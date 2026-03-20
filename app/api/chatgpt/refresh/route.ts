import { NextResponse } from "next/server";
import { readChatGPTTokenStore, writeChatGPTTokenStore } from "@/lib/chatgpt/tokens";
import { refreshAccessToken } from "@/lib/chatgpt/oauth";

export async function POST() {
  const store = readChatGPTTokenStore();

  if (!store.refresh_token) {
    return NextResponse.json(
      { error: "Token refresh failed. Please reconnect to ChatGPT.", needs_reauth: true },
      { status: 401 }
    );
  }

  try {
    const tokens = await refreshAccessToken(store.refresh_token);

    writeChatGPTTokenStore({
      ...store,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: tokens.expires_at,
    });

    return NextResponse.json({
      refreshed: true,
      expires_at: tokens.expires_at,
    });
  } catch {
    return NextResponse.json(
      { error: "Token refresh failed. Please reconnect to ChatGPT.", needs_reauth: true },
      { status: 401 }
    );
  }
}
