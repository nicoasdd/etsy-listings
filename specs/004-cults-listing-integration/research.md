# Research: Cults3D Listing Integration

**Feature**: 004-cults-listing-integration | **Date**: 2026-03-23

## R1: Cults3D GraphQL API Analysis

**Decision**: Interact with the Cults3D GraphQL API at `https://cults3d.com/graphql` using HTTP Basic Auth and native `fetch`. All calls are `POST` requests with a `query` body parameter containing the GraphQL query/mutation string.

Key operations identified from the [API docs](https://cults3d.com/en/pages/graphql) and [query examples](https://gist.github.com/sunny/07db54478ac030bd277c19cfe734648b):

### Verification Query (for testing credentials)

```graphql
{
  myself {
    user {
      nick
      shortUrl
    }
  }
}
```

### Create a Design (mutation)

```graphql
mutation {
  createCreation(
    name: "Design Title"
    description: "Full description"
    imageUrls: ["https://publicly-accessible-url/image.jpg"]
    fileUrls: ["https://publicly-accessible-url/model.stl"]
    locale: EN
    categoryId: "Q2F0ZWdvcnkvMjM="
    subCategoryIds: ["Q2F0ZWdvcnkvMzc"]
    downloadPrice: 4.99
    currency: EUR
    licenseCode: "cults_cu"
  ) {
    creation {
      url(locale: EN)
    }
    errors
  }
}
```

Required fields: `name`, `description`, `imageUrls` (array), `fileUrls` (array), `locale`, `categoryId`, `downloadPrice`, `currency`.
Optional fields: `subCategoryIds`, `licenseCode`.

### Fetch Categories

```graphql
{
  categories {
    id
    name(locale: EN)
    children {
      id
      name(locale: EN)
    }
  }
}
```

Categories are: Art, Fashion, Jewelry, Home, Architecture, Gadget, Game, Tool, Naughties, Various. Each has subcategories. IDs are base64-encoded strings (e.g., `"Q2F0ZWdvcnkvMjM="`).

### Fetch Licenses

```graphql
{
  licenses {
    code
    name(locale: EN)
    url(locale: EN)
    availableOnFreeDesigns
    availableOnPricedDesigns
  }
}
```

License codes include: `cults_cu` (Commercial Use), `cults_cu_nd` (Commercial Use No Derivatives), and various Creative Commons / open-source licenses. Free designs have a different set of available licenses than priced designs.

**Rationale**: The GraphQL API is well-documented with clear query examples. HTTP Basic Auth is simpler than OAuth — just encode `username:password` as Base64 in the `Authorization` header. All GraphQL operations use the same `POST` endpoint, making the client implementation straightforward. Native `fetch` is sufficient — no GraphQL client library needed.

**Alternatives considered**:
- **GraphQL client library (e.g., `graphql-request`, `urql`)**: Adds unnecessary dependency for a simple API with known queries. All queries are static strings — no need for query building, caching, or schema validation. Rejected per Constitution Principle V.
- **Separate REST-like endpoints**: The Cults3D API only offers GraphQL. No REST alternative.

## R2: Cloud Storage for File Uploads

**Decision**: Use S3-compatible cloud storage via the `aws4fetch` npm package (~5KB, minimal AWS SigV4 signing for `fetch`). The server proxies file uploads from the client to cloud storage and returns publicly accessible URLs.

Configuration via environment variables:
- `STORAGE_ENDPOINT` — S3-compatible endpoint URL (e.g., `https://<account>.r2.cloudflarestorage.com`)
- `STORAGE_ACCESS_KEY_ID` — Access key for the storage provider
- `STORAGE_SECRET_ACCESS_KEY` — Secret key for the storage provider
- `STORAGE_BUCKET` — Bucket name
- `STORAGE_PUBLIC_URL` — Public URL prefix for serving files (e.g., `https://pub-xxx.r2.dev`)
- `STORAGE_REGION` — Region identifier (e.g., `auto` for R2, `us-east-1` for S3)

Upload flow:
1. Client sends file to `POST /api/upload/file` as `multipart/form-data`
2. Server reads the file into memory, generates a unique key (`{type}/{timestamp}-{uuid}.{ext}`)
3. Server signs and sends a `PUT` request to the S3-compatible endpoint using `aws4fetch`
4. Server returns the public URL: `{STORAGE_PUBLIC_URL}/{key}`

File size limit: 50 MB per file. For a local single-user tool, server-side proxying is acceptable — no need for presigned URL complexity.

**Recommended provider**: Cloudflare R2 — free egress, 10 GB free storage, S3-compatible API, simple setup.

**Rationale**: `aws4fetch` is the minimal justified dependency for S3-compatible storage. At ~5KB, it's essentially a signing utility, not a full SDK. It uses native `fetch` and Web Crypto (available in Node.js 18+), aligning with the existing tech stack. The S3-compatible approach works with R2, S3, MinIO, Backblaze B2, and any other S3-compatible provider, giving the user flexibility without code changes.

**Alternatives considered**:
- **`@aws-sdk/client-s3`**: Full AWS SDK (~14MB). Overkill for simple PUT/GET operations on a local tool. Rejected for bloat.
- **Supabase Storage REST API**: No dependency needed (just `fetch` + API key), but couples to Supabase specifically. Less flexible than S3-compatible approach. Rejected.
- **Presigned URLs (client uploads directly to S3)**: Better for large files in production, but adds complexity (CORS config on bucket, extra API route for URL generation, client-side upload logic). Overkill for a local single-user tool. Rejected for now — can be added later if needed.
- **No cloud storage (user provides URLs)**: Original spec approach. Rejected by user as too much friction.

## R3: Extending the AI System Prompt for Dual-Marketplace Generation

**Decision**: Modify the existing system prompt to generate both Etsy and Cults3D listing fields in a single ChatGPT request. The response JSON will have two top-level keys: `etsy` and `cults3d`.

New response schema:

```json
{
  "etsy": {
    "title": "string (max 140 chars)",
    "description": "string",
    "tags": ["string array, 10-13 items, each max 20 chars"],
    "materials": ["string array"],
    "styles": ["string array, 0-2 items"],
    "suggested_category": "string"
  },
  "cults3d": {
    "name": "string",
    "description": "string",
    "tags": ["string array, 5-15 items"],
    "suggested_category": "string (from: Art, Fashion, Jewelry, Home, Architecture, Gadget, Game, Tool, Various)"
  }
}
```

The Cults3D section of the system prompt will include best practices for 3D printing marketplace listings:
- **Name**: Clear, descriptive title with the design's purpose and key features. Include keywords like "3D Print", "STL", or the printing technique when relevant.
- **Description**: Focus on print specifications (recommended layer height, infill, supports needed), materials (PLA, PETG, resin), dimensions, and use cases. Include assembly instructions if multi-part.
- **Tags**: 3D printing-specific terms (filament type, printer compatibility, category-specific terms like "cosplay prop", "functional print", "home decor").
- **Category**: Must be one of the Cults3D top-level categories (Art, Fashion, Jewelry, Home, Architecture, Gadget, Game, Tool, Various).

**Rationale**: A single API call generating both marketplaces' fields is more efficient than two separate calls. It also maintains the UX promise of "single image upload → dual output." The increased prompt size adds ~200 tokens, negligible compared to the image tokens (~500-1500). GPT-4o+ handles multi-section JSON responses reliably when the schema is explicit.

**Alternatives considered**:
- **Two separate ChatGPT calls**: One for Etsy, one for Cults3D. Doubles API cost and response time. Rejected.
- **Single call with post-processing**: Generate generic fields, then adapt them per marketplace. Loses marketplace-specific optimization. Rejected.

## R4: Cults3D Credential Storage

**Decision**: Store Cults3D credentials in `data/cults3d-credentials.json`, following the same pattern as `data/tokens.json` (Etsy) and `data/chatgpt-tokens.json` (ChatGPT). The file contains the username, generated API key, and verified account info.

Since Cults3D uses HTTP Basic Auth with an API key (not OAuth), the storage is simpler:
- No token refresh mechanism needed
- No expiration tracking needed
- API key (generated at https://cults3d.com/en/api/keys) stored as-is (this is a local-only tool per Constitution V)
- Verification info (nick) stored to display connection status

**Rationale**: Following the established pattern of one credential file per service, stored in the git-ignored `data/` directory. The simplicity of HTTP Basic Auth with an API key means no OAuth flow complexity — just save, verify, and use.

## R5: File Naming and Organization in Cloud Storage

**Decision**: Use the following key structure in the storage bucket:

```
images/{timestamp}-{uuid}.{ext}    → for preview images (JPEG, PNG, WebP)
models/{timestamp}-{uuid}.{ext}    → for 3D model files (STL, OBJ, 3MF, STEP)
```

Example: `images/1711187200000-a1b2c3d4.jpg`, `models/1711187200000-e5f6g7h8.stl`

The timestamp prefix enables chronological sorting. The UUID suffix prevents collisions. The original filename is NOT used in the key (to avoid special characters and encoding issues) but is preserved in the client-side state for display.

**Rationale**: Flat structure within type-based prefixes is the simplest approach. No per-listing directories needed since files are just temporary hosting for the Cults3D API to fetch during creation.

## R6: Next.js Route Configuration for Large File Uploads

**Decision**: Configure the upload API route to accept file uploads up to 50 MB. In Next.js App Router, `request.formData()` handles multipart parsing internally. For the Node.js runtime, the default memory limits are sufficient for 50 MB files on a local machine.

Export a route segment config in the upload route:

```typescript
export const runtime = "nodejs";
```

The 50 MB limit is enforced application-side by checking `file.size` before uploading to storage. No Next.js-level body size configuration is needed for App Router route handlers.

**Rationale**: Local single-user tool with ample memory. Streaming the file through the server adds negligible latency for files under 50 MB on localhost. The approach is simpler than presigned URLs and requires no client-side S3 logic.
