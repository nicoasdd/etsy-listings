# Quickstart: ChatGPT Codex OAuth Integration

**Feature**: 002-chatgpt-codex-oauth | **Date**: 2026-03-20

## Prerequisites

- Existing etsy-listings app running (feature 001 complete)
- A ChatGPT Plus or Pro subscription at [chat.openai.com](https://chat.openai.com)
- The OpenAI Codex CLI client ID (see Configuration below)

## Configuration

Add these variables to your `.env.local` file:

```bash
# OpenAI Codex OAuth settings
OPENAI_CLIENT_ID=<codex-cli-client-id>
OPENAI_REDIRECT_URI=http://localhost:1455/auth/callback
```

**How to find the client ID**: The client ID is embedded in the open-source Codex CLI. You can find it by:
1. Inspecting the Codex CLI source at `github.com/openai/codex`
2. Or capturing it from a Codex CLI login request in your browser's network tab

## New Files

```text
app/api/chatgpt/
├── connect/route.ts       # POST - Start OAuth flow, return authorization URL
├── exchange/route.ts      # POST - Exchange pasted callback URL for tokens
├── status/route.ts        # GET  - ChatGPT connection status
├── disconnect/route.ts    # POST - Clear ChatGPT tokens
├── refresh/route.ts       # POST - Refresh access token
└── test/route.ts          # POST - Send test prompt, return response

lib/chatgpt/
├── oauth.ts               # Build auth URLs, exchange code, refresh tokens
├── tokens.ts              # Read/write chatgpt-tokens.json
└── api.ts                 # Send prompts to ChatGPT backend

lib/types/
└── chatgpt.ts             # ChatGPT-specific TypeScript types

app/components/
├── ChatGPTStatus.tsx       # Connection status, connect/disconnect UI
└── TestPrompt.tsx          # Test prompt input and response display
```

## User Flow

### Connect to ChatGPT

1. Start the app: `npm run dev`
2. Navigate to `http://localhost:3000`
3. In the ChatGPT section, click **Connect ChatGPT**
4. A new browser tab opens with the OpenAI sign-in page
5. Sign in with your ChatGPT account and grant access
6. After granting access, the browser redirects to `localhost:1455` (shows a page-not-found error — this is expected)
7. **Copy the full URL** from the browser address bar
8. Paste the URL into the input field in the app and click **Complete Connection**
9. The app exchanges the code for tokens and shows "Connected to ChatGPT"

### Test the Connection

1. After connecting, a "Test Connection" section appears
2. Click **Test Connection** to send a predefined prompt, or type your own message
3. The app sends the prompt to ChatGPT and displays the response
4. A loading indicator shows while waiting for the response

### Disconnect

1. Click **Disconnect ChatGPT** in the connection section
2. All ChatGPT tokens are cleared
3. The test prompt feature becomes unavailable

## Development Notes

- ChatGPT tokens are stored separately from Etsy tokens in `data/chatgpt-tokens.json`
- All ChatGPT API calls route through Next.js API routes (no direct browser → OpenAI calls)
- The ChatGPT backend endpoint is `https://chatgpt.com/backend-api/codex/responses` (NOT the Platform API)
- Token refresh is automatic when the access token expires
- The `data/` directory is git-ignored

## Verification

After implementation, verify by running through the full flow:

1. `npm run dev` — app starts without errors
2. Click "Connect ChatGPT" — authorization URL opens in new tab
3. Complete OpenAI login → copy callback URL → paste → "Connected" status shows
4. Click "Test Connection" → ChatGPT response appears within 15 seconds
5. Click "Disconnect ChatGPT" → status returns to disconnected
6. Test prompt section is disabled when disconnected
