# Implementation Plan: Etsy Craft Listing Uploader

**Branch**: `001-etsy-listing-integration` | **Date**: 2026-03-20 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-etsy-listing-integration/spec.md`

## Summary

A local Next.js application that authenticates with Etsy via OAuth 2.0 (PKCE) and allows a user to paste listing JSON into a text area to create draft listings on Etsy via the `createDraftListing` API. The app runs locally, stores tokens in a server-side JSON file, and proxies all Etsy API calls through Next.js API routes to keep secrets server-side.

## Technical Context

**Language/Version**: TypeScript 5.x with Next.js 15 (App Router)
**Primary Dependencies**: Next.js, Tailwind CSS, native `fetch` API
**Storage**: File-based JSON for token persistence (`data/tokens.json`); no database
**Testing**: Manual integration testing against the live Etsy API with a registered developer app
**Target Platform**: Local development machine (macOS/Linux/Windows), accessed via `http://localhost:3000`
**Project Type**: Web application (local single-user tool)
**Performance Goals**: N/A — single-user local tool, no concurrency concerns
**Constraints**: All secrets server-side only; single `npm run dev` to run; no external services beyond Etsy API
**Scale/Scope**: Single user, single shop, <100 listings per batch

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Evidence |
|-----------|--------|----------|
| I. Secure Token Management | PASS | Tokens stored in `data/tokens.json` on the server filesystem, never exposed to the browser. PKCE with S256 implemented in `lib/auth/pkce.ts`. API key in `.env.local`. |
| II. Server-Side API Boundary | PASS | All Etsy API calls routed through `app/api/` routes. Client components call internal `/api/*` endpoints only. |
| III. JSON-In, Listing-Out | PASS | JSON validated client-side (syntax check in `JsonEditor` component) and server-side (`lib/listings/validate.ts`) before any API call. Required fields checked against Etsy schema. |
| IV. Single-Concern Modules | PASS | Auth module (`lib/auth/`), Listings module (`lib/listings/`), UI components (`app/components/`) are separated. No cross-concern mixing. |
| V. Simplicity & Local-First | PASS | No database, no auth framework, no deployment infra. File-based token storage. Runs with `npm run dev` after setting `.env.local`. |

All gates pass. No violations to justify.

### Post-Design Re-evaluation (after Phase 1)

| Principle | Status | Evidence |
|-----------|--------|----------|
| I. Secure Token Management | PASS | `data/tokens.json` is server-only (not in `public/`, not served by Next.js). PKCE flow documented in research.md. `code_verifier` stored server-side keyed by `state`. API key read from `process.env` in API routes only. |
| II. Server-Side API Boundary | PASS | Contracts in `contracts/api-auth.md` and `contracts/api-listings.md` define 6 internal API routes. No contract exposes Etsy tokens or keys to the client. |
| III. JSON-In, Listing-Out | PASS | Two-layer validation documented in research.md R4. Data model defines all required/optional fields with validation rules. Server validates before any Etsy API call. |
| IV. Single-Concern Modules | PASS | Project structure separates `lib/auth/` (3 files), `lib/listings/` (2 files), `lib/types/` (2 files), and `app/components/` (3 files). No module crosses concerns. |
| V. Simplicity & Local-First | PASS | Zero external dependencies beyond Next.js and Tailwind. File-based token storage. No database, no auth library. Single `npm run dev` command. |

All gates pass post-design. No complexity tracking entries needed.

## Project Structure

### Documentation (this feature)

```text
specs/001-etsy-listing-integration/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── api-auth.md
│   └── api-listings.md
└── checklists/
    └── requirements.md
```

### Source Code (repository root)

```text
app/
├── api/
│   ├── auth/
│   │   ├── connect/route.ts        # Generates PKCE pair, redirects to Etsy OAuth
│   │   ├── callback/route.ts       # Handles Etsy redirect, exchanges code for tokens
│   │   ├── refresh/route.ts        # Refreshes access token using refresh token
│   │   ├── status/route.ts         # Returns current connection status + shop name
│   │   └── disconnect/route.ts     # Clears stored tokens
│   └── listings/
│       └── upload/route.ts         # Validates & uploads listing(s) to Etsy
├── components/
│   ├── ConnectionStatus.tsx        # Shows connected shop / connect button
│   ├── JsonEditor.tsx              # Text area with client-side JSON validation
│   └── UploadResults.tsx           # Per-listing success/failure results display
├── page.tsx                        # Main page composing all components
├── layout.tsx                      # Root layout with Tailwind
└── globals.css                     # Tailwind directives

lib/
├── auth/
│   ├── pkce.ts                     # code_verifier + code_challenge generation (S256)
│   ├── tokens.ts                   # Read/write tokens.json, check expiry
│   └── etsy-oauth.ts              # Build OAuth URLs, exchange code, refresh token
├── listings/
│   ├── validate.ts                 # JSON parse + required field validation
│   └── etsy-api.ts                # createDraftListing call, response mapping
└── types/
    ├── etsy.ts                     # Etsy API request/response types
    └── app.ts                      # App-specific types (UploadResult, ConnectionStatus)

data/                               # Git-ignored, created at runtime
└── tokens.json                     # Persisted OAuth tokens + PKCE state

public/                             # Static assets (if any)
```

**Structure Decision**: Single Next.js project. No separate backend — Next.js API routes serve as the server layer. This is the simplest viable structure for a local tool per Constitution Principle V.

## Complexity Tracking

No violations. No entries needed.
