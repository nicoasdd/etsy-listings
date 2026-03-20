import { NextResponse } from "next/server";
import { clearChatGPTTokenStore } from "@/lib/chatgpt/tokens";

export async function POST() {
  clearChatGPTTokenStore();
  return NextResponse.json({ disconnected: true });
}
