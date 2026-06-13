import { redirect } from "next/navigation";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const cookieStore = await cookies();
  const role = cookieStore.get("user_role")?.value;

  if (!role) {
    redirect("/login");
  }

  if (role === "admin") redirect("/admin");
  if (role === "recruiter") redirect("/recruiter");
  redirect("/candidate");
}
