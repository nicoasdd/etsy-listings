import { NextResponse } from "next/server";
import { clearCults3DCredentials } from "@/lib/cults3d/credentials";

export async function POST() {
  clearCults3DCredentials();
  return NextResponse.json({ disconnected: true });
}
