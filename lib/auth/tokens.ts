import { readFileSync, writeFileSync, mkdirSync, existsSync, unlinkSync } from "fs";
import { join } from "path";
import type { TokenStore } from "@/lib/types/app";

const DATA_DIR = join(process.cwd(), "data");
const TOKEN_FILE = join(DATA_DIR, "tokens.json");

function ensureDataDir(): void {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function readTokenStore(): TokenStore {
  try {
    const raw = readFileSync(TOKEN_FILE, "utf-8");
    return JSON.parse(raw) as TokenStore;
  } catch {
    return {};
  }
}

export function writeTokenStore(store: TokenStore): void {
  ensureDataDir();
  writeFileSync(TOKEN_FILE, JSON.stringify(store, null, 2), "utf-8");
}

export function clearTokenStore(): void {
  try {
    if (existsSync(TOKEN_FILE)) {
      unlinkSync(TOKEN_FILE);
    }
  } catch {
    // Ignore errors during cleanup
  }
}

export function isTokenExpired(store: TokenStore): boolean {
  if (!store.expires_at) return true;
  const now = Math.floor(Date.now() / 1000);
  return now >= store.expires_at;
}

/**
 * Refresh tokens have a 90-day TTL. We store expires_at for the access token
 * but have no direct expiry for the refresh token. If a refresh call fails
 * with an auth error, the caller should set needs_reauth = true.
 */
export function extractUserId(accessToken: string): number {
  const dotIndex = accessToken.indexOf(".");
  if (dotIndex === -1) throw new Error("Invalid access token format");
  return parseInt(accessToken.substring(0, dotIndex), 10);
}
