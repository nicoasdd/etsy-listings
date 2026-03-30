import { NextRequest, NextResponse } from "next/server";
import { readTokenStore, writeTokenStore, extractUserId } from "@/lib/auth/tokens";
import { exchangeCodeForTokens, fetchUserShop } from "@/lib/auth/etsy-oauth";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    const errorDesc = searchParams.get("error_description") || error;
    return NextResponse.redirect(
      new URL(`/?error=${encodeURIComponent(errorDesc)}`, request.url)
    );
  }

  if (!code || !state) {
    return NextResponse.json(
      { error: "Missing code or state parameter" },
      { status: 400 }
    );
  }

  const store = readTokenStore();

  if (!store.pending_oauth || store.pending_oauth.state !== state) {
    return NextResponse.json(
      { error: "Invalid state parameter" },
      { status: 400 }
    );
  }

  const codeVerifier = store.pending_oauth.code_verifier;

  try {
    const tokenResponse = await exchangeCodeForTokens(code, codeVerifier);

    const userId = extractUserId(tokenResponse.access_token);
    const { shopId, shopName } = await fetchUserShop(
      userId,
      tokenResponse.access_token
    );

    writeTokenStore({
      access_token: tokenResponse.access_token,
      refresh_token: tokenResponse.refresh_token,
      expires_at: Math.floor(Date.now() / 1000) + tokenResponse.expires_in,
      user_id: userId,
      shop_id: shopId,
      shop_name: shopName,
      pending_oauth: null,
    });

    return NextResponse.redirect(new URL("/", request.url));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.redirect(
      new URL(`/?error=${encodeURIComponent(message)}`, request.url)
    );
  }
}
