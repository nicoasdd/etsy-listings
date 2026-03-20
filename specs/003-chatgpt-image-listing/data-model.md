# Data Model: ChatGPT Image-Based Listing Generator

**Feature**: 003-chatgpt-image-listing
**Date**: 2026-03-20

## Entities

### GenerateListingRequest

Sent from the client to the server API route. The image is uploaded as a file; the server reads it, base64-encodes it, and sends it to ChatGPT.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `image` | File (binary) | yes | Product photo (JPEG, PNG, or WebP). Max 20 MB. |
| `description` | string | no | Optional brief product description from the user. |

### GeneratedListingFields

Parsed from ChatGPT's structured JSON response. These are the AI-generated fields displayed in the editing form.

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `title` | string | yes | Non-empty, max 140 chars |
| `description` | string | yes | Non-empty |
| `tags` | string[] | yes | 10-13 items, each max 20 chars |
| `materials` | string[] | yes | Non-empty array |
| `styles` | string[] | no | 0-2 items |
| `suggested_category` | string | yes | Plain-text category name |

### GenerateListingResponse

Returned from the server API route to the client.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `success` | boolean | yes | Whether generation succeeded |
| `fields` | GeneratedListingFields | if success | The AI-generated listing fields |
| `model` | string | if success | The ChatGPT model used for generation |
| `error` | string | if error | Human-readable error message |
| `needs_reauth` | boolean | no | True if the ChatGPT token is expired/invalid |

### UserProvidedFields

Fields the user must supply manually (not AI-generated). Collected in the editing form before Etsy submission.

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `price` | number | yes | Positive non-zero |
| `quantity` | integer | yes | Positive non-zero |
| `who_made` | enum string | yes | One of: `i_did`, `someone_else`, `collective` |
| `when_made` | enum string | yes | One of: `made_to_order`, `2020_2023`, etc. (full WhenMade enum) |
| `taxonomy_id` | integer | yes | Positive non-zero |
| `shipping_profile_id` | integer | no | Required for physical listings to be published |

### CombinedListingPayload

Merge of GeneratedListingFields + UserProvidedFields, formatted as a `ListingPayload` (from feature 001 data model) for Etsy submission.

| Field | Source | Notes |
|-------|--------|-------|
| `title` | AI-generated (editable) | |
| `description` | AI-generated (editable) | |
| `tags` | AI-generated (editable) | |
| `materials` | AI-generated (editable) | |
| `styles` | AI-generated (editable) | |
| `price` | User-provided | |
| `quantity` | User-provided | |
| `who_made` | User-provided | |
| `when_made` | User-provided | |
| `taxonomy_id` | User-provided (guided by AI's suggested_category) | |
| `shipping_profile_id` | User-provided (optional) | |

This entity is structurally identical to `ListingPayload` from feature 001. No new type is needed — the form builds a `ListingPayload` object.

## Relationships

```text
User uploads image + description ──sent as──> GenerateListingRequest

GenerateListingRequest ──processed by server──> ChatGPT API call
ChatGPT response ──parsed into──> GeneratedListingFields
GeneratedListingFields ──returned as──> GenerateListingResponse

GeneratedListingFields + UserProvidedFields ──merged into──> ListingPayload (feature 001)

ListingPayload ──submitted to──> POST /api/listings/upload (existing feature 001 route)
```

## State Transitions

### Generation Lifecycle

```text
[Idle] ──(user uploads image)──> [Image Loaded]
[Image Loaded] ──(user clicks Generate)──> [Generating]
[Generating] ──(ChatGPT responds successfully)──> [Fields Generated]
[Generating] ──(ChatGPT error/timeout)──> [Generation Error]
[Generation Error] ──(user clicks Retry)──> [Generating]
[Fields Generated] ──(user edits fields)──> [Fields Edited]
[Fields Generated] ──(user clicks Regenerate)──> [Generating]
[Fields Edited] ──(user clicks Regenerate)──> [Generating]
[Fields Generated | Fields Edited] ──(user fills required fields + submits)──> [Submitting to Etsy]
[Submitting to Etsy] ──(Etsy success)──> [Listing Created]
[Submitting to Etsy] ──(Etsy error)──> [Submission Error]
[Fields Generated | Fields Edited] ──(user clicks Copy as JSON)──> [JSON Copied] (stays in current state)
```
