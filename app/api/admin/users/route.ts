import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/** Verify the caller is an admin */
async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const adminDb = createAdminClient();
  const { data: profile } = await adminDb
    .from("user_profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin") return null;
  return { user, adminDb };
}

/**
 * GET /api/admin/users
 * Returns all staff users (admin + recruiter) from user_profiles.
 */
export async function GET() {
  const ctx = await requireAdmin();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { adminDb } = ctx;
  const { data, error } = await adminDb
    .from("user_profiles")
    .select("id, full_name, email, role, created_at")
    .in("role", ["admin", "recruiter"])
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ users: data });
}

/**
 * POST /api/admin/users
 * Creates a new recruiter or admin account.
 * Body: { email, fullName, role, password }
 */
export async function POST(request: NextRequest) {
  const ctx = await requireAdmin();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { adminDb } = ctx;
  const body = await request.json();
  const { email, fullName, role, password } = body;

  if (!email || !fullName || !role || !password) {
    return NextResponse.json(
      { error: "email, fullName, role, and password are required." },
      { status: 400 }
    );
  }

  if (!["recruiter", "admin"].includes(role)) {
    return NextResponse.json(
      { error: "Role must be 'recruiter' or 'admin'." },
      { status: 400 }
    );
  }

  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters." },
      { status: 400 }
    );
  }

  // Create auth user
  const { data: authData, error: authError } =
    await adminDb.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName.trim(),
        role,
      },
    });

  if (authError) {
    const isExists = authError.message.toLowerCase().includes("already");
    return NextResponse.json(
      {
        error: isExists
          ? "A user with this email already exists."
          : authError.message,
      },
      { status: isExists ? 409 : 500 }
    );
  }

  const userId = authData.user.id;

  // Upsert profile
  const { error: profileError } = await adminDb.from("user_profiles").upsert({
    id: userId,
    email: email.trim().toLowerCase(),
    full_name: fullName.trim(),
    role,
  });

  if (profileError) {
    console.error("[Admin Users] Profile upsert error:", profileError.message);
    // Auth user was created but profile failed — clean up
    await adminDb.auth.admin.deleteUser(userId);
    return NextResponse.json(
      { error: "Account created but profile could not be saved. Please try again." },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      user: {
        id: userId,
        email: email.trim().toLowerCase(),
        full_name: fullName.trim(),
        role,
      },
    },
    { status: 201 }
  );
}

/**
 * DELETE /api/admin/users?id=<userId>
 * Deletes a staff user (admin or recruiter).
 */
export async function DELETE(request: NextRequest) {
  const ctx = await requireAdmin();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { adminDb, user: callerUser } = ctx;
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("id");

  if (!userId) {
    return NextResponse.json({ error: "User ID required." }, { status: 400 });
  }

  if (userId === callerUser.id) {
    return NextResponse.json(
      { error: "You cannot delete your own account." },
      { status: 400 }
    );
  }

  // Verify target is staff (not candidate)
  const { data: targetProfile } = await adminDb
    .from("user_profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (!targetProfile || !["admin", "recruiter"].includes(targetProfile.role)) {
    return NextResponse.json(
      { error: "User not found or not a staff member." },
      { status: 404 }
    );
  }

  const { error: deleteError } = await adminDb.auth.admin.deleteUser(userId);
  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  // Profile is deleted by DB cascade, but force it just in case
  await adminDb.from("user_profiles").delete().eq("id", userId);

  return NextResponse.json({ success: true });
}
