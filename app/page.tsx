import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { MapPin, Briefcase, Clock, ChevronRight } from "lucide-react";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Careers at TAO" };

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const role = user.user_metadata?.role;
    if (role === "admin") redirect("/admin");
    if (role === "recruiter") redirect("/recruiter");
    if (role === "candidate") redirect("/candidate");
  }

  const serviceClient = await createServiceClient();
  const { data: jobsData } = await serviceClient
    .from("jobs")
    .select("*, department:departments(name)")
    .eq("status", "published")
    .order("created_at", { ascending: false });
  const jobs = jobsData || [];

  // Group by department
  const jobsByDept = jobs.reduce((acc, job) => {
    const dept = job.department?.name ?? "Other";
    if (!acc[dept]) acc[dept] = [];
    acc[dept].push(job);
    return acc;
  }, {} as Record<string, typeof jobs>);

  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      {/* Header */}
      <header className="border-b border-[var(--color-border)] bg-white sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/">
            <Image src="/logo.webp" alt="TAO" width={72} height={28} priority />
          </Link>
          <nav className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm font-medium text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors"
            >
              Sign In
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative bg-[#C2DFB3] overflow-hidden">
        {/* Background Image & Overlay */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/jobs-hero.png"
            alt="TAO Team"
            fill
            className="object-cover object-center lg:object-right"
            priority
          />
          {/* Soft Green gradient overlay matching user mockup */}
          <div className="absolute inset-0 bg-[#C2DFB3]/50 sm:bg-gradient-to-r sm:from-[#C2DFB3]/80 sm:via-[#C2DFB3]/40 sm:to-transparent"></div>
        </div>

        {/* Content Overlay */}
        <div className="relative z-10 max-w-5xl mx-auto px-6 py-20 md:py-32 flex flex-col items-start justify-center min-h-[400px]">
          <div className="max-w-lg space-y-5">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-[#2A2A2A]">
              Ready to live your <span className="text-[#046C44]">Dream</span>?
            </h1>
            <p className="text-base md:text-lg text-[#444444] font-medium leading-relaxed max-w-md">
              Come join a team that&apos;s making agriculture a viable and fulfilling economic option for millions of young people.
            </p>
            <div className="pt-2">
              <a
                href="/register"
                className="inline-flex items-center justify-center gap-2 rounded-md bg-[#046C44] px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#035a38] transition-all"
              >
                Join the team <ChevronRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Job Listings */}
      <main id="open-roles" className="max-w-4xl mx-auto px-6 py-16 space-y-12">
        {Object.entries(jobsByDept).length === 0 ? (
          <div className="text-center py-20">
            <Briefcase size={48} className="mx-auto text-[var(--color-muted-foreground)] opacity-20 mb-4" strokeWidth={1} />
            <h2 className="text-xl font-semibold text-[var(--color-foreground)]">No open positions</h2>
            <p className="text-[var(--color-muted-foreground)] mt-2">
              We don&apos;t have any open roles right now. Please check back later!
            </p>
          </div>
        ) : (
          (Object.entries(jobsByDept) as [string, typeof jobs][]).map(([dept, deptJobs]) => (
            <div key={dept} className="space-y-4">
              <h2 className="text-xl font-bold text-[var(--color-foreground)] border-b border-[var(--color-border)] pb-2">
                {dept}
              </h2>
              <div className="grid gap-4">
                {deptJobs.map((job) => (
                  <Link
                    key={job.id}
                    href={`/jobs/${job.id}`}
                    className="group flex flex-col sm:flex-row sm:items-center justify-between p-5 rounded-lg border border-[var(--color-border)] bg-white hover:border-[var(--color-brand)] hover:shadow-md transition-all cursor-pointer"
                  >
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold text-[var(--color-foreground)] group-hover:text-[var(--color-brand)] transition-colors">
                        {job.title}
                      </h3>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--color-muted-foreground)]">
                        {job.location && (
                          <span className="flex items-center gap-1">
                            <MapPin size={14} /> {job.location}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Briefcase size={14} /> {job.remote ? "Remote" : "On-site"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock size={14} />{" "}
                          {job.employment_type.replace("_", " ")}
                        </span>
                      </div>
                    </div>
                    <div className="mt-4 sm:mt-0 flex items-center justify-end text-[var(--color-brand)]">
                      <span className="text-sm font-medium mr-1 opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0">
                        View Role
                      </span>
                      <ChevronRight size={18} className="transform group-hover:translate-x-1 transition-transform" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))
        )}
      </main>
    </div>
  );
}
