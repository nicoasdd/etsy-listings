import { NextRequest, NextResponse } from "next/server";
import { readChatGPTTokenStore, writeChatGPTTokenStore } from "@/lib/chatgpt/tokens";
import { exchangeCodeForTokens } from "@/lib/chatgpt/oauth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const callbackUrl: string | undefined = body.callback_url;

    if (!callbackUrl || typeof callbackUrl !== "string") {
      return NextResponse.json(
        { error: "callback_url is required." },
        { status: 400 }
      );
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(callbackUrl);
    } catch {
      return NextResponse.json(
        { error: "Invalid callback URL format. Please paste the complete URL from your browser address bar." },
        { status: 400 }
      );
    }

    const code = parsedUrl.searchParams.get("code");
    const state = parsedUrl.searchParams.get("state");

    if (!code || !state) {
      return NextResponse.json(
        { error: "Invalid callback URL. Missing 'code' or 'state' parameter." },
        { status: 400 }
      );
    }

    const store = readChatGPTTokenStore();

    if (!store.pending_oauth) {
      return NextResponse.json(
        { error: "No pending OAuth flow. Click 'Connect ChatGPT' first." },
        { status: 400 }
      );
    }

    if (store.pending_oauth.state !== state) {
      return NextResponse.json(
        { error: "State mismatch. Please restart the connection flow." },
        { status: 400 }
      );
    }

    const codeVerifier = store.pending_oauth.code_verifier;

    const tokens = await exchangeCodeForTokens(code, codeVerifier);

    writeChatGPTTokenStore({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: tokens.expires_at,
      user_email: tokens.user_email,
      pending_oauth: null,
    });

    return NextResponse.json({
      connected: true,
      user_email: tokens.user_email,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to exchange code with OpenAI", details: message },
      { status: 502 }
    );
  }
}
