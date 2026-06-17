import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const cookieStore = await cookies();
  const candidateId = cookieStore.get("mock_user_id")?.value;
  const role = cookieStore.get("user_role")?.value;

  if (!candidateId || role !== "candidate") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  try {
    const { data: profile, error } = await supabase
      .from("candidate_profiles")
      .select("phone, location, linkedin_url, portfolio_url, resume_url, resume_name, bio, skills")
      .eq("user_id", candidateId)
      .maybeSingle();

    if (error) {
      console.error("[Profile API] Error fetching candidate profile:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ profile });
  } catch (err: any) {
    console.error("[Profile API] Internal error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error occurred." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  // ── 1. Auth check ──────────────────────────────────────────
  const cookieStore = await cookies();
  const candidateId = cookieStore.get("mock_user_id")?.value;
  const role = cookieStore.get("user_role")?.value;

  if (!candidateId || role !== "candidate") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  try {
    // ── 2. Parse form data ──────────────────────────────────────
    const formData = await request.formData();
    const fullName = formData.get("fullName") as string;
    const phone = formData.get("phone") as string;
    const location = formData.get("location") as string;
    const linkedinUrl = formData.get("linkedinUrl") as string;
    const portfolioUrl = formData.get("portfolioUrl") as string;
    const bio = formData.get("bio") as string;
    const skillsRaw = formData.getAll("skills[]") as string[];
    const resumeFile = formData.get("resume") as File | null;

    if (!fullName) {
      return NextResponse.json({ error: "Full Name is required" }, { status: 400 });
    }

    // ── 3. Upload new CV if provided ────────────────────────────
    let resumeUrl: string | null = null;
    let resumeName: string | null = null;

    if (resumeFile && resumeFile.size > 0) {
      const fileExt = resumeFile.name.split(".").pop();
      const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
      const storagePath = `${candidateId}/${uniqueName}`;
      resumeName = resumeFile.name;

      const arrayBuffer = await resumeFile.arrayBuffer();
      const cvBuffer = Buffer.from(arrayBuffer);

      const { error: uploadError } = await supabase.storage
        .from("resumes")
        .upload(storagePath, cvBuffer, {
          contentType: resumeFile.type,
          upsert: true,
        });

      if (uploadError) {
        return NextResponse.json(
          { error: `CV upload failed: ${uploadError.message}` },
          { status: 400 }
        );
      }

      const { data: urlData } = supabase.storage
        .from("resumes")
        .getPublicUrl(storagePath);
      resumeUrl = urlData?.publicUrl || null;

      // Record in candidate_documents
      await supabase.from("candidate_documents").insert({
        candidate_id: candidateId,
        file_name: resumeFile.name,
        file_size: resumeFile.size,
        file_type: resumeFile.type,
        storage_path: storagePath,
      });
    }

    // ── 4. Update user_profiles display name ────────────────────
    const { error: userUpdateError } = await supabase
      .from("user_profiles")
      .update({ full_name: fullName })
      .eq("id", candidateId);

    if (userUpdateError) {
      return NextResponse.json(
        { error: `Name update failed: ${userUpdateError.message}` },
        { status: 500 }
      );
    }

    // Sync the name cookie
    cookieStore.set("mock_user_name", fullName, { maxAge: 604800, path: "/" });

    // ── 5. Upsert candidate_profiles ────────────────────────────
    const profileData: Record<string, unknown> = {
      user_id: candidateId,
      phone: phone || null,
      location: location || null,
      linkedin_url: linkedinUrl || null,
      portfolio_url: portfolioUrl || null,
      bio: bio || null,
      skills: skillsRaw.length > 0 ? skillsRaw : [],
    };

    if (resumeUrl && resumeName) {
      profileData.resume_url = resumeUrl;
      profileData.resume_name = resumeName;
    }

    const { error: profileError } = await supabase
      .from("candidate_profiles")
      .upsert(profileData, { onConflict: "user_id" });

    if (profileError) {
      return NextResponse.json(
        { error: `Profile save failed: ${profileError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[Profile API] POST Error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
