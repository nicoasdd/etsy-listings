import { NextRequest, NextResponse } from "next/server";
import { generateCodeVerifier, generateCodeChallenge, generateState } from "@/lib/auth/pkce";
import { readTokenStore, writeTokenStore } from "@/lib/auth/tokens";
import { buildAuthorizationUrl } from "@/lib/auth/etsy-oauth";

export async function GET(request: NextRequest) {
  const apiKey = process.env.ETSY_API_KEY;
  const redirectUri = process.env.ETSY_REDIRECT_URI;

  if (!apiKey || !redirectUri) {
    const msg = "Missing ETSY_API_KEY or ETSY_REDIRECT_URI. Create a .env.local file — see .env.example.";
    return NextResponse.redirect(
      new URL(`/?error=${encodeURIComponent(msg)}`, request.url)
    );
  }

  try {
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);
    const state = generateState();

    const store = readTokenStore();
    store.pending_oauth = { state, code_verifier: codeVerifier };
    writeTokenStore(store);

    const authUrl = buildAuthorizationUrl(state, codeChallenge);
    return NextResponse.redirect(authUrl);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to start OAuth flow";
    return NextResponse.redirect(
      new URL(`/?error=${encodeURIComponent(msg)}`, request.url)
    );
  }
}
