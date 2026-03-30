import { NextRequest, NextResponse } from "next/server";
import { readCults3DCredentials } from "@/lib/cults3d/credentials";
import { createCults3DDesign } from "@/lib/cults3d/api";
import type { Cults3DCreateInput } from "@/lib/types/cults3d";

export async function POST(request: NextRequest) {
  let body: Cults3DCreateInput;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const missing: string[] = [];
  if (!body.name?.trim()) missing.push("name");
  if (!body.description?.trim()) missing.push("description");
  if (!Array.isArray(body.imageUrls) || body.imageUrls.length === 0) missing.push("imageUrls");
  if (!Array.isArray(body.fileUrls) || body.fileUrls.length === 0) missing.push("fileUrls");
  if (body.downloadPrice == null || body.downloadPrice < 0) missing.push("downloadPrice");
  if (!body.currency?.trim()) missing.push("currency");
  if (!body.categoryId?.trim()) missing.push("categoryId");
  if (!body.locale?.trim()) missing.push("locale");

  if (missing.length > 0) {
    return NextResponse.json(
      { success: false, error: `Missing required fields: ${missing.join(", ")}` },
      { status: 400 }
    );
  }

  const store = readCults3DCredentials();
  if (!store.verified || !store.username || !store.apiKey) {
    return NextResponse.json(
      { success: false, error: "Not connected to Cults3D. Please connect first." },
      { status: 401 }
    );
  }

  try {
    const result = await createCults3DDesign(
      { username: store.username, apiKey: store.apiKey },
      body
    );
    return NextResponse.json({ success: true, url: result.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "";

    if (message.startsWith("AUTH_FAILED")) {
      return NextResponse.json(
        { success: false, error: "Cults3D credentials are no longer valid. Please reconnect." },
        { status: 401 }
      );
    }

    if (message === "CULTS3D_CREATION_ERRORS") {
      const apiErrors = (err as Error & { apiErrors?: string[] }).apiErrors ?? [];
      return NextResponse.json(
        {
          success: false,
          error: "Cults3D returned errors while creating the design.",
          apiErrors,
        },
        { status: 502 }
      );
    }

    return NextResponse.json(
      { success: false, error: "Failed to create design on Cults3D. Please try again." },
      { status: 502 }
    );
  }
}
