# API Contracts: Listings

**Feature**: 001-etsy-listing-integration
**Base URL**: `http://localhost:3000`

---

## POST /api/listings/upload

Validates and uploads one or more listings to Etsy as draft listings. Accepts either a single listing JSON object or a JSON array of listing objects.

**Request Headers**:
| Header | Value |
|--------|-------|
| `Content-Type` | `application/json` |

**Request Body**: Raw JSON string — either a single listing object or an array of listing objects.

Single listing example:
```json
{
  "quantity": 5,
  "title": "Handmade Ceramic Mug - Blue Glaze",
  "description": "Beautiful handmade ceramic mug with blue glaze finish.",
  "price": 25.00,
  "who_made": "i_did",
  "when_made": "2020_2023",
  "taxonomy_id": 1,
  "tags": ["ceramic", "mug", "handmade"],
  "materials": ["ceramic", "glaze"]
}
```

Batch example:
```json
[
  {
    "quantity": 5,
    "title": "Handmade Ceramic Mug - Blue Glaze",
    "description": "Beautiful handmade ceramic mug.",
    "price": 25.00,
    "who_made": "i_did",
    "when_made": "2020_2023",
    "taxonomy_id": 1
  },
  {
    "quantity": 3,
    "title": "Handmade Ceramic Bowl - Green Glaze",
    "description": "Beautiful handmade ceramic bowl.",
    "price": 35.00,
    "who_made": "i_did",
    "when_made": "2020_2023",
    "taxonomy_id": 1
  }
]
```

**Success Response** (`200`):
```json
{
  "results": [
    {
      "index": 0,
      "title": "Handmade Ceramic Mug - Blue Glaze",
      "status": "success",
      "listing_id": 1234567890,
      "listing_url": "https://www.etsy.com/listing/1234567890"
    },
    {
      "index": 1,
      "title": "Handmade Ceramic Bowl - Green Glaze",
      "status": "error",
      "error": "Invalid taxonomy_id",
      "etsy_errors": [{"error": "Invalid taxonomy_id value: 9999"}]
    }
  ],
  "summary": {
    "total": 2,
    "succeeded": 1,
    "failed": 1
  }
}
```

**Validation Error Response** (`400`):

When JSON syntax is invalid:
```json
{
  "error": "Invalid JSON syntax",
  "details": "Unexpected token } at position 42"
}
```

When required fields are missing (per-listing validation errors):
```json
{
  "error": "Validation failed",
  "validation_errors": [
    {
      "index": 0,
      "title": "Handmade Ceramic Mug",
      "errors": [
        "Missing required field: price",
        "Invalid who_made value: 'me'. Must be one of: i_did, someone_else, collective"
      ]
    },
    {
      "index": 1,
      "title": "(no title)",
      "errors": [
        "Missing required field: title",
        "Missing required field: description"
      ]
    }
  ]
}
```

**Auth Error Response** (`401`):
```json
{
  "error": "Not connected to Etsy. Please authenticate first."
}
```

**Refresh token expired** (`401`):
```json
{
  "error": "Etsy session expired. Please reconnect.",
  "needs_reauth": true
}
```

---

## Processing Behavior

1. **Parse**: The raw JSON string is parsed. If it fails, return `400` immediately.
2. **Normalize**: If the parsed result is a single object, wrap it in an array.
3. **Validate**: Each listing object is validated for required fields and value constraints. If any listing fails validation, return `400` with all validation errors (no API calls made).
4. **Ensure auth**: Check that tokens exist and the access token is valid. If expired, attempt a silent refresh. If refresh fails, return `401`.
5. **Upload sequentially**: For each validated listing, call `POST https://api.etsy.com/v3/application/shops/{shop_id}/listings` with the listing data as `application/x-www-form-urlencoded`. Collect results.
6. **Return results**: Return all per-listing results with a summary.

Array fields (`tags`, `materials`, `styles`, `image_ids`, `production_partner_ids`) are converted from JSON arrays to the format expected by Etsy's URL-encoded API (repeated keys or comma-separated, depending on the field).
