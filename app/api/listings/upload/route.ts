import { NextRequest, NextResponse } from "next/server";
import { readTokenStore, writeTokenStore, isTokenExpired, extractUserId } from "@/lib/auth/tokens";
import { refreshAccessToken } from "@/lib/auth/etsy-oauth";
import { parseAndNormalize, validateListings, getWarnings } from "@/lib/listings/validate";
import { createDraftListing } from "@/lib/listings/etsy-api";
import type { ListingPayload } from "@/lib/types/etsy";
import type { UploadResult } from "@/lib/types/app";

const RATE_LIMIT_DELAY_MS = 200;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function resolveAuth() {
  const store = readTokenStore();
  if (!store.access_token || !store.shop_id) {
    return { error: "Not connected to Etsy. Please authenticate first.", status: 401 } as const;
  }

  let accessToken = store.access_token;

  if (isTokenExpired(store) && store.refresh_token) {
    try {
      const tokenResponse = await refreshAccessToken(store.refresh_token);
      const userId = extractUserId(tokenResponse.access_token);
      const expiresAt = Math.floor(Date.now() / 1000) + tokenResponse.expires_in;

      writeTokenStore({
        ...store,
        access_token: tokenResponse.access_token,
        refresh_token: tokenResponse.refresh_token,
        expires_at: expiresAt,
        user_id: userId,
        pending_oauth: null,
      });

      accessToken = tokenResponse.access_token;
    } catch {
      return {
        error: "Etsy session expired. Please reconnect.",
        needs_reauth: true,
        status: 401,
      } as const;
    }
  }

  const keystring = process.env.ETSY_API_KEY;
  const sharedSecret = process.env.ETSY_SHARED_SECRET;
  if (!keystring || !sharedSecret) {
    return { error: "Missing ETSY_API_KEY or ETSY_SHARED_SECRET environment variable", status: 500 } as const;
  }
  const apiKey = `${keystring}:${sharedSecret}`;

  return { accessToken, apiKey, shopId: store.shop_id } as const;
}

export async function POST(request: NextRequest) {
  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return NextResponse.json(
      { error: "Failed to read request body" },
      { status: 400 }
    );
  }

  let listings: unknown[];
  try {
    listings = parseAndNormalize(rawBody);
  } catch (err) {
    return NextResponse.json(
      {
        error: "Invalid JSON syntax",
        details: err instanceof Error ? err.message : "Parse error",
      },
      { status: 400 }
    );
  }

  const validationErrors = validateListings(listings);
  if (validationErrors.length > 0) {
    return NextResponse.json(
      { error: "Validation failed", validation_errors: validationErrors },
      { status: 400 }
    );
  }

  const auth = await resolveAuth();
  if ("error" in auth) {
    return NextResponse.json(
      { error: auth.error, ...(auth.needs_reauth ? { needs_reauth: true } : {}) },
      { status: auth.status }
    );
  }

  const useStreaming = request.headers.get("accept") === "text/event-stream";

  if (useStreaming && listings.length > 1) {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (event: string, data: unknown) => {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        };

        send("total", { total: listings.length });

        const results: UploadResult[] = [];
        for (let i = 0; i < listings.length; i++) {
          if (i > 0) await delay(RATE_LIMIT_DELAY_MS);
          const result = await createDraftListing(
            auth.shopId,
            auth.accessToken,
            auth.apiKey,
            listings[i] as ListingPayload,
            i
          );
          results.push(result);
          send("result", result);
        }

        const succeeded = results.filter((r) => r.status === "success").length;
        const failed = results.filter((r) => r.status === "error").length;
        send("done", {
          results,
          summary: { total: results.length, succeeded, failed },
        });

        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  }

  const results: UploadResult[] = [];
  for (let i = 0; i < listings.length; i++) {
    if (i > 0) await delay(RATE_LIMIT_DELAY_MS);
    const result = await createDraftListing(
      auth.shopId,
      auth.accessToken,
      auth.apiKey,
      listings[i] as ListingPayload,
      i
    );
    results.push(result);
  }

  const succeeded = results.filter((r) => r.status === "success").length;
  const failed = results.filter((r) => r.status === "error").length;

  const warnings = getWarnings(listings);

  return NextResponse.json({
    results,
    summary: { total: results.length, succeeded, failed },
    ...(warnings.length > 0 ? { warnings } : {}),
  });
}
