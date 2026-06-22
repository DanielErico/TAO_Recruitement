import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Briefcase, FileText, TrendingUp } from "lucide-react";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Recruiter Dashboard" };

function withTimeout<T>(p: Promise<T>, ms = 8000): Promise<T | null> {
  return Promise.race([
    p,
    new Promise<null>((res) => setTimeout(() => res(null), ms)),
  ]);
}

export default async function RecruiterDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const role = user.user_metadata?.role;
  const fullName = user.user_metadata?.full_name || "Recruiter";

  if (!role) redirect("/login");
  if (!["recruiter", "admin"].includes(role)) redirect("/candidate");

  // Stats queries with timeout — safe to fail silently
  const [jobsRes, appsRes, candidatesRes, cvAnalysesRes] = await Promise.all([
    withTimeout(Promise.resolve(supabase.from("jobs").select("id", { count: "exact", head: true }))),
    withTimeout(Promise.resolve(supabase.from("applications").select("id", { count: "exact", head: true }))),
    withTimeout(Promise.resolve(supabase.from("user_profiles").select("id", { count: "exact", head: true }).eq("role", "candidate"))),
    withTimeout(Promise.resolve(supabase.from("cv_analyses").select("id", { count: "exact", head: true }))),
  ]);

  const stats = [
    {
      label: "Active Jobs",
      value: (jobsRes as any)?.count ?? "—",
      icon: Briefcase,
      description: "Currently published",
    },
    {
      label: "Total Applications",
      value: (appsRes as any)?.count ?? "—",
      icon: FileText,
      description: "Across all roles",
    },
    {
      label: "Registered Candidates",
      value: (candidatesRes as any)?.count ?? "—",
      icon: Users,
      description: "In the system",
    },
    {
      label: "AI Analyses Run",
      value: (cvAnalysesRes as any)?.count ?? 0,
      icon: TrendingUp,
      description: "CV analyses completed",
    },
  ];

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="page-title">
          {greeting}, {fullName.split(" ")[0]}
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Here&apos;s an overview of your recruitment pipeline.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.label}
                  </CardTitle>
                  <div className="p-1.5 rounded-md bg-brand-light">
                    <Icon size={15} className="text-brand" strokeWidth={1.75} />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{stat.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Getting started notice */}
      <Card className="border-[var(--color-brand)]/20 bg-[var(--color-brand-light)]/40">
        <CardContent className="py-5">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-md bg-brand-light">
              <Briefcase size={16} className="text-[var(--color-brand)]" strokeWidth={1.75} />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Get started</p>
              <p className="text-sm text-muted-foreground mt-0.5">
                Create your first job posting to begin collecting applications. Once active,
                AI-powered CV analysis and interviews will be available.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
