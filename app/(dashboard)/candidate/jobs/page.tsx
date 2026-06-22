import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Briefcase, Clock, Search, Filter } from "lucide-react";
import { getStatusConfig } from "@/lib/utils";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Browse Job Openings" };

interface SearchParams {
  search?: string;
  dept?: string;
  remote?: string;
}

export default async function CandidateJobsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const role = user.user_metadata?.role;
  const userId = user.id;

  if (!role || !userId) redirect("/login");
  if (role !== "candidate") redirect("/recruiter");

  // 2. Fetch live published jobs
  let jobsQuery = supabase
    .from("jobs")
    .select("*, department:departments(name)")
    .eq("status", "published")
    .order("created_at", { ascending: false });

  const { data: rawJobs = [] } = await jobsQuery;
  const jobs = rawJobs || [];

  // 3. Fetch candidate's applications to show status on cards
  const { data: applications = [] } = await supabase
    .from("applications")
    .select("job_id, status, id")
    .eq("candidate_id", userId);

  const appMap = new Map(applications?.map((app) => [app.job_id, app]));

  // Get departments for filters
  const { data: departments = [] } = await supabase
    .from("departments")
    .select("id, name");

  // Client-side or Server-side filtering
  const querySearch = (params.search || "").toLowerCase();
  const queryDept = params.dept || "";
  const queryRemote = params.remote === "true";

  const filteredJobs = jobs.filter((job) => {
    const matchesSearch =
      !querySearch ||
      job.title.toLowerCase().includes(querySearch) ||
      (job.description || "").toLowerCase().includes(querySearch) ||
      job.skills_required.some((s: string) => s.toLowerCase().includes(querySearch));

    const matchesDept = !queryDept || job.department_id === queryDept;
    const matchesRemote = !queryRemote || job.remote === true;

    return matchesSearch && matchesDept && matchesRemote;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="page-title">Browse Opportunities</h1>
        <p className="text-sm text-[var(--color-muted-foreground)] mt-0.5">
          Find your next career step and apply directly.
        </p>
      </div>

      {/* Filter Bar */}
      <form method="GET" className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 rounded-xl border border-[var(--color-border)] bg-white shadow-sm">
        {/* Search */}
        <div className="md:col-span-2 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)]" />
          <input
            type="text"
            name="search"
            defaultValue={params.search || ""}
            placeholder="Search jobs, skills, description..."
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-[var(--color-border)] focus:outline-none focus:border-[var(--color-brand)] focus:ring-1 focus:ring-[var(--color-brand)] bg-[var(--color-background)]"
          />
        </div>

        {/* Department */}
        <div>
          <select
            name="dept"
            defaultValue={params.dept || ""}
            className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] focus:outline-none focus:border-[var(--color-brand)] focus:ring-1 focus:ring-[var(--color-brand)] bg-[var(--color-background)]"
          >
            <option value="">All Departments</option>
            {departments?.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        {/* Remote Check / Submit */}
        <div className="flex items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-sm font-medium text-[var(--color-foreground)] select-none cursor-pointer">
            <input
              type="checkbox"
              name="remote"
              value="true"
              defaultChecked={params.remote === "true"}
              className="rounded border-[var(--color-border)] text-[var(--color-brand)] focus:ring-[var(--color-brand)] cursor-pointer"
            />
            Remote Only
          </label>
          <Button type="submit" size="sm">
            Apply Filter
          </Button>
        </div>
      </form>

      {/* Job Grid */}
      {filteredJobs.length === 0 ? (
        <Card className="py-16 text-center">
          <CardContent className="space-y-3">
            <Briefcase size={32} className="mx-auto text-[var(--color-muted-foreground)] opacity-30" strokeWidth={1.5} />
            <p className="text-sm font-medium text-[var(--color-foreground)]">No matching job openings</p>
            <p className="text-sm text-[var(--color-muted-foreground)] max-w-sm mx-auto">
              Try adjusting your search terms or filters to find other active opportunities.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredJobs.map((job) => {
            const hasApplied = appMap.has(job.id);
            const app = appMap.get(job.id);
            const statusCfg = app ? getStatusConfig(app.status) : null;

            return (
              <Card key={job.id} className="hover:border-[var(--color-brand)]/50 hover:shadow-md transition-all">
                <CardContent className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-3 flex-1">
                    <div className="flex items-start justify-between md:justify-start gap-3 flex-wrap">
                      <h3 className="text-lg font-bold text-[var(--color-foreground)]">
                        {job.title}
                      </h3>
                      {job.department?.name && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[var(--color-brand-light)] text-[var(--color-brand)]">
                          {job.department.name}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[var(--color-muted-foreground)]">
                      {job.location && (
                        <span className="flex items-center gap-1">
                          <MapPin size={14} /> {job.location}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Briefcase size={14} /> {job.remote ? "Remote" : "On-site"}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={14} /> {job.employment_type.replace("_", " ")}
                      </span>
                    </div>

                    {/* Skills required */}
                    {job.skills_required?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {job.skills_required.map((skill: string) => (
                          <span
                            key={skill}
                            className="inline-flex items-center px-2 py-0.5 rounded border border-[var(--color-border)] bg-[var(--color-muted)] text-[11px] font-medium text-[var(--color-muted-foreground)]"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex md:flex-col items-start md:items-end justify-between md:justify-center gap-3 border-t md:border-t-0 border-[var(--color-border)] pt-4 md:pt-0">
                    {hasApplied && statusCfg ? (
                      <div className="flex items-center md:items-end flex-row md:flex-col justify-between w-full md:w-auto gap-3">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusCfg.className}`}>
                          {statusCfg.label}
                        </span>
                        {app?.status === "interview" ? (
                          <Button size="sm" asChild>
                            <Link href={`/candidate/interview/${app.id}`}>
                              Start Interview
                            </Link>
                          </Button>
                        ) : (
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/jobs/${job.id}`} target="_blank">
                              View Details
                            </Link>
                          </Button>
                        )}
                      </div>
                    ) : (
                      <Button asChild>
                        <Link href={`/jobs/${job.id}`}>
                          View Details & Apply
                        </Link>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
