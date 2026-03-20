# Implementation Plan: ChatGPT Codex OAuth Integration

**Branch**: `002-chatgpt-codex-oauth` | **Date**: 2026-03-20 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-chatgpt-codex-oauth/spec.md`

## Summary

Integrate ChatGPT Codex OAuth into the existing Etsy Listings app so users can connect their ChatGPT Pro/Plus subscription and use AI capabilities. The feature reverse-engineers the Codex CLI's OAuth 2.0 + PKCE flow against `auth.openai.com`, uses a user-assisted callback (URL copy-paste), stores tokens server-side in a separate JSON file, and provides a test prompt feature to verify connectivity. All ChatGPT API calls are proxied through Next.js API routes to the `chatgpt.com/backend-api/codex/responses` endpoint.

## Technical Context

**Language/Version**: TypeScript 5.x with Next.js 16 (App Router)
**Primary Dependencies**: Next.js, Tailwind CSS, native `fetch` API (no new dependencies)
**Storage**: File-based JSON for ChatGPT token persistence (`data/chatgpt-tokens.json`); separate from Etsy tokens
**Testing**: Manual integration testing with a real ChatGPT Plus/Pro account
**Target Platform**: Local development machine (macOS/Linux/Windows), accessed via `http://localhost:3000`
**Project Type**: Web application (local single-user tool)
**Performance Goals**: Test prompt response within 15 seconds (SC-002 from spec)
**Constraints**: All secrets server-side only; no new dependencies; user-assisted OAuth callback (URL copy-paste); ChatGPT OAuth tokens use `chatgpt.com` endpoint NOT `api.openai.com`
**Scale/Scope**: Single user, single ChatGPT connection

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Evidence |
|-----------|--------|----------|
| I. Secure Token Management | PASS | ChatGPT OAuth tokens stored in `data/chatgpt-tokens.json` on server filesystem, never exposed to browser. PKCE with S256 for the OAuth flow. `OPENAI_CLIENT_ID` in `.env.local`. Refresh tokens handled server-side. |
| II. Server-Side API Boundary | PASS | All ChatGPT API calls routed through `app/api/chatgpt/` routes. Client components call internal `/api/chatgpt/*` endpoints only. Token exchange happens server-side. |
| III. JSON-In, Listing-Out | N/A | This feature does not create listings. The test prompt validates via message length check client-side and server-side. |
| IV. Single-Concern Modules | PASS | ChatGPT auth in `lib/chatgpt/` (separate from Etsy auth in `lib/auth/`). ChatGPT API routes in `app/api/chatgpt/` (separate from Etsy routes in `app/api/auth/`). ChatGPT types in `lib/types/chatgpt.ts`. |
| V. Simplicity & Local-First | PASS | No new dependencies. File-based token storage. User-assisted OAuth callback (simplest viable mechanism). No secondary server or complex redirect interception. Runs with `npm run dev`. |

All gates pass. No violations to justify.

### Post-Design Re-evaluation (after Phase 1)

| Principle | Status | Evidence |
|-----------|--------|----------|
| I. Secure Token Management | PASS | `data/chatgpt-tokens.json` is server-only. PKCE code_verifier stored server-side keyed by state. Client ID from `process.env` in API routes only. Token refresh handled automatically on the server. |
| II. Server-Side API Boundary | PASS | Contract in `contracts/api-chatgpt.md` defines 6 API routes. No route exposes tokens or the OpenAI client ID to the client. The test prompt route proxies to ChatGPT — the client never contacts `chatgpt.com` directly. |
| III. JSON-In, Listing-Out | N/A | Feature scope is OAuth + test prompt only. Future listing improvement features will be a separate spec. |
| IV. Single-Concern Modules | PASS | Three new library files in `lib/chatgpt/` (oauth, tokens, api). Separate types file. Six new API routes. Two new UI components. No module crosses concerns with the existing Etsy auth or listings modules. |
| V. Simplicity & Local-First | PASS | Zero new npm dependencies. File-based token storage (same pattern as Etsy). The user-assisted URL copy-paste flow avoids spawning secondary servers. Single `npm run dev` command. |

All gates pass post-design. No complexity tracking entries needed.

## Project Structure

### Documentation (this feature)

```text
specs/002-chatgpt-codex-oauth/
├── plan.md              # This file
├── research.md          # Phase 0 output — OAuth flow research, endpoint details
├── data-model.md        # Phase 1 output — token store, connection status, test prompt types
├── quickstart.md        # Phase 1 output — setup & usage guide
├── contracts/
│   └── api-chatgpt.md   # Phase 1 output — all 6 ChatGPT API route contracts
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
app/
├── api/
│   ├── auth/                          # (existing) Etsy OAuth routes
│   │   ├── connect/route.ts
│   │   ├── callback/route.ts
│   │   ├── refresh/route.ts
│   │   ├── status/route.ts
│   │   └── disconnect/route.ts
│   ├── chatgpt/                       # (new) ChatGPT OAuth + test prompt routes
│   │   ├── connect/route.ts           # POST — Generate PKCE, return OpenAI auth URL
│   │   ├── exchange/route.ts          # POST — Accept pasted callback URL, exchange code
│   │   ├── status/route.ts            # GET  — ChatGPT connection status
│   │   ├── disconnect/route.ts        # POST — Clear ChatGPT tokens
│   │   ├── refresh/route.ts           # POST — Refresh ChatGPT access token
│   │   └── test/route.ts              # POST — Send test prompt, return response
│   └── listings/                      # (existing) Listing upload
│       └── upload/route.ts
├── components/
│   ├── ConnectionStatus.tsx           # (existing) Etsy connection status
│   ├── ChatGPTStatus.tsx              # (new) ChatGPT connection + URL paste UI
│   ├── TestPrompt.tsx                 # (new) Test prompt input and response display
│   ├── JsonEditor.tsx                 # (existing)
│   ├── UploadResults.tsx              # (existing)
│   └── ErrorBoundary.tsx              # (existing)
├── page.tsx                           # (modified) Add ChatGPT section
├── layout.tsx                         # (existing, unchanged)
└── globals.css                        # (existing, unchanged)

lib/
├── auth/                              # (existing) Etsy auth — unchanged
│   ├── etsy-oauth.ts
│   ├── pkce.ts
│   └── tokens.ts
├── chatgpt/                           # (new) ChatGPT auth + API
│   ├── oauth.ts                       # Build OpenAI auth URL, exchange code, refresh token
│   ├── tokens.ts                      # Read/write chatgpt-tokens.json, check expiry
│   └── api.ts                         # Send prompts to ChatGPT backend endpoint
├── listings/                          # (existing) — unchanged
│   ├── etsy-api.ts
│   └── validate.ts
└── types/
    ├── app.ts                         # (existing) — unchanged
    ├── etsy.ts                        # (existing) — unchanged
    └── chatgpt.ts                     # (new) ChatGPT-specific types

data/                                  # Git-ignored, created at runtime
├── tokens.json                        # (existing) Etsy OAuth tokens
└── chatgpt-tokens.json                # (new) ChatGPT OAuth tokens
```

**Structure Decision**: Extends the existing single Next.js project. New `lib/chatgpt/` module follows the same pattern as `lib/auth/` (Etsy). New `app/api/chatgpt/` routes follow the same convention as `app/api/auth/`. Separate token files per Constitution Principle IV.

## Complexity Tracking

No violations. No entries needed.
