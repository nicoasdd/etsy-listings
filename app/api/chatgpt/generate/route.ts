import { NextRequest, NextResponse } from "next/server";
import {
  readChatGPTTokenStore,
  writeChatGPTTokenStore,
  isChatGPTTokenExpired,
} from "@/lib/chatgpt/tokens";
import { refreshAccessToken } from "@/lib/chatgpt/oauth";
import { sendChatGPTImageGeneration } from "@/lib/chatgpt/generate";
import type { GenerateDualListingResponse } from "@/lib/types/chatgpt";

const ACCEPTED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

export async function POST(request: NextRequest) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Invalid request. Expected multipart/form-data." } satisfies Partial<GenerateDualListingResponse>,
      { status: 400 }
    );
  }

  const imageFile = formData.get("image");
  if (!imageFile || !(imageFile instanceof File)) {
    return NextResponse.json(
      { error: "No image provided. Please upload a product photo." } satisfies Partial<GenerateDualListingResponse>,
      { status: 400 }
    );
  }

  if (!ACCEPTED_MIME_TYPES.has(imageFile.type)) {
    return NextResponse.json(
      { error: `Unsupported image format: ${imageFile.type}. Accepted formats: JPEG, PNG, WebP.` } satisfies Partial<GenerateDualListingResponse>,
      { status: 400 }
    );
  }

  if (imageFile.size > MAX_FILE_SIZE) {
    const sizeMB = (imageFile.size / (1024 * 1024)).toFixed(1);
    return NextResponse.json(
      { error: `Image exceeds 20 MB size limit (yours: ${sizeMB} MB).` } satisfies Partial<GenerateDualListingResponse>,
      { status: 400 }
    );
  }

  const description = formData.get("description");
  const descriptionStr = typeof description === "string" ? description : undefined;

  const store = readChatGPTTokenStore();

  if (!store.access_token) {
    return NextResponse.json(
      { error: "Not connected to ChatGPT. Please connect first.", needs_reauth: true } satisfies Partial<GenerateDualListingResponse>,
      { status: 401 }
    );
  }

  let accessToken = store.access_token;

  if (isChatGPTTokenExpired(store)) {
    if (!store.refresh_token) {
      return NextResponse.json(
        { error: "ChatGPT session expired. Please reconnect.", needs_reauth: true } satisfies Partial<GenerateDualListingResponse>,
        { status: 401 }
      );
    }

    try {
      const refreshed = await refreshAccessToken(store.refresh_token);
      writeChatGPTTokenStore({
        ...store,
        access_token: refreshed.access_token,
        refresh_token: refreshed.refresh_token,
        expires_at: refreshed.expires_at,
      });
      accessToken = refreshed.access_token;
    } catch {
      return NextResponse.json(
        { error: "Token refresh failed. Please reconnect to ChatGPT.", needs_reauth: true } satisfies Partial<GenerateDualListingResponse>,
        { status: 401 }
      );
    }
  }

  try {
    const arrayBuffer = await imageFile.arrayBuffer();
    const imageBase64 = Buffer.from(arrayBuffer).toString("base64");

    const result = await sendChatGPTImageGeneration(
      accessToken,
      imageBase64,
      imageFile.type,
      descriptionStr
    );

    const response: GenerateDualListingResponse = {
      success: true,
      fields: result.fields,
      model: result.model,
    };

    return NextResponse.json(response);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";

    if (errorMessage === "TIMEOUT") {
      return NextResponse.json(
        { error: "ChatGPT did not respond within the timeout period. Please try again." } satisfies Partial<GenerateDualListingResponse>,
        { status: 504 }
      );
    }

    if (errorMessage.includes("(401)") || errorMessage.includes("(403)")) {
      return NextResponse.json(
        { error: "ChatGPT authentication failed. Please reconnect.", needs_reauth: true } satisfies Partial<GenerateDualListingResponse>,
        { status: 401 }
      );
    }

    if (errorMessage.includes("(429)")) {
      return NextResponse.json(
        {
          error: "ChatGPT rate limit reached. Please wait a moment and try again.",
          details: errorMessage,
        } as Record<string, unknown>,
        { status: 502 }
      );
    }

    if (
      errorMessage.includes("unexpected format") ||
      errorMessage.includes("response missing")
    ) {
      return NextResponse.json(
        {
          error: errorMessage,
          details: "ChatGPT returned a response that could not be parsed as listing fields.",
        } as Record<string, unknown>,
        { status: 502 }
      );
    }

    return NextResponse.json(
      {
        error: "ChatGPT request failed. This may be a temporary outage — please try again.",
        details: errorMessage,
      } as Record<string, unknown>,
      { status: 502 }
    );
  }
}
