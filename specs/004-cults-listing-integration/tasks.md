# Tasks: Cults3D Listing Integration

**Input**: Design documents from `/specs/004-cults-listing-integration/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4, US5, US6)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: Install the new dependency, create types, and build core library modules that all stories depend on.

**CRITICAL**: No user story work can begin until this phase is complete.

- [x] T001 Install `aws4fetch` dependency
  - Run `npm install aws4fetch`
  - This is the only new dependency — justified in plan.md Complexity Tracking (SigV4 signing for S3-compatible cloud storage)

- [x] T002 [P] Create Cults3D types in `lib/types/cults3d.ts`
  - `Cults3DCredentialStore`: `{ username?: string; password?: string; nick?: string; verified?: boolean }`
  - `Cults3DConnectionStatus`: `{ connected: boolean; nick?: string }`
  - `GeneratedCults3DFields`: `{ name: string; description: string; tags: string[]; suggested_category: string }`
  - `Cults3DCategory`: `{ id: string; name: string; children: Cults3DCategory[] }`
  - `Cults3DLicense`: `{ code: string; name: string; url: string; availableOnFreeDesigns: boolean; availableOnPricedDesigns: boolean }`
  - `UploadedFile`: `{ id: string; originalName: string; fileType: "image" | "model"; size: number; status: "uploading" | "complete" | "error"; progress?: number; url?: string; error?: string; previewUrl?: string }`
  - `UploadFileResponse`: `{ success: boolean; url?: string; key?: string; error?: string }`
  - `Cults3DCreateInput`: all fields from data-model.md
  - `Cults3DCreateResult`: `{ success: boolean; url?: string; error?: string; apiErrors?: string[] }`
  - See data-model.md for full field definitions

- [x] T003 [P] Update types in `lib/types/chatgpt.ts` — add dual-marketplace types
  - Add `DualListingFields`: `{ etsy: GeneratedListingFields; cults3d: GeneratedCults3DFields }` (import `GeneratedCults3DFields` from `cults3d.ts`)
  - Add `GenerateDualListingResponse`: `{ success: boolean; fields?: DualListingFields; model?: string; error?: string; needs_reauth?: boolean }`
  - Keep existing `GeneratedListingFields` and `GenerateListingResponse` types (backward compat for existing code that references them)

- [x] T004 [P] Create `lib/cults3d/credentials.ts` — credential file read/write
  - Export `readCults3DCredentials(): Cults3DCredentialStore` — reads `data/cults3d-credentials.json`, returns empty object if file doesn't exist. Same pattern as `lib/auth/tokens.ts` (`readTokenStore`)
  - Export `writeCults3DCredentials(store: Cults3DCredentialStore): void` — writes JSON to `data/cults3d-credentials.json`, creates `data/` dir if needed
  - Export `clearCults3DCredentials(): void` — writes empty object to the file

- [x] T005 [P] Create `lib/cults3d/api.ts` — Cults3D GraphQL client
  - Internal helper `graphqlRequest(query: string, credentials: { username: string; password: string }): Promise<unknown>` — POST to `https://cults3d.com/graphql` with HTTP Basic Auth header (`Authorization: Basic ${btoa(username:password)}`), request body `query=${query}` as form-encoded (per Cults API docs using `-d` flag). Parse JSON response
  - Export `verifyCults3DCredentials(username: string, password: string): Promise<{ nick: string }>` — runs `{ myself { user { nick } } }` query. Throws on auth failure
  - Export `fetchCults3DCategories(credentials): Promise<Cults3DCategory[]>` — runs the categories query from research.md
  - Export `fetchCults3DLicenses(credentials): Promise<Cults3DLicense[]>` — runs the licenses query from research.md
  - Export `createCults3DDesign(credentials, input: Cults3DCreateInput): Promise<{ url: string }>` — builds and runs the `createCreation` mutation. Throws with `apiErrors` if the mutation returns errors

- [x] T006 [P] Create `lib/storage/s3.ts` — S3-compatible upload via aws4fetch
  - Read env vars: `STORAGE_ENDPOINT`, `STORAGE_ACCESS_KEY_ID`, `STORAGE_SECRET_ACCESS_KEY`, `STORAGE_BUCKET`, `STORAGE_PUBLIC_URL`, `STORAGE_REGION`
  - Export `isStorageConfigured(): boolean` — returns true if all required env vars are set
  - Export `uploadFileToStorage(fileBuffer: Buffer, key: string, contentType: string): Promise<string>` — uses `AwsClient` from `aws4fetch` to sign a PUT request to `{endpoint}/{bucket}/{key}` with the file body and Content-Type header. Returns the public URL: `{STORAGE_PUBLIC_URL}/{key}`
  - Export `generateStorageKey(type: "images" | "models", originalName: string): string` — returns `{type}/{Date.now()}-{crypto.randomUUID().slice(0,8)}.{ext}` where ext is extracted from originalName

- [x] T007 Update `.env.example` — add Cults3D and storage environment variables
  - Add a `# Cults3D API` section with `CULTS3D_USERNAME` and `CULTS3D_PASSWORD` placeholders (note: these are only for documentation; actual credentials are stored via the connect flow in `data/cults3d-credentials.json`)
  - Add a `# Cloud Storage (S3-compatible)` section with: `STORAGE_ENDPOINT`, `STORAGE_ACCESS_KEY_ID`, `STORAGE_SECRET_ACCESS_KEY`, `STORAGE_BUCKET`, `STORAGE_PUBLIC_URL`, `STORAGE_REGION`
  - Depends on T006 (to know the exact env var names)

**Checkpoint**: All core library modules exist. Types defined. Credential storage, GraphQL client, and S3 upload functions are ready. Can be tested individually with unit-style manual checks.

---

## Phase 2: User Story 1 — Connect to Cults3D with API Credentials (Priority: P1) MVP

**Goal**: User can enter Cults3D credentials, verify them, see connected status, and disconnect.

**Independent Test**: Enter Cults3D username/password, click Connect, verify the app shows the account nick. Reopen the app and verify connection persists. Click Disconnect and verify it returns to disconnected state.

### Implementation for User Story 1

- [x] T008 [US1] Create `app/api/cults3d/connect/route.ts` — POST per contracts/api-cults3d.md
  - Parse JSON body: `{ username, password }`
  - Validate both are non-empty strings
  - Call `verifyCults3DCredentials(username, password)` from `lib/cults3d/api.ts`
  - On success: call `writeCults3DCredentials({ username, password, nick, verified: true })`, return `{ connected: true, nick }`
  - On auth failure (401 from Cults3D): return 401 `{ error: "Invalid Cults3D credentials...", connected: false }`
  - On network error: return 502 `{ error: "Could not reach the Cults3D API...", connected: false }`
  - Depends on T004, T005

- [x] T009 [P] [US1] Create `app/api/cults3d/status/route.ts` — GET per contracts/api-cults3d.md
  - Read credentials via `readCults3DCredentials()`
  - If `verified === true` and `nick` exists: return `{ connected: true, nick }`
  - Otherwise: return `{ connected: false }`
  - Depends on T004

- [x] T010 [P] [US1] Create `app/api/cults3d/disconnect/route.ts` — POST per contracts/api-cults3d.md
  - Call `clearCults3DCredentials()`
  - Return `{ disconnected: true }`
  - Depends on T004

- [x] T011 [US1] Create `app/components/Cults3DStatus.tsx` — connection UI component
  - Props: `onStatusChange: (connected: boolean) => void`
  - On mount: fetch `GET /api/cults3d/status`, update state and call `onStatusChange`
  - **Disconnected state**: show username + password input fields and "Connect to Cults3D" button. Style matching `ChatGPTStatus.tsx` pattern (rounded-lg border, purple/blue accent to distinguish from orange Etsy theme)
  - **Connecting state**: loading spinner on the button
  - **Connected state**: show "Connected to Cults3D as {nick}" with a "Disconnect" button
  - **Error state**: show error message with retry option
  - Handle connect: POST to `/api/cults3d/connect` with `{ username, password }`, update state
  - Handle disconnect: POST to `/api/cults3d/disconnect`, update state
  - Depends on T008, T009, T010

- [x] T012 [US1] Integrate `Cults3DStatus` into `app/page.tsx`
  - Import `Cults3DStatus` component
  - Add `isCults3DConnected` state with `handleCults3DStatusChange` callback (same pattern as Etsy and ChatGPT)
  - Render `<Cults3DStatus onStatusChange={handleCults3DStatusChange} />` below the `ChatGPTStatus` section
  - Pass `isCults3DConnected` to `ListingGenerator` as a new prop (will be used in later phases)
  - Depends on T011

**Checkpoint**: User Story 1 is functional — user can connect/disconnect Cults3D. Connection persists across page reloads.

---

## Phase 3: User Story 2 — Generate Cults3D Listing Fields from Product Image (Priority: P1)

**Goal**: When the user generates listing fields from an image, both Etsy and Cults3D field sets are produced and displayed.

**Independent Test**: Upload a product image, click Generate Listing, verify both Etsy and Cults3D sections appear with marketplace-specific content.

### Implementation for User Story 2

- [x] T013 [US2] Extend system prompt and parser in `lib/chatgpt/generate.ts`
  - Rename `ETSY_LISTING_SYSTEM_PROMPT` to `DUAL_LISTING_SYSTEM_PROMPT` (or create new alongside old)
  - Extend the prompt to instruct ChatGPT to return a JSON object with two keys: `etsy` (existing schema) and `cults3d` (new schema: `{ name, description, tags, suggested_category }`). Add Cults3D-specific rules from research.md R3:
    - NAME: Clear, descriptive title with design purpose. Include "3D Print" / "STL" when relevant
    - DESCRIPTION: Focus on print specs (layer height, infill, supports), materials, dimensions, use cases
    - TAGS: 5-15 items, 3D printing terms (filament type, printer compat, category terms)
    - CATEGORY: Must be one of Art, Fashion, Jewelry, Home, Architecture, Gadget, Game, Tool, Various
  - Add `parseDualGeneratedFields(rawText: string): DualListingFields` — strips fences, parses JSON, validates both `etsy` and `cults3d` sections. Reuses existing field validation logic for the etsy part. Adds validation for cults3d fields (name non-empty, description non-empty, tags array)
  - Update `sendChatGPTImageGeneration` to use the new dual prompt and return `DualListingFields` instead of `GeneratedListingFields`
  - Depends on T002, T003

- [x] T014 [US2] Update `app/api/chatgpt/generate/route.ts` — return dual-marketplace fields
  - Update the response to match the `GenerateDualListingResponse` shape from contracts/api-cults3d.md (Modified section)
  - The `fields` property now contains `{ etsy: {...}, cults3d: {...} }` instead of a flat object
  - Update error handling types to use `GenerateDualListingResponse`
  - Depends on T013

- [x] T015 [US2] Update `app/components/ListingGenerator.tsx` — display dual fields
  - Update state: `generatedFields` and `editedFields` now use `DualListingFields` type
  - Update the `generate` function to expect the new response shape: `data.fields.etsy` and `data.fields.cults3d`
  - Rename the existing "Generated Listing Fields" section to **"Etsy Listing Fields"** with an Etsy-themed header
  - Add a new **"Cults3D Listing Fields"** section below (initially read-only display):
    - Name (title)
    - Description
    - Tags (as chips)
    - Suggested category
  - Both sections visible after generation. The Etsy section continues to work as before
  - Update `buildPayload` and `handleCopyAsJson` to use `editedFields.etsy` instead of `editedFields` directly
  - Accept new prop `isCults3DConnected: boolean` (from T012)
  - Depends on T013, T014

**Checkpoint**: Dual-marketplace generation works. Both Etsy and Cults3D fields appear after image analysis.

---

## Phase 4: User Story 3 — Upload Preview Images and 3D Model Files (Priority: P2)

**Goal**: User can upload images and 3D model files through the app, which are automatically hosted in cloud storage.

**Independent Test**: Upload a JPEG image and an STL file, verify both show as uploaded with accessible public URLs.

### Implementation for User Story 3

- [x] T016 [US3] Create `app/api/upload/file/route.ts` — POST per contracts/api-upload.md
  - Parse `multipart/form-data`: extract `file` (File) and `type` ("image" | "model")
  - Validate `type` is "image" or "model"
  - Validate file is present and is a File instance
  - Validate file size ≤ 50 MB
  - For `type === "image"`: validate MIME type is `image/jpeg`, `image/png`, or `image/webp`
  - For `type === "model"`: validate file extension is one of `.stl`, `.obj`, `.3mf`, `.step`, `.stp`, `.scad`, `.blend`
  - Check `isStorageConfigured()` — return 503 if not configured
  - Generate storage key via `generateStorageKey()`
  - Read file into Buffer: `Buffer.from(await file.arrayBuffer())`
  - Upload via `uploadFileToStorage(buffer, key, contentType)`
  - Return `{ success: true, url, key }` or error responses per contract
  - Depends on T006

- [x] T017 [US3] Create `app/components/FileUploader.tsx` — drag-and-drop file upload component
  - Props: `type: "image" | "model"`, `label: string`, `accept: string` (MIME/extension filter), `files: UploadedFile[]`, `onFilesChange: (files: UploadedFile[]) => void`, `maxFiles?: number`
  - **Upload zone**: drag-and-drop area or click-to-select. Style matching existing image upload zone in `ListingGenerator.tsx` but with configurable label/accept
  - **File list**: each file shows: filename, size, status indicator (uploading spinner / complete checkmark / error icon). Images show thumbnail preview via `previewUrl`. Model files show filename + extension icon
  - **Upload logic**: on file select, validate client-side (size ≤ 50 MB, format). Add to `files` array with `status: "uploading"`. POST file to `/api/upload/file` with `FormData` including `type`. On success, update `status: "complete"` and set `url`. On error, update `status: "error"` and set `error`
  - **Remove**: each file has a remove button (X). Calls `onFilesChange` with the file removed
  - Depends on T002 (for `UploadedFile` type), T016

**Checkpoint**: File upload infrastructure works end-to-end. Files land in cloud storage with public URLs.

---

## Phase 5: User Story 4 — Review, Edit, and Complete Cults3D Listing Fields (Priority: P2)

**Goal**: User can edit AI-generated Cults3D fields, upload files, select category/license, and fill in pricing.

**Independent Test**: Generate Cults3D fields, edit the name and description, upload an image + STL file, select a category, set a price, verify all fields pass validation.

### Implementation for User Story 4

- [x] T018 [US4] Create `app/api/cults3d/categories/route.ts` — GET per contracts/api-cults3d.md
  - Read credentials via `readCults3DCredentials()`
  - If not connected (no verified credentials): return 401
  - Call `fetchCults3DCategories(credentials)` from `lib/cults3d/api.ts`
  - Return `{ categories: [...] }`
  - On API error: return 502
  - Depends on T004, T005

- [x] T019 [P] [US4] Create `app/api/cults3d/licenses/route.ts` — GET per contracts/api-cults3d.md
  - Read credentials via `readCults3DCredentials()`
  - If not connected: return 401
  - Call `fetchCults3DLicenses(credentials)` from `lib/cults3d/api.ts`
  - Return `{ licenses: [...] }`
  - On API error: return 502
  - Depends on T004, T005

- [x] T020 [US4] Create `app/components/Cults3DListingForm.tsx` — full Cults3D editing form
  - Props: `fields: GeneratedCults3DFields | null`, `imageFile: File | null` (from AI analysis), `isCults3DConnected: boolean`, `onSubmit: (input: Cults3DCreateInput) => void`, `isSubmitting: boolean`, `submitResult: Cults3DCreateResult | null`
  - **AI-generated fields (editable)**:
    - Name: text input
    - Description: textarea
    - Tags: chip/pill UI with add/remove (same pattern as Etsy tags in `ListingGenerator.tsx`)
  - **File upload sections** (using `FileUploader` from T017):
    - Preview images: `type="image"`, accept JPEG/PNG/WebP. If `imageFile` prop is provided, auto-create an `UploadedFile` entry and upload it on mount (FR-015: pre-attach the ChatGPT analysis image)
    - 3D model files: `type="model"`, accept STL/OBJ/3MF/STEP etc.
  - **Category selector**: on mount, fetch `GET /api/cults3d/categories`. Render as a grouped dropdown: top-level categories as option groups, subcategories as options. Store selected `categoryId` and optional `subCategoryIds`
  - **License selector**: on mount, fetch `GET /api/cults3d/licenses`. Filter by free/priced based on whether `downloadPrice === 0`. Render as dropdown with license name and link to license URL
  - **User-provided fields**:
    - Download price: number input (0 = free)
    - Currency: dropdown (EUR, USD, GBP, etc.)
    - Locale: dropdown (EN, FR, DE, ES, etc.)
  - **Validation** (FR-019): before submission, check: name non-empty, description non-empty, ≥1 uploaded image with `status: "complete"`, ≥1 uploaded model with `status: "complete"`, price ≥ 0, currency non-empty, categoryId non-empty. Show inline errors for invalid fields
  - **Submit button**: "Create Listing on Cults3D" — disabled when not connected, when required fields incomplete, or during submission
  - **Result display**: success message with link to Cults3D listing, or error details
  - Style: use a distinct color accent (purple/blue) to differentiate from the orange Etsy section
  - Depends on T002, T015, T017, T018, T019

- [x] T021 [US4] Integrate `Cults3DListingForm` into `app/components/ListingGenerator.tsx`
  - Import and render `Cults3DListingForm` below the Cults3D read-only fields section (from T015)
  - Pass the generated `cults3d` fields, the `imageFile` (for auto-attachment), `isCults3DConnected` prop
  - Make the Cults3D section collapsible/expandable (same pattern as the Etsy details section)
  - Wire up the `onSubmit` callback to call the create route (T022 in next phase)
  - Depends on T015, T020

**Checkpoint**: Full Cults3D form is usable — editing works, files upload, categories/licenses load from API.

---

## Phase 6: User Story 5 — Create a Listing on Cults3D (Priority: P2)

**Goal**: User submits the completed Cults3D listing and a design is created on the platform.

**Independent Test**: Complete all Cults3D fields (including file uploads), click Create, verify design appears on Cults3D with correct name, description, images, and files.

### Implementation for User Story 5

- [x] T022 [US5] Create `app/api/cults3d/create/route.ts` — POST per contracts/api-cults3d.md
  - Parse JSON body as `Cults3DCreateInput`
  - Server-side validation: name non-empty, description non-empty, imageUrls ≥1 valid URL, fileUrls ≥1 valid URL, downloadPrice ≥ 0, currency non-empty, categoryId non-empty. Return 400 with specific missing fields on failure
  - Read credentials via `readCults3DCredentials()`. Return 401 if not connected
  - Call `createCults3DDesign(credentials, input)` from `lib/cults3d/api.ts`
  - On success: return `{ success: true, url }`
  - On Cults3D errors: return 502 `{ success: false, error: "...", apiErrors: [...] }`
  - Depends on T004, T005

- [x] T023 [US5] Wire up Cults3D submission in `app/components/ListingGenerator.tsx`
  - Implement the `handleSubmitToCults3D` function:
    - Collect edited Cults3D fields (name, description, tags)
    - Collect uploaded file URLs: filter `UploadedFile[]` where `status === "complete"`, split into `imageUrls` and `fileUrls`
    - Collect user-provided fields (categoryId, subCategoryIds, downloadPrice, currency, locale, licenseCode)
    - Build `Cults3DCreateInput` object
    - POST to `/api/cults3d/create`
    - Display result (success with link / error with details)
  - Pass this handler as `onSubmit` prop to `Cults3DListingForm`
  - Depends on T021, T022

**Checkpoint**: End-to-end flow works — image → generate → edit → upload files → fill details → create on Cults3D.

---

## Phase 7: User Story 6 — Create Listings on Both Marketplaces Simultaneously (Priority: P3)

**Goal**: User can create listings on both Etsy and Cults3D from the same generation session.

**Independent Test**: Generate fields for both marketplaces, complete both forms, click "Create on Both", verify listings appear on both Etsy and Cults3D.

### Implementation for User Story 6

- [x] T024 [US6] Add "Create on Both" action in `app/components/ListingGenerator.tsx`
  - Add a **"Create on Both Marketplaces"** button in the action bar (visible only when both Etsy and Cults3D are connected and both forms are filled)
  - On click: execute both `handleSubmitToEtsy` and `handleSubmitToCults3D` concurrently (using `Promise.allSettled`)
  - Display per-marketplace results: show success/failure for each marketplace independently
  - If one succeeds and the other fails, clearly indicate which succeeded and which failed with specific error details
  - Depends on T007 (existing Etsy submit), T023 (Cults3D submit)

**Checkpoint**: All 6 user stories are functional.

---

## Phase 8: Polish & Edge Cases

**Purpose**: Error handling refinements, edge case coverage, and documentation.

- [x] T025 [P] Handle cloud storage not configured gracefully in `app/components/FileUploader.tsx`
  - If `POST /api/upload/file` returns 503 (storage not configured), show a clear message: "Cloud storage is not configured. Please set the STORAGE_* environment variables in .env.local."
  - Disable the file upload zones when storage is not configured
  - Can check on component mount by attempting a status check or catching the 503 on first upload

- [x] T026 [P] Handle Cults3D credential invalidation in `app/components/Cults3DStatus.tsx`
  - If any Cults3D API call returns 401 (from categories, licenses, or create routes), update the connection status to disconnected
  - Show a message: "Cults3D credentials are no longer valid. Please reconnect."
  - Propagate the disconnection via `onStatusChange(false)`

- [x] T027 [P] Add category fallback in `app/components/Cults3DListingForm.tsx`
  - If the categories API call fails (502), show an error message and a manual text input for category ID as fallback
  - Display the AI's `suggested_category` as guidance text above the input

- [x] T028 [P] Add free/priced license filtering in `app/components/Cults3DListingForm.tsx`
  - When `downloadPrice` changes to 0, filter licenses to only `availableOnFreeDesigns === true`
  - When `downloadPrice` changes to > 0, filter licenses to only `availableOnPricedDesigns === true`
  - Clear the selected license if it becomes unavailable after a price change

- [x] T029 Run quickstart.md validation — verify all steps in `specs/004-cults-listing-integration/quickstart.md` work end-to-end with a real Cults3D account and cloud storage

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies. T002, T003, T004, T005, T006 can all run in parallel. T007 depends on T006. T001 (npm install) should run first.
- **Phase 2 (US1)**: Depends on T004, T005. T008, T009, T010 can run in parallel. T011 depends on T008-T010. T012 depends on T011.
- **Phase 3 (US2)**: Depends on T002, T003. T013 first, then T014, then T015.
- **Phase 4 (US3)**: Depends on T006. T016 first, then T017.
- **Phase 5 (US4)**: Depends on T015, T017. T018 and T019 can run in parallel. T020 depends on T017-T019. T021 depends on T015, T020.
- **Phase 6 (US5)**: Depends on T021. T022 first, then T023.
- **Phase 7 (US6)**: Depends on T023 (Cults3D submit) and existing Etsy submit.
- **Phase 8 (Polish)**: T025-T028 can run in parallel, anytime after their dependent components exist. T029 runs last.

### Critical Path

```text
T001 (npm install)
  │
  ├──> T002 (cults3d types) ──┐
  ├──> T003 (chatgpt types) ──┤
  │                           ├──> T013 (dual prompt) ──> T014 (generate route) ──> T015 (dual UI)
  ├──> T004 (credentials) ──┐ │                                                       │
  ├──> T005 (graphql client)┤ │                                                       │
  │                         ├──> T008-T010 (connect routes) ──> T011 (Cults3DStatus)   │
  │                         │                                    ──> T012 (page.tsx)    │
  │                         ├──> T018-T019 (categories/licenses routes) ──┐             │
  │                         │                                             │             │
  ├──> T006 (s3 storage) ──> T016 (upload route) ──> T017 (FileUploader) ┤             │
  │                                                                       │             │
  │                         T020 (Cults3DListingForm) <───────────────────┘─────────────┘
  │                             │
  │                         T021 (integrate form into ListingGenerator)
  │                             │
  │                         T022 (create route) ──> T023 (wire submit)
  │                             │
  │                         T024 (Create on Both)
  │
  └──> T007 (.env.example)
```

### Parallel Opportunities

- **Phase 1**: T002, T003, T004, T005, T006 — all different files, no dependencies between them
- **Phase 2**: T008, T009, T010 — different route files
- **Phase 3 + Phase 2**: US1 (connection) and US2 (dual generation) can proceed in parallel since they touch different files
- **Phase 4**: T016 can start as soon as T006 is done, independent of US1/US2
- **Phase 5**: T018, T019 — different route files
- **Phase 8**: T025, T026, T027, T028 — different components

---

## Implementation Strategy

### MVP First (US1 + US2 — Phases 1-3)

1. Complete Phase 1: Types + libraries + dependency
2. Complete Phase 2: Cults3D connection
3. Complete Phase 3: Dual-marketplace generation
4. **STOP and VALIDATE**: Connect Cults3D, upload an image, verify both Etsy and Cults3D fields appear
5. This delivers the core "connect + generate for both marketplaces" value

### Full Cults3D Flow (add US3 + US4 + US5 — Phases 4-6)

6. Add Phase 4: File upload infrastructure
7. Add Phase 5: Full Cults3D editing form with categories/licenses
8. Add Phase 6: Create listing on Cults3D
9. **VALIDATE**: Full end-to-end flow — image → generate → edit → upload → create on Cults3D

### Complete Feature (add US6 + Polish — Phases 7-8)

10. Add Phase 7: Dual-marketplace creation
11. Run Phase 8 polish items
12. Validate with quickstart.md

### Task Count Summary

| Phase | Tasks | Parallel | New Files |
|-------|-------|----------|-----------|
| Phase 1: Setup | 7 | T002-T006 | `lib/types/cults3d.ts`, `lib/cults3d/credentials.ts`, `lib/cults3d/api.ts`, `lib/storage/s3.ts` |
| Phase 2: US1 | 5 | T008-T010 | `app/api/cults3d/connect/route.ts`, `status/route.ts`, `disconnect/route.ts`, `app/components/Cults3DStatus.tsx` |
| Phase 3: US2 | 3 | — | (modifies existing files) |
| Phase 4: US3 | 2 | — | `app/api/upload/file/route.ts`, `app/components/FileUploader.tsx` |
| Phase 5: US4 | 4 | T018-T019 | `app/api/cults3d/categories/route.ts`, `licenses/route.ts`, `app/components/Cults3DListingForm.tsx` |
| Phase 6: US5 | 2 | — | `app/api/cults3d/create/route.ts` |
| Phase 7: US6 | 1 | — | (modifies existing) |
| Phase 8: Polish | 5 | T025-T028 | — |
| **Total** | **29** | | **12 new files, 5 modified files** |

---

## Notes

- The `ListingGenerator.tsx` component is extended incrementally across US2 → US4 → US5 → US6. These phases are sequential for that file.
- `lib/cults3d/api.ts` uses form-encoded body (`query=...`) per the Cults3D curl examples, not JSON body. Verify this matches their API behavior.
- The AI analysis image auto-attachment (FR-015) in T020 uploads the image File from the `ListingGenerator` parent to cloud storage on the Cults3D form mount — deduplicates the upload effort.
- Cloud storage env vars must be set for US3+ to work. US1 and US2 do NOT require cloud storage.
- Cults3D GraphQL category/license IDs are base64-encoded strings (e.g., `"Q2F0ZWdvcnkvMjM="`), not numeric — type them as `string`.
