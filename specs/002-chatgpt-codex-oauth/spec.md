# Feature Specification: ChatGPT Codex OAuth Integration

**Feature Branch**: `002-chatgpt-codex-oauth`  
**Created**: 2026-03-20  
**Status**: Draft  
**Input**: User description: "I want to integrate ChatGPT Codex OAuth so I can use ChatGPT to improve title, description etc."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Connect ChatGPT Account via Codex OAuth (Priority: P1)

As a craft seller, I want to connect my ChatGPT Pro or Plus account to the app using the Codex OAuth flow so that I can use ChatGPT's AI capabilities without paying separate API costs.

The user sees a "Connect ChatGPT" button in the app. Clicking it initiates the OpenAI Codex OAuth authorization flow. The user is redirected to OpenAI's login page where they sign in with their existing ChatGPT Pro/Plus account and confirm access. After authorization, they are redirected back to the app with an authorization code. The app exchanges this for an access token and displays confirmation that ChatGPT is connected. The connection persists across sessions.

**Why this priority**: Without authentication, no AI-powered features are available. This is the foundational capability that gates all future ChatGPT functionality.

**Independent Test**: Can be fully tested by clicking "Connect ChatGPT", completing the OAuth flow with an OpenAI account, and verifying the app shows a connected status. Delivers value by confirming the ChatGPT integration link works.

**Acceptance Scenarios**:

1. **Given** the user has not connected their ChatGPT account, **When** they click "Connect ChatGPT", **Then** the app opens the OpenAI Codex OAuth consent screen in the browser.
2. **Given** the user signs in and grants access on OpenAI, **When** OpenAI redirects back with an authorization code, **Then** the app exchanges the code for an access token and displays a confirmation that ChatGPT is connected.
3. **Given** the user has a valid ChatGPT access token stored, **When** they reopen the app, **Then** the app recognizes the existing connection and shows ChatGPT as connected without re-authentication.
4. **Given** the user denies access on OpenAI or an error occurs, **When** the redirect returns with an error, **Then** the app displays a clear error message and allows the user to retry.
5. **Given** the user's ChatGPT access token has expired, **When** the user tries to use a feature, **Then** the app automatically refreshes the token (if a refresh token is available) or prompts the user to re-authenticate.

---

### User Story 2 - Test Prompt to Verify Connectivity (Priority: P1)

As a craft seller, I want to send a simple test prompt to ChatGPT after connecting so that I can verify the connection is working end-to-end and the AI can respond.

After connecting their ChatGPT account, the user sees a "Test Connection" button or a simple prompt input. They can click the button (which sends a predefined test prompt) or type a short message. The app sends the prompt to ChatGPT via the authenticated Codex connection and displays the AI's response. This confirms that the OAuth tokens are valid and the app can successfully communicate with ChatGPT.

**Why this priority**: Verifying connectivity is essential right after connecting. Without confirming the connection actually works for sending prompts and receiving responses, the user has no confidence the setup succeeded.

**Independent Test**: Can be tested by clicking "Test Connection" after authenticating and verifying a response from ChatGPT is displayed in the app.

**Acceptance Scenarios**:

1. **Given** the user is connected to ChatGPT, **When** they click "Test Connection", **Then** the app sends a predefined test prompt and displays ChatGPT's response.
2. **Given** the user is connected to ChatGPT, **When** they type a custom message and click "Send", **Then** the app sends the message to ChatGPT and displays the response.
3. **Given** the ChatGPT connection has a valid token, **When** the test prompt is sent, **Then** the response appears within a reasonable time with a loading indicator shown while waiting.
4. **Given** the ChatGPT connection has an expired or invalid token, **When** the user sends a test prompt, **Then** the app displays a clear error explaining the connection issue and offers to reconnect.

---

### User Story 3 - Disconnect ChatGPT Account (Priority: P2)

As a craft seller, I want to disconnect my ChatGPT account from the app if I no longer want to use it or want to connect a different account.

The user clicks "Disconnect ChatGPT" in the connection area. The app clears the stored ChatGPT tokens and returns to the disconnected state. The test prompt feature becomes unavailable until the user reconnects.

**Why this priority**: Account management feature needed for completeness. Allows the user to reset their connection or switch accounts.

**Independent Test**: Can be tested by disconnecting while connected and verifying tokens are cleared and the test prompt feature becomes unavailable.

**Acceptance Scenarios**:

1. **Given** the user is connected to ChatGPT, **When** they click "Disconnect ChatGPT", **Then** the app clears all stored ChatGPT tokens and shows a disconnected status.
2. **Given** the user has disconnected, **When** they try to use the test prompt feature, **Then** the app prompts them to reconnect first.

---

### Edge Cases

- What happens when the user's ChatGPT Pro/Plus subscription lapses? The app should display the error from OpenAI clearly and suggest the user check their subscription status.
- What happens when ChatGPT is temporarily unavailable (outage)? The app should display a user-friendly error message.
- What happens when the OAuth redirect fails (e.g., browser blocks popup, network timeout)? The app should show a clear error and allow retry.
- What happens when the user's refresh token expires (long inactivity)? The app should prompt re-authentication via the full OAuth flow.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide an OAuth authorization flow using the OpenAI Codex OAuth mechanism to connect the user's ChatGPT Pro or Plus account.
- **FR-002**: System MUST securely store ChatGPT OAuth tokens locally and persist them across browser sessions.
- **FR-003**: System MUST automatically refresh expired ChatGPT tokens when possible, or prompt re-authentication when not.
- **FR-004**: System MUST display a clear ChatGPT connection status indicator in the app (connected/disconnected).
- **FR-005**: System MUST provide a test prompt feature that sends a message to ChatGPT and displays the response, confirming the connection works end-to-end.
- **FR-006**: System MUST show a loading indicator while waiting for a ChatGPT response to the test prompt.
- **FR-007**: System MUST allow the user to disconnect their ChatGPT account and clear all stored tokens.
- **FR-008**: System MUST gracefully handle ChatGPT errors (timeouts, rate limits, outages, invalid tokens) by displaying user-friendly messages.
- **FR-009**: System MUST disable the test prompt feature when the user is not connected to ChatGPT and show a prompt to connect.

### Key Entities

- **ChatGPT Connection**: Represents the authenticated link between the app and the user's ChatGPT account via Codex OAuth. Key attributes: connection status, access token, refresh token (if available), token expiration time.
- **Test Prompt Exchange**: A request/response pair used to verify the ChatGPT connection. Key attributes: prompt text, response text, success/failure status, response time.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can complete the ChatGPT Codex OAuth connection flow in under 1 minute from clicking "Connect" to seeing a connected status.
- **SC-002**: Users receive a response to the test prompt within 15 seconds of sending it.
- **SC-003**: Users can verify their ChatGPT connection is working (connect + test prompt) in under 2 minutes on their first use.
- **SC-004**: 100% of connection errors display a user-understandable message with a clear recovery action (retry or reconnect).

## Assumptions

- The user has an active ChatGPT Pro or Plus subscription that provides access to the OpenAI Codex OAuth flow.
- The OpenAI Codex OAuth mechanism allows third-party local applications to authenticate and use ChatGPT models through the user's subscription, similar to how OpenClaw integrates with it.
- No additional API costs are incurred by the user since the Codex OAuth flow leverages their existing ChatGPT subscription.
- The OpenAI Codex OAuth redirect URI supports localhost for local development applications.
- This feature lays the groundwork for future AI-powered listing improvement features (title, description, tags) that will be built in a subsequent iteration.
