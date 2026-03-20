# Tasks: Etsy Craft Listing Uploader

**Input**: Design documents from `/specs/001-etsy-listing-integration/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Not explicitly requested in the specification — test tasks are omitted.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, dependencies, and base configuration

- [ ] T001 Initialize Next.js 15 project with TypeScript 5.x and App Router (`package.json`, `tsconfig.json`, `next.config.ts`)
- [ ] T002 [P] Install and configure Tailwind CSS (`app/globals.css`, `tailwind.config.ts`, `postcss.config.js`)
- [ ] T003 [P] Create root layout with Tailwind and base metadata (`app/layout.tsx`)
- [ ] T004 [P] Create `.env.example` with `ETSY_API_KEY` and `ETSY_REDIRECT_URI` placeholders
- [ ] T005 [P] Add `data/` to `.gitignore`

**Checkpoint**: Project runs with `npm run dev` and renders an empty page.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T006 Create TypeScript types for Etsy API request/response shapes in `lib/types/etsy.ts` (ListingPayload with all required/optional fields, Etsy token response, Etsy shop response)
- [ ] T007 [P] Create TypeScript types for app-specific models in `lib/types/app.ts` (TokenStore, PendingOAuth, UploadResult, ConnectionStatus per data-model.md)
- [ ] T008 Implement PKCE utilities in `lib/auth/pkce.ts` — `generateCodeVerifier()` (43-128 chars from `[A-Za-z0-9._~-]`) and `generateCodeChallenge(verifier)` (SHA256, base64url-encoded)
- [ ] T009 Implement token storage helpers in `lib/auth/tokens.ts` — `readTokenStore()`, `writeTokenStore()`, `clearTokenStore()`, `isTokenExpired()`. File path: `data/tokens.json`. Auto-create `data/` directory if missing.
- [ ] T010 [P] Implement Etsy OAuth URL builder and token exchange in `lib/auth/etsy-oauth.ts` — `buildAuthorizationUrl(state, codeChallenge)`, `exchangeCodeForTokens(code, codeVerifier)`, `refreshAccessToken(refreshToken)`, `fetchUserShop(userId, accessToken)`. All calls include `x-api-key` header.
- [ ] T011 [P] Implement listing validation in `lib/listings/validate.ts` — `validateListings(parsed: unknown[])` returns per-listing structured errors. Validates 7 required fields, enum values for `who_made`/`when_made`, positive numbers for `quantity`/`price`/`taxonomy_id`.
- [ ] T012 Implement Etsy listing API caller in `lib/listings/etsy-api.ts` — `createDraftListing(shopId, accessToken, apiKey, listing)` sends `POST /v3/application/shops/{shop_id}/listings` with `application/x-www-form-urlencoded` body. Converts array fields (tags, materials, styles) to URL-encoded format.

**Checkpoint**: Foundation ready — all library modules exist and export their functions. User story implementation can now begin.

---

## Phase 3: User Story 1 — Authenticate with Etsy (Priority: P1) 🎯 MVP

**Goal**: User can click "Connect to Etsy", complete OAuth 2.0 PKCE flow, and see their shop name displayed.

**Independent Test**: Click "Connect to Etsy", complete OAuth on Etsy, verify app shows connected shop name.

### Implementation for User Story 1

- [ ] T013 [US1] Implement `GET /api/auth/connect` route in `app/api/auth/connect/route.ts` — Generate PKCE pair and state, store as `pending_oauth` in tokens.json, redirect to Etsy OAuth URL with all required query params (per contracts/api-auth.md). Return 500 if env vars missing.
- [ ] T014 [US1] Implement `GET /api/auth/callback` route in `app/api/auth/callback/route.ts` — Validate state param against stored `pending_oauth.state`, exchange auth code for tokens via `exchangeCodeForTokens`, extract user_id from token prefix, fetch shop info via `fetchUserShop`, store tokens + shop info, clear `pending_oauth`, redirect to `/`. Return 400 for state mismatch, 502 for token exchange failure.
- [ ] T015 [US1] Implement `POST /api/auth/refresh` route in `app/api/auth/refresh/route.ts` — Read stored refresh token, call `refreshAccessToken`, update tokens.json with new tokens and `expires_at`. Return 401 if not connected or refresh fails with `needs_reauth: true`.
- [ ] T016 [US1] Implement `GET /api/auth/status` route in `app/api/auth/status/route.ts` — Read tokens.json, return `ConnectionStatus` shape. Return `connected: false` if no tokens. Include `needs_reauth: true` if refresh token is also expired.
- [ ] T017 [P] [US1] Create `ConnectionStatus` component in `app/components/ConnectionStatus.tsx` — Polls `GET /api/auth/status` on mount. Shows "Connect to Etsy" button (links to `/api/auth/connect`) when not connected. Shows shop name and "Connected" indicator when authenticated. Shows re-auth prompt when `needs_reauth` is true.
- [ ] T018 [US1] Wire `ConnectionStatus` into `app/page.tsx` as the main page with layout and heading.

**Checkpoint**: User Story 1 fully functional — user can connect to Etsy and see their shop name. US2/US3/US4 can begin in parallel from here.

---

## Phase 4: User Story 2 — Paste and Upload a Single Listing JSON (Priority: P1) 🎯 MVP

**Goal**: User can paste a listing JSON object, submit it, and have a draft listing created on Etsy.

**Independent Test**: Paste valid listing JSON, click "Upload Listing", verify draft appears in Etsy shop.

### Implementation for User Story 2

- [ ] T019 [US2] Implement `POST /api/listings/upload` route in `app/api/listings/upload/route.ts` — Parse JSON body, normalize single object to array, validate with `validateListings`, check auth (refresh if expired), call `createDraftListing` sequentially for each listing, return per-listing `UploadResult[]` with summary. Return 400 for parse/validation errors, 401 if not authenticated.
- [ ] T020 [P] [US2] Create `JsonEditor` component in `app/components/JsonEditor.tsx` — Large text area for pasting JSON. Client-side syntax validation on change/blur with `JSON.parse()`. Shows inline error with line/position info for malformed JSON. Checks parsed result is an object or array of objects.
- [ ] T021 [P] [US2] Create `UploadResults` component in `app/components/UploadResults.tsx` — Displays per-listing results (success with listing link, error with message). Shows summary counts (total, succeeded, failed). Loading state with progress indicator during upload.
- [ ] T022 [US2] Integrate `JsonEditor` and `UploadResults` into `app/page.tsx` — Add upload form below ConnectionStatus. "Upload Listing" button sends JSON to `POST /api/listings/upload`. Display results via `UploadResults`. Disable upload when not connected.

**Checkpoint**: User Stories 1 AND 2 fully functional — user can connect and upload a single listing via JSON.

---

## Phase 5: User Story 3 — Paste and Upload Multiple Listings (Priority: P2)

**Goal**: User can paste a JSON array of listing objects and upload them all, with per-listing progress and results.

**Independent Test**: Paste JSON array with 2-3 listings, click upload, verify each appears as a draft in Etsy shop with per-listing status.

### Implementation for User Story 3

- [ ] T023 [US3] Enhance `POST /api/listings/upload` route in `app/api/listings/upload/route.ts` to support streaming progress — Return per-listing results as they complete (or accumulate and return at end). Ensure a single JSON object is treated as a single listing (already handled by normalize step in T019).
- [ ] T024 [US3] Update `UploadResults` component in `app/components/UploadResults.tsx` — Add progress bar/indicator showing "Uploading X of Y..." during batch processing. Show per-listing results as they arrive. Clearly distinguish succeeded vs failed items with color coding.
- [ ] T025 [US3] Update `app/page.tsx` — Button text changes to "Upload Listings" when a JSON array is detected. Show batch summary after completion.

**Checkpoint**: User Stories 1, 2, AND 3 all work — single and batch uploads both supported.

---

## Phase 6: User Story 4 — View Connection Status and Disconnect (Priority: P3)

**Goal**: User can see detailed connection status and disconnect their Etsy account.

**Independent Test**: View status page while connected, click "Disconnect", verify app returns to unauthenticated state.

### Implementation for User Story 4

- [ ] T026 [US4] Implement `POST /api/auth/disconnect` route in `app/api/auth/disconnect/route.ts` — Call `clearTokenStore()` to delete `data/tokens.json` contents. Return `{ success: true }`.
- [ ] T027 [US4] Enhance `ConnectionStatus` component in `app/components/ConnectionStatus.tsx` — Show token expiration status. Add "Disconnect" button that calls `POST /api/auth/disconnect` and resets UI to unauthenticated state. Show shop name prominently.

**Checkpoint**: All 4 user stories independently functional.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T028 [P] Create `.env.example` documentation with all required variables and inline comments
- [ ] T029 [P] Add error boundary or global error handling in `app/page.tsx` for network failures
- [ ] T030 Handle edge case: refresh token expired (90 days inactivity) — prompt full re-auth in `ConnectionStatus`
- [ ] T031 Handle edge case: network loss mid-upload — report which listings succeeded/failed, allow retry of failed
- [ ] T032 Handle edge case: extremely large batches (100+ listings) — add Etsy rate limit awareness with delay between requests
- [ ] T033 Handle edge case: unrecognized fields in pasted JSON — warn user but still attempt upload
- [ ] T034 Run quickstart.md validation — verify full flow (connect + upload) works per documented steps

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories
- **US1 Auth (Phase 3)**: Depends on Foundational — delivers MVP auth
- **US2 Upload (Phase 4)**: Depends on Foundational — can run in parallel with US1 for component work (T020, T021), but API route (T019) and page integration (T022) need auth routes from US1
- **US3 Batch (Phase 5)**: Depends on US2 completion — extends existing upload functionality
- **US4 Disconnect (Phase 6)**: Depends on US1 completion — extends existing auth UI
- **Polish (Phase 7)**: Depends on all user stories being complete

### Within Each User Story

- API routes before UI components that call them
- Components before page integration
- Core implementation before enhancements

### Parallel Opportunities

- T002, T003, T004, T005 can all run in parallel (Phase 1)
- T006/T007 types can run in parallel; T008/T009/T010/T011 can run in parallel after types are done
- T017 (ConnectionStatus UI) can run in parallel with T013-T016 (auth API routes)
- T020, T021 (JsonEditor, UploadResults UI) can run in parallel with T019 (upload API route)
- US4 (Phase 6) can run in parallel with US3 (Phase 5) once US1 and US2 are done

---

## Implementation Strategy

### MVP First (User Stories 1 + 2)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 1 (Auth)
4. Complete Phase 4: User Story 2 (Upload)
5. **STOP and VALIDATE**: Test connect + upload single listing end-to-end

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add US1 → Test auth independently → Working auth
3. Add US2 → Test upload independently → **MVP complete!**
4. Add US3 → Test batch upload → Batch support
5. Add US4 → Test disconnect → Full feature set
6. Polish → Edge cases and robustness

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story is independently completable and testable after Phase 2
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Etsy API uses `application/x-www-form-urlencoded` for createDraftListing (not JSON body)
- All Etsy API calls require `x-api-key` header with the App API Key
- Access token prefix contains the numeric user ID needed for shop lookup
