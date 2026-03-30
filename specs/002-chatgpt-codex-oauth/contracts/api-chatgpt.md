# API Contract: ChatGPT Codex OAuth

**Feature**: 002-chatgpt-codex-oauth | **Date**: 2026-03-20

All routes are server-side Next.js API routes under `app/api/chatgpt/`. No ChatGPT tokens, secrets, or OpenAI credentials are ever exposed to the browser.

---

## POST `/api/chatgpt/connect`

Start the ChatGPT Codex OAuth flow. Generates PKCE parameters, stores them server-side, and returns the OpenAI authorization URL for the user to open.

**Request**: No body required.

**Response** `200 OK`:

```json
{
  "authorization_url": "https://auth.openai.com/oauth/authorize?response_type=code&client_id=...&redirect_uri=...&scope=...&code_challenge=...&code_challenge_method=S256&state=...",
  "instructions": "Open the URL above, sign in to OpenAI, and after being redirected copy the full URL from your browser address bar and paste it below."
}
```

**Response** `409 Conflict` (already connected):

```json
{
  "error": "Already connected to ChatGPT. Disconnect first to reconnect."
}
```

**Response** `500 Internal Server Error`:

```json
{
  "error": "Failed to start ChatGPT OAuth flow",
  "details": "..."
}
```

---

## POST `/api/chatgpt/exchange`

Exchange the authorization code from the user-pasted callback URL for access and refresh tokens.

**Request**:

```json
{
  "callback_url": "http://localhost:1455/auth/callback?code=ac_KZL...&scope=openid+profile+email+offline_access&state=gAAAA..."
}
```

**Validation**:
- `callback_url` must be a non-empty string
- Must contain a `code` query parameter
- Must contain a `state` query parameter matching the stored pending OAuth state

**Response** `200 OK`:

```json
{
  "connected": true,
  "user_email": "user@example.com"
}
```

**Response** `400 Bad Request`:

```json
{
  "error": "Invalid callback URL. Missing 'code' or 'state' parameter."
}
```

**Response** `400 Bad Request` (state mismatch):

```json
{
  "error": "State mismatch. Please restart the connection flow."
}
```

**Response** `400 Bad Request` (no pending flow):

```json
{
  "error": "No pending OAuth flow. Click 'Connect ChatGPT' first."
}
```

**Response** `502 Bad Gateway` (OpenAI token exchange failed):

```json
{
  "error": "Failed to exchange code with OpenAI",
  "details": "..."
}
```

---

## GET `/api/chatgpt/status`

Return the current ChatGPT connection status. No secrets in the response.

**Request**: No body required.

**Response** `200 OK` (connected):

```json
{
  "connected": true,
  "user_email": "user@example.com",
  "expires_at": 1742515200,
  "needs_reauth": false,
  "pending": false
}
```

**Response** `200 OK` (disconnected):

```json
{
  "connected": false,
  "needs_reauth": false,
  "pending": false
}
```

**Response** `200 OK` (pending OAuth flow):

```json
{
  "connected": false,
  "needs_reauth": false,
  "pending": true
}
```

---

## POST `/api/chatgpt/disconnect`

Clear all stored ChatGPT tokens and reset connection state.

**Request**: No body required.

**Response** `200 OK`:

```json
{
  "disconnected": true
}
```

---

## POST `/api/chatgpt/refresh`

Refresh the ChatGPT access token using the stored refresh token. Called automatically by the test prompt route when the access token is expired, but also exposed as a standalone route.

**Request**: No body required.

**Response** `200 OK`:

```json
{
  "refreshed": true,
  "expires_at": 1742518800
}
```

**Response** `401 Unauthorized` (no refresh token or refresh failed):

```json
{
  "error": "Token refresh failed. Please reconnect to ChatGPT.",
  "needs_reauth": true
}
```

---

## POST `/api/chatgpt/test`

Send a test prompt to ChatGPT via the Codex backend endpoint and return the response. Automatically refreshes the access token if expired.

**Request**:

```json
{
  "message": "Hello, can you confirm you're working?",
  "model": "gpt-4o"
}
```

**Validation**:
- `message` must be a non-empty string (max 2000 characters after trimming)
- `model` is optional (defaults to `gpt-4o`)

**Response** `200 OK`:

```json
{
  "success": true,
  "response": "Hello! Yes, I'm working and ready to help.",
  "model": "gpt-4o"
}
```

**Response** `400 Bad Request`:

```json
{
  "error": "Message is required and must be 2000 characters or less."
}
```

**Response** `401 Unauthorized` (not connected or token invalid):

```json
{
  "error": "Not connected to ChatGPT. Please connect first.",
  "needs_reauth": true
}
```

**Response** `502 Bad Gateway` (ChatGPT API error):

```json
{
  "error": "ChatGPT request failed",
  "details": "..."
}
```

**Response** `504 Gateway Timeout`:

```json
{
  "error": "ChatGPT did not respond within the timeout period. Please try again."
}
```

---

## Common Error Shape

All error responses use the existing app convention:

```json
{
  "error": "Human-readable error message",
  "details": "Optional technical details (omitted in production if sensitive)"
}
```

Optionally includes:
- `needs_reauth: true` — signals the client should show a reconnect prompt
