import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createAdminClient } from "@/lib/supabase/admin";
import { Button } from "@/components/ui/button";
import { MapPin, Briefcase, Clock, ArrowLeft, ChevronRight } from "lucide-react";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const supabase = createAdminClient();
  const { data } = await supabase.from("jobs").select("title").eq("id", id).single();
  return { title: data?.title ? `${data.title} | TAO Careers` : "Job Details" };
}

export default async function PublicJobDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createAdminClient();

  const { data: job } = await supabase
    .from("jobs")
    .select("*, department:departments(name)")
    .eq("id", id)
    .single();

  if (!job || job.status !== "published") {
    notFound();
  }

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
              href="/jobs"
              className="text-sm font-medium text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors"
            >
              All Jobs
            </Link>
            <Link
              href="/login"
              className="text-sm font-medium text-[var(--color-brand)] hover:text-[var(--color-brand-hover)] transition-colors"
            >
              Sign In
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-6 py-12 space-y-10 animate-fade-in">
        {/* Back Link */}
        <div>
          <Link
            href="/jobs"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors"
          >
            <ArrowLeft size={16} /> Back to all jobs
          </Link>
        </div>

        {/* Job Header */}
        <div className="space-y-6">
          <h1 className="text-3xl md:text-4xl font-bold text-[var(--color-foreground)] tracking-tight">
            {job.title}
          </h1>
          <div className="flex flex-wrap gap-4 text-[var(--color-foreground)]">
            {job.department?.name && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[var(--color-brand-light)] text-[var(--color-brand)] rounded-full text-sm font-medium">
                {job.department.name}
              </span>
            )}
            <span className="flex items-center gap-1.5 text-sm font-medium">
              <Clock size={16} className="text-[var(--color-muted-foreground)]" />
              {job.employment_type.replace("_", " ")}
            </span>
            <span className="flex items-center gap-1.5 text-sm font-medium">
              <Briefcase size={16} className="text-[var(--color-muted-foreground)]" />
              {job.experience_level}
            </span>
            {job.location && (
              <span className="flex items-center gap-1.5 text-sm font-medium">
                <MapPin size={16} className="text-[var(--color-muted-foreground)]" />
                {job.location} {job.remote && "(Remote)"}
              </span>
            )}
          </div>
        </div>

        {/* Apply CTA (Top) */}
        <div className="py-6 border-y border-[var(--color-border)] flex items-center justify-between">
          <div>
            <p className="font-semibold text-[var(--color-foreground)]">Interested in this role?</p>
            <p className="text-sm text-[var(--color-muted-foreground)]">Takes ~3 minutes to apply.</p>
          </div>
          <Button asChild size="lg">
            <Link href={`/jobs/${job.id}/apply`}>
              Apply Now <ChevronRight size={16} className="ml-1" />
            </Link>
          </Button>
        </div>

        {/* Content */}
        <div className="space-y-10 text-[var(--color-foreground)] leading-relaxed">
          <section className="space-y-3">
            <h2 className="text-xl font-bold border-b border-[var(--color-border)] pb-2">About the Role</h2>
            <div className="whitespace-pre-wrap">{job.description}</div>
          </section>

          {job.responsibilities && (
            <section className="space-y-3">
              <h2 className="text-xl font-bold border-b border-[var(--color-border)] pb-2">Key Responsibilities</h2>
              <div className="whitespace-pre-wrap">{job.responsibilities}</div>
            </section>
          )}

          {job.requirements && (
            <section className="space-y-3">
              <h2 className="text-xl font-bold border-b border-[var(--color-border)] pb-2">Requirements</h2>
              <div className="whitespace-pre-wrap">{job.requirements}</div>
            </section>
          )}

          {job.skills_required?.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-xl font-bold border-b border-[var(--color-border)] pb-2">Skills</h2>
              <div className="flex flex-wrap gap-2">
                {job.skills_required.map((skill: string) => (
                  <span
                    key={skill}
                    className="inline-flex items-center px-3 py-1 rounded-full border border-[var(--color-border)] bg-[var(--color-muted)] text-sm font-medium"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Apply CTA (Bottom) */}
        <div className="mt-16 bg-[var(--color-brand-light)] border border-[var(--color-brand)]/20 rounded-xl p-8 text-center space-y-4">
          <h2 className="text-2xl font-bold text-[var(--color-foreground)]">Ready to join us?</h2>
          <p className="text-[var(--color-muted-foreground)] max-w-md mx-auto">
            Submit your application today. Our recruitment team (and AI) will review it shortly.
          </p>
          <div className="pt-2">
            <Button asChild size="lg">
              <Link href={`/jobs/${job.id}/apply`}>
                Apply for this Position
              </Link>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
