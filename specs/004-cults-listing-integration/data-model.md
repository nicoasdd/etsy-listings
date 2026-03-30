# Data Model: Cults3D Listing Integration

**Feature**: 004-cults-listing-integration
**Date**: 2026-03-23

## Entities

### Cults3DCredentialStore

Persisted in `data/cults3d-credentials.json`. Server-side only — never exposed to browser.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `username` | `string` | No | Cults3D API username |
| `apiKey` | `string` | No | Cults3D API key (generated at cults3d.com/en/api/keys) |
| `nick` | `string` | No | Verified Cults3D display name (from `myself` query) |
| `verified` | `boolean` | No | Whether credentials have been verified against the API |

**Validation rules**:
- `username` and `apiKey` must be non-empty strings when present
- `nick` is set after successful verification and cleared on disconnect

---

### Cults3DConnectionStatus

Returned by `GET /api/cults3d/status`. Client-facing — contains no secrets.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `connected` | `boolean` | Yes | Whether valid credentials are stored and verified |
| `nick` | `string` | No | Cults3D account display name (only when connected) |

---

### GeneratedCults3DFields

Parsed from the `cults3d` section of ChatGPT's dual-marketplace response.

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `name` | `string` | Yes | Non-empty |
| `description` | `string` | Yes | Non-empty |
| `tags` | `string[]` | Yes | 5-15 items |
| `suggested_category` | `string` | Yes | One of: Art, Fashion, Jewelry, Home, Architecture, Gadget, Game, Tool, Various |

---

### GenerateDualListingResponse

Updated response from `POST /api/chatgpt/generate`. Replaces the current `GenerateListingResponse`.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `success` | `boolean` | Yes | Whether generation succeeded |
| `fields` | `DualListingFields` | If success | Container for both marketplaces' fields |
| `model` | `string` | If success | The ChatGPT model used |
| `error` | `string` | If error | Human-readable error message |
| `needs_reauth` | `boolean` | No | True if the ChatGPT token is expired/invalid |

### DualListingFields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `etsy` | `GeneratedListingFields` | Yes | Etsy-optimized fields (existing type, unchanged) |
| `cults3d` | `GeneratedCults3DFields` | Yes | Cults3D-optimized fields |

---

### Cults3DCategory

Fetched from the Cults3D API. Not persisted — fetched on demand and cached client-side.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | Yes | Base64-encoded category ID (e.g., `"Q2F0ZWdvcnkvMjM="`) |
| `name` | `string` | Yes | Display name (e.g., `"Art"`, `"Home"`) |
| `children` | `Cults3DCategory[]` | Yes | Subcategories (may be empty) |

---

### Cults3DLicense

Fetched from the Cults3D API. Not persisted — fetched on demand and cached client-side.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `code` | `string` | Yes | License code (e.g., `"cults_cu"`, `"cc_by_sa"`) |
| `name` | `string` | Yes | Display name (e.g., `"Cults - Commercial Use"`) |
| `url` | `string` | Yes | URL to license description |
| `availableOnFreeDesigns` | `boolean` | Yes | Whether this license can be used for free designs |
| `availableOnPricedDesigns` | `boolean` | Yes | Whether this license can be used for priced designs |

---

### UploadedFile

Client-side state tracking for files uploaded to cloud storage. Not persisted server-side.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | Yes | Client-generated unique ID (for UI key) |
| `originalName` | `string` | Yes | Original filename from the user's machine |
| `fileType` | `"image" \| "model"` | Yes | Whether this is a preview image or 3D model file |
| `size` | `number` | Yes | File size in bytes |
| `status` | `"uploading" \| "complete" \| "error"` | Yes | Current upload state |
| `progress` | `number` | No | Upload progress 0-100 (while uploading) |
| `url` | `string` | No | Public URL from cloud storage (when complete) |
| `error` | `string` | No | Error message (when error) |
| `previewUrl` | `string` | No | Local blob URL for image thumbnail (images only) |

---

### UploadFileResponse

Returned by `POST /api/upload/file`.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `success` | `boolean` | Yes | Whether the upload succeeded |
| `url` | `string` | If success | Publicly accessible URL of the uploaded file |
| `key` | `string` | If success | Storage key (path within bucket) |
| `error` | `string` | If error | Human-readable error message |

---

### Cults3DCreateInput

Assembled from AI-generated fields + user-provided data + uploaded file URLs. Used to build the `createCreation` GraphQL mutation.

| Field | Source | Type | Required |
|-------|--------|------|----------|
| `name` | AI-generated (editable) | `string` | Yes |
| `description` | AI-generated (editable) | `string` | Yes |
| `tags` | AI-generated (editable) | `string[]` | No |
| `imageUrls` | From uploaded files | `string[]` | Yes (≥1) |
| `fileUrls` | From uploaded files | `string[]` | Yes (≥1) |
| `categoryId` | User-selected | `string` | Yes |
| `subCategoryIds` | User-selected | `string[]` | No |
| `downloadPrice` | User-provided | `number` | Yes |
| `currency` | User-selected | `string` | Yes |
| `locale` | User-selected | `string` | Yes |
| `licenseCode` | User-selected | `string` | No |

---

### Cults3DCreateResult

Returned by `POST /api/cults3d/create`.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `success` | `boolean` | Yes | Whether the listing was created |
| `url` | `string` | If success | URL of the created design on Cults3D |
| `error` | `string` | If error | Human-readable error message |
| `apiErrors` | `string[]` | If error | Raw error strings from the Cults3D API `errors` field |

---

## Relationships

```text
User enters credentials ──saved as──> Cults3DCredentialStore
Cults3DCredentialStore ──produces──> Cults3DConnectionStatus

User uploads image + description ──sent to──> POST /api/chatgpt/generate
ChatGPT response ──parsed into──> DualListingFields
  DualListingFields.etsy ──type──> GeneratedListingFields (existing, unchanged)
  DualListingFields.cults3d ──type──> GeneratedCults3DFields

User uploads files ──sent to──> POST /api/upload/file
POST /api/upload/file ──returns──> UploadFileResponse (with public URL)
UploadFileResponse.url ──stored in──> UploadedFile (client state)

GeneratedCults3DFields + UserInput + UploadedFile[] ──assembled into──> Cults3DCreateInput
Cults3DCreateInput ──submitted to──> POST /api/cults3d/create
POST /api/cults3d/create ──returns──> Cults3DCreateResult
```

## State Transitions

### Cults3D Connection Lifecycle

```text
[Disconnected] ──(user enters credentials + clicks Connect)──> [Verifying]
[Verifying] ──(API returns user nick)──> [Connected]
[Verifying] ──(API returns 401/error)──> [Error] ──(user retries)──> [Verifying]
[Connected] ──(user clicks Disconnect)──> [Disconnected]
[Connected] ──(API call returns 401)──> [Disconnected] (credentials invalidated)
```

### File Upload Lifecycle

```text
[No File] ──(user selects file)──> [Validating]
[Validating] ──(size/format OK)──> [Uploading]
[Validating] ──(size/format invalid)──> [Error]
[Uploading] ──(upload completes)──> [Complete] (url available)
[Uploading] ──(upload fails)──> [Error] ──(user retries)──> [Uploading]
[Complete] ──(user removes)──> [No File]
```

### Cults3D Listing Creation Lifecycle

```text
[Idle] ──(image generation returns dual fields)──> [Fields Generated]
[Fields Generated] ──(user edits fields)──> [Fields Edited]
[Fields Generated | Fields Edited] ──(user fills required fields + uploads files)──> [Ready to Submit]
[Ready to Submit] ──(user clicks Create)──> [Submitting]
[Submitting] ──(Cults3D returns success)──> [Listing Created]
[Submitting] ──(Cults3D returns error)──> [Submission Error]
[Submission Error] ──(user fixes + retries)──> [Submitting]
[Fields Generated | Fields Edited] ──(user clicks Regenerate)──> [Fields Generated]
```
