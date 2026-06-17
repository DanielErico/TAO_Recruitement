import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function CandidateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const userId = cookieStore.get("mock_user_id")?.value;
  const role = cookieStore.get("user_role")?.value;

  // If no auth tokens, redirect to login page
  if (!userId || role !== "candidate") {
    redirect("/login");
  }

  const supabase = createAdminClient();
  
  // Check if the candidate has completed their onboarding
  const { data: profile, error } = await supabase
    .from("candidate_profiles")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("[CandidateLayout] Error fetching candidate profile:", error.message);
    // On DB error, redirect to onboarding as a safe fallback rather than
    // letting the candidate reach the dashboard with no profile data.
    redirect("/candidate/onboarding");
  }

  // If no candidate profile row exists, redirect to onboarding
  if (!profile) {
    redirect("/candidate/onboarding");
  }

  return <>{children}</>;
}
