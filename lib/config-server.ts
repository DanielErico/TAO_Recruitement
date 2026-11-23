/**
 * TAO Recruit AI — Server-Side Recruitment Mode Config
 * =====================================================
 * Reads recruitment mode on the server, safely accessing
 * request cookies via next/headers and process.env.
 *
 * Use this in Server Components and API route handlers.
 * For client components, use lib/config.ts.
 * =====================================================
 */

import { cookies } from "next/headers";
import { RecruitmentMode, DEFAULT_RECRUITMENT_MODE } from "./config";

export async function getServerRecruitmentMode(): Promise<RecruitmentMode> {
  // 1. Explicit environment variable takes highest precedence
  const envMode = process.env.NEXT_PUBLIC_RECRUITMENT_MODE as RecruitmentMode | undefined;
  if (envMode === "PLAN_A" || envMode === "PLAN_B") {
    return envMode;
  }

  // 2. Read cookie set by admin toggle
  try {
    const cookieStore = await cookies();
    const cookieMode = cookieStore.get("tao_recruitment_mode")?.value;
    if (cookieMode === "PLAN_A" || cookieMode === "PLAN_B") {
      return cookieMode;
    }
  } catch {
    // cookies() may throw if called outside request context (e.g. build time)
  }

  // 3. Fallback to default
  return DEFAULT_RECRUITMENT_MODE;
}

export async function isServerPlanB(): Promise<boolean> {
  const mode = await getServerRecruitmentMode();
  return mode === "PLAN_B";
}

export async function isServerPlanA(): Promise<boolean> {
  const mode = await getServerRecruitmentMode();
  return mode === "PLAN_A";
}

