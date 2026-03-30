import { NextRequest, NextResponse } from "next/server";
import { verifyCults3DCredentials } from "@/lib/cults3d/api";
import { writeCults3DCredentials } from "@/lib/cults3d/credentials";

export async function POST(request: NextRequest) {
  let body: { username?: string; apiKey?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body.", connected: false },
      { status: 400 }
    );
  }

  const { username, apiKey } = body;
  if (!username?.trim() || !apiKey?.trim()) {
    return NextResponse.json(
      { error: "Username and API key are required.", connected: false },
      { status: 400 }
    );
  }

  try {
    const { nick } = await verifyCults3DCredentials(username, apiKey);
    writeCults3DCredentials({ username, apiKey, nick, verified: true });
    return NextResponse.json({ connected: true, nick });
  } catch (err) {
    const message = err instanceof Error ? err.message : "";

    if (message.startsWith("AUTH_FAILED")) {
      return NextResponse.json(
        {
          error: "Invalid Cults3D credentials. Please check your username and API key.",
          connected: false,
        },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        error: "Could not reach the Cults3D API. Please try again later.",
        connected: false,
      },
      { status: 502 }
    );
  }
}
