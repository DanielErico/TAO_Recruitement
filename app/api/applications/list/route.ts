import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();

  // Create a server-side Supabase client to authenticate the user securely via JWT session
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Safe to ignore in dynamic route context
          }
        },
      },
    }
  );

  const { data: { user } } = await supabaseAuth.auth.getUser();
  const cookieRole = cookieStore.get("user_role")?.value;
  const role = user?.user_metadata?.role || (user ? cookieRole : null) || "candidate";

  if (!user || !role || !["recruiter", "admin"].includes(role)) {
    return NextResponse.json({ error: "Unauthorized access" }, { status: 403 });
  }

  try {
    const supabase = createAdminClient();

    const { data: applications, error } = await supabase
      .from("applications")
      .select(`
        id,
        status,
        applied_at,
        candidate:user_profiles (
          id,
          full_name,
          email
        ),
        job:jobs (
          id,
          title
        ),
        cv_analysis:cv_analyses (
          job_fit_score
        )
      `)
      .order("applied_at", { ascending: false });

    if (error) {
      throw error;
    }

    // Flatten CV Analysis if it is an array
    const flattenedApps = applications?.map((app: any) => {
      const cvAnalysis = Array.isArray(app.cv_analysis) 
        ? app.cv_analysis[0] 
        : app.cv_analysis;

      return {
        ...app,
        cv_analysis: cvAnalysis || null
      };
    }) || [];

    return NextResponse.json({ success: true, applications: flattenedApps });
  } catch (err: any) {
    console.error("Failed to list applications:", err);
    return NextResponse.json({ error: err.message || "Failed to list applications" }, { status: 500 });
  }
}
