import { NextResponse } from "next/server";
import { readCults3DCredentials } from "@/lib/cults3d/credentials";

export async function GET() {
  const store = readCults3DCredentials();

  if (store.verified && store.nick) {
    return NextResponse.json({ connected: true, nick: store.nick });
  }

  return NextResponse.json({ connected: false });
}
