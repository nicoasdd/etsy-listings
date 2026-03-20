<!--
Sync Impact Report
- Version change: N/A → 1.0.0
- Modified principles: N/A (initial creation)
- Added sections: Core Principles (5), Technology Stack, Development Workflow, Governance
- Removed sections: None
- Templates requiring updates:
  - .specify/templates/plan-template.md ✅ No changes needed (generic, aligns with principles)
  - .specify/templates/spec-template.md ✅ No changes needed (generic, aligns with principles)
  - .specify/templates/tasks-template.md ✅ No changes needed (generic, aligns with principles)
- Follow-up TODOs: None
-->

# Etsy Listings Constitution

## Core Principles

### I. Secure Token Management

All OAuth 2.0 tokens, refresh tokens, and API keys MUST never be exposed
to the browser. Secret values MUST be stored in environment variables
(`.env.local`) and accessed exclusively through Next.js server-side code
(API routes / server actions). The full PKCE authorization code flow MUST
be implemented per Etsy Open API v3 specification, including
`code_verifier` / `code_challenge` generation with S256 method. Refresh
tokens MUST be persisted server-side and used to silently renew access
tokens before expiry.

### II. Server-Side API Boundary

Every request to `api.etsy.com` MUST route through Next.js API routes
(`app/api/`). The client MUST never call Etsy endpoints directly.
This ensures secrets remain on the server, enables centralized error
handling, and allows request/response transformation in one place.
API route handlers MUST validate inputs before forwarding to Etsy.

### III. JSON-In, Listing-Out

The primary user workflow is: paste a listing JSON payload into the UI,
validate it, and submit it to Etsy's `createDraftListing` endpoint.
JSON validation MUST occur both client-side (for immediate feedback) and
server-side (before any API call). Validation MUST check required fields
per Etsy's listing schema (`title`, `description`, `price`, `quantity`,
`who_made`, `when_made`, `taxonomy_id`, etc.). Clear, actionable error
messages MUST be returned for malformed or incomplete payloads.

### IV. Single-Concern Modules

Each module MUST handle exactly one responsibility:
- **Auth module**: OAuth flow, token storage, token refresh
- **Listings module**: JSON validation, Etsy API calls for listing CRUD
- **UI components**: Presentation and user interaction only

No module may mix concerns (e.g., a UI component MUST NOT call Etsy
directly). Shared types and constants live in a dedicated `lib/` or
`types/` directory. Avoid premature abstractions — add layers only when
a concrete second use case exists.

### V. Simplicity & Local-First

This is a local tool for personal/small-team use. Do NOT introduce
authentication frameworks, databases, or deployment infrastructure unless
explicitly required. Token persistence MUST use the simplest viable
mechanism (file-based or in-memory for local dev). The app MUST run with
a single `npm run dev` command after setting environment variables.
YAGNI applies: do not build features speculatively.

## Technology Stack

- **Framework**: Next.js (App Router) with TypeScript
- **Runtime**: Node.js (LTS)
- **Styling**: Tailwind CSS
- **HTTP Client**: Native `fetch` API (no axios or similar unless justified)
- **External API**: Etsy Open API v3 (`https://api.etsy.com/v3/`)
- **Auth Protocol**: OAuth 2.0 Authorization Code Grant with PKCE
- **Package Manager**: npm
- **Linting**: ESLint with Next.js recommended config
- **Environment**: `.env.local` for secrets (`ETSY_API_KEY`,
  `ETSY_REDIRECT_URI`, tokens at runtime)

Adding new dependencies MUST be justified by a concrete need that cannot
be met with existing tools or a small utility function.

## Development Workflow

- All Etsy API interactions MUST be tested against the actual API using
  a registered Etsy app with valid OAuth credentials.
- Environment variables MUST be documented in a `.env.example` file
  (without real values).
- Every API route MUST handle and return structured error responses
  (`{ error: string, details?: unknown }`).
- Git commits MUST be atomic and descriptive.
- Sensitive files (`.env.local`, token storage files) MUST be listed
  in `.gitignore`.

## Governance

This constitution is the authoritative reference for all architectural
and process decisions in the Etsy Listings project. Amendments require:

1. A documented rationale for the change.
2. An updated version number following semantic versioning:
   - **MAJOR**: Principle removal or backward-incompatible redefinition.
   - **MINOR**: New principle or materially expanded guidance.
   - **PATCH**: Clarifications, wording fixes, non-semantic refinements.
3. Updated `LAST_AMENDED_DATE`.

All code contributions MUST comply with these principles. Deviations
MUST be justified in a Complexity Tracking table (see plan template).

**Version**: 1.0.0 | **Ratified**: 2026-03-20 | **Last Amended**: 2026-03-20
