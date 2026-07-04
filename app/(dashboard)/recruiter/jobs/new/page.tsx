import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { JobForm } from "@/components/jobs/JobForm";
import type { Metadata } from "next";
import type { Department } from "@/types";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Post a Job" };

export default async function NewJobPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const role = user.user_metadata?.role;
  const userId = user.id;

  if (!role) redirect("/login");
  if (!["recruiter", "admin"].includes(role)) redirect("/candidate");

  // Fetch departments — use admin client to ensure database retrieval is robust
  let departments: Department[] = [];
  try {
    const adminDb = createAdminClient();
    const { data } = await adminDb
      .from("departments")
      .select("id, name, created_at")
      .order("name");
    departments = (data as Department[]) || [];
  } catch {
    // If DB unreachable, form still works — just no department dropdown
  }

  return (
    <div className="max-w-3xl space-y-6 animate-fade-in">
      <div>
        <h1 className="page-title">Post a Job</h1>
        <p className="text-sm text-[var(--color-muted-foreground)] mt-0.5">
          Fill in the details below to create a new job posting.
        </p>
      </div>

      <div className="rounded-lg border border-[var(--color-border)] bg-white p-6 shadow-sm">
        <JobForm
          departments={departments}
          userId={userId}
          mode="create"
        />
      </div>
    </div>
  );
}
