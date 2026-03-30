# API Contract: Cults3D Integration

**Feature**: 004-cults-listing-integration
**Date**: 2026-03-23

## POST /api/cults3d/connect

Save and verify Cults3D API credentials.

### Request

**Content-Type**: `application/json`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `username` | string | Yes | Cults3D username |
| `apiKey` | string | Yes | Cults3D API key (from cults3d.com/en/api/keys) |

### Response (200 — Success)

```json
{
  "connected": true,
  "nick": "MyDesignStudio"
}
```

### Response (401 — Invalid Credentials)

```json
{
  "error": "Invalid Cults3D credentials. Please check your username and API key.",
  "connected": false
}
```

### Response (502 — API Unreachable)

```json
{
  "error": "Could not reach the Cults3D API. Please try again later.",
  "connected": false
}
```

---

## GET /api/cults3d/status

Get current Cults3D connection status.

### Response (200)

**Connected:**

```json
{
  "connected": true,
  "nick": "MyDesignStudio"
}
```

**Disconnected:**

```json
{
  "connected": false
}
```

---

## POST /api/cults3d/disconnect

Clear stored Cults3D credentials.

### Response (200)

```json
{
  "disconnected": true
}
```

---

## GET /api/cults3d/categories

Fetch available categories and subcategories from the Cults3D API. Requires active Cults3D connection.

### Response (200 — Success)

```json
{
  "categories": [
    {
      "id": "Q2F0ZWdvcnkvMjM=",
      "name": "Art",
      "children": [
        { "id": "Q2F0ZWdvcnkvMzc", "name": "Fan Art" },
        { "id": "Q2F0ZWdvcnkvMzg", "name": "Sculptures" }
      ]
    },
    {
      "id": "Q2F0ZWdvcnkvMjQ=",
      "name": "Fashion",
      "children": []
    }
  ]
}
```

### Response (401 — Not Connected)

```json
{
  "error": "Not connected to Cults3D. Please connect first."
}
```

### Response (502 — API Error)

```json
{
  "error": "Failed to fetch categories from Cults3D."
}
```

---

## GET /api/cults3d/licenses

Fetch available licenses from the Cults3D API. Requires active Cults3D connection.

### Response (200 — Success)

```json
{
  "licenses": [
    {
      "code": "cults_cu",
      "name": "Cults - Commercial Use",
      "url": "https://cults3d.com/en/pages/cults-license-commercial-use",
      "availableOnFreeDesigns": false,
      "availableOnPricedDesigns": true
    },
    {
      "code": "cc_by_sa",
      "name": "Creative Commons - Attribution - Share Alike",
      "url": "https://creativecommons.org/licenses/by-sa/4.0/",
      "availableOnFreeDesigns": true,
      "availableOnPricedDesigns": false
    }
  ]
}
```

### Response (401 — Not Connected)

```json
{
  "error": "Not connected to Cults3D. Please connect first."
}
```

---

## POST /api/cults3d/create

Create a new design on Cults3D. Requires active Cults3D connection.

### Request

**Content-Type**: `application/json`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Design title |
| `description` | string | Yes | Full design description |
| `imageUrls` | string[] | Yes | Publicly accessible preview image URLs (≥1) |
| `fileUrls` | string[] | Yes | Publicly accessible 3D model file URLs (≥1) |
| `categoryId` | string | Yes | Base64-encoded Cults3D category ID |
| `subCategoryIds` | string[] | No | Base64-encoded subcategory IDs |
| `downloadPrice` | number | Yes | Price (0 = free) |
| `currency` | string | Yes | Currency code (e.g., `"EUR"`, `"USD"`) |
| `locale` | string | Yes | Locale code (e.g., `"EN"`, `"FR"`) |
| `licenseCode` | string | No | License code (e.g., `"cults_cu"`) |
| `tags` | string[] | No | Design tags |

### Response (200 — Success)

```json
{
  "success": true,
  "url": "https://cults3d.com/en/3d-model/art/my-design-name"
}
```

### Response (400 — Validation Error)

```json
{
  "success": false,
  "error": "Missing required fields: name, imageUrls"
}
```

Server-side validation before calling Cults3D API:
- `name` must be non-empty
- `description` must be non-empty
- `imageUrls` must have at least 1 valid URL
- `fileUrls` must have at least 1 valid URL
- `downloadPrice` must be ≥ 0
- `currency` must be non-empty
- `categoryId` must be non-empty

### Response (401 — Not Connected)

```json
{
  "success": false,
  "error": "Not connected to Cults3D. Please connect first."
}
```

### Response (502 — Cults3D API Error)

```json
{
  "success": false,
  "error": "Cults3D returned errors while creating the design.",
  "apiErrors": ["Image URL is not accessible", "Invalid category ID"]
}
```

Returned when the `createCreation` mutation returns a non-empty `errors` array.

---

## Modified: POST /api/chatgpt/generate

The existing generate route is updated to return dual-marketplace fields.

### Response (200 — Success) — UPDATED

```json
{
  "success": true,
  "fields": {
    "etsy": {
      "title": "Handmade Blue Glazed Ceramic Mug, 12oz Artisan Stoneware Coffee Cup",
      "description": "Elevate your morning routine...",
      "tags": ["ceramic mug", "handmade pottery", "..."],
      "materials": ["stoneware clay", "food-safe glaze"],
      "styles": ["Bohemian", "Minimalist"],
      "suggested_category": "Home & Living > Kitchen & Dining > Drinkware > Mugs"
    },
    "cults3d": {
      "name": "Ceramic Mug 3D Model - Artisan Stoneware Cup STL",
      "description": "High-detail 3D model of an artisan ceramic mug. Print settings: 0.2mm layer height, 20% infill, supports needed for handle...",
      "tags": ["ceramic mug", "cup model", "kitchen decor", "stl file", "3d printable"],
      "suggested_category": "Home"
    }
  },
  "model": "gpt-5.4"
}
```

The `fields` property changes from a flat `GeneratedListingFields` object to a `DualListingFields` object containing `etsy` and `cults3d` sub-objects.

Error responses (400, 401, 502, 504) remain unchanged.
