# Data Model: Etsy Craft Listing Uploader

**Feature**: 001-etsy-listing-integration
**Date**: 2026-03-20

## Entities

### TokenStore

Persisted in `data/tokens.json`. Represents the full authentication state.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `access_token` | string | yes (when connected) | Etsy OAuth access token with user ID prefix |
| `refresh_token` | string | yes (when connected) | Etsy OAuth refresh token with user ID prefix |
| `expires_at` | number | yes (when connected) | Unix timestamp (seconds) when access token expires |
| `user_id` | number | yes (when connected) | Numeric Etsy user ID extracted from token prefix |
| `shop_id` | number | yes (when connected) | Numeric Etsy shop ID |
| `shop_name` | string | yes (when connected) | Display name of the Etsy shop |
| `pending_oauth` | PendingOAuth \| null | no | Temporary state during OAuth flow |

### PendingOAuth

Temporary data stored during the OAuth authorization flow, cleared after token exchange.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `state` | string | yes | Random CSRF protection string |
| `code_verifier` | string | yes | PKCE code verifier for token exchange |

### ListingPayload

The user-provided JSON for a single listing. Validated before sending to Etsy.

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `quantity` | integer | yes | Positive non-zero |
| `title` | string | yes | Non-empty, max 140 chars |
| `description` | string | yes | Non-empty |
| `price` | number | yes | Positive non-zero |
| `who_made` | enum string | yes | One of: `i_did`, `someone_else`, `collective` |
| `when_made` | enum string | yes | One of: `made_to_order`, `2020_2023`, `2010_2019`, `2004_2009`, `before_2004`, `2000_2003`, `1990s`, `1980s`, `1970s`, `1960s`, `1950s`, `1940s`, `1930s`, `1920s`, `1910s`, `1900s`, `1800s`, `1700s`, `before_1700` |
| `taxonomy_id` | integer | yes | Positive non-zero |
| `shipping_profile_id` | integer | no | Required for physical listings to be published |
| `return_policy_id` | integer | no | Numeric |
| `materials` | string[] | no | Each string: letters, numbers, whitespace only |
| `shop_section_id` | integer | no | Numeric |
| `processing_min` | integer | no | Positive |
| `processing_max` | integer | no | Positive, >= processing_min |
| `tags` | string[] | no | Max 13 tags, each: letters, numbers, whitespace, -, ', ™, ©, ® |
| `styles` | string[] | no | Max 2 styles |
| `item_weight` | number | no | Positive if set |
| `item_length` | number | no | Positive if set |
| `item_width` | number | no | Positive if set |
| `item_height` | number | no | Positive if set |
| `item_weight_unit` | enum string | no | One of: `oz`, `g`, `kg`, `lb` |
| `item_dimensions_unit` | enum string | no | One of: `in`, `ft`, `mm`, `cm`, `m`, `yd` |
| `is_personalizable` | boolean | no | |
| `personalization_is_required` | boolean | no | Only applies if `is_personalizable` is true |
| `personalization_char_count_max` | integer | no | Only applies if `is_personalizable` is true |
| `personalization_instructions` | string | no | Only applies if `is_personalizable` is true |
| `production_partner_ids` | integer[] | no | |
| `image_ids` | integer[] | no | Max 10 |
| `is_supply` | boolean | no | |
| `is_customizable` | boolean | no | |
| `should_auto_renew` | boolean | no | |
| `is_taxable` | boolean | no | |
| `type` | enum string | no | One of: `physical`, `download`. Default: `physical` |

### UploadResult

Returned to the UI after each listing upload attempt.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `index` | number | yes | Position in the batch (0-based) |
| `title` | string | yes | Listing title from the payload |
| `status` | enum string | yes | `success` or `error` |
| `listing_id` | number | if success | Etsy listing ID of the created draft |
| `listing_url` | string | if success | URL to the draft listing on Etsy |
| `error` | string | if error | Human-readable error message |
| `etsy_errors` | object[] | if error | Raw error details from Etsy API |

### ConnectionStatus

Returned by the status endpoint to the UI.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `connected` | boolean | yes | Whether the user has a valid (or refreshable) connection |
| `shop_name` | string | if connected | Display name of the connected shop |
| `shop_id` | number | if connected | Numeric shop ID |
| `expires_at` | number | if connected | Token expiration timestamp |
| `needs_reauth` | boolean | yes | True if refresh token is also expired/invalid |

## Relationships

```text
TokenStore ──contains──> PendingOAuth (during OAuth flow only)

User pastes JSON ──parsed as──> ListingPayload[] (1 or more)

ListingPayload ──uploaded via API──> UploadResult (1:1 per listing)

TokenStore.shop_id ──used in──> createDraftListing URL path
TokenStore.access_token ──used in──> createDraftListing Authorization header
```

## State Transitions

### TokenStore Lifecycle

```text
[Empty/No File] ──(user clicks Connect)──> [PendingOAuth set]
[PendingOAuth set] ──(callback received, code exchanged)──> [Tokens + Shop stored, PendingOAuth cleared]
[Tokens stored] ──(access token expires)──> [Token refresh triggered]
[Token refresh] ──(success)──> [New tokens stored]
[Token refresh] ──(failure / refresh token expired)──> [needs_reauth = true]
[Any state] ──(user clicks Disconnect)──> [Empty/No File]
```
