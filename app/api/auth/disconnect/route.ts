import { NextResponse } from "next/server";
import { clearTokenStore } from "@/lib/auth/tokens";

export async function POST() {
  clearTokenStore();
  return NextResponse.json({ success: true });
}
