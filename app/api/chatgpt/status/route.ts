import { NextResponse } from "next/server";
import { readChatGPTTokenStore, isChatGPTTokenExpired } from "@/lib/chatgpt/tokens";
import type { ChatGPTConnectionStatus } from "@/lib/types/chatgpt";

export async function GET() {
  const store = readChatGPTTokenStore();

  const hasPending = !!store.pending_oauth;
  const hasToken = !!store.access_token;
  const expired = hasToken && isChatGPTTokenExpired(store);
  const hasRefresh = !!store.refresh_token;
  const needsReauth = hasToken && expired && !hasRefresh;

  const status: ChatGPTConnectionStatus = {
    connected: hasToken && (!expired || hasRefresh),
    user_email: hasToken ? store.user_email : undefined,
    expires_at: hasToken ? store.expires_at : undefined,
    needs_reauth: needsReauth,
    pending: hasPending && !hasToken,
  };

  return NextResponse.json(status);
}
