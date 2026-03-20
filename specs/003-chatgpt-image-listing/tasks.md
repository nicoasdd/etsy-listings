# Tasks: ChatGPT Image-Based Listing Generator

**Input**: Design documents from `/specs/003-chatgpt-image-listing/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

---

## Phase 1: Foundational (Types + Core Library)

**Purpose**: Types, system prompt, and ChatGPT image generation function — everything needed before UI work.

**CRITICAL**: No user story work can begin until this phase is complete.

- [X] T001 [P] Add `GeneratedListingFields` and `GenerateListingResponse` types to `lib/types/chatgpt.ts`
  - `GeneratedListingFields`: `{ title: string; description: string; tags: string[]; materials: string[]; styles: string[]; suggested_category: string }`
  - `GenerateListingResponse`: `{ success: boolean; fields?: GeneratedListingFields; model?: string; error?: string; needs_reauth?: boolean }`
  - See data-model.md for full field definitions

- [X] T002 [P] Create `lib/chatgpt/generate.ts` — system prompt constant + image generation function
  - Export `ETSY_LISTING_SYSTEM_PROMPT` — the curated system prompt encoding Etsy SEO best practices from research.md R4 (title optimization, description structure, 13 tags strategy, materials, styles, category suggestion). Prompt must instruct ChatGPT to respond ONLY with a JSON object matching the `GeneratedListingFields` schema (no markdown fences, no commentary)
  - Export `sendChatGPTImageGeneration(accessToken: string, imageBase64: string, mimeType: string, description?: string): Promise<{ fields: GeneratedListingFields; model: string }>` — builds the Codex Responses API payload with `input_image` (base64 data URL) and optional `input_text` content blocks per research.md R1. Uses 60-second timeout per R6. Reuses `collectStreamedResponse` from `lib/chatgpt/api.ts` (export it if currently unexported)
  - Export `parseGeneratedFields(rawText: string): GeneratedListingFields` — strips markdown code fences if present, parses JSON, validates all required fields exist and conform to constraints (title ≤ 140 chars, tags ≤ 13 items each ≤ 20 chars, styles ≤ 2 items). Throws descriptive error if parsing or validation fails

- [X] T003 Create `app/api/chatgpt/generate/route.ts` — POST endpoint per contracts/api-generate.md
  - Parse `multipart/form-data` request body (use Next.js `request.formData()`)
  - Validate: image file present, MIME type is `image/jpeg`, `image/png`, or `image/webp`, file size ≤ 20 MB
  - Read ChatGPT token store, check expiry, auto-refresh if needed (same pattern as `app/api/chatgpt/test/route.ts`)
  - Convert image `File` to base64 string via `Buffer.from(await file.arrayBuffer()).toString("base64")`
  - Call `sendChatGPTImageGeneration` with the token, base64 image, MIME type, and optional description
  - Call `parseGeneratedFields` on the raw response
  - Return `GenerateListingResponse` JSON
  - Handle all error cases: 400 (validation), 401 (auth), 502 (ChatGPT error / malformed response), 504 (timeout)
  - Depends on T001, T002

**Checkpoint**: API endpoint is functional — can be tested with `curl` or Postman by POSTing a product image.

---

## Phase 2: User Story 1 — Upload Product Image and Generate Listing Fields (Priority: P1) MVP

**Goal**: User can upload a product photo, optionally add a description, click "Generate Listing," and see all AI-generated listing fields.

**Independent Test**: Upload a product image, click Generate, verify all fields (title, description, tags, materials, styles, suggested category) appear populated.

### Implementation for User Story 1

- [X] T004 [US1] Create `app/components/ListingGenerator.tsx` — image upload and generation UI
  - Component state: `imageFile`, `imagePreview` (object URL), `description`, `isGenerating`, `generatedFields`, `generationError`
  - **Image upload zone**: drag-and-drop or click-to-select. Accept `image/jpeg, image/png, image/webp`. Client-side validation: file size ≤ 20 MB, file type check. Display image preview after upload (FR-016). Show file name and size. Allow clearing/replacing the image
  - **Description text field**: optional, placeholder "Brief product description (optional)"
  - **Generate button**: "Generate Listing" — disabled when no image uploaded or when generating. Shows loading spinner with "Analyzing image..." text during generation (FR-008)
  - **API call**: POST to `/api/chatgpt/generate` with `FormData` containing `image` file and `description` string
  - **Generated fields display** (read-only in this task — editing comes in US2): show title, description, tags (as chips/pills), materials (as list), styles, suggested category. Each field labeled clearly
  - **Error display**: show `generationError` with retry button. Handle `needs_reauth` by showing "Connect ChatGPT" prompt (FR-014, FR-015)
  - Style with Tailwind CSS following existing component patterns (rounded-lg borders, bg-white, text-gray-900, orange accents)

- [X] T005 [US1] Integrate `ListingGenerator` into `app/page.tsx`
  - Import `ListingGenerator` component
  - Render it when `isChatGPTConnected` is true, below the `TestPrompt` section and above the "Upload Listings" section
  - Wrap in a card container matching existing page style: `<div className="rounded-lg border border-gray-200 bg-white p-6">`
  - Pass `isEtsyConnected={isConnected}` prop so the component can conditionally show/hide the "Create Listing on Etsy" button (US3)
  - When ChatGPT is not connected, do not render the component (FR-015 — handled by the existing `isChatGPTConnected` conditional)
  - Depends on T004

**Checkpoint**: User Story 1 is functional — user can upload an image, generate fields, and see results. Fields are read-only at this point.

---

## Phase 3: User Story 2 — Review and Edit Generated Fields (Priority: P1)

**Goal**: User can edit every generated field with real-time constraint feedback before using them.

**Independent Test**: Generate fields, then modify the title (verify character counter), add/remove tags (verify count), edit description. Verify edits persist and constraints are enforced.

### Implementation for User Story 2

- [X] T006 [US2] Extend `app/components/ListingGenerator.tsx` — editable form with constraints
  - Convert the read-only field display from T004 into editable inputs:
    - **Title**: `<input>` with real-time character counter (`X / 140`). Show warning (red text) when exceeding 140 chars (FR-007)
    - **Description**: `<textarea>` with auto-resize or fixed height
    - **Tags**: Chip/pill UI — each tag shown as a removable chip. Input field to add new tags. Show counter (`X / 13`). Enforce max 20 chars per tag. Prevent adding more than 13 tags (FR-007)
    - **Materials**: Editable list — each material as a removable item. Input to add new materials
    - **Styles**: Up to 2 editable text inputs (FR-007)
    - **Suggested Category**: Read-only text display (informational — user maps to taxonomy_id in US3)
  - Add **"Regenerate"** button — clears current fields, re-sends the same image and description to `/api/chatgpt/generate`, replaces fields with new response (FR-009). Disabled during generation
  - All edits update local component state (`editedFields` separate from `generatedFields` so regeneration replaces cleanly)
  - Depends on T004

**Checkpoint**: User Story 2 is functional — all fields are editable with live constraint feedback. Regenerate works.

---

## Phase 4: User Story 3 — Create Etsy Listing from Generated Fields (Priority: P2)

**Goal**: User fills in remaining required fields (price, quantity, who_made, when_made, taxonomy_id) and creates a draft listing on Etsy.

**Independent Test**: Generate and edit fields, fill in price/quantity/who_made/when_made/taxonomy_id, click "Create Listing on Etsy," verify draft listing appears in Etsy shop.

### Implementation for User Story 3

- [X] T007 [US3] Extend `app/components/ListingGenerator.tsx` — user-provided fields form + Etsy submission
  - Add a collapsible/expandable section below the AI-generated fields: **"Listing Details (Required for Etsy)"**
  - Input fields for user-provided values:
    - **Price**: number input, positive non-zero, with $ prefix
    - **Quantity**: integer input, positive non-zero
    - **Who Made**: select dropdown with options `i_did`, `someone_else`, `collective`
    - **When Made**: select dropdown with full `WhenMade` enum values from `lib/types/etsy.ts`
    - **Taxonomy ID**: number input with helper text showing the AI's `suggested_category` as guidance
    - **Shipping Profile ID**: optional number input
  - **Validation** (FR-011): before submission, check all required fields (both AI-generated: title, description, tags + user-provided: price, quantity, who_made, when_made, taxonomy_id). Show inline error messages for missing/invalid fields
  - **"Create Listing on Etsy"** button — visible only when `isEtsyConnected` prop is true. Disabled when required fields are incomplete or during submission. Show loading state during submission
  - **Submission logic**: build a `ListingPayload` JSON object from editedFields + userFields. POST it as JSON string to `/api/listings/upload` (reuses existing route — same as the JSON editor flow)
  - **Result display**: on success, show green success message with link to the Etsy listing. On error, show the error details (same display pattern as `UploadResults` component)
  - When Etsy is not connected, show disabled button with text "Connect Etsy to create listings"
  - Depends on T006

**Checkpoint**: End-to-end flow works — image → generate → edit → fill details → create draft on Etsy.

---

## Phase 5: User Story 4 — Copy Generated Fields as JSON (Priority: P3)

**Goal**: User can copy the current (edited) listing fields as a JSON object to the clipboard.

**Independent Test**: Generate fields, optionally edit them, click "Copy as JSON," paste into a text editor, verify valid JSON matching Etsy listing schema.

### Implementation for User Story 4

- [X] T008 [US4] Extend `app/components/ListingGenerator.tsx` — "Copy as JSON" action
  - Add **"Copy as JSON"** button in the actions bar (next to "Regenerate" and "Create Listing on Etsy")
  - On click: build a `ListingPayload`-shaped JSON object from the current edited AI fields + any user-provided fields that have been filled in. Omit fields that are empty/undefined. Use `navigator.clipboard.writeText(JSON.stringify(payload, null, 2))`
  - Show a brief confirmation toast or inline text ("Copied!" that fades after 2 seconds) (FR-013)
  - The copied JSON reflects the **edited** values, not the original generated values
  - Button always available once fields are generated (does not require Etsy connection)
  - Depends on T006

**Checkpoint**: All 4 user stories are functional.

---

## Phase 6: Polish & Edge Cases

**Purpose**: Error handling refinements, edge case coverage, and cross-cutting improvements.

- [X] T009 [P] Add client-side file validation feedback in `app/components/ListingGenerator.tsx`
  - Unsupported file format: show "Accepted formats: JPEG, PNG, WebP" message with the list of accepted types
  - File too large: show "Image must be under 20 MB (yours: X MB)" message
  - Multiple files dropped: accept only the first, show "Only one image per generation" message
  - These validations happen before the file is set in state (no API call wasted)

- [X] T010 [P] Handle malformed ChatGPT response gracefully in `lib/chatgpt/generate.ts`
  - If `parseGeneratedFields` receives a string that isn't valid JSON even after stripping code fences, throw a clear error: "ChatGPT returned an unexpected format. Please try again."
  - If the parsed JSON is missing required fields (title, description, tags, materials), throw with specifics: "ChatGPT response missing: {fields}. Please try again."
  - If tags exceed 13 or title exceeds 140 chars, silently truncate rather than failing (defensive normalization)

- [X] T011 Run quickstart.md validation — verify all steps in `specs/003-chatgpt-image-listing/quickstart.md` work end-to-end with a real product image

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Foundational)**: No dependencies on other phases. T001 and T002 can run in parallel. T003 depends on T001 + T002.
- **Phase 2 (US1)**: Depends on Phase 1 completion. T004 depends on T003. T005 depends on T004.
- **Phase 3 (US2)**: Depends on T004. T006 extends the same component.
- **Phase 4 (US3)**: Depends on T006. T007 extends the same component.
- **Phase 5 (US4)**: Depends on T006. T008 can run in parallel with T007 (both extend the component in different areas).
- **Phase 6 (Polish)**: T009 and T010 can run in parallel with Phases 3-5. T011 runs last.

### Critical Path

```text
T001 ──┐
       ├──> T003 ──> T004 ──> T005
T002 ──┘              │
                      ├──> T006 ──> T007 (US3)
                      │         ├──> T008 (US4, parallel with T007)
                      │
                      T009 (parallel, anytime after T004)
                      T010 (parallel, anytime after T002)
```

### Parallel Opportunities

- T001 and T002 — different files (`lib/types/chatgpt.ts` vs `lib/chatgpt/generate.ts`)
- T007 and T008 — extend different sections of ListingGenerator (US3 adds form + submit, US4 adds copy button)
- T009 and T010 — different files (component vs library), can run alongside US2-US4
- T011 — manual validation, runs after all other tasks

---

## Implementation Strategy

### MVP First (User Story 1 + 2 — Phases 1-3)

1. Complete Phase 1: Types + generate function + API route
2. Complete Phase 2: Image upload UI + field display
3. Complete Phase 3: Editable form with constraints
4. **STOP and VALIDATE**: Upload a real product image, verify generation + editing works
5. This delivers the core "image to listing fields" value

### Full Feature (add US3 + US4 — Phases 4-5)

6. Add Phase 4: Etsy submission integration
7. Add Phase 5: Copy as JSON
8. Run Phase 6 polish items
9. Validate with quickstart.md

### Task Count Summary

| Phase | Tasks | Parallel | Files Touched |
|-------|-------|----------|---------------|
| Phase 1: Foundational | 3 | T001, T002 | `lib/types/chatgpt.ts`, `lib/chatgpt/generate.ts`, `app/api/chatgpt/generate/route.ts` |
| Phase 2: US1 | 2 | — | `app/components/ListingGenerator.tsx`, `app/page.tsx` |
| Phase 3: US2 | 1 | — | `app/components/ListingGenerator.tsx` |
| Phase 4: US3 | 1 | — | `app/components/ListingGenerator.tsx` |
| Phase 5: US4 | 1 | with T007 | `app/components/ListingGenerator.tsx` |
| Phase 6: Polish | 3 | T009, T010 | `app/components/ListingGenerator.tsx`, `lib/chatgpt/generate.ts` |
| **Total** | **11** | | |

---

## Notes

- `lib/chatgpt/api.ts` may need `collectStreamedResponse` exported (currently unexported). If so, add a one-line export in T002 as part of creating `generate.ts`.
- The `ListingGenerator.tsx` component is built incrementally across US1 → US2 → US3 → US4. Each phase extends it, so they must be sequential.
- No new npm dependencies. All functionality uses native browser APIs (File, FormData, clipboard) and existing project infrastructure.
- The system prompt in `generate.ts` should be a single multiline string constant for easy updating. It encodes the best practices from research.md R4.
