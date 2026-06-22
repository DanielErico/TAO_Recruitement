import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { Sidebar } from "@/components/shared/Sidebar";
import type { UserRole } from "@/types";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const cookieStore = await cookies();
  const roleCookie = cookieStore.get("user_role")?.value;
  const role = (user.user_metadata?.role || roleCookie || "candidate") as UserRole;

  // Fetch the actual profile for name/email
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("full_name, email")
    .eq("id", user.id)
    .single();

  const fullName = profile?.full_name || user.user_metadata?.full_name || user.email?.split("@")[0] || "User";
  const email = profile?.email || user.email || "";

  return (
    <div className="min-h-screen bg-[#F8FAF9]">
      <Sidebar
        role={role}
        fullName={fullName}
        email={email}
      />
      {/* Main content offset for sidebar */}
      <main className="lg:pl-56 pt-0 lg:pt-0">
        {/* Mobile top bar spacer */}
        <div className="lg:hidden h-14" />
        <div className="p-6 lg:p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
