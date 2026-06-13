import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { ApplicationReviewClient } from "./ApplicationReviewClient";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const supabase = createAdminClient();
  const { data: app } = await supabase
    .from("applications")
    .select(`
      candidate:user_profiles (full_name),
      job:jobs (title)
    `)
    .eq("id", id)
    .maybeSingle();

  if (!app) return { title: "Review Application" };
  const candidateName = (app.candidate as any)?.full_name || "Candidate";
  const jobTitle = (app.job as any)?.title || "Role";
  return { title: `Review: ${candidateName} — ${jobTitle}` };
}

export default async function RecruiterApplicationReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: appId } = await params;
  const cookieStore = await cookies();
  const role = cookieStore.get("user_role")?.value;
  if (!role) redirect("/login");
  if (!["recruiter", "admin"].includes(role)) redirect("/candidate");

  const supabase = createAdminClient();

  // 1. Fetch application first (needed to check existence and get interview ID)
  const { data: application } = await supabase
    .from("applications")
    .select(`
      id,
      status,
      applied_at,
      resume_url,
      portfolio_url,
      cover_letter,
      candidate:user_profiles (
        id,
        full_name,
        email
      ),
      job:jobs (
        id,
        title,
        description,
        requirements
      )
    `)
    .eq("id", appId)
    .maybeSingle();

  if (!application) {
    notFound();
  }

  // 2. Fetch CV analysis, interview, and evaluation in parallel
  const [
    { data: cvAnalysis },
    { data: interview },
    { data: evaluation },
  ] = await Promise.all([
    supabase.from("cv_analyses").select("*").eq("application_id", appId).maybeSingle(),
    supabase.from("interviews").select("id, status").eq("application_id", appId).maybeSingle(),
    supabase.from("evaluations").select("*").eq("application_id", appId).maybeSingle(),
  ]);

  // 3. Fetch interview responses (depends on interview id from above)
  let interviewResponses: any[] = [];
  if (interview) {
    const { data: responses } = await supabase
      .from("interview_responses")
      .select("question_text, response_text, created_at")
      .eq("interview_id", interview.id)
      .order("created_at", { ascending: true });
    interviewResponses = responses || [];
  }

  return (
    <div className="max-w-6xl mx-auto py-2 animate-fade-in">
      <ApplicationReviewClient
        application={application as any}
        cvAnalysis={cvAnalysis}
        interview={interview}
        interviewResponses={interviewResponses}
        evaluation={evaluation}
      />
    </div>
  );
}
