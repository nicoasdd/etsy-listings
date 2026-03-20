# Implementation Plan: ChatGPT Image-Based Listing Generator

**Branch**: `003-chatgpt-image-listing` | **Date**: 2026-03-20 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/003-chatgpt-image-listing/spec.md`

## Summary

Add a "Generate Listing from Image" feature to the existing Etsy Listings app. The user uploads a product photo and an optional brief description. The app sends both to ChatGPT (via the existing Codex OAuth connection from feature 002) with a curated system prompt encoding Etsy listing SEO best practices as of March 2026. ChatGPT returns a structured JSON response containing an SEO-optimized title, detailed description, up to 13 tags, materials, styles, and a suggested category. The user reviews and edits the fields in a form, then either creates a draft listing on Etsy (via the existing upload flow from feature 001) or copies the fields as JSON.

## Technical Context

**Language/Version**: TypeScript 5.x with Next.js 16 (App Router)
**Primary Dependencies**: Next.js, Tailwind CSS, native `fetch` API (no new dependencies)
**Storage**: No new storage needed; ChatGPT tokens already in `data/chatgpt-tokens.json` (feature 002)
**Testing**: Manual integration testing with a real ChatGPT Plus/Pro account and product images
**Target Platform**: Local development machine (macOS/Linux/Windows), accessed via `http://localhost:3000`
**Project Type**: Web application (local single-user tool)
**Performance Goals**: Generation response within 60 seconds (timeout); typical response 10-30 seconds
**Constraints**: All secrets server-side only; no new dependencies; image transmitted as base64 in ChatGPT API payload; 20 MB max image size
**Scale/Scope**: Single user, single image per generation, one listing at a time

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Evidence |
|-----------|--------|----------|
| I. Secure Token Management | PASS | Reuses existing ChatGPT token management from feature 002. Image processing happens entirely server-side in the API route. No tokens or images exposed to the browser. |
| II. Server-Side API Boundary | PASS | New `app/api/chatgpt/generate/route.ts` receives the image upload, base64-encodes it server-side, and calls ChatGPT. The client never contacts ChatGPT directly. |
| III. JSON-In, Listing-Out | PASS | Generated listing fields are validated against Etsy field constraints (title length, tag count, etc.) in the editing form. Combined payload is validated by the existing `validateListings` function before Etsy submission via the existing `/api/listings/upload` route. |
| IV. Single-Concern Modules | PASS | New generation logic in `lib/chatgpt/generate.ts` (system prompt + image payload). New API route in `app/api/chatgpt/generate/`. New UI component `ListingGenerator.tsx`. Each module has a single responsibility. |
| V. Simplicity & Local-First | PASS | No new dependencies. Reuses existing ChatGPT auth and Etsy upload infrastructure. Image sent as base64 (no file hosting needed). Single new API route, single new library file, single new component. |

All gates pass. No violations to justify.

### Post-Design Re-evaluation (after Phase 1)

| Principle | Status | Evidence |
|-----------|--------|----------|
| I. Secure Token Management | PASS | The generate route reads ChatGPT tokens from `data/chatgpt-tokens.json` server-side, same as the existing test route. Image data is received server-side and never stored persistently — processed in memory and discarded after the ChatGPT call. |
| II. Server-Side API Boundary | PASS | Contract in `contracts/api-generate.md` defines 1 new API route (`POST /api/chatgpt/generate`). Client sends the image via `multipart/form-data` to the internal API route. All ChatGPT communication is server-side. Etsy submission reuses the existing `/api/listings/upload` route. |
| III. JSON-In, Listing-Out | PASS | ChatGPT's response is parsed as JSON server-side. If parsing fails, an error is returned. The editing form enforces Etsy field constraints. Final submission goes through the existing validation + upload pipeline. |
| IV. Single-Concern Modules | PASS | `lib/chatgpt/generate.ts` — system prompt and ChatGPT image API call. `lib/chatgpt/api.ts` — reused for streaming response collection. `app/api/chatgpt/generate/route.ts` — API route (auth check, image processing, error handling). `app/components/ListingGenerator.tsx` — UI component (image upload, form, actions). No module crosses concerns. |
| V. Simplicity & Local-First | PASS | Zero new npm dependencies. Follows the same patterns as features 001 and 002. The system prompt is a string constant in `lib/chatgpt/generate.ts`. No database, no file hosting, no background jobs. |

All gates pass post-design. No complexity tracking entries needed.

## Project Structure

### Documentation (this feature)

```text
specs/003-chatgpt-image-listing/
├── plan.md              # This file
├── research.md          # Phase 0 output — image API, Etsy best practices, structured output
├── data-model.md        # Phase 1 output — request/response types, state transitions
├── quickstart.md        # Phase 1 output — user guide
├── contracts/
│   └── api-generate.md  # Phase 1 output — POST /api/chatgpt/generate contract
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # Phase 2 output (/speckit.tasks command)
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
│   ├── chatgpt/                           # (existing + new)
│   │   ├── connect/route.ts               # (existing) ChatGPT OAuth — unchanged
│   │   ├── exchange/route.ts              # (existing) — unchanged
│   │   ├── status/route.ts                # (existing) — unchanged
│   │   ├── disconnect/route.ts            # (existing) — unchanged
│   │   ├── refresh/route.ts               # (existing) — unchanged
│   │   ├── test/route.ts                  # (existing) — unchanged
│   │   └── generate/route.ts              # (new) Image upload + ChatGPT generation endpoint
│   └── listings/                          # (existing) — unchanged
│       └── upload/route.ts
├── components/
│   ├── ConnectionStatus.tsx               # (existing) — unchanged
│   ├── ChatGPTStatus.tsx                  # (existing) — unchanged
│   ├── TestPrompt.tsx                     # (existing) — unchanged
│   ├── JsonEditor.tsx                     # (existing) — unchanged
│   ├── UploadResults.tsx                  # (existing) — unchanged
│   ├── ErrorBoundary.tsx                  # (existing) — unchanged
│   └── ListingGenerator.tsx               # (new) Image upload + editing form + actions
├── page.tsx                               # (modified) Add ListingGenerator section
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
│   ├── api.ts                             # (existing) — unchanged (reused for stream collection)
│   └── generate.ts                        # (new) System prompt, image payload builder, response parser
├── listings/                              # (existing) — unchanged
│   ├── etsy-api.ts
│   └── validate.ts
└── types/
    ├── app.ts                             # (existing) — unchanged
    ├── etsy.ts                            # (existing) — unchanged
    └── chatgpt.ts                         # (modified) Add GeneratedListingFields, GenerateListingResponse types
```

**Structure Decision**: Extends the existing single Next.js project. One new API route (`generate`), one new library file (`generate.ts`), one new component (`ListingGenerator.tsx`), and minor type additions. The existing ChatGPT API layer (`api.ts`) and Etsy upload pipeline are reused without modification.

## Complexity Tracking

No violations. No entries needed.
