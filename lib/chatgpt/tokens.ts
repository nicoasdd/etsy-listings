import { readFileSync, writeFileSync, mkdirSync, existsSync, unlinkSync } from "fs";
import { join } from "path";
import type { ChatGPTTokenStore } from "@/lib/types/chatgpt";

const DATA_DIR = join(process.cwd(), "data");
const TOKEN_FILE = join(DATA_DIR, "chatgpt-tokens.json");

function ensureDataDir(): void {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function readChatGPTTokenStore(): ChatGPTTokenStore {
  try {
    const raw = readFileSync(TOKEN_FILE, "utf-8");
    return JSON.parse(raw) as ChatGPTTokenStore;
  } catch {
    return {};
  }
}

export function writeChatGPTTokenStore(store: ChatGPTTokenStore): void {
  ensureDataDir();
  writeFileSync(TOKEN_FILE, JSON.stringify(store, null, 2), "utf-8");
}

export function clearChatGPTTokenStore(): void {
  try {
    if (existsSync(TOKEN_FILE)) {
      unlinkSync(TOKEN_FILE);
    }
  } catch {
    // Ignore errors during cleanup
  }
}

export function isChatGPTTokenExpired(store: ChatGPTTokenStore): boolean {
  if (!store.expires_at) return true;
  const now = Math.floor(Date.now() / 1000);
  return now >= store.expires_at;
}
