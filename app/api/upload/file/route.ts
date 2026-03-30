import { NextRequest, NextResponse } from "next/server";
import {
  isStorageConfigured,
  uploadFileToStorage,
  generateStorageKey,
} from "@/lib/storage/s3";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 50 * 1024 * 1024;

const IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MODEL_EXTENSIONS = new Set([
  ".stl", ".obj", ".3mf", ".step", ".stp", ".scad", ".blend",
]);

export async function POST(request: NextRequest) {
  if (!isStorageConfigured()) {
    return NextResponse.json(
      {
        success: false,
        error: "Cloud storage is not configured. Please set the STORAGE_* environment variables.",
      },
      { status: 503 }
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid request. Expected multipart/form-data." },
      { status: 400 }
    );
  }

  const file = formData.get("file");
  const type = formData.get("type");

  if (!type || (type !== "image" && type !== "model")) {
    return NextResponse.json(
      { success: false, error: 'Invalid type. Must be "image" or "model".' },
      { status: 400 }
    );
  }

  if (!file || !(file instanceof File)) {
    return NextResponse.json(
      { success: false, error: "No file provided." },
      { status: 400 }
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    return NextResponse.json(
      { success: false, error: `File exceeds 50 MB size limit (yours: ${sizeMB} MB).` },
      { status: 400 }
    );
  }

  if (type === "image") {
    if (!IMAGE_MIME_TYPES.has(file.type)) {
      return NextResponse.json(
        {
          success: false,
          error: `Unsupported image format: ${file.type}. Accepted formats: JPEG, PNG, WebP.`,
        },
        { status: 400 }
      );
    }
  } else {
    const ext = "." + (file.name.split(".").pop()?.toLowerCase() ?? "");
    if (!MODEL_EXTENSIONS.has(ext)) {
      return NextResponse.json(
        {
          success: false,
          error: `Unsupported file format: ${ext}. Accepted model formats: STL, OBJ, 3MF, STEP, STP, SCAD, BLEND.`,
        },
        { status: 400 }
      );
    }
  }

  try {
    const storageType = type === "image" ? "images" : "models";
    const key = generateStorageKey(storageType, file.name);
    const buffer = Buffer.from(await file.arrayBuffer());
    const contentType = file.type || "application/octet-stream";

    const url = await uploadFileToStorage(buffer, key, contentType);
    return NextResponse.json({ success: true, url, key });
  } catch (err) {
    console.error("File upload error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to upload file to storage. Please try again." },
      { status: 500 }
    );
  }
}
