import { NextResponse } from "next/server";
import { readTokenStore, writeTokenStore, extractUserId } from "@/lib/auth/tokens";
import { refreshAccessToken } from "@/lib/auth/etsy-oauth";

export async function POST() {
  const store = readTokenStore();

  if (!store.refresh_token) {
    return NextResponse.json(
      { error: "Not connected to Etsy" },
      { status: 401 }
    );
  }

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

    return NextResponse.json({ success: true, expires_at: expiresAt });
  } catch {
    return NextResponse.json(
      {
        error: "Refresh token expired. Please reconnect to Etsy.",
        needs_reauth: true,
      },
      { status: 401 }
    );
  }
}
