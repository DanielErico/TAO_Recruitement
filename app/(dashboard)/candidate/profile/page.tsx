import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDate } from "@/lib/utils";
import type { Metadata } from "next";
import { CandidateProfileClient } from "./CandidateProfileClient";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "My Profile" };

export default async function CandidateProfilePage() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("mock_user_id")?.value;
  const role = cookieStore.get("user_role")?.value;

  if (!userId || role !== "candidate") redirect("/login");

  const supabase = createAdminClient();

  // Fetch user profile + candidate profile in parallel
  const [userProfileRes, candidateProfileRes, docsRes] = await Promise.all([
    supabase.from("user_profiles").select("id, full_name, email, created_at").eq("id", userId).single(),
    supabase.from("candidate_profiles").select("*").eq("user_id", userId).maybeSingle(),
    supabase.from("candidate_documents").select("*").eq("candidate_id", userId).order("uploaded_at", { ascending: false }),
  ]);

  const userProfile = userProfileRes.data;
  const candidateProfile = candidateProfileRes.data;
  const documents = docsRes.data || [];

  if (!userProfile) redirect("/login");

  return (
    <CandidateProfileClient
      userId={userId}
      userProfile={userProfile}
      candidateProfile={candidateProfile}
      documents={documents}
    />
  );
}
