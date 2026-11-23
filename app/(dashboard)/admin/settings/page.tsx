/**
 * TAO Recruit AI — Admin Settings Page
 * =====================================================
 * Allows administrators to toggle the active recruitment
 * assessment mode between PLAN_A (AI Voice Interview)
 * and PLAN_B (AI-Powered Online Assessment).
 *
 * Only accessible to users with the `admin` role.
 * =====================================================
 */

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminSettingsClient } from "./AdminSettingsClient";
import { getServerRecruitmentMode } from "@/lib/config-server";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Platform Settings — TAO Recruit AI" };

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") redirect("/recruiter");

  // Read mode dynamically on the server (checks env then request cookies)
  const currentMode = await getServerRecruitmentMode();

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="page-title">Platform Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Configure recruitment assessment mode and platform-wide options.
        </p>
      </div>
      <AdminSettingsClient currentMode={currentMode} adminName={profile.full_name || "Admin"} />
    </div>
  );
}
