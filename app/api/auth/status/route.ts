import { NextResponse } from "next/server";
import { readTokenStore, isTokenExpired } from "@/lib/auth/tokens";
import type { ConnectionStatus } from "@/lib/types/app";

export async function GET() {
  const store = readTokenStore();

  if (!store.access_token || !store.shop_name) {
    const status: ConnectionStatus = {
      connected: false,
      needs_reauth: false,
    };
    return NextResponse.json(status);
  }

  const accessExpired = isTokenExpired(store);

  const status: ConnectionStatus = {
    connected: true,
    shop_name: store.shop_name,
    shop_id: store.shop_id,
    expires_at: store.expires_at,
    needs_reauth: false,
  };

  if (accessExpired) {
    // Access token is expired but refresh token may still be valid.
    // The upload route will attempt a refresh automatically.
    // Only mark needs_reauth if we know the refresh token is also gone.
    // Since we can't check refresh token expiry without trying, we still
    // report connected=true and let the upload flow handle the refresh.
    status.connected = true;
  }

  return NextResponse.json(status);
}
