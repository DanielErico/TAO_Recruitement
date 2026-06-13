import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { JobForm } from "@/components/jobs/JobForm";
import type { Metadata } from "next";
import type { Department } from "@/types";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Post a Job" };

export default async function NewJobPage() {
  const cookieStore = await cookies();

  const role = cookieStore.get("user_role")?.value;
  const userId = cookieStore.get("mock_user_id")?.value;

  if (!role || !userId) redirect("/login");
  if (!["recruiter", "admin"].includes(role)) redirect("/candidate");

  const supabase = createAdminClient();

  // Fetch departments — these are public reference data, safe to query
  let departments: Department[] = [];
  try {
    const { data } = await supabase
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
