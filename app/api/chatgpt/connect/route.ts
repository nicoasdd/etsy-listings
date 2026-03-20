import { NextResponse } from "next/server";
import { generateCodeVerifier, generateCodeChallenge, generateState } from "@/lib/auth/pkce";
import { readChatGPTTokenStore, writeChatGPTTokenStore, isChatGPTTokenExpired } from "@/lib/chatgpt/tokens";
import { buildOpenAIAuthorizationUrl } from "@/lib/chatgpt/oauth";

export async function POST() {
  try {
    const store = readChatGPTTokenStore();

    if (store.access_token && !isChatGPTTokenExpired(store)) {
      return NextResponse.json(
        { error: "Already connected to ChatGPT. Disconnect first to reconnect." },
        { status: 409 }
      );
    }

    const state = generateState();
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);

    writeChatGPTTokenStore({
      ...store,
      pending_oauth: { state, code_verifier: codeVerifier },
    });

    const authorizationUrl = buildOpenAIAuthorizationUrl(state, codeChallenge);

    return NextResponse.json({
      authorization_url: authorizationUrl,
      instructions:
        "Open the URL above, sign in to OpenAI, and after being redirected copy the full URL from your browser address bar and paste it below.",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to start ChatGPT OAuth flow", details: message },
      { status: 500 }
    );
  }
}
