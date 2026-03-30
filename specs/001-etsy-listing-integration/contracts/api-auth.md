# API Contracts: Authentication

**Feature**: 001-etsy-listing-integration
**Base URL**: `http://localhost:3000`

---

## GET /api/auth/connect

Initiates the Etsy OAuth 2.0 PKCE flow. Generates PKCE pair and state, stores them server-side, and redirects the user to Etsy's authorization page.

**Response**: `302 Redirect` to `https://www.etsy.com/oauth/connect?...`

**Redirect Query Parameters**:
| Parameter | Value |
|-----------|-------|
| `response_type` | `code` |
| `client_id` | From `ETSY_API_KEY` env var |
| `redirect_uri` | From `ETSY_REDIRECT_URI` env var |
| `scope` | `listings_w listings_r shops_r` |
| `state` | Generated random string |
| `code_challenge` | SHA256 of code_verifier, base64url encoded |
| `code_challenge_method` | `S256` |

**Side Effects**: Writes `pending_oauth` to `data/tokens.json`.

**Error Response** (if env vars missing):
```json
{
  "error": "Missing ETSY_API_KEY or ETSY_REDIRECT_URI environment variable"
}
```
Status: `500`

---

## GET /api/auth/callback

Handles the OAuth redirect from Etsy. Validates the state parameter, exchanges the authorization code for tokens, fetches the user's shop info, and stores everything.

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `code` | string | yes | Authorization code from Etsy |
| `state` | string | yes | Must match the stored pending_oauth.state |

**Success Response**: `302 Redirect` to `/` (home page)

**Side Effects**: 
- Calls `POST https://api.etsy.com/v3/public/oauth/token` to exchange code
- Calls `GET https://api.etsy.com/v3/application/users/{user_id}/shops` to get shop info
- Writes tokens and shop info to `data/tokens.json`
- Clears `pending_oauth`

**Error Responses**:

State mismatch:
```json
{
  "error": "Invalid state parameter"
}
```
Status: `400`

Token exchange failure:
```json
{
  "error": "Failed to exchange authorization code",
  "details": "..."
}
```
Status: `502`

---

## POST /api/auth/refresh

Refreshes the access token using the stored refresh token. Called automatically by other API routes when the token is expired, but also available as an explicit endpoint.

**Request Body**: None

**Success Response** (`200`):
```json
{
  "success": true,
  "expires_at": 1711003600
}
```

**Error Responses**:

No tokens stored:
```json
{
  "error": "Not connected to Etsy"
}
```
Status: `401`

Refresh failed (refresh token expired):
```json
{
  "error": "Refresh token expired. Please reconnect to Etsy.",
  "needs_reauth": true
}
```
Status: `401`

---

## GET /api/auth/status

Returns the current connection status without triggering any token refresh.

**Request Body**: None

**Success Response** (`200`):
```json
{
  "connected": true,
  "shop_name": "MyEtsyShop",
  "shop_id": 12345678,
  "expires_at": 1711003600,
  "needs_reauth": false
}
```

**Not Connected Response** (`200`):
```json
{
  "connected": false,
  "needs_reauth": false
}
```

---

## POST /api/auth/disconnect

Clears all stored tokens and returns to unauthenticated state.

**Request Body**: None

**Success Response** (`200`):
```json
{
  "success": true
}
```
