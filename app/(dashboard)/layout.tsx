import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { Sidebar } from "@/components/shared/Sidebar";
import type { UserRole } from "@/types";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();

  // Read user data directly from cookies set at login — no DB round-trip needed
  const role = cookieStore.get("user_role")?.value as UserRole | undefined;
  const fullName = cookieStore.get("mock_user_name")?.value;
  const email = cookieStore.get("mock_user_email")?.value;

  // If no role cookie, user is not logged in
  if (!role || !fullName || !email) {
    redirect("/login");
  }

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
