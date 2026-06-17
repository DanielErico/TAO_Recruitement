import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { JobForm } from "@/components/jobs/JobForm";
import { Button } from "@/components/ui/button";
import { formatDate, getStatusConfig } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";
import { DeleteJobButton } from "@/components/jobs/DeleteJobButton";
import type { Metadata } from "next";
import type { Department, Job } from "@/types";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("jobs").select("title").eq("id", id).single();
  return { title: data?.title ? `Edit — ${data.title}` : "Edit Job" };
}

export default async function EditJobPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const cookieStore = await cookies();
  const role = cookieStore.get("user_role")?.value;
  const userId = cookieStore.get("mock_user_id")?.value;

  if (!role || !userId) redirect("/login");
  if (!["recruiter", "admin"].includes(role)) redirect("/candidate");

  const supabase = await createClient();

  const { data: job } = await supabase
    .from("jobs")
    .select("*, department:departments(name)")
    .eq("id", id)
    .single();

  if (!job) notFound();

  const { data: depts } = await supabase
    .from("departments")
    .select("id, name, created_at")
    .order("name");

  const departments = (depts as Department[]) || [];
  const statusCfg = getStatusConfig(job.status);

  return (
    <div className="max-w-3xl space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <Link
            href="/recruiter/jobs"
            className="inline-flex items-center gap-1.5 text-sm text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors"
          >
            <ArrowLeft size={14} /> Back to Jobs
          </Link>
          <h1 className="page-title">{job.title}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusCfg.className}`}>
              {statusCfg.label}
            </span>
            <span className="text-xs text-[var(--color-muted-foreground)]">
              Posted {formatDate(job.created_at)}
            </span>
          </div>
        </div>

        {/* Archive / Delete — admin and recruiter */}
        {["admin", "recruiter"].includes(role) && (
          <div className="flex items-center gap-2">
            <ArchiveDeleteButtons jobId={id} status={job.status} />
          </div>
        )}
      </div>

      <div className="rounded-lg border border-[var(--color-border)] bg-white p-6 shadow-sm">
        <JobForm
          job={job as Partial<Job>}
          departments={departments}
          userId={userId}
          mode="edit"
        />
      </div>
    </div>
  );
}

// ── Inline archive / delete buttons ───────────────────────────
function ArchiveDeleteButtons({
  jobId,
  status,
}: {
  jobId: string;
  status: string;
}) {
  return (
    <>
      {status !== "archived" && (
        <form action={`/api/jobs/${jobId}/archive`} method="POST">
          <Button type="submit" variant="outline" size="sm">
            Archive
          </Button>
        </form>
      )}
      <DeleteJobButton jobId={jobId} />
    </>
  );
}
