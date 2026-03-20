# Feature Specification: ChatGPT Image-Based Listing Generator

**Feature Branch**: `003-chatgpt-image-listing`  
**Created**: 2026-03-20  
**Status**: Draft  
**Input**: User description: "i want to support send an image to chatGPT so i can provide an image of the product and a quick description, and it creates all the fields needed to create the listing, based on a system prompt that adapts to all the good practices of etsy listing updated to 03/2026"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Upload Product Image and Generate Listing Fields (Priority: P1)

As a craft seller, I want to upload a photo of my product and type a brief description so that ChatGPT analyzes both and generates all the Etsy listing fields I need — saving me time and following Etsy SEO best practices automatically.

The user navigates to a "Generate Listing" area in the app. They see an image upload zone and a text field for a short product description. The user uploads a product photo (JPEG, PNG, or WebP) and types a brief description such as "Handmade ceramic mug with blue glaze, 12oz." They click "Generate Listing." The app sends the image and description to ChatGPT along with a curated system prompt that encodes Etsy listing best practices (as of March 2026). ChatGPT returns a structured response containing all the listing fields: an SEO-optimized title, a detailed description, up to 13 tags, materials, suggested styles, and a recommended category. The generated fields are displayed in a structured, readable form for the user to review.

**Why this priority**: This is the core value of the feature — turning a product photo and a quick note into a complete, optimized Etsy listing. Without this, the feature has no purpose.

**Independent Test**: Can be fully tested by uploading a product image, typing a brief description, clicking "Generate Listing," and verifying that all listing fields appear populated with relevant, SEO-aware content. Delivers value by converting a photo into a ready-to-use listing draft.

**Acceptance Scenarios**:

1. **Given** the user is connected to ChatGPT and on the Generate Listing page, **When** they upload a product image and type a brief description, **Then** the app sends both to ChatGPT and displays all generated listing fields within a reasonable time.
2. **Given** the user clicks "Generate Listing," **When** ChatGPT processes the request, **Then** the app shows a loading indicator until the response is ready.
3. **Given** ChatGPT returns a valid response, **When** the response is parsed, **Then** the following fields are populated: title, description, tags (up to 13), materials, and suggested category name.
4. **Given** the user uploads an image without providing a text description, **When** they click "Generate Listing," **Then** the app still generates listing fields based on the image alone (description is optional, not required).
5. **Given** ChatGPT returns an error or times out, **When** the app receives the failure, **Then** the app displays a clear error message and allows the user to retry.

---

### User Story 2 - Review and Edit Generated Fields Before Use (Priority: P1)

As a craft seller, I want to review and edit the AI-generated listing fields before using them so that I can correct any inaccuracies, adjust wording, or add personal touches.

After generation completes, each field is displayed in an editable form. The user can modify the title, rewrite parts of the description, add or remove tags, adjust materials, and change the suggested category. Each field shows its constraints (e.g., title max 140 characters, max 13 tags) so the user stays within Etsy limits. The user can regenerate individual fields or the entire listing if unsatisfied.

**Why this priority**: AI output is a strong starting point but rarely perfect. The ability to review and edit before committing is essential for user trust and listing quality.

**Independent Test**: Can be tested by generating a listing, modifying several fields (title, tags, description), and verifying the edits persist and respect field constraints (character limits, tag counts).

**Acceptance Scenarios**:

1. **Given** listing fields have been generated, **When** the user views them, **Then** each field is displayed in an editable form with its constraints visible (e.g., character count for title, tag count).
2. **Given** the user edits the title, **When** they exceed 140 characters, **Then** the app shows a warning indicating the title is too long.
3. **Given** the user removes a tag, **When** they view the tags list, **Then** the tag count updates accordingly.
4. **Given** the user is unsatisfied with all generated fields, **When** they click "Regenerate," **Then** the app sends the same image and description to ChatGPT again and replaces the fields with the new response.

---

### User Story 3 - Use Generated Fields to Create an Etsy Listing (Priority: P2)

As a craft seller, I want to take the generated (and optionally edited) fields and use them to create a draft listing on Etsy so that the workflow from photo to published listing is seamless.

After reviewing the generated fields, the user fills in the remaining required fields that the AI cannot determine — price, quantity, who made it, and when it was made. The user then clicks "Create Listing on Etsy." The app combines the AI-generated fields with the user-provided fields, formats them as the Etsy listing JSON, and sends them to the existing listing upload flow (from feature 001). The result (success or failure) is displayed.

**Why this priority**: Connects the AI generation feature to the existing Etsy upload flow, completing the end-to-end workflow. Depends on Story 1 and the existing upload feature (001).

**Independent Test**: Can be tested by generating fields, filling in price/quantity/who_made/when_made, clicking "Create Listing on Etsy," and verifying a draft listing appears in the Etsy shop with the correct content.

**Acceptance Scenarios**:

1. **Given** the user has generated and reviewed listing fields, **When** they fill in price, quantity, who_made, and when_made and click "Create Listing on Etsy," **Then** the app sends the combined payload to Etsy and displays the result.
2. **Given** the user has not filled in all required user-provided fields (price, quantity, who_made, when_made), **When** they click "Create Listing on Etsy," **Then** the app shows validation errors for the missing fields.
3. **Given** the Etsy API returns a success, **When** the draft listing is created, **Then** the app displays a success message with a link to the listing on Etsy.
4. **Given** the Etsy API returns an error, **When** the upload fails, **Then** the app displays the error details so the user can correct the issue.

---

### User Story 4 - Copy Generated Fields as JSON (Priority: P3)

As a craft seller, I want to copy the generated listing fields as a JSON object so that I can paste it into the existing JSON upload area or save it for later use.

After fields are generated and optionally edited, the user clicks "Copy as JSON." The app formats all generated fields as a JSON object matching the Etsy `createDraftListing` schema and copies it to the clipboard. A confirmation toast is shown.

**Why this priority**: Provides flexibility for users who prefer the existing JSON paste workflow or want to store templates. Low effort to implement given the data is already structured.

**Independent Test**: Can be tested by generating fields, clicking "Copy as JSON," pasting into a text editor, and verifying valid JSON matching the Etsy listing schema.

**Acceptance Scenarios**:

1. **Given** listing fields have been generated, **When** the user clicks "Copy as JSON," **Then** a valid JSON object matching the Etsy listing schema is copied to the clipboard.
2. **Given** the user has edited some fields after generation, **When** they click "Copy as JSON," **Then** the copied JSON reflects the edited values, not the original generated values.

---

### Edge Cases

- What happens when the uploaded image is too large (over 20 MB)? The app should reject the image before sending and display a file size limit message.
- What happens when the uploaded image format is unsupported (e.g., TIFF, BMP)? The app should reject the file and list the accepted formats (JPEG, PNG, WebP).
- What happens when the product image is blurry or very dark? ChatGPT should still attempt to generate fields; the quality of output may vary, and the user can edit.
- What happens when ChatGPT's response does not conform to the expected structured format? The app should detect the malformed response, display an error, and allow the user to retry.
- What happens when the user is not connected to ChatGPT? The app should disable the Generate Listing feature and prompt the user to connect first.
- What happens when the user is connected to ChatGPT but not connected to Etsy? The Generate Listing feature should still work (it only requires ChatGPT), but the "Create Listing on Etsy" button should be disabled with a prompt to connect Etsy.
- What happens when ChatGPT suggests a category that does not match any Etsy taxonomy ID? The app should display the suggested category name as guidance and let the user manually select or enter the correct taxonomy ID.
- What happens when the user uploads multiple images? The app should accept only one image per generation request and clearly communicate this limit.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide an image upload area that accepts JPEG, PNG, and WebP files up to 20 MB.
- **FR-002**: System MUST provide a text input field for an optional brief product description alongside the image.
- **FR-003**: System MUST send the uploaded image (base64-encoded) and the text description to ChatGPT using the authenticated Codex connection (from feature 002).
- **FR-004**: System MUST include a curated system prompt with the ChatGPT request that encodes Etsy listing best practices as of March 2026, including SEO optimization for titles, descriptions, and tags.
- **FR-005**: System MUST instruct ChatGPT to return a structured response (JSON) containing at minimum: title, description, tags, and materials.
- **FR-006**: System MUST parse ChatGPT's structured response and display each field in an editable form.
- **FR-007**: System MUST enforce Etsy field constraints in the editing form: title max 140 characters, max 13 tags, max 2 styles, and tag character restrictions.
- **FR-008**: System MUST show a loading indicator while waiting for ChatGPT to generate the listing fields.
- **FR-009**: System MUST allow the user to regenerate all fields by re-sending the same image and description to ChatGPT.
- **FR-010**: System MUST allow the user to provide the remaining required fields (price, quantity, who_made, when_made) that the AI does not generate.
- **FR-011**: System MUST validate all required fields (both AI-generated and user-provided) before allowing submission to Etsy.
- **FR-012**: System MUST integrate with the existing Etsy listing upload flow (feature 001) to create a draft listing from the combined fields.
- **FR-013**: System MUST provide a "Copy as JSON" action that copies the generated fields as a valid Etsy listing JSON object to the clipboard.
- **FR-014**: System MUST display clear error messages when ChatGPT fails (timeout, malformed response, connection error) and allow retry.
- **FR-015**: System MUST disable the generation feature when the user is not connected to ChatGPT and show a prompt to connect.
- **FR-016**: System MUST display the image preview after upload so the user can confirm the correct image before generating.

### Key Entities

- **Product Image**: The uploaded photograph of the craft product. Key attributes: file data, file type (JPEG/PNG/WebP), file size, base64 encoding for API transmission.
- **Product Description**: The optional brief text the user provides alongside the image. Key attributes: free-form text, used to give ChatGPT additional context.
- **System Prompt**: The curated instruction set sent to ChatGPT that encodes Etsy listing best practices (March 2026). Key attributes: SEO guidelines for titles and descriptions, tag optimization strategies, materials and category guidance, structured JSON output format instructions.
- **Generated Listing Fields**: The structured output returned by ChatGPT after analyzing the image and description. Key attributes: title, description, tags (up to 13), materials, suggested styles, suggested category name.
- **Combined Listing Payload**: The merge of AI-generated fields with user-provided fields (price, quantity, who_made, when_made, taxonomy_id) ready for Etsy submission. Follows the existing ListingPayload schema from feature 001.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can go from uploading a product photo to seeing all generated listing fields in under 30 seconds (excluding ChatGPT response time variability).
- **SC-002**: Generated titles use relevant keywords and stay within the 140-character Etsy limit 100% of the time.
- **SC-003**: Generated tag sets contain between 10 and 13 tags per listing, maximizing the Etsy tag allowance.
- **SC-004**: Users can complete the full workflow — upload image, generate fields, review/edit, and create a draft listing on Etsy — in under 5 minutes on their first use.
- **SC-005**: 100% of ChatGPT errors display a user-understandable message with a clear recovery action (retry or reconnect).
- **SC-006**: Users can edit any generated field before submission, with real-time constraint feedback (character counts, tag limits).

## Assumptions

- The user has already connected their ChatGPT account via the Codex OAuth flow (feature 002) before using this feature.
- The ChatGPT model (`gpt-4o`) supports image/vision input through the Codex backend API endpoint, accepting base64-encoded images in the request payload.
- The user has already connected their Etsy account (feature 001) if they want to create a listing on Etsy; ChatGPT generation works independently of Etsy connectivity.
- The system prompt for Etsy best practices is maintained by the application developer and is not user-editable. It covers: SEO-optimized titles (front-loading keywords), keyword-rich descriptions, long-tail tag strategy, accurate materials listing, and category guidance.
- ChatGPT can reliably return structured JSON output when properly instructed via the system prompt, using the `instructions` field in the Codex Responses API.
- A single product image is sufficient for generating listing fields. Multiple image support may be added in a future iteration.
- The AI does not generate price, quantity, who_made, or when_made — these are business decisions that must come from the seller.
- The AI suggests a category name in plain text; the user is responsible for mapping it to the correct Etsy `taxonomy_id`. A future enhancement could add taxonomy search/autocomplete.
