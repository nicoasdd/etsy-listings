const OPENAI_AUTH_URL = "https://auth.openai.com/oauth/authorize";
const OPENAI_TOKEN_URL = "https://auth.openai.com/oauth/token";

function getClientId(): string {
  const clientId = process.env.OPENAI_CLIENT_ID;
  if (!clientId) throw new Error("OPENAI_CLIENT_ID environment variable is not set");
  return clientId;
}

function getRedirectUri(): string {
  const uri = process.env.OPENAI_REDIRECT_URI;
  if (!uri) throw new Error("OPENAI_REDIRECT_URI environment variable is not set");
  return uri;
}

export function buildOpenAIAuthorizationUrl(state: string, codeChallenge: string): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: getClientId(),
    redirect_uri: getRedirectUri(),
    scope: "openid profile email offline_access",
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    state,
    id_token_add_organizations: "true",
    codex_cli_simplified_flow: "true",
  });
  return `${OPENAI_AUTH_URL}?${params.toString()}`;
}

interface OpenAITokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type: string;
  id_token?: string;
}

function decodeIdTokenEmail(idToken: string): string | undefined {
  try {
    const payload = idToken.split(".")[1];
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf-8"));
    return decoded.email as string | undefined;
  } catch {
    return undefined;
  }
}

export async function exchangeCodeForTokens(
  code: string,
  codeVerifier: string
): Promise<{ access_token: string; refresh_token?: string; expires_at: number; user_email?: string }> {
  const res = await fetch(OPENAI_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      code_verifier: codeVerifier,
      client_id: getClientId(),
      redirect_uri: getRedirectUri(),
    }).toString(),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Token exchange failed (${res.status}): ${errorBody}`);
  }

  const data = (await res.json()) as OpenAITokenResponse;
  const expiresIn = data.expires_in ?? 3600;
  const expiresAt = Math.floor(Date.now() / 1000) + expiresIn;
  const userEmail = data.id_token ? decodeIdTokenEmail(data.id_token) : undefined;

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: expiresAt,
    user_email: userEmail,
  };
}

export async function refreshAccessToken(
  refreshToken: string
): Promise<{ access_token: string; refresh_token?: string; expires_at: number }> {
  const res = await fetch(OPENAI_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: getClientId(),
    }).toString(),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Token refresh failed (${res.status}): ${errorBody}`);
  }

  const data = (await res.json()) as OpenAITokenResponse;
  const expiresIn = data.expires_in ?? 3600;
  const expiresAt = Math.floor(Date.now() / 1000) + expiresIn;

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token ?? refreshToken,
    expires_at: expiresAt,
  };
}
