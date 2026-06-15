import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const allKeys = Object.keys(process.env);
  const hasKey = !!process.env.NVIDIA_API_KEY;
  const keyPrefix = process.env.NVIDIA_API_KEY 
    ? process.env.NVIDIA_API_KEY.substring(0, 12) + "..." 
    : "not set";

  return NextResponse.json({
    status: "diagnostics",
    hasNvidiaKey: hasKey,
    nvidiaKeyPrefix: keyPrefix,
    availableKeys: allKeys.filter(k => !k.toLowerCase().includes('key') && !k.toLowerCase().includes('secret') && !k.toLowerCase().includes('password') && !k.toLowerCase().includes('token')),
  });
}
