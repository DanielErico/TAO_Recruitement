import { redirect } from "next/navigation";

// The jobs listing has been moved to the home page (/)
export default function PublicJobsPage() {
  redirect("/");
}
