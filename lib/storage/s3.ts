import { AwsClient } from "aws4fetch";
import { randomUUID } from "crypto";
import { extname } from "path";

function getStorageConfig() {
  return {
    endpoint: process.env.STORAGE_ENDPOINT ?? "",
    accessKeyId: process.env.STORAGE_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY ?? "",
    bucket: process.env.STORAGE_BUCKET ?? "",
    publicUrl: process.env.STORAGE_PUBLIC_URL ?? "",
    region: process.env.STORAGE_REGION ?? "auto",
  };
}

export function isStorageConfigured(): boolean {
  const config = getStorageConfig();
  return !!(
    config.endpoint &&
    config.accessKeyId &&
    config.secretAccessKey &&
    config.bucket &&
    config.publicUrl
  );
}

export async function uploadFileToStorage(
  fileBuffer: Buffer,
  key: string,
  contentType: string
): Promise<string> {
  const config = getStorageConfig();

  const client = new AwsClient({
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
    region: config.region,
    service: "s3",
  });

  const url = `${config.endpoint}/${config.bucket}/${key}`;

  const body = new Uint8Array(fileBuffer);
  const res = await client.fetch(url, {
    method: "PUT",
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(fileBuffer.byteLength),
    },
    body,
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Storage upload failed (${res.status}): ${body}`);
  }

  return `${config.publicUrl}/${key}`;
}

export function generateStorageKey(
  type: "images" | "models",
  originalName: string
): string {
  const ext = extname(originalName).toLowerCase();
  const uuid = randomUUID().slice(0, 8);
  return `${type}/${Date.now()}-${uuid}${ext}`;
}
