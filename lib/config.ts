/**
 * TAO Recruit AI — Central Configuration & Recruitment Assessment Mode
 * ====================================================================
 * Supports toggling between:
 *   - PLAN_A: AI Voice Interview (Real-time generative voice dialog via Gemini/NVIDIA)
 *   - PLAN_B: AI-Powered Online Assessment (Form-based role-tailored written assessment)
 *
 * PLAN_B is currently ACTIVE to ensure high reliability and eliminate API rate limits.
 * All Plan A code, prompts, and routes are preserved for future activation.
 * ====================================================================
 */

export type RecruitmentMode = "PLAN_A" | "PLAN_B";

// Default active mode is PLAN_B as requested
export const DEFAULT_RECRUITMENT_MODE: RecruitmentMode = "PLAN_B";

/**
 * Resolves the active recruitment mode.
 * Checks cookie -> process.env -> default (PLAN_B).
 */
export function getRecruitmentMode(): RecruitmentMode {
  // Check environment variable override if explicitly set
  const envMode = process.env.NEXT_PUBLIC_RECRUITMENT_MODE as RecruitmentMode | undefined;
  if (envMode === "PLAN_A" || envMode === "PLAN_B") {
    return envMode;
  }

  // Check client cookie if running in browser
  if (typeof document !== "undefined") {
    const match = document.cookie.match(/(?:^|; )tao_recruitment_mode=([^;]*)/);
    if (match && (match[1] === "PLAN_A" || match[1] === "PLAN_B")) {
      return match[1] as RecruitmentMode;
    }
  }

  return DEFAULT_RECRUITMENT_MODE;
}

export function isPlanB(): boolean {
  return getRecruitmentMode() === "PLAN_B";
}

export function isPlanA(): boolean {
  return getRecruitmentMode() === "PLAN_A";
}

/**
 * Helper to get the user-facing assessment stage label based on active mode
 */
export function getAssessmentStageLabel(mode: RecruitmentMode = getRecruitmentMode()): string {
  return mode === "PLAN_B" ? "Online Assessment" : "AI Voice Interview";
}

/**
 * Helper to get the user-facing action button text
 */
export function getAssessmentActionText(mode: RecruitmentMode = getRecruitmentMode()): string {
  return mode === "PLAN_B" ? "Start Assessment" : "Start Voice Interview";
}

/**
 * Helper to get target assessment link for a candidate
 */
export function getCandidateAssessmentUrl(applicationId: string, mode: RecruitmentMode = getRecruitmentMode()): string {
  return mode === "PLAN_B"
    ? `/candidate/assessment/${applicationId}`
    : `/candidate/interview/${applicationId}`;
}

