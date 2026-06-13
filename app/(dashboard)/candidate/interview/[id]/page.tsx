import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { InterviewChat } from "./InterviewChat";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "AI Screening Interview" };

export default async function CandidateInterviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: appId } = await params;
  const cookieStore = await cookies();

  const role = cookieStore.get("user_role")?.value;
  const userId = cookieStore.get("mock_user_id")?.value;

  if (!role || !userId) redirect("/login");
  if (role !== "candidate") redirect("/recruiter");

  const supabase = createAdminClient();

  console.log(`[InterviewPage] appId: ${appId}, userId: ${userId}, role: ${role}`);

  // Fetch application and job details (uses admin client to bypass RLS)
  const { data: application, error: appError } = await supabase
    .from("applications")
    .select(`
      id,
      status,
      candidate_id,
      job:jobs (
        id,
        title,
        location,
        remote,
        department:departments (name)
      )
    `)
    .eq("id", appId)
    .maybeSingle();

  if (appError) {
    console.error("[InterviewPage] Supabase error:", appError);
  }

  console.log("[InterviewPage] fetched application:", application);

  if (!application) {
    console.warn(`[InterviewPage] application not found for ID: ${appId}, redirecting to /candidate/applications`);
    redirect("/candidate/applications");
  }

  // Security check: candidate can only take their own interview
  if (application.candidate_id !== userId) {
    redirect("/candidate");
  }

  // If the interview is already completed, redirect back
  if (application.status !== "interview") {
    redirect("/candidate/applications");
  }

  return (
    <div className="max-w-3xl mx-auto py-4 animate-fade-in">
      <InterviewChat
        applicationId={application.id}
        job={application.job as any}
        candidateId={userId}
      />
    </div>
  );
}
