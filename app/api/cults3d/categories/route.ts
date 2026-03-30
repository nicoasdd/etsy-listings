import { NextResponse } from "next/server";
import { readCults3DCredentials } from "@/lib/cults3d/credentials";
import { fetchCults3DCategories } from "@/lib/cults3d/api";

export async function GET() {
  const store = readCults3DCredentials();

  if (!store.verified || !store.username || !store.apiKey) {
    return NextResponse.json(
      { error: "Not connected to Cults3D. Please connect first." },
      { status: 401 }
    );
  }

  try {
    const categories = await fetchCults3DCategories({
      username: store.username,
      apiKey: store.apiKey,
    });
    return NextResponse.json({ categories });
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (message.startsWith("AUTH_FAILED")) {
      return NextResponse.json(
        { error: "Cults3D credentials are no longer valid. Please reconnect." },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { error: "Failed to fetch categories from Cults3D." },
      { status: 502 }
    );
  }
}
