import { redirect } from "next/navigation";
import Link from "next/link";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { Button } from "@/components/ui/button";
import { Plus, Search, Briefcase } from "lucide-react";
import { JobsTable } from "@/components/jobs/JobsTable";
import type { Metadata } from "next";
import type { Job } from "@/types";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Jobs" };

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; dept?: string }>;
}) {
  const cookieStore = await cookies();
  const role = cookieStore.get("user_role")?.value;
  if (!role) redirect("/login");
  if (!["recruiter", "admin"].includes(role)) redirect("/candidate");

  const supabase = createAdminClient();

  const params = await searchParams;
  const q = params.q ?? "";
  const statusFilter = params.status ?? "";
  const deptFilter = params.dept ?? "";

  // Build query
  let query = supabase
    .from("jobs")
    .select(`
      *,
      department:departments(name)
    `)
    .order("created_at", { ascending: false });

  if (statusFilter) query = query.eq("status", statusFilter);
  if (deptFilter) query = query.eq("department_id", deptFilter);
  if (q) query = query.ilike("title", `%${q}%`);

  const { data: jobsData } = await query;
  const jobs = jobsData || [];

  // Fetch departments for filter
  const { data: deptsData } = await supabase
    .from("departments")
    .select("id, name")
    .order("name");
  const departments = deptsData || [];

  const statusOptions = [
    { value: "", label: "All statuses" },
    { value: "draft", label: "Draft" },
    { value: "published", label: "Published" },
    { value: "archived", label: "Archived" },
    { value: "closed", label: "Closed" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Jobs</h1>
          <p className="text-sm text-[var(--color-muted-foreground)] mt-0.5">
            {jobs.length} {jobs.length === 1 ? "job" : "jobs"} found
          </p>
        </div>
        <Button asChild>
          <Link href="/recruiter/jobs/new">
            <Plus size={15} />
            Post a Job
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <form method="GET" className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)]"
          />
          <input
            name="q"
            defaultValue={q}
            placeholder="Search jobs…"
            className="h-9 w-full rounded-md border border-[var(--color-border)] bg-white pl-8 pr-3 text-sm
              focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)] focus:ring-offset-1
              placeholder:text-[var(--color-muted-foreground)]"
          />
        </div>

        {/* Status filter */}
        <select
          name="status"
          defaultValue={statusFilter}
          className="h-9 rounded-md border border-[var(--color-border)] bg-white px-3 text-sm
            focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]
            text-[var(--color-foreground)] cursor-pointer"
        >
          {statusOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <Button type="submit" size="sm" variant="outline">
          Filter
        </Button>
      </form>

      {/* Jobs Table */}
      {jobs.length === 0 ? (
        <div className="rounded-lg border border-[var(--color-border)] bg-white py-16 text-center">
          <Briefcase
            size={32}
            className="mx-auto text-[var(--color-muted-foreground)] mb-3"
            strokeWidth={1.5}
          />
          <p className="text-sm font-medium text-[var(--color-foreground)]">No jobs yet</p>
          <p className="text-sm text-[var(--color-muted-foreground)] mt-1">
            Create your first job posting to get started.
          </p>
          <div className="mt-4">
            <Button asChild size="sm">
              <Link href="/recruiter/jobs/new">
                <Plus size={14} /> Post a Job
              </Link>
            </Button>
          </div>
        </div>
      ) : (
        <JobsTable initialJobs={jobs as any} />
      )}
    </div>
  );
}
