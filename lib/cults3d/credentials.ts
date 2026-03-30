import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import type { Cults3DCredentialStore } from "@/lib/types/cults3d";

const DATA_DIR = join(process.cwd(), "data");
const CREDENTIALS_FILE = join(DATA_DIR, "cults3d-credentials.json");

function ensureDataDir(): void {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function readCults3DCredentials(): Cults3DCredentialStore {
  try {
    const raw = readFileSync(CREDENTIALS_FILE, "utf-8");
    return JSON.parse(raw) as Cults3DCredentialStore;
  } catch {
    return {};
  }
}

export function writeCults3DCredentials(store: Cults3DCredentialStore): void {
  ensureDataDir();
  writeFileSync(CREDENTIALS_FILE, JSON.stringify(store, null, 2), "utf-8");
}

export function clearCults3DCredentials(): void {
  ensureDataDir();
  writeFileSync(CREDENTIALS_FILE, JSON.stringify({}, null, 2), "utf-8");
}
