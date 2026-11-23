/**
 * TAO Recruit AI — POST /api/admin/recruitment-mode
 * ============================================================
 * Allows authorized administrators to toggle the recruitment mode
 * between PLAN_A (AI Voice Interview) and PLAN_B (Online Assessment).
 *
 * Body: { mode: "PLAN_A" | "PLAN_B" }
 * ============================================================
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { RecruitmentMode } from "@/lib/config";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const role = user?.user_metadata?.role;
  const cookieMode = request.cookies.get("tao_recruitment_mode")?.value as RecruitmentMode | undefined;
  const envMode = process.env.NEXT_PUBLIC_RECRUITMENT_MODE as RecruitmentMode | undefined;
  const mode = (envMode === "PLAN_A" || envMode === "PLAN_B")
    ? envMode
    : (cookieMode === "PLAN_A" || cookieMode === "PLAN_B")
      ? cookieMode
      : "PLAN_B";

  return NextResponse.json({
    mode,
    userRole: role,
  });
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = user.user_metadata?.role;
    if (role !== "admin") {
      return NextResponse.json({ error: "Forbidden: Only administrators can modify recruitment mode" }, { status: 403 });
    }

    const body = await request.json();
    const { mode } = body as { mode: RecruitmentMode };

    if (mode !== "PLAN_A" && mode !== "PLAN_B") {
      return NextResponse.json({ error: "Invalid mode. Must be PLAN_A or PLAN_B" }, { status: 400 });
    }

    const response = NextResponse.json({
      success: true,
      mode,
      message: `Recruitment mode switched to ${mode === "PLAN_B" ? "Plan B (Online Assessment)" : "Plan A (AI Voice Interview)"}`,
    });

    // Set cookie on response for persistent toggle across the application
    response.cookies.set("tao_recruitment_mode", mode, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365, // 1 year
      sameSite: "lax",
    });

    return response;
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to update recruitment mode" }, { status: 500 });
  }
}

