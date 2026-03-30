# Feature Specification: Cults3D Listing Integration

**Feature Branch**: `004-cults-listing-integration`  
**Created**: 2026-03-23  
**Status**: Draft  
**Input**: User description: "i want now to integrate with cults listings, here is the graphQL api docs: https://cults3d.com/en/pages/graphql and here examples: https://gist.github.com/sunny/07db54478ac030bd277c19cfe734648b so once an image is shared we need also to create all the fields needed on cults, and enable to share the cults api key and create the listing"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Connect to Cults3D with API Credentials (Priority: P1)

As a 3D design seller, I want to enter my Cults3D API credentials (username and password) in the app so that the app can create listings on my Cults3D account.

The user navigates to a connection/settings area and sees a "Connect to Cults3D" section. They enter their Cults3D API username and password. The app verifies the credentials by making a test query to the Cults3D API (e.g., fetching the user's profile). If valid, the app displays the connected Cults3D account name and confirms the connection. The credentials persist across sessions. The user can update or remove their credentials at any time.

**Why this priority**: Without valid Cults3D credentials, no listing creation is possible. This is the foundational capability that gates all Cults3D interactions.

**Independent Test**: Can be fully tested by entering Cults3D credentials, verifying the app shows the connected account name, and confirming the credentials persist after closing and reopening the app. Delivers value by establishing the Cults3D integration link.

**Acceptance Scenarios**:

1. **Given** the user has not configured Cults3D credentials, **When** they navigate to the connection settings, **Then** the app shows a form to enter their Cults3D API username and password.
2. **Given** the user enters valid credentials and clicks "Connect", **When** the app verifies the credentials against the Cults3D API, **Then** the app displays the connected account name and a success confirmation.
3. **Given** the user enters invalid credentials, **When** the app attempts to verify them, **Then** the app displays a clear error message indicating the credentials are incorrect and allows the user to retry.
4. **Given** the user has valid stored credentials, **When** they reopen the app, **Then** the app recognizes the existing connection and shows Cults3D as connected without requiring re-entry.
5. **Given** the user is connected, **When** they click "Disconnect Cults3D", **Then** the app clears the stored credentials and returns to the disconnected state.

---

### User Story 2 - Generate Cults3D Listing Fields from Product Image (Priority: P1)

As a 3D design seller, I want the AI image analysis (from the existing image-based generation feature) to also produce Cults3D-specific listing fields so that I can create listings on Cults3D without manually writing titles and descriptions from scratch.

When the user uploads a product image and generates listing fields (existing feature 003), the AI now also generates Cults3D-specific fields alongside the Etsy fields. The Cults3D fields include: a marketplace-optimized name (title), a rich description tailored to 3D printing buyers, suggested tags, and a suggested category. The generated fields are displayed in a separate Cults3D section next to the Etsy section so the user can see and manage both marketplaces' fields from the same generation result.

**Why this priority**: This is the core value of the feature — extending the AI-powered listing generation to cover Cults3D, saving the seller time by generating marketplace-optimized content for both platforms from a single image upload.

**Independent Test**: Can be fully tested by uploading a product image, generating listing fields, and verifying that both Etsy and Cults3D field sets appear populated with relevant, marketplace-appropriate content. Delivers value by turning a single photo into drafts for two marketplaces.

**Acceptance Scenarios**:

1. **Given** the user is connected to ChatGPT and on the Generate Listing page, **When** they upload a product image and click "Generate Listing", **Then** the app generates both Etsy and Cults3D field sets and displays them in clearly separated sections.
2. **Given** the AI returns Cults3D fields, **When** the user views them, **Then** the following fields are populated: name (title), description, suggested tags, and a suggested category name.
3. **Given** the user provides a brief text description alongside the image, **When** the AI generates fields, **Then** the Cults3D fields reflect the additional context from the description (e.g., mentioning materials or print specifications).
4. **Given** the AI generates Cults3D fields, **When** the user views them, **Then** the description is tailored for 3D printing buyers (mentioning print details, materials, dimensions when inferable from the image).

---

### User Story 3 - Upload Preview Images and 3D Model Files (Priority: P2)

As a 3D design seller, I want to upload my preview images and 3D model files (STL, OBJ, 3MF, etc.) directly through the app so that they are automatically hosted and made available for the Cults3D listing without me having to manage file hosting separately.

The Cults3D listing form includes upload zones for two types of files: preview images and 3D model files. The user drags or selects files from their local machine. The app uploads them to cloud storage and generates publicly accessible URLs automatically. The product image already uploaded for AI analysis (feature 003) is automatically offered as the first preview image, so the user doesn't need to re-upload it. The user can add additional preview images and must upload at least one 3D model file. Upload progress is shown for each file, and the user can remove uploaded files before submission.

**Why this priority**: Cults3D requires publicly accessible URLs for both images and 3D files. Without built-in file hosting, the user would need to manually upload files to an external service and paste URLs — a significant friction point that would make the workflow cumbersome.

**Independent Test**: Can be tested by uploading a preview image and a 3D model file through the app, verifying both show upload confirmation with accessible URLs, and confirming the URLs are reachable from the internet.

**Acceptance Scenarios**:

1. **Given** the user is on the Cults3D listing form, **When** they view the file upload section, **Then** they see separate upload zones for preview images and 3D model files.
2. **Given** the user already uploaded a product image for AI analysis, **When** they view the Cults3D image upload section, **Then** that image is automatically pre-attached as the first preview image.
3. **Given** the user selects a local file (image or 3D model), **When** the upload begins, **Then** the app shows upload progress and, on completion, displays a confirmation with a thumbnail (for images) or filename (for 3D files).
4. **Given** the user has uploaded files, **When** they view the upload section, **Then** they can remove any uploaded file before submission.
5. **Given** the user uploads a file that exceeds the maximum size limit, **When** the upload is attempted, **Then** the app rejects the file and displays the size limit.
6. **Given** the user uploads a file in an unsupported format, **When** the upload is attempted, **Then** the app rejects the file and lists the accepted formats.

---

### User Story 4 - Review, Edit, and Complete Cults3D Listing Fields (Priority: P2)

As a 3D design seller, I want to review and edit the AI-generated Cults3D fields, and fill in the remaining required fields that the AI cannot determine, so that I have a complete and accurate listing ready for submission.

After the AI generates Cults3D fields, the user sees an editable form for the Cults3D listing. AI-generated fields (name, description, tags) are pre-filled and editable. The user must fill in additional required fields: download price, currency, and select a category from the Cults3D category list. They must also upload at least one preview image and one 3D model file (Story 3). Optionally, the user can select subcategories, a license, and a locale. The app fetches the available categories and licenses from the Cults3D API to present as selectable options.

**Why this priority**: AI output needs human review, and several fields require manual input because they involve business decisions (pricing) and file selection. This step ensures listing quality and completeness before submission.

**Independent Test**: Can be tested by generating Cults3D fields, editing the name and description, filling in price/currency, uploading files, selecting a category, and verifying all fields are validated before allowing submission.

**Acceptance Scenarios**:

1. **Given** Cults3D listing fields have been generated, **When** the user views the Cults3D section, **Then** AI-generated fields (name, description, tags) are displayed in editable form inputs.
2. **Given** the user views the Cults3D form, **When** they look at the category selector, **Then** it shows categories and subcategories fetched from the Cults3D API.
3. **Given** the user views the license selector, **When** it loads, **Then** it shows available licenses fetched from the Cults3D API, filtered by whether the design is free or priced.
4. **Given** the user has not filled in all required fields (name, description, at least one uploaded image, at least one uploaded 3D file, price, currency, category), **When** they attempt to submit, **Then** the app shows validation errors for the missing fields.
5. **Given** the user edits the AI-generated description, **When** they view the form, **Then** the edited value persists and is used for submission.

---

### User Story 5 - Create a Listing on Cults3D (Priority: P2)

As a 3D design seller, I want to submit the completed Cults3D listing fields to create a design on Cults3D so that my product appears on the marketplace without leaving the app.

After the user has reviewed, edited, and completed all required fields (including uploaded files), they click "Create Listing on Cults3D." The app uses the cloud-hosted URLs from the uploaded files and sends the complete listing data to the Cults3D API. On success, the app displays a success message with a link to the newly created design on Cults3D. On failure, the app displays the error details returned by Cults3D.

**Why this priority**: Completes the end-to-end workflow from image upload to published listing on Cults3D. Depends on Stories 1-4.

**Independent Test**: Can be tested by completing all Cults3D listing fields (including file uploads) and clicking "Create Listing on Cults3D", then verifying the design appears on the Cults3D platform with the correct content and files.

**Acceptance Scenarios**:

1. **Given** the user has completed all required Cults3D fields (including file uploads) and is connected to Cults3D, **When** they click "Create Listing on Cults3D", **Then** the app sends the listing data (with cloud-hosted file URLs) to the Cults3D API and displays the result.
2. **Given** the Cults3D API returns a success with a listing URL, **When** the listing is created, **Then** the app displays a success message with a clickable link to the new design on Cults3D.
3. **Given** the Cults3D API returns an error, **When** the submission fails, **Then** the app displays the error details so the user can correct the issue and retry.
4. **Given** the user is not connected to Cults3D, **When** they view the Cults3D section, **Then** the "Create Listing on Cults3D" button is disabled with a prompt to connect their Cults3D credentials first.

---

### User Story 6 - Create Listings on Both Marketplaces Simultaneously (Priority: P3)

As a 3D design seller, I want to create listings on both Etsy and Cults3D from the same generation session so that I can publish my product to multiple marketplaces in one workflow.

After generating and editing fields for both marketplaces, the user can choose to create listings on Etsy only, Cults3D only, or both. When creating on both, the app submits to each marketplace independently and reports per-marketplace results.

**Why this priority**: Convenience feature that maximizes the value of the dual-marketplace generation. The core value is delivered by the individual marketplace flows (Stories 1-4 for Cults3D, existing features for Etsy).

**Independent Test**: Can be tested by generating fields for both marketplaces, selecting "Create on Both", and verifying listings appear on both Etsy and Cults3D.

**Acceptance Scenarios**:

1. **Given** the user has completed fields for both Etsy and Cults3D, **When** they choose to create on both marketplaces, **Then** the app submits to each marketplace independently and shows per-marketplace success/failure results.
2. **Given** one marketplace submission succeeds and the other fails, **When** the results are displayed, **Then** the user sees which marketplace succeeded and which failed with specific error details.

---

### Edge Cases

- What happens when the Cults3D API is unreachable or returns a server error? The app should display a user-friendly error message with the option to retry.
- What happens when the user's Cults3D credentials become invalid (e.g., password changed)? The app should detect the authentication failure, inform the user, and prompt them to update their credentials.
- What happens when a file upload to cloud storage fails (network error, storage quota exceeded)? The app should display the error for the specific file and allow the user to retry the upload.
- What happens when the cloud-hosted file URL becomes inaccessible before the Cults3D API fetches it? The Cults3D API may return an error — the app should relay this error clearly and suggest the user re-upload the file.
- What happens when the user uploads a very large 3D model file (e.g., 100+ MB)? The app should enforce a reasonable file size limit and display the limit if exceeded. Upload progress must be clearly visible for large files.
- What happens when the user enters a download price of 0? The app should treat it as a free design and filter available licenses accordingly (only showing licenses available for free designs).
- What happens when the Cults3D categories or licenses API call fails? The app should show an error and allow the user to manually enter a category ID as a fallback.
- What happens when the AI suggests a category that doesn't match any Cults3D category? The app should display the AI suggestion as guidance and let the user select the correct category from the fetched list.
- What happens when the user is connected to Cults3D but not to ChatGPT? The Cults3D listing form should still be usable for manual entry, but the AI generation feature should be disabled with a prompt to connect ChatGPT.
- What happens when the user tries to create a Cults3D listing without uploading any 3D model files? The app should block submission and display a validation error — 3D files are required since Cults3D is a file-sharing marketplace.
- What happens when the user uploads an unsupported 3D file format? The app should reject the file and list accepted formats (e.g., STL, OBJ, 3MF, STEP).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a form to enter and save Cults3D API credentials (username and password).
- **FR-002**: System MUST verify Cults3D credentials by making a test query to the Cults3D API and displaying the result (success with account info, or failure with error).
- **FR-003**: System MUST persist Cults3D credentials locally across sessions, separate from Etsy and ChatGPT tokens.
- **FR-004**: System MUST display a Cults3D connection status indicator (connected/disconnected) alongside the existing Etsy and ChatGPT indicators.
- **FR-005**: System MUST allow the user to disconnect their Cults3D account, clearing stored credentials.
- **FR-006**: System MUST extend the AI image-based listing generation (feature 003) to also produce Cults3D-specific fields: name, description, tags, and a suggested category name.
- **FR-007**: System MUST display the AI-generated Cults3D fields in a separate, clearly labeled section from the Etsy fields.
- **FR-008**: System MUST allow the user to edit all AI-generated Cults3D fields (name, description, tags) before submission.
- **FR-009**: System MUST fetch and display available Cults3D categories and subcategories from the API for the user to select.
- **FR-010**: System MUST fetch and display available Cults3D licenses from the API, filtered by whether the design is free or priced.
- **FR-011**: System MUST provide input fields for user-provided Cults3D data: download price, currency, locale, and license selection.
- **FR-012**: System MUST provide file upload zones for preview images (JPEG, PNG, WebP) and 3D model files (STL, OBJ, 3MF, STEP, and other common 3D formats).
- **FR-013**: System MUST upload user-selected files to cloud storage and generate publicly accessible URLs for use with the Cults3D API.
- **FR-014**: System MUST show upload progress for each file and display confirmation (with thumbnail for images, filename for 3D files) on completion.
- **FR-015**: System MUST automatically pre-attach the product image uploaded for AI analysis (feature 003) as the first preview image for the Cults3D listing, avoiding redundant re-upload.
- **FR-016**: System MUST allow the user to upload multiple preview images and multiple 3D model files for a single listing.
- **FR-017**: System MUST allow the user to remove any uploaded file before submission.
- **FR-018**: System MUST enforce file size limits and reject files that exceed the maximum, displaying the limit to the user.
- **FR-019**: System MUST validate all required Cults3D fields before allowing submission: name, description, at least one uploaded preview image, at least one uploaded 3D model file, download price, currency, and category.
- **FR-020**: System MUST submit the completed Cults3D listing (with cloud-hosted file URLs) to the Cults3D API and display the result (success with listing URL, or failure with error details).
- **FR-021**: System MUST display clear error messages when Cults3D API calls fail (authentication errors, validation errors, server errors) and allow retry.
- **FR-022**: System MUST disable Cults3D listing creation when the user is not connected to Cults3D and show a prompt to connect.

### Key Entities

- **Cults3D Connection**: The authenticated link between the app and the user's Cults3D account. Key attributes: connection status, username, credential validity.
- **Cults3D Listing Fields**: The structured data needed to create a design on Cults3D. Key attributes: name (title), description, tags, category, subcategories, download price, currency, locale, license, uploaded preview images, uploaded 3D model files.
- **Uploaded File**: A file (image or 3D model) uploaded by the user through the app and hosted in cloud storage. Key attributes: original filename, file type (image or 3D model), file size, upload status (uploading/complete/failed), cloud storage URL (publicly accessible).
- **Cults3D Category**: A classification for designs on the Cults3D marketplace. Key attributes: category ID, display name, list of subcategories (each with ID and name).
- **Cults3D License**: Usage rights associated with a design. Key attributes: license code, display name, availability for free designs, availability for priced designs.
- **Cults3D Submission Result**: The outcome of creating a listing on Cults3D. Key attributes: success/failure status, listing URL (on success), error messages (on failure).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can connect their Cults3D account in under 1 minute from entering credentials to seeing a confirmed connection.
- **SC-002**: Users see AI-generated Cults3D fields (name, description, tags, suggested category) alongside Etsy fields after a single image upload, with no additional user action required.
- **SC-003**: Users can complete the full Cults3D listing workflow — connect account, upload image, generate fields, fill in remaining data, and create listing — in under 5 minutes on their first use.
- **SC-004**: 100% of Cults3D API errors display a user-understandable message with a clear recovery action (retry, update credentials, or fix input).
- **SC-005**: Users can create listings on both Etsy and Cults3D from the same image upload session without re-uploading or re-generating.
- **SC-006**: Category and license selection is informed by live data from the Cults3D API, not hardcoded values, ensuring accuracy as the marketplace evolves.
- **SC-007**: Users can upload preview images and 3D model files directly through the app without needing to use a separate file hosting service or manually manage URLs.
- **SC-008**: The product image uploaded for AI analysis is automatically available as a Cults3D preview image, eliminating redundant uploads.

## Assumptions

- The user has a Cults3D account with API access enabled and has received API credentials (username and password) for HTTP Basic Auth.
- The user's Cults3D API credentials grant permission to create designs (creations) via the GraphQL `createCreation` mutation.
- The Cults3D API endpoint (`https://cults3d.com/graphql`) is accessible from the user's machine and supports the documented GraphQL schema.
- The app provides cloud storage integration for hosting uploaded files (preview images and 3D models) at publicly accessible URLs. The user configures cloud storage credentials once (e.g., via environment variables or settings).
- Uploaded files must remain accessible at their cloud URLs long enough for the Cults3D API to fetch them during listing creation. Long-term persistence of uploaded files is a cloud storage configuration concern, not an app concern.
- The product image uploaded for AI analysis (feature 003) can be reused as a Cults3D preview image without re-upload, since it is already available in the app.
- The ChatGPT system prompt (from feature 003) will be extended to include Cults3D marketplace best practices in addition to Etsy practices, generating separate optimized content for each platform.
- The existing ChatGPT connection (feature 002) is a prerequisite for AI-generated Cults3D fields, but the manual Cults3D listing form can work without ChatGPT.
- Cults3D credentials (username/password) are simpler than Etsy OAuth and do not require a redirect flow or token refresh mechanism.
- A single product image is used to generate fields for both marketplaces simultaneously — no separate generation step is needed per marketplace.
- Common 3D model file formats include STL, OBJ, 3MF, and STEP. The accepted format list may be adjusted during implementation based on Cults3D platform requirements.
