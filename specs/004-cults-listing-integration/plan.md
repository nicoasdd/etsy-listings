# Implementation Plan: Cults3D Listing Integration

**Branch**: `004-cults-listing-integration` | **Date**: 2026-03-23 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/004-cults-listing-integration/spec.md`

## Summary

Add Cults3D as a second marketplace to the existing Etsy Listings app. The user connects their Cults3D account via API credentials (HTTP Basic Auth), uploads product images and 3D model files through the app (hosted on S3-compatible cloud storage), and the existing ChatGPT image analysis generates optimized listing fields for both Etsy and Cults3D simultaneously. The user reviews/edits the Cults3D fields, selects a category and license (fetched live from the Cults3D API), and submits to create a design via the GraphQL `createCreation` mutation.

## Technical Context

**Language/Version**: TypeScript 5.x with Next.js 16 (App Router)
**Primary Dependencies**: Next.js, Tailwind CSS, native `fetch` API, `aws4fetch` (new — ~5KB SigV4 signing for S3-compatible storage)
**Storage**: File-based JSON for Cults3D credentials (`data/cults3d-credentials.json`); S3-compatible cloud storage for uploaded files (Cloudflare R2 recommended)
**Testing**: Manual integration testing with a real Cults3D account, ChatGPT subscription, and configured cloud storage
**Target Platform**: Local development machine (macOS/Linux/Windows), accessed via `http://localhost:3000`
**Project Type**: Web application (local single-user tool)
**Performance Goals**: File uploads complete within 30 seconds for files under 50 MB; Cults3D listing creation within 10 seconds
**Constraints**: All secrets server-side only; one new dependency (`aws4fetch`) justified by cloud storage need; 50 MB max file size; Cults3D API accessed via GraphQL
**Scale/Scope**: Single user, single listing at a time, files up to 50 MB

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Evidence |
|-----------|--------|----------|
| I. Secure Token Management | PASS | Cults3D credentials stored in `data/cults3d-credentials.json` on the server filesystem, never exposed to browser. Cloud storage keys in `.env.local`. HTTP Basic Auth header constructed server-side only. |
| II. Server-Side API Boundary | PASS | All Cults3D GraphQL calls route through `app/api/cults3d/` routes. File uploads proxy through `app/api/upload/file`. Client never contacts `cults3d.com` or cloud storage directly. |
| III. JSON-In, Listing-Out | PASS | Cults3D listing fields validated server-side before calling the `createCreation` mutation. Required fields checked (name, description, imageUrls, fileUrls, categoryId, price, currency). GraphQL errors from Cults3D relayed to client. |
| IV. Single-Concern Modules | PASS | New `lib/cults3d/` module for Cults3D API + credentials. New `lib/storage/` module for S3-compatible uploads. New `app/api/cults3d/` routes. New `app/api/upload/` route. Each module has a single responsibility. |
| V. Simplicity & Local-First | PASS | One new dependency (`aws4fetch`, ~5KB) justified by concrete cloud storage need that cannot be met with a small utility (SigV4 signing is complex). Cults3D auth is simpler than OAuth (just username/password). File-based credential storage. Runs with `npm run dev`. |

All gates pass. One dependency addition justified in Complexity Tracking.

### Post-Design Re-evaluation (after Phase 1)

| Principle | Status | Evidence |
|-----------|--------|----------|
| I. Secure Token Management | PASS | `data/cults3d-credentials.json` is server-only (gitignored `data/` directory). Cloud storage credentials in `.env.local`. The `connect` route constructs the Basic Auth header server-side. No credentials in any client-facing response. |
| II. Server-Side API Boundary | PASS | Contracts define 7 new API routes + 1 modified route. Cults3D GraphQL calls in `lib/cults3d/api.ts`, never from client. Upload route in `app/api/upload/file/route.ts` proxies to S3 server-side. Client sends files to internal API routes only. |
| III. JSON-In, Listing-Out | PASS | `POST /api/cults3d/create` validates all required Cults3D fields before building the GraphQL mutation. ChatGPT's dual-marketplace response parsed and validated server-side with field-level checks. Cults3D `errors` array from mutation response relayed to client. |
| IV. Single-Concern Modules | PASS | `lib/cults3d/api.ts` — GraphQL queries/mutations. `lib/cults3d/credentials.ts` — read/write credentials file. `lib/storage/s3.ts` — S3-compatible upload via `aws4fetch`. `lib/chatgpt/generate.ts` — extended system prompt (same file, same concern). Types in `lib/types/cults3d.ts`. No module crosses concerns. |
| V. Simplicity & Local-First | PASS | `aws4fetch` is the only new dependency (~5KB). No GraphQL client library. No complex OAuth flow. File-based credential storage. Cloud storage configured via env vars. Single `npm run dev` command. |

All gates pass post-design.

## Project Structure

### Documentation (this feature)

```text
specs/004-cults-listing-integration/
├── plan.md                        # This file
├── research.md                    # Phase 0 output — Cults3D API, cloud storage, dual-prompt
├── data-model.md                  # Phase 1 output — entities, types, state transitions
├── quickstart.md                  # Phase 1 output — setup guide
├── contracts/
│   ├── api-cults3d.md             # Cults3D connection, categories, licenses, create routes
│   └── api-upload.md              # File upload route contract
├── checklists/
│   └── requirements.md            # Spec quality checklist
└── tasks.md                       # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
app/
├── api/
│   ├── auth/                              # (existing) Etsy OAuth routes — unchanged
│   │   ├── connect/route.ts
│   │   ├── callback/route.ts
│   │   ├── refresh/route.ts
│   │   ├── status/route.ts
│   │   └── disconnect/route.ts
│   ├── chatgpt/                           # (existing + modified)
│   │   ├── connect/route.ts               # (existing) — unchanged
│   │   ├── exchange/route.ts              # (existing) — unchanged
│   │   ├── status/route.ts                # (existing) — unchanged
│   │   ├── disconnect/route.ts            # (existing) — unchanged
│   │   ├── refresh/route.ts               # (existing) — unchanged
│   │   ├── test/route.ts                  # (existing) — unchanged
│   │   └── generate/route.ts              # (modified) Returns DualListingFields instead of GeneratedListingFields
│   ├── cults3d/                           # (new) Cults3D integration routes
│   │   ├── connect/route.ts               # POST — Save + verify credentials
│   │   ├── status/route.ts                # GET  — Connection status
│   │   ├── disconnect/route.ts            # POST — Clear credentials
│   │   ├── categories/route.ts            # GET  — Fetch categories from Cults3D API
│   │   ├── licenses/route.ts              # GET  — Fetch licenses from Cults3D API
│   │   └── create/route.ts               # POST — Create design on Cults3D
│   ├── upload/                            # (new) File upload
│   │   └── file/route.ts                 # POST — Upload file to cloud storage
│   └── listings/                          # (existing) — unchanged
│       └── upload/route.ts
├── components/
│   ├── ConnectionStatus.tsx               # (existing) — unchanged
│   ├── ChatGPTStatus.tsx                  # (existing) — unchanged
│   ├── TestPrompt.tsx                     # (existing) — unchanged
│   ├── JsonEditor.tsx                     # (existing) — unchanged
│   ├── UploadResults.tsx                  # (existing) — unchanged
│   ├── ErrorBoundary.tsx                  # (existing) — unchanged
│   ├── ListingGenerator.tsx               # (modified) Display dual fields, add Cults3D section
│   ├── Cults3DStatus.tsx                  # (new) Cults3D connection status + credentials form
│   ├── Cults3DListingForm.tsx             # (new) Cults3D editing form + category/license selectors
│   └── FileUploader.tsx                   # (new) Drag-and-drop file upload with progress
├── page.tsx                               # (modified) Add Cults3DStatus section
├── layout.tsx                             # (existing) — unchanged
└── globals.css                            # (existing) — unchanged

lib/
├── auth/                                  # (existing) — unchanged
│   ├── etsy-oauth.ts
│   ├── pkce.ts
│   └── tokens.ts
├── chatgpt/
│   ├── oauth.ts                           # (existing) — unchanged
│   ├── tokens.ts                          # (existing) — unchanged
│   ├── api.ts                             # (existing) — unchanged
│   └── generate.ts                        # (modified) Extended system prompt for dual-marketplace, updated parser
├── cults3d/                               # (new) Cults3D integration module
│   ├── api.ts                             # GraphQL client: categories, licenses, createCreation, myself
│   └── credentials.ts                     # Read/write cults3d-credentials.json
├── storage/                               # (new) Cloud storage module
│   └── s3.ts                              # S3-compatible upload via aws4fetch
├── listings/                              # (existing) — unchanged
│   ├── etsy-api.ts
│   └── validate.ts
└── types/
    ├── app.ts                             # (existing) — unchanged
    ├── etsy.ts                            # (existing) — unchanged
    ├── chatgpt.ts                         # (modified) Add DualListingFields, GeneratedCults3DFields, update GenerateListingResponse
    └── cults3d.ts                         # (new) Cults3D-specific types

data/                                      # Git-ignored, created at runtime
├── tokens.json                            # (existing) Etsy OAuth tokens
├── chatgpt-tokens.json                    # (existing) ChatGPT OAuth tokens
└── cults3d-credentials.json               # (new) Cults3D API credentials
```

**Structure Decision**: Extends the existing single Next.js project. New `lib/cults3d/` module follows the same pattern as `lib/auth/` and `lib/chatgpt/`. New `lib/storage/` module is a standalone concern for cloud file uploads. New `app/api/cults3d/` routes follow the existing convention. One new dependency (`aws4fetch`) for S3-compatible storage.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| New dependency: `aws4fetch` | S3-compatible cloud storage requires AWS SigV4 request signing. The signing algorithm involves HMAC-SHA256, canonical request construction, and multiple hashing steps — not implementable as a "small utility function." | Manual SigV4 implementation: error-prone, ~200+ lines, reinvents the wheel. Rejected. `@aws-sdk/client-s3` (~14MB): massively oversized for simple PUT operations. Rejected. No cloud storage (user provides URLs): rejected by user as poor UX. |
