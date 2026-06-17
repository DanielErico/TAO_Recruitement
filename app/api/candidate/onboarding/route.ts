import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

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
    const resumeFile = formData.get("resume") as File | null;

    if (!fullName) {
      return NextResponse.json({ error: "Full Name is required" }, { status: 400 });
    }

    // ── 3. Upload CV to Storage (if provided) ───────────────────
    let resumeUrl: string | null = null;
    let resumeName: string | null = null;

    if (resumeFile && resumeFile.size > 0) {
      const fileExt = resumeFile.name.split(".").pop();
      const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
      const storagePath = `${candidateId}/${uniqueName}`;
      resumeName = resumeFile.name;

      const arrayBuffer = await resumeFile.arrayBuffer();
      const cvBuffer = Buffer.from(arrayBuffer);

      // Upload file to 'resumes' bucket
      const { error: uploadError } = await supabase.storage
        .from("resumes")
        .upload(storagePath, cvBuffer, {
          contentType: resumeFile.type,
          upsert: true,
        });

      if (uploadError) {
        console.error("[Onboarding] Storage upload failed:", uploadError);
        return NextResponse.json(
          { error: `CV upload failed: ${uploadError.message}` },
          { status: 400 }
        );
      }

      // Get public URL of the uploaded resume
      const { data: urlData } = supabase.storage
        .from("resumes")
        .getPublicUrl(storagePath);
      resumeUrl = urlData?.publicUrl || null;

      // Create a document record in candidate_documents
      const { error: docError } = await supabase.from("candidate_documents").insert({
        candidate_id: candidateId,
        file_name: resumeFile.name,
        file_size: resumeFile.size,
        file_type: resumeFile.type,
        storage_path: storagePath,
      });

      if (docError) {
        console.warn("[Onboarding] Failed to record in candidate_documents:", docError.message);
      }
    }

    // ── 4. Update user_profiles display name ────────────────────
    const { error: userUpdateError } = await supabase
      .from("user_profiles")
      .update({ full_name: fullName })
      .eq("id", candidateId);

    if (userUpdateError) {
      console.error("[Onboarding] Failed to update user profile name:", userUpdateError.message);
      return NextResponse.json(
        { error: `Profile update failed: ${userUpdateError.message}` },
        { status: 500 }
      );
    }

    // Update the mock name cookie to match the new name
    cookieStore.set("mock_user_name", fullName, { maxAge: 604800, path: "/" });

    // ── 5. Upsert candidate_profiles ────────────────────────────
    const profileData: any = {
      user_id: candidateId,
      phone: phone || null,
      location: location || null,
      linkedin_url: linkedinUrl || null,
      portfolio_url: portfolioUrl || null,
    };

    if (resumeUrl && resumeName) {
      profileData.resume_url = resumeUrl;
      profileData.resume_name = resumeName;
    }

    const { error: profileError } = await supabase
      .from("candidate_profiles")
      .upsert(profileData, { onConflict: "user_id" });

    if (profileError) {
      console.error("[Onboarding] Failed to upsert candidate profile:", profileError.message);
      return NextResponse.json(
        { error: `Candidate profile saving failed: ${profileError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[Onboarding] Onboarding route failed:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error occurred." },
      { status: 500 }
    );
  }
}
