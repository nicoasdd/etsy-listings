import { NextRequest, NextResponse } from "next/server";
import { readTokenStore, writeTokenStore, isTokenExpired, extractUserId } from "@/lib/auth/tokens";
import { refreshAccessToken } from "@/lib/auth/etsy-oauth";

const ETSY_API_BASE = "https://api.etsy.com/v3/application";

async function resolveAuth() {
  const store = readTokenStore();
  if (!store.access_token || !store.shop_id) {
    return { error: "Not connected to Etsy.", status: 401 } as const;
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
      return { error: "Etsy session expired. Please reconnect.", status: 401 } as const;
    }
  }

  const keystring = process.env.ETSY_API_KEY;
  const sharedSecret = process.env.ETSY_SHARED_SECRET;
  if (!keystring || !sharedSecret) {
    return { error: "Missing ETSY_API_KEY or ETSY_SHARED_SECRET", status: 500 } as const;
  }

  return { accessToken, apiKey: `${keystring}:${sharedSecret}`, shopId: store.shop_id } as const;
}

export async function GET() {
  const auth = await resolveAuth();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const url = `${ETSY_API_BASE}/shops/${auth.shopId}/readiness-state-definitions`;

  const res = await fetch(url, {
    headers: {
      "x-api-key": auth.apiKey,
      Authorization: `Bearer ${auth.accessToken}`,
    },
  });

  if (!res.ok) {
    const body = await res.text();
    return NextResponse.json(
      { error: `Etsy API error (${res.status}): ${body}` },
      { status: res.status },
    );
  }

  const data = await res.json();
  return NextResponse.json({ definitions: data.results ?? [] });
}

export async function POST(request: NextRequest) {
  const auth = await resolveAuth();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await request.json();
  const {
    readiness_state = "made_to_order",
    min_processing_time = 3,
    max_processing_time = 5,
    processing_time_unit = "days",
  } = body;

  const url = `${ETSY_API_BASE}/shops/${auth.shopId}/readiness-state-definitions`;

  const params = new URLSearchParams();
  params.append("readiness_state", readiness_state);
  params.append("min_processing_time", String(min_processing_time));
  params.append("max_processing_time", String(max_processing_time));
  params.append("processing_time_unit", processing_time_unit);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "x-api-key": auth.apiKey,
      Authorization: `Bearer ${auth.accessToken}`,
    },
    body: params.toString(),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    return NextResponse.json(
      { error: `Etsy API error (${res.status}): ${errorBody}` },
      { status: res.status },
    );
  }

  const data = await res.json();
  return NextResponse.json({ definition: data });
}
