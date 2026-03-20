# Research: Etsy Craft Listing Uploader

**Feature**: 001-etsy-listing-integration
**Date**: 2026-03-20

## R1: Etsy OAuth 2.0 PKCE Flow

### Decision
Implement the full OAuth 2.0 Authorization Code Grant with PKCE (S256) as specified by the Etsy Open API v3.

### Rationale
Etsy requires PKCE on every authorization flow. The flow is:
1. **Generate PKCE pair**: Create a `code_verifier` (43-128 chars from `[A-Za-z0-9._~-]`) and derive `code_challenge` as the URL-safe base64 of its SHA256 hash.
2. **Redirect to Etsy**: `GET https://www.etsy.com/oauth/connect` with `response_type=code`, `client_id`, `redirect_uri`, `scope`, `state`, `code_challenge`, `code_challenge_method=S256`.
3. **Handle callback**: Etsy redirects to our `redirect_uri` with `code` and `state` params. Validate `state` matches what was sent.
4. **Exchange code for tokens**: `POST https://api.etsy.com/v3/public/oauth/token` with `grant_type=authorization_code`, `client_id`, `redirect_uri`, `code`, `code_verifier`.
5. **Store tokens**: Access token (1 hour TTL), refresh token (90 day TTL). The `access_token` has a numeric user ID prefix (e.g., `12345678.tokenstring`).
6. **Refresh**: `POST https://api.etsy.com/v3/public/oauth/token` with `grant_type=refresh_token`, `client_id`, `refresh_token`.

### Key Details
- **Scopes needed**: `listings_w listings_r shops_r`
- **`code_verifier` storage**: Store server-side in `data/tokens.json` keyed by the `state` parameter during the OAuth flow. After token exchange, the verifier is no longer needed.
- **`state` parameter**: Generate a cryptographically random string per flow; validate on callback to prevent CSRF.
- **Redirect URI**: Must be registered in the Etsy developer app. Etsy allows `http://localhost` for development.
- **`x-api-key` header**: Required on all v3 API calls. Value is the Etsy App API Key keystring.

### Alternatives Considered
- **Auth.js / NextAuth.js**: Rejected — adds unnecessary complexity for a single OAuth provider on a local tool. Etsy is not a built-in provider, so we'd need a custom implementation anyway. Constitution Principle V (Simplicity) favors a manual implementation.
- **Storing code_verifier in HTTP-only cookie**: Viable but adds cookie management complexity. Since this is a local single-user app, file-based storage is simpler.

---

## R2: createDraftListing API Endpoint

### Decision
Use `POST https://api.etsy.com/v3/application/shops/{shop_id}/listings` with `application/x-www-form-urlencoded` content type.

### Rationale
The endpoint creates a physical draft listing. The `shop_id` is extracted from the user's connected shop (obtained via `GET /v3/application/users/{user_id}/shops` after authentication).

### Required Fields (minimum for a draft)
| Field | Type | Description |
|-------|------|-------------|
| `quantity` | integer | Positive non-zero count of items |
| `title` | string | Letters, numbers, punctuation, math symbols, whitespace, ™©® |
| `description` | string | Product description |
| `price` | float | Positive non-zero price |
| `who_made` | enum | `i_did`, `someone_else`, `collective` |
| `when_made` | enum | `made_to_order`, `2020_2023`, `2010_2019`, etc. |
| `taxonomy_id` | integer | Numerical taxonomy ID from Etsy's seller taxonomy |

### Optional Fields
`shipping_profile_id`, `return_policy_id`, `materials` (string[]), `shop_section_id`, `processing_min`, `processing_max`, `tags` (string[]), `styles` (string[], max 2), `item_weight`, `item_length`, `item_width`, `item_height`, `item_weight_unit` (oz/g/kg/lb), `item_dimensions_unit` (in/ft/mm/cm/m/yd), `is_personalizable`, `personalization_is_required`, `personalization_char_count_max`, `personalization_instructions`, `production_partner_ids` (int[]), `image_ids` (int[]), `is_supply`, `is_customizable`, `should_auto_renew`, `is_taxable`, `type` (physical/download).

### Request Headers
- `Content-Type: application/x-www-form-urlencoded`
- `x-api-key: {ETSY_API_KEY}`
- `Authorization: Bearer {access_token}`

### Getting shop_id
After OAuth, the access token has a user ID prefix (e.g., `12345678.token...`). Extract the numeric prefix and call `GET https://api.etsy.com/v3/application/users/{user_id}/shops` to retrieve the `shop_id` and `shop_name`.

### Alternatives Considered
- **JSON content type**: The Etsy API examples use `application/x-www-form-urlencoded`. While JSON might work for some endpoints, the official docs and tutorials consistently show URL-encoded form data. Following the documented approach reduces risk.
- **Batch endpoint**: Etsy does not provide a batch listing creation endpoint. Sequential calls with per-listing error handling is the only option.

---

## R3: Token Storage Strategy

### Decision
Store tokens in a server-side JSON file at `data/tokens.json`, git-ignored. The `data/` directory is created at runtime if it doesn't exist.

### Rationale
Constitution Principle V mandates the simplest viable mechanism. For a local single-user app:
- No database needed (no concurrent access, no multi-user)
- File-based storage persists across server restarts
- The file is never served to the client (Next.js doesn't serve files from `data/`)
- Reading/writing is synchronous-safe for a single-user scenario

### Token File Schema
```json
{
  "access_token": "12345678.xxx...",
  "refresh_token": "12345678.yyy...",
  "expires_at": 1711000000,
  "shop_id": 12345678,
  "shop_name": "MyEtsyShop",
  "user_id": 12345678,
  "pending_oauth": {
    "state": "random-state-string",
    "code_verifier": "random-verifier-string"
  }
}
```

The `pending_oauth` field is set when the OAuth flow starts and cleared after token exchange. The `expires_at` field is computed as `Date.now()/1000 + expires_in` from the Etsy token response.

### Alternatives Considered
- **HTTP-only cookies**: More standard for web apps, but adds cookie management complexity and doesn't persist across server restarts unless backed by a store. Overkill for local use.
- **SQLite / LevelDB**: Adds a dependency for storing a single JSON document. Rejected per Constitution Principle V.
- **In-memory only**: Does not persist across server restarts; user would need to re-authenticate every time they restart `npm run dev`. Rejected for poor UX.

---

## R4: JSON Input Validation Strategy

### Decision
Two-layer validation: client-side for immediate feedback, server-side as the authoritative gate before any API call.

### Rationale
Constitution Principle III requires validation on both sides.

**Client-side** (in the `JsonEditor` component):
- `JSON.parse()` to catch syntax errors
- Display line/column of parse error when available
- Check if parsed result is an object or array of objects

**Server-side** (in `lib/listings/validate.ts`):
- Re-parse JSON (never trust client input)
- Normalize: if single object, wrap in array for uniform processing
- For each listing object, validate required fields are present and non-empty
- Validate enum fields (`who_made`, `when_made`) against known values
- Validate numeric fields (`quantity`, `price`, `taxonomy_id`) are positive numbers
- Return structured validation errors per listing

### Alternatives Considered
- **JSON Schema validation (ajv)**: Powerful but adds a dependency for validating ~7 required fields. A simple manual check is sufficient and aligns with Principle V. Could be added later if the schema grows.
- **Zod**: Type-safe but again an extra dependency. The validation logic is straightforward enough for manual implementation.

---

## R5: Obtaining shop_id for API Calls

### Decision
After the OAuth token exchange, immediately call `GET /v3/application/users/{user_id}/shops` to retrieve the user's shop ID and name. Store both alongside the tokens.

### Rationale
The `createDraftListing` endpoint requires `shop_id` in the URL path. The user ID is available as the numeric prefix of the access token. By fetching and storing the shop info during the initial authentication, we avoid repeated shop lookups.

### Alternatives Considered
- **Ask the user to input their shop ID**: Adds friction and the user may not know their numeric shop ID. Automated retrieval is better UX.
- **Fetch shop ID on every listing upload**: Unnecessary network call when we can cache it with the tokens.
