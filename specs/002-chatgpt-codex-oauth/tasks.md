# Tasks: ChatGPT Codex OAuth Integration

**Input**: Design documents from `/specs/002-chatgpt-codex-oauth/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Not explicitly requested in the specification — test tasks are omitted.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Environment configuration for the new ChatGPT OAuth integration

- [x] T001 Add `OPENAI_CLIENT_ID` and `OPENAI_REDIRECT_URI` placeholders to `.env.example` with inline comments explaining how to obtain the Codex CLI client ID
- [x] T002 [P] Add `OPENAI_CLIENT_ID` and `OPENAI_REDIRECT_URI` values to `.env.local`

**Checkpoint**: Environment variables are documented and configured. No runtime changes yet.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core types and library modules that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T003 Create ChatGPT-specific TypeScript types in `lib/types/chatgpt.ts` — `ChatGPTTokenStore` (access_token, refresh_token, expires_at, user_email, pending_oauth), `ChatGPTPendingOAuth` (state, code_verifier), `ChatGPTConnectionStatus` (connected, user_email, expires_at, needs_reauth, pending), `TestPromptRequest` (message, model?), `TestPromptResponse` (success, response, model, error?). Per data-model.md.
- [x] T004 [P] Implement ChatGPT token storage helpers in `lib/chatgpt/tokens.ts` — `readChatGPTTokenStore()`, `writeChatGPTTokenStore()`, `clearChatGPTTokenStore()`, `isChatGPTTokenExpired()`. File path: `data/chatgpt-tokens.json`. Auto-create `data/` directory if missing. Follow same pattern as existing `lib/auth/tokens.ts`.
- [x] T005 Implement ChatGPT OAuth module in `lib/chatgpt/oauth.ts` — `buildOpenAIAuthorizationUrl(state, codeChallenge)` constructs URL to `https://auth.openai.com/oauth/authorize` with `response_type=code`, `client_id` from env, `redirect_uri` from env, `scope=openid profile email offline_access`, `code_challenge_method=S256`, plus `id_token_add_organizations=true` and `codex_cli_simplified_flow=true`. `exchangeCodeForTokens(code, codeVerifier)` sends POST to `https://auth.openai.com/oauth/token` with `grant_type=authorization_code`, `code`, `code_verifier`, `client_id`, `redirect_uri`. `refreshAccessToken(refreshToken)` sends POST to same endpoint with `grant_type=refresh_token`. Reuse PKCE utilities from existing `lib/auth/pkce.ts`. Depends on T003.
- [x] T006 [P] Implement ChatGPT API module in `lib/chatgpt/api.ts` — `sendChatGPTPrompt(accessToken, message, model?)` sends POST to `https://chatgpt.com/backend-api/codex/responses` with `Authorization: Bearer {token}`, body `{ model, instructions: "You are a helpful assistant.", store: false, stream: true, input: [{ role: "user", content: [{ type: "input_text", text: message }] }] }`. Collects streamed response and returns assembled text. 30-second timeout. Depends on T003.

**Checkpoint**: Foundation ready — all library modules exist and export their functions. User story implementation can now begin.

---

## Phase 3: User Story 1 — Connect ChatGPT Account via Codex OAuth (Priority: P1) 🎯 MVP

**Goal**: User can click "Connect ChatGPT", complete the OpenAI OAuth flow (with URL copy-paste), and see their ChatGPT account shown as connected.

**Independent Test**: Click "Connect ChatGPT", sign in on OpenAI, copy callback URL, paste it back, verify app shows "Connected to ChatGPT".

### Implementation for User Story 1

- [x] T007 [US1] Implement `POST /api/chatgpt/connect` route in `app/api/chatgpt/connect/route.ts` — Generate PKCE pair using existing `lib/auth/pkce.ts` (`generateCodeVerifier`, `generateCodeChallenge`, `generateState`). Store `{ state, code_verifier }` as `pending_oauth` in chatgpt-tokens.json via `writeChatGPTTokenStore`. Build authorization URL via `buildOpenAIAuthorizationUrl`. Return `{ authorization_url, instructions }`. Return 409 if already connected. Return 500 if env vars missing. Per contracts/api-chatgpt.md.
- [x] T008 [US1] Implement `POST /api/chatgpt/exchange` route in `app/api/chatgpt/exchange/route.ts` — Accept `{ callback_url }` body. Parse URL to extract `code` and `state` query params. Validate `state` matches `pending_oauth.state` in stored tokens. Call `exchangeCodeForTokens(code, code_verifier)`. Store returned access_token, refresh_token, expires_at. Extract user_email from token response if available. Clear `pending_oauth`. Return `{ connected: true, user_email }`. Return 400 for missing params, state mismatch, or no pending flow. Return 502 if OpenAI token exchange fails. Per contracts/api-chatgpt.md.
- [x] T009 [P] [US1] Implement `GET /api/chatgpt/status` route in `app/api/chatgpt/status/route.ts` — Read chatgpt-tokens.json. Return `ChatGPTConnectionStatus` shape: `connected: true` if access_token present and not expired (or refreshable), `user_email` from store, `pending: true` if `pending_oauth` is set, `needs_reauth: true` if token expired and no refresh token. Per contracts/api-chatgpt.md.
- [x] T010 [P] [US1] Implement `POST /api/chatgpt/refresh` route in `app/api/chatgpt/refresh/route.ts` — Read stored refresh_token. Call `refreshAccessToken(refreshToken)`. Update chatgpt-tokens.json with new access_token and expires_at. Return `{ refreshed: true, expires_at }`. Return 401 with `{ needs_reauth: true }` if no refresh token or refresh fails. Per contracts/api-chatgpt.md.
- [x] T011 [US1] Create `ChatGPTStatus` component in `app/components/ChatGPTStatus.tsx` — Client component. Polls `GET /api/chatgpt/status` on mount (same pattern as existing `ConnectionStatus.tsx`). **Disconnected state**: Shows "Connect ChatGPT" button that calls `POST /api/chatgpt/connect`, opens `authorization_url` in new tab via `window.open()`, then shows URL paste input with instructions. **Pending state**: Shows input field for pasting callback URL, "Complete Connection" button that sends URL to `POST /api/chatgpt/exchange`, error display for failed exchanges with retry. **Connected state**: Shows "Connected to ChatGPT" with user email. **Needs reauth state**: Shows message + "Reconnect" button. Style with Tailwind to match existing `ConnectionStatus.tsx`. Depends on T007-T010.
- [x] T012 [US1] Integrate `ChatGPTStatus` into `app/page.tsx` — Add a new section below the Etsy connection area. Import and render `ChatGPTStatus`. Wrap in `Suspense` if needed for consistency with existing pattern.

**Checkpoint**: User Story 1 fully functional — user can connect to ChatGPT via Codex OAuth and see connected status. Connection persists across sessions.

---

## Phase 4: User Story 2 — Test Prompt to Verify Connectivity (Priority: P1) 🎯 MVP

**Goal**: User can send a test prompt to ChatGPT and see the AI's response, confirming the connection works end-to-end.

**Independent Test**: After connecting, click "Test Connection" or type a message, verify ChatGPT responds within 15 seconds.

### Implementation for User Story 2

- [x] T013 [US2] Implement `POST /api/chatgpt/test` route in `app/api/chatgpt/test/route.ts` — Accept `{ message, model? }` body. Validate message (non-empty, max 2000 chars after trim). Default model to `gpt-4o`. Read chatgpt-tokens.json, check connection. If token expired, attempt auto-refresh via `refreshAccessToken`. Call `sendChatGPTPrompt(accessToken, message, model)`. Return `{ success: true, response, model }`. Return 400 for invalid message. Return 401 with `needs_reauth` if not connected or token invalid. Return 502 for ChatGPT API errors. Return 504 for timeout. Per contracts/api-chatgpt.md.
- [x] T014 [US2] Create `TestPrompt` component in `app/components/TestPrompt.tsx` — Client component. **When connected**: Shows "Test Connection" button that sends predefined prompt ("Hello! Please confirm you're working by responding with a brief greeting."). Also shows text input for custom messages with "Send" button. Loading indicator (spinner + "Waiting for ChatGPT...") while request is in flight. Displays ChatGPT's response text in a styled card. Shows error with retry option if request fails. **When disconnected**: Shows disabled state with message "Connect to ChatGPT first to test the connection." (FR-009). Style with Tailwind. Depends on T013.
- [x] T015 [US2] Integrate `TestPrompt` into `app/page.tsx` — Add below `ChatGPTStatus` section. Pass connection status from `ChatGPTStatus` (or have `TestPrompt` poll its own status). Only render the active prompt UI when connected.

**Checkpoint**: User Stories 1 AND 2 fully functional — user can connect and verify the ChatGPT connection works.

---

## Phase 5: User Story 3 — Disconnect ChatGPT Account (Priority: P2)

**Goal**: User can disconnect their ChatGPT account, clearing all stored tokens and returning to the disconnected state.

**Independent Test**: While connected, click "Disconnect ChatGPT", verify status shows disconnected and test prompt is disabled.

### Implementation for User Story 3

- [x] T016 [US3] Implement `POST /api/chatgpt/disconnect` route in `app/api/chatgpt/disconnect/route.ts` — Call `clearChatGPTTokenStore()` to delete `data/chatgpt-tokens.json`. Return `{ disconnected: true }`. Per contracts/api-chatgpt.md.
- [x] T017 [US3] Add disconnect functionality to `ChatGPTStatus` component in `app/components/ChatGPTStatus.tsx` — Add "Disconnect ChatGPT" button shown only in connected state. Clicking it calls `POST /api/chatgpt/disconnect` and resets component to disconnected state. Re-poll status after disconnect to confirm. Test prompt section should become disabled after disconnect.

**Checkpoint**: All 3 user stories independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Error handling, edge cases, and documentation that affect multiple user stories

- [x] T018 [P] Update `.env.example` with complete ChatGPT configuration section including comments explaining the Codex CLI client ID source and redirect URI requirement
- [x] T019 Handle edge case: user's ChatGPT subscription lapses — display OpenAI error clearly and suggest checking subscription status (spec Edge Cases)
- [x] T020 [P] Handle edge case: ChatGPT service outage — display user-friendly error message with retry option (spec Edge Cases)
- [x] T021 Handle edge case: refresh token expires after long inactivity — prompt full re-auth via the OAuth flow (spec Edge Cases, FR-003)
- [x] T022 [P] Handle edge case: user pastes invalid or incomplete callback URL — show clear error with instructions to retry (spec Acceptance Scenario US1-4)
- [x] T023 Ensure all error responses include recovery actions: retry button, reconnect prompt, or link to check subscription (SC-004)
- [x] T024 Run quickstart.md validation — verify full flow (connect → paste URL → test prompt → disconnect) works per documented steps

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories
- **US1 Connect (Phase 3)**: Depends on Foundational — delivers MVP auth flow
- **US2 Test Prompt (Phase 4)**: Depends on Foundational for `lib/chatgpt/api.ts` — can run in parallel with US1 for API route (T013) and component (T014), but page integration (T015) needs US1 wired into page first
- **US3 Disconnect (Phase 5)**: Depends on US1 completion — extends existing ChatGPTStatus component
- **Polish (Phase 6)**: Depends on all user stories being complete

### Within Each User Story

- API routes before UI components that call them
- Components before page integration
- Core implementation before enhancements

### Parallel Opportunities

- T001, T002 can run in parallel (Phase 1)
- T003 types first; then T004, T005, T006 can run in parallel (Phase 2)
- T007/T008 (connect/exchange routes) and T009/T010 (status/refresh routes) can run in parallel (Phase 3)
- T013 (test API route) can run in parallel with T011 (ChatGPTStatus component) once routes are done
- T014 (TestPrompt component) can run in parallel with T016 (disconnect route) once US1 components are done
- T018, T020, T022 can all run in parallel (Phase 6)

---

## Implementation Strategy

### MVP First (User Stories 1 + 2)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 1 (Connect)
4. Complete Phase 4: User Story 2 (Test Prompt)
5. **STOP and VALIDATE**: Test connect → paste URL → send test prompt end-to-end

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add US1 → Test connect independently → Working ChatGPT auth
3. Add US2 → Test prompt independently → **MVP complete!**
4. Add US3 → Test disconnect → Full feature set
5. Polish → Edge cases and robustness

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story is independently completable and testable after Phase 2
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Reuse existing PKCE utilities from `lib/auth/pkce.ts` (generateCodeVerifier, generateCodeChallenge, generateState) — do NOT duplicate
- ChatGPT OAuth tokens use `https://chatgpt.com/backend-api/codex/responses` endpoint (NOT `api.openai.com`)
- The redirect URI is `http://localhost:1455/auth/callback` (Codex CLI's whitelisted URI) — user must copy-paste the URL back to our app
- The OpenAI token exchange endpoint is `https://auth.openai.com/oauth/token`
- All ChatGPT tokens stored separately in `data/chatgpt-tokens.json` (not mixed with Etsy tokens)
