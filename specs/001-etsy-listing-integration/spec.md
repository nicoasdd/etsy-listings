# Feature Specification: Etsy Craft Listing Uploader

**Feature Branch**: `001-etsy-listing-integration`  
**Created**: 2026-03-20  
**Status**: Draft  
**Input**: User description: "I want to create a local Next app that allows me to integrate with Etsy create craft listing API and auth. It needs to allow you to paste a listings JSON to upload."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Authenticate with Etsy (Priority: P1)

As a craft seller, I want to connect the app to my Etsy shop using my Etsy account so that the app can create listings on my behalf.

The user opens the local app and sees a "Connect to Etsy" button. Clicking it initiates the Etsy OAuth 2.0 authorization flow (with PKCE). The user is redirected to Etsy to grant permission, then redirected back to the local app. Once connected, the app displays the user's Etsy shop name and a confirmation that the connection is active. The app stores the access and refresh tokens locally and automatically refreshes expired tokens.

**Why this priority**: Without authentication, no other functionality is possible. This is the foundational capability that gates all Etsy API interactions.

**Independent Test**: Can be fully tested by clicking "Connect to Etsy", completing the OAuth flow, and verifying the app shows the connected shop name. Delivers value by confirming the integration link is working.

**Acceptance Scenarios**:

1. **Given** the user has not connected their Etsy account, **When** they click "Connect to Etsy", **Then** the app opens the Etsy OAuth consent screen with the required scopes (`listings_w`, `listings_r`, `shops_r`).
2. **Given** the user grants access on Etsy, **When** Etsy redirects back to the app with an authorization code, **Then** the app exchanges the code for an access token and displays the connected shop name.
3. **Given** the user has a valid access token, **When** the token expires, **Then** the app automatically refreshes the token using the stored refresh token without requiring user interaction.
4. **Given** the user denies access on Etsy, **When** Etsy redirects back with an error, **Then** the app displays a clear error message and allows the user to retry.

---

### User Story 2 - Paste and Upload a Single Listing JSON (Priority: P1)

As a craft seller, I want to paste a JSON object representing a listing into the app and submit it so that a draft listing is created in my Etsy shop.

The user navigates to the upload page, pastes a JSON object into a text area that matches the Etsy `createDraftListing` body schema (including fields like `title`, `description`, `price`, `quantity`, `who_made`, `when_made`, `taxonomy_id`, etc.), and clicks "Upload Listing". The app validates the JSON structure, sends it to the Etsy API, and displays a success confirmation with a link to the newly created draft listing on Etsy.

**Why this priority**: This is the core value proposition of the app — uploading craft listings from JSON. Without this, the app has no practical use.

**Independent Test**: Can be tested by pasting valid listing JSON and verifying a draft listing appears in the user's Etsy shop. Delivers immediate value by enabling listing creation through JSON input.

**Acceptance Scenarios**:

1. **Given** the user is authenticated and on the upload page, **When** they paste a valid listing JSON and click "Upload Listing", **Then** the app creates a draft listing on Etsy and displays a success message with a link to the listing.
2. **Given** the user pastes invalid JSON (malformed syntax), **When** they click "Upload Listing", **Then** the app displays a clear error message indicating the JSON is invalid and highlights the issue.
3. **Given** the user pastes a JSON object missing required fields (e.g., `title`, `price`, `quantity`, `who_made`, `when_made`, `taxonomy_id`), **When** they click "Upload Listing", **Then** the app displays validation errors listing the missing required fields before sending anything to Etsy.
4. **Given** the Etsy API returns an error (e.g., invalid `taxonomy_id`, rate limit, server error), **When** the upload is attempted, **Then** the app displays the Etsy error details so the user can correct the issue.

---

### User Story 3 - Paste and Upload Multiple Listings (Priority: P2)

As a craft seller, I want to paste a JSON array of multiple listing objects and upload them all at once so that I can efficiently create several draft listings in a single operation.

The user pastes a JSON array of listing objects into the text area and clicks "Upload Listings". The app processes each listing sequentially, showing a progress indicator and reporting the result (success or failure) for each individual listing.

**Why this priority**: Batch uploading multiplies the value of the single upload feature and saves significant time for sellers with many listings to create.

**Independent Test**: Can be tested by pasting a JSON array with 2-3 listings and verifying each appears as a draft in the Etsy shop. Delivers value by enabling bulk listing creation.

**Acceptance Scenarios**:

1. **Given** the user is authenticated and pastes a valid JSON array of listing objects, **When** they click "Upload Listings", **Then** the app creates a draft listing for each object and shows per-listing success/failure results.
2. **Given** one listing in the array fails (e.g., missing required field), **When** the batch upload runs, **Then** the app continues processing remaining listings and clearly reports which succeeded and which failed with reasons.
3. **Given** the user pastes a single JSON object (not an array), **When** they click "Upload Listings", **Then** the app treats it as a single listing upload and processes it normally.

---

### User Story 4 - View Connection Status and Disconnect (Priority: P3)

As a craft seller, I want to see my current Etsy connection status and be able to disconnect my account if needed.

The app shows the currently connected Etsy shop name and token expiration status. The user can disconnect, which clears all stored tokens and returns the app to the unauthenticated state.

**Why this priority**: Useful for managing the connection lifecycle, but not critical for the core upload workflow.

**Independent Test**: Can be tested by viewing the status page while connected, then disconnecting and verifying the app returns to the unauthenticated state.

**Acceptance Scenarios**:

1. **Given** the user is authenticated, **When** they view the connection status area, **Then** the app displays the connected shop name and token status.
2. **Given** the user is authenticated, **When** they click "Disconnect", **Then** the app clears stored tokens and returns to the unauthenticated state showing the "Connect to Etsy" button.

---

### Edge Cases

- What happens when the user's refresh token expires (after 90 days of inactivity)? The app should prompt the user to re-authenticate via the full OAuth flow.
- What happens when the user pastes extremely large JSON (e.g., 100+ listings)? The app should handle it gracefully, processing listings sequentially with progress feedback and respecting Etsy API rate limits.
- What happens when the user's Etsy shop is in vacation mode or suspended? The app should display the Etsy API error clearly.
- What happens when the user loses network connectivity mid-upload? The app should report which listings succeeded and which failed, allowing the user to retry the failed ones.
- What happens when the pasted JSON contains fields not recognized by the Etsy API? The app should warn the user about unrecognized fields but still attempt the upload (Etsy API may ignore extra fields or return an error).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide an OAuth 2.0 authorization flow with PKCE to connect to the user's Etsy account, requesting `listings_w`, `listings_r`, and `shops_r` scopes.
- **FR-002**: System MUST securely store OAuth access tokens and refresh tokens locally between sessions.
- **FR-003**: System MUST automatically refresh expired access tokens using the stored refresh token without user interaction.
- **FR-004**: System MUST provide a text area where users can paste a JSON object or JSON array representing one or more Etsy listing(s).
- **FR-005**: System MUST validate pasted JSON for correct syntax before attempting to upload.
- **FR-006**: System MUST validate that required Etsy listing fields (`title`, `description`, `price`, `quantity`, `who_made`, `when_made`, `taxonomy_id`) are present before sending to the API.
- **FR-007**: System MUST call the Etsy `createDraftListing` API endpoint for each listing and display success or failure results.
- **FR-008**: System MUST display Etsy API error messages clearly so the user can understand and fix issues.
- **FR-009**: System MUST support batch uploads when a JSON array is pasted, processing each listing and reporting per-listing results.
- **FR-010**: System MUST display the connected Etsy shop name after successful authentication.
- **FR-011**: System MUST allow the user to disconnect their Etsy account, clearing all stored tokens.
- **FR-012**: System MUST handle the Etsy OAuth callback redirect URI on localhost.
- **FR-013**: System MUST provide a way for the user to configure their Etsy App API Key (keystring) for the OAuth flow.

### Key Entities

- **Etsy Connection**: Represents the authenticated link between the app and an Etsy shop. Key attributes: shop name, access token, refresh token, token expiration time, connected status.
- **Listing Payload**: A JSON object representing a single craft listing to upload. Key attributes: title, description, price, quantity, who_made, when_made, taxonomy_id, tags, materials, and other optional Etsy listing fields.
- **Upload Result**: The outcome of an individual listing upload attempt. Key attributes: listing title, success/failure status, Etsy listing URL (if successful), error message (if failed).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can complete the Etsy OAuth connection flow in under 1 minute from clicking "Connect" to seeing their shop name displayed.
- **SC-002**: Users can paste a valid single listing JSON and have a draft listing created on Etsy in under 30 seconds.
- **SC-003**: Users can paste a batch of 10 listings and receive per-listing results within 2 minutes.
- **SC-004**: 100% of JSON syntax errors are caught and reported to the user before any API call is made.
- **SC-005**: 100% of missing required field errors are caught and reported before any API call is made.
- **SC-006**: Users can complete the full workflow (connect + upload first listing) in under 3 minutes on their first use.

## Assumptions

- This is a local-only application intended for a single user (the shop owner) running on their own machine.
- The user has already registered an Etsy developer app and has their App API Key (keystring) available.
- The Etsy developer app has a registered redirect URI pointing to the local app (e.g., `http://localhost:3000/api/auth/callback`). Etsy allows `http://localhost` redirect URIs for development.
- The user is responsible for crafting valid listing JSON payloads that conform to the Etsy `createDraftListing` schema. The app validates structure and required fields but does not provide a form-based listing editor.
- Token storage uses local browser/server-side storage appropriate for a single-user local application (not a production-grade secrets vault).
- The app does not handle image uploads — listings are created as drafts, and images can be added via the Etsy seller dashboard.
