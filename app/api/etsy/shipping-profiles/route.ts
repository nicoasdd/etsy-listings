import { NextResponse } from "next/server";
import {
  readTokenStore,
  writeTokenStore,
  isTokenExpired,
  extractUserId,
} from "@/lib/auth/tokens";
import { refreshAccessToken } from "@/lib/auth/etsy-oauth";

const ETSY_API_BASE = "https://api.etsy.com/v3/application";

export async function GET() {
  const store = readTokenStore();
  if (!store.access_token || !store.shop_id) {
    return NextResponse.json(
      { error: "Not connected to Etsy" },
      { status: 401 },
    );
  }

  let accessToken = store.access_token;

  if (isTokenExpired(store) && store.refresh_token) {
    try {
      const tokenResponse = await refreshAccessToken(store.refresh_token);
      const userId = extractUserId(tokenResponse.access_token);
      const expiresAt =
        Math.floor(Date.now() / 1000) + tokenResponse.expires_in;

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
      return NextResponse.json(
        { error: "Session expired. Please reconnect." },
        { status: 401 },
      );
    }
  }

  const apiKey = process.env.ETSY_API_KEY;
  const sharedSecret = process.env.ETSY_SHARED_SECRET;
  if (!apiKey || !sharedSecret) {
    return NextResponse.json(
      { error: "Missing API configuration" },
      { status: 500 },
    );
  }

  const res = await fetch(
    `${ETSY_API_BASE}/shops/${store.shop_id}/shipping-profiles`,
    {
      headers: {
        "x-api-key": `${apiKey}:${sharedSecret}`,
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json(
      { error: `Etsy API error (${res.status}): ${text}` },
      { status: res.status },
    );
  }

  const data = await res.json();
  const profiles = (data.results ?? []).map(
    (p: Record<string, unknown>) => ({
      shipping_profile_id: p.shipping_profile_id,
      title: p.title,
    }),
  );

  return NextResponse.json({ profiles });
}
