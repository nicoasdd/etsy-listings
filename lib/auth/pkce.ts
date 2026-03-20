import { randomBytes, createHash } from "crypto";

const VERIFIER_LENGTH = 64;
const CHARSET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789._~-";

export function generateCodeVerifier(): string {
  const bytes = randomBytes(VERIFIER_LENGTH);
  let verifier = "";
  for (let i = 0; i < VERIFIER_LENGTH; i++) {
    verifier += CHARSET[bytes[i] % CHARSET.length];
  }
  return verifier;
}

export function generateCodeChallenge(verifier: string): string {
  const hash = createHash("sha256").update(verifier).digest();
  return hash
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function generateState(): string {
  return randomBytes(32).toString("hex");
}
