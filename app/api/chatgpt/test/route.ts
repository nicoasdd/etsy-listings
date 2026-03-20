import { NextRequest, NextResponse } from "next/server";
import { readChatGPTTokenStore, writeChatGPTTokenStore, isChatGPTTokenExpired } from "@/lib/chatgpt/tokens";
import { refreshAccessToken } from "@/lib/chatgpt/oauth";
import { sendChatGPTPrompt } from "@/lib/chatgpt/api";

const MAX_MESSAGE_LENGTH = 2000;
const DEFAULT_MODEL = "gpt-5.4";

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const rawMessage = body.message;
  if (!rawMessage || typeof rawMessage !== "string") {
    return NextResponse.json(
      { error: "Message is required and must be 2000 characters or less." },
      { status: 400 }
    );
  }

  const message = rawMessage.trim();
  if (message.length === 0 || message.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json(
      { error: "Message is required and must be 2000 characters or less." },
      { status: 400 }
    );
  }

  const model = typeof body.model === "string" && body.model.trim()
    ? body.model.trim()
    : DEFAULT_MODEL;

  const store = readChatGPTTokenStore();

  if (!store.access_token) {
    return NextResponse.json(
      { error: "Not connected to ChatGPT. Please connect first.", needs_reauth: true },
      { status: 401 }
    );
  }

  let accessToken = store.access_token;

  if (isChatGPTTokenExpired(store)) {
    if (!store.refresh_token) {
      return NextResponse.json(
        { error: "ChatGPT session expired. Please reconnect.", needs_reauth: true },
        { status: 401 }
      );
    }

    try {
      const refreshed = await refreshAccessToken(store.refresh_token);
      writeChatGPTTokenStore({
        ...store,
        access_token: refreshed.access_token,
        refresh_token: refreshed.refresh_token,
        expires_at: refreshed.expires_at,
      });
      accessToken = refreshed.access_token;
    } catch {
      return NextResponse.json(
        { error: "Token refresh failed. Please reconnect to ChatGPT.", needs_reauth: true },
        { status: 401 }
      );
    }
  }

  try {
    const result = await sendChatGPTPrompt(accessToken, message, model);
    return NextResponse.json({
      success: true,
      response: result.response,
      model: result.model,
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";

    if (errorMessage === "TIMEOUT") {
      return NextResponse.json(
        { error: "ChatGPT did not respond within the timeout period. Please try again." },
        { status: 504 }
      );
    }

    if (errorMessage.includes("(401)")) {
      return NextResponse.json(
        { error: "ChatGPT authentication failed. Please reconnect.", needs_reauth: true },
        { status: 401 }
      );
    }

    if (errorMessage.includes("(403)")) {
      return NextResponse.json(
        { error: "ChatGPT access denied. Your subscription may have lapsed or this feature may not be available on your plan. Please check your ChatGPT subscription status at chat.openai.com.", needs_reauth: true },
        { status: 401 }
      );
    }

    if (errorMessage.includes("(429)")) {
      return NextResponse.json(
        { error: "ChatGPT rate limit reached. Please wait a moment and try again." },
        { status: 502 }
      );
    }

    return NextResponse.json(
      { error: "ChatGPT request failed. This may be a temporary outage — please try again.", details: errorMessage },
      { status: 502 }
    );
  }
}
