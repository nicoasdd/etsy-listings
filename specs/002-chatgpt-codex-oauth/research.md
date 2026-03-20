# Research: ChatGPT Codex OAuth Integration

**Feature**: 002-chatgpt-codex-oauth | **Date**: 2026-03-20

## R1: How does the Codex OAuth flow work for third-party apps?

**Decision**: Reverse-engineer the Codex CLI's OAuth 2.0 Authorization Code + PKCE flow to authenticate users with their existing ChatGPT subscription.

**Rationale**: OpenAI does not provide an official public OAuth API for third-party apps to leverage users' ChatGPT subscriptions. However, the Codex CLI (open source at `github.com/openai/codex`) uses a standard OAuth 2.1 flow against `auth.openai.com` with PKCE. Third-party tools like OpenClaw and InnomightLabs have successfully replicated this flow. The key limitation is that the redirect URI (`http://localhost:1455/auth/callback`) is whitelisted for the Codex CLI client, so our app must use a user-assisted callback (user copies the redirected URL and pastes it back into the app).

**Alternatives considered**:
- **OpenAI Platform API key**: Costs money separately from the user's ChatGPT subscription. Rejected because the user already pays for ChatGPT Pro/Plus and wants to leverage that subscription.
- **Official Apps SDK OAuth**: This is designed for ChatGPT connecting to *your* MCP server, not for your app connecting to ChatGPT. The flow direction is reversed. Not applicable.
- **Running a local server on port 1455**: Would automatically capture the redirect. Rejected for complexity — conflicts with the Codex CLI if installed, requires spawning a secondary HTTP server, violates Constitution Principle V (Simplicity).

## R2: OAuth endpoints, parameters, and client configuration

**Decision**: Use the following OpenAI OAuth endpoints and parameters:

| Parameter | Value |
|-----------|-------|
| Authorization URL | `https://auth.openai.com/oauth/authorize` |
| Token exchange URL | `https://auth.openai.com/oauth/token` |
| Redirect URI | `http://localhost:1455/auth/callback` |
| Client ID | Configurable via `OPENAI_CLIENT_ID` env var (sourced from Codex CLI) |
| Scopes | `openid profile email offline_access` |
| PKCE method | S256 (same as Etsy flow) |
| Additional params | `id_token_add_organizations=true`, `codex_cli_simplified_flow=true` |

**Rationale**: These are the exact parameters the Codex CLI uses. The `offline_access` scope ensures a refresh token is issued. The client ID is public (embedded in the open-source Codex CLI) but is made configurable in `.env.local` so it can be updated if OpenAI rotates it.

**Alternatives considered**:
- Hardcoding the client ID: Rejected because it may change with Codex CLI updates.
- Using different scopes: The minimum viable set is `openid offline_access`, but `profile email` provides user identity for display purposes.

## R3: User-assisted callback flow (URL copy-paste)

**Decision**: After the user completes OpenAI sign-in, the browser redirects to `localhost:1455` which shows a 404. The app UI instructs the user to copy the full URL from the browser address bar and paste it into an input field. The app extracts the `code` and `state` parameters and exchanges the code for tokens server-side.

**Rationale**: This is the approach proven by InnomightLabs. The redirect URI (`localhost:1455`) is whitelisted by OpenAI's auth server and cannot be changed. Since our app runs on port 3000, we cannot intercept this redirect. The copy-paste step is a one-time action during setup. Clear UI instructions minimize user friction.

**Alternatives considered**:
- **Spawning a temporary HTTP server on port 1455**: More seamless UX but adds significant complexity, may conflict with the Codex CLI, and violates Constitution Principle V.
- **Device code flow**: Codex supports this as beta. It avoids the redirect entirely by displaying a code the user enters at openai.com. However, it's undocumented for third-party usage and may not be available to non-Codex clients.
- **Proxy/intercept approach**: Using browser extensions or OS-level networking. Far too complex and fragile.

## R4: Runtime inference endpoint and payload format

**Decision**: Use the ChatGPT backend Codex responses endpoint for inference:

| Parameter | Value |
|-----------|-------|
| Endpoint | `https://chatgpt.com/backend-api/codex/responses` |
| Method | POST |
| Auth header | `Authorization: Bearer {access_token}` |
| Content type | `application/json` |

Required payload shape:

```json
{
  "model": "gpt-4o",
  "instructions": "System instructions here",
  "store": false,
  "stream": true,
  "input": [
    {
      "role": "user",
      "content": [
        { "type": "input_text", "text": "User message here" }
      ]
    }
  ]
}
```

**Rationale**: This is the ChatGPT backend API, distinct from the Platform API (`api.openai.com`). ChatGPT OAuth tokens only work with this endpoint. The `store: false` and `stream: true` fields are required. The `instructions` field must be present. The response uses the Responses API format (not Chat Completions).

**Alternatives considered**:
- **Platform API (`api.openai.com/v1/responses`)**: Requires a separate API key with usage-based billing. ChatGPT OAuth tokens get scope/permission errors on this endpoint.
- **Chat Completions format**: The Codex backend uses the newer Responses API format with `input` instead of `messages`.

## R5: Token storage and refresh strategy

**Decision**: Store ChatGPT tokens in a separate file `data/chatgpt-tokens.json` with its own read/write module `lib/chatgpt/tokens.ts`. Refresh tokens automatically when the access token expires, using the same `https://auth.openai.com/oauth/token` endpoint with `grant_type=refresh_token`.

**Rationale**: Keeping ChatGPT tokens separate from Etsy tokens (`data/tokens.json`) respects Constitution Principle IV (Single-Concern Modules). The ChatGPT auth module has different endpoints, scopes, and token formats from the Etsy auth module. A separate file also isolates failure — clearing one set of tokens doesn't affect the other.

**Alternatives considered**:
- **Single combined token store**: Simpler single file but mixes two unrelated auth concerns. Rejected per Constitution Principle IV.
- **Encrypted token storage**: More secure but adds complexity. The constitution specifies "simplest viable mechanism" for local tools. Tokens are already server-side only and the app is local-only.

## R6: Model selection for test prompts

**Decision**: Default to `gpt-4o` for the test prompt feature. Make the model configurable via a UI dropdown or environment variable for future flexibility.

**Rationale**: `gpt-4o` is widely available to ChatGPT Plus/Pro subscribers and provides a good balance of capability and speed for testing. The user's subscription tier determines which models are available.

**Alternatives considered**:
- **Hardcode a specific model**: Too rigid; model availability changes over time.
- **Auto-detect available models**: No known endpoint to query available models via ChatGPT OAuth. Over-engineering for a test prompt feature.

## R7: Error handling for unsupported regions and subscription issues

**Decision**: Handle all OpenAI API errors with clear, actionable messages. Key error scenarios:

| Error | Cause | User action |
|-------|-------|-------------|
| `403 unsupported_country_region_territory` | Network/proxy routing issue during token exchange | Check network/VPN settings, ensure requests reach OpenAI directly |
| `401 Unauthorized` | Expired or invalid token | Auto-refresh or prompt re-authentication |
| `429 Too Many Requests` | Rate limit exceeded | Show retry-after time, suggest waiting |
| `403` on inference endpoint | Subscription lapsed or insufficient tier | Check ChatGPT subscription status |
| Network errors | ChatGPT service outage | Show user-friendly message, allow retry |

**Rationale**: The `unsupported_country_region_territory` error was confirmed to be a client-side networking issue (not honoring proxy settings) rather than a server-side block. All error handling routes through our API routes per Constitution Principle II.
