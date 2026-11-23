import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOrCreateRoleAssessment } from "@/lib/assessment-engine";
import { isServerPlanA } from "@/lib/config-server";
import { AssessmentForm } from "./AssessmentForm";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Online Recruitment Assessment" };

export default async function CandidateAssessmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: appId } = await params;

  // If recruitment mode is switched back to Plan A, redirect to voice interview
  if (await isServerPlanA()) {
    redirect(`/candidate/interview/${appId}`);
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const role = user.user_metadata?.role;
  if (!role || role !== "candidate") redirect("/recruiter");

  const admin = createAdminClient();

  // Fetch application + job info
  const { data: application, error: appError } = await admin
    .from("applications")
    .select(`
      id,
      status,
      candidate_id,
      applied_at,
      job:jobs (
        id,
        title,
        description,
        responsibilities,
        requirements,
        skills_required,
        department:departments (name)
      )
    `)
    .eq("id", appId)
    .single();

  if (appError || !application) {
    notFound();
  }

  // Security check: Candidate can only access their own application
  if (application.candidate_id !== user.id) {
    redirect("/candidate");
  }

  // If already completed or not in interview/assessment stage, redirect to applications
  if (application.status !== "interview") {
    redirect("/candidate/applications");
  }

  const job = application.job as any;
  const deptName = job?.department?.name || "General Operations";

  // Pre-load role-tailored questions server-side for fastest instant render
  const assessmentSet = await getOrCreateRoleAssessment({
    id: job.id,
    title: job.title,
    department: deptName,
    description: job.description,
    responsibilities: job.responsibilities,
    requirements: job.requirements,
    skills_required: job.skills_required,
    organisation: "The Agriculture Option (TAO)",
  });

  return (
    <div className="max-w-3xl mx-auto py-6 animate-fade-in">
      <AssessmentForm
        applicationId={application.id}
        candidateId={user.id}
        candidateName={user.user_metadata?.full_name || "Applicant"}
        job={{
          id: job.id,
          title: job.title,
          department: deptName,
        }}
        assessment={assessmentSet}
      />
    </div>
  );
}

