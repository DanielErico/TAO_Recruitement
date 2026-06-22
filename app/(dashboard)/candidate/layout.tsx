import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function CandidateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const role = user.user_metadata?.role || "candidate";
  const userId = user.id;

  // If no auth tokens, redirect to login page
  if (!userId || role !== "candidate") {
    redirect("/login");
  }
  
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
