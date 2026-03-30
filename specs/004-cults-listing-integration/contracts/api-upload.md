# API Contract: File Upload

**Feature**: 004-cults-listing-integration
**Date**: 2026-03-23

## POST /api/upload/file

Upload a file (image or 3D model) to cloud storage and return a publicly accessible URL.

### Request

**Content-Type**: `multipart/form-data`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | File | Yes | The file to upload. |
| `type` | string | Yes | Either `"image"` or `"model"`. Determines accepted formats and storage prefix. |

**Accepted formats by type:**

| Type | Accepted MIME types / extensions |
|------|----------------------------------|
| `image` | `image/jpeg`, `image/png`, `image/webp` |
| `model` | `.stl`, `.obj`, `.3mf`, `.step`, `.stp`, `.scad`, `.blend` (validated by extension, MIME types vary) |

**File size limit**: 50 MB per file.

### Response (200 — Success)

```json
{
  "success": true,
  "url": "https://pub-xxx.r2.dev/images/1711187200000-a1b2c3d4.jpg",
  "key": "images/1711187200000-a1b2c3d4.jpg"
}
```

### Response (400 — Validation Error)

Missing file:

```json
{
  "success": false,
  "error": "No file provided."
}
```

Invalid type parameter:

```json
{
  "success": false,
  "error": "Invalid type. Must be \"image\" or \"model\"."
}
```

Unsupported format:

```json
{
  "success": false,
  "error": "Unsupported file format: .dae. Accepted model formats: STL, OBJ, 3MF, STEP, STP, SCAD, BLEND."
}
```

File too large:

```json
{
  "success": false,
  "error": "File exceeds 50 MB size limit (yours: 67.2 MB)."
}
```

### Response (500 — Upload Error)

```json
{
  "success": false,
  "error": "Failed to upload file to storage. Please try again."
}
```

Returned when the S3-compatible storage returns an error (network failure, auth error, bucket not found, etc.).

### Response (503 — Storage Not Configured)

```json
{
  "success": false,
  "error": "Cloud storage is not configured. Please set the STORAGE_* environment variables."
}
```

Returned when required storage environment variables are missing.
