import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { LandingClient } from "@/components/landing/LandingClient";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const cookieStore = await cookies();
  const role = cookieStore.get("user_role")?.value;

  if (role === "admin") redirect("/admin");
  if (role === "recruiter") redirect("/recruiter");
  if (role === "candidate") redirect("/candidate");

  return <LandingClient />;
}
