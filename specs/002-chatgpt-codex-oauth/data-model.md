# Data Model: ChatGPT Codex OAuth Integration

**Feature**: 002-chatgpt-codex-oauth | **Date**: 2026-03-20

## Entities

### ChatGPTTokenStore

Persisted in `data/chatgpt-tokens.json`. Server-side only — never exposed to browser.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `access_token` | `string` | No | OpenAI OAuth access token for ChatGPT backend API |
| `refresh_token` | `string` | No | OpenAI OAuth refresh token for silent renewal |
| `expires_at` | `number` | No | Unix timestamp (seconds) when access_token expires |
| `user_email` | `string` | No | User email from OpenAI profile (display only) |
| `pending_oauth` | `ChatGPTPendingOAuth \| null` | No | Temporary PKCE state during OAuth flow |

**Validation rules**:
- `access_token` and `refresh_token` must be non-empty strings when present
- `expires_at` must be a positive integer (Unix epoch seconds)
- `pending_oauth` is set when the OAuth flow starts and cleared after token exchange

**State transitions**:
1. **Disconnected** → `pending_oauth` set → **Pending** (user initiated connect)
2. **Pending** → tokens stored, `pending_oauth` cleared → **Connected**
3. **Connected** → `expires_at` reached → **Expired** (auto-refresh attempted)
4. **Expired** → refresh succeeds → **Connected**
5. **Expired** → refresh fails → **Needs Reauth** (user must reconnect)
6. **Connected / Expired / Needs Reauth** → user disconnects → **Disconnected**

---

### ChatGPTPendingOAuth

Temporary state stored inside `ChatGPTTokenStore.pending_oauth` during the OAuth flow.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `state` | `string` | Yes | Random state parameter for CSRF protection |
| `code_verifier` | `string` | Yes | PKCE code verifier (used during token exchange) |

**Validation rules**:
- `state` must be a cryptographically random string (min 32 characters)
- `code_verifier` must be 43–128 characters per RFC 7636

---

### ChatGPTConnectionStatus

Returned by the `/api/chatgpt/status` route. Client-facing — no secrets.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `connected` | `boolean` | Yes | Whether a valid ChatGPT connection exists |
| `user_email` | `string` | No | Display email (only when connected) |
| `expires_at` | `number` | No | Token expiry timestamp (only when connected) |
| `needs_reauth` | `boolean` | Yes | Whether the user must re-authenticate |
| `pending` | `boolean` | Yes | Whether an OAuth flow is in progress |

---

### TestPromptExchange

Request/response pair for the test prompt feature. Not persisted.

**Request** (client → `/api/chatgpt/test`):

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `message` | `string` | Yes | User's prompt text (max 2000 characters) |
| `model` | `string` | No | Model override (defaults to `gpt-4o`) |

**Validation rules**:
- `message` must be a non-empty string, trimmed, max 2000 characters
- `model` if provided must be a non-empty string

**Response** (server → client):

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `response` | `string` | Yes | ChatGPT's text response |
| `model` | `string` | Yes | Model that generated the response |
| `success` | `boolean` | Yes | Whether the prompt succeeded |
| `error` | `string` | No | Error message if `success` is false |

---

## Relationships

```text
ChatGPTTokenStore (1) ──contains──> (0..1) ChatGPTPendingOAuth
ChatGPTTokenStore (1) ──produces──> (1) ChatGPTConnectionStatus
TestPromptExchange ──requires──> ChatGPTTokenStore.access_token (must be valid)
```

## Storage

- **File**: `data/chatgpt-tokens.json`
- **Format**: JSON, single object (no array — single-user tool)
- **Access**: Server-side only via `lib/chatgpt/tokens.ts`
- **Git**: Listed in `.gitignore` (already covered by `data/` directory exclusion)
