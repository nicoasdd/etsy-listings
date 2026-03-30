# API Contract: Listing Generation

**Feature**: 003-chatgpt-image-listing
**Date**: 2026-03-20

## POST /api/chatgpt/generate

Generate Etsy listing fields from a product image and optional description using ChatGPT.

### Request

**Content-Type**: `multipart/form-data`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `image` | File | yes | Product photo. Accepted formats: JPEG, PNG, WebP. Max 20 MB. |
| `description` | string | no | Brief product description to give ChatGPT additional context. |

### Response (200 — Success)

**Content-Type**: `application/json`

```json
{
  "success": true,
  "fields": {
    "title": "Handmade Blue Glazed Ceramic Mug, 12oz Artisan Stoneware Coffee Cup, Unique Pottery Gift",
    "description": "Elevate your morning routine with this handcrafted ceramic mug...",
    "tags": [
      "ceramic mug",
      "handmade pottery",
      "blue glaze cup",
      "artisan stoneware",
      "coffee lover gift",
      "unique mug",
      "pottery mug",
      "handcrafted cup",
      "stoneware mug",
      "kitchen decor",
      "housewarming gift",
      "tea cup handmade",
      "boho mug"
    ],
    "materials": ["stoneware clay", "food-safe glaze"],
    "styles": ["Bohemian", "Minimalist"],
    "suggested_category": "Home & Living > Kitchen & Dining > Drinkware > Mugs"
  },
  "model": "gpt-5.4"
}
```

### Response (400 — Validation Error)

```json
{
  "error": "No image provided. Please upload a product photo."
}
```

Possible 400 errors:
- Missing image file
- Unsupported image format (not JPEG/PNG/WebP)
- Image exceeds 20 MB size limit

### Response (401 — Authentication Error)

```json
{
  "error": "Not connected to ChatGPT. Please connect first.",
  "needs_reauth": true
}
```

Also returned when:
- Access token expired and refresh failed
- Token was revoked

### Response (502 — ChatGPT Error)

```json
{
  "error": "ChatGPT request failed. This may be a temporary outage — please try again.",
  "details": "ChatGPT request failed (429): rate limit exceeded"
}
```

Returned when:
- ChatGPT rate limit (429)
- ChatGPT server error (500+)
- Malformed response from ChatGPT (could not parse JSON from response)

### Response (504 — Timeout)

```json
{
  "error": "ChatGPT did not respond within the timeout period. Please try again."
}
```

Returned when the 60-second timeout is exceeded.

---

## Integration with Existing Routes

### Creating a listing from generated fields

After the user reviews/edits the generated fields and provides the remaining required fields (price, quantity, who_made, when_made, taxonomy_id), the client submits the combined payload to the **existing** `POST /api/listings/upload` route (from feature 001). No new route is needed for Etsy submission.

The client constructs a `ListingPayload` JSON object from the form data and sends it as the request body to `/api/listings/upload` in the same format as the JSON editor.
