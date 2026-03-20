import type { EtsyTokenResponse, EtsyShopResponse } from "@/lib/types/etsy";

const ETSY_OAUTH_URL = "https://www.etsy.com/oauth/connect";
const ETSY_TOKEN_URL = "https://api.etsy.com/v3/public/oauth/token";
const ETSY_API_BASE = "https://api.etsy.com/v3/application";

function getApiKey(): string {
  const key = process.env.ETSY_API_KEY;
  if (!key) throw new Error("Missing ETSY_API_KEY environment variable");
  return key;
}

function getRedirectUri(): string {
  const uri = process.env.ETSY_REDIRECT_URI;
  if (!uri) throw new Error("Missing ETSY_REDIRECT_URI environment variable");
  return uri;
}

export function buildAuthorizationUrl(
  state: string,
  codeChallenge: string
): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: getApiKey(),
    redirect_uri: getRedirectUri(),
    scope: "listings_w listings_r shops_r",
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });
  return `${ETSY_OAUTH_URL}?${params.toString()}`;
}

export async function exchangeCodeForTokens(
  code: string,
  codeVerifier: string
): Promise<EtsyTokenResponse> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: getApiKey(),
    redirect_uri: getRedirectUri(),
    code,
    code_verifier: codeVerifier,
  });

  const response = await fetch(ETSY_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Token exchange failed (${response.status}): ${errorText}`);
  }

  return response.json() as Promise<EtsyTokenResponse>;
}

export async function refreshAccessToken(
  refreshToken: string
): Promise<EtsyTokenResponse> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: getApiKey(),
    refresh_token: refreshToken,
  });

  const response = await fetch(ETSY_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Token refresh failed (${response.status}): ${errorText}`
    );
  }

  return response.json() as Promise<EtsyTokenResponse>;
}

export async function fetchUserShop(
  userId: number,
  accessToken: string
): Promise<{ shopId: number; shopName: string }> {
  const url = `${ETSY_API_BASE}/users/${userId}/shops`;
  const response = await fetch(url, {
    headers: {
      "x-api-key": getApiKey(),
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch shop info (${response.status}): ${errorText}`);
  }

  const data = (await response.json()) as EtsyShopResponse;
  if (!data.results || data.results.length === 0) {
    throw new Error("No shops found for this Etsy account");
  }

  const shop = data.results[0];
  return { shopId: shop.shop_id, shopName: shop.shop_name };
}
