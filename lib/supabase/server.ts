import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  const mockRole = cookieStore.get("user_role")?.value;
  const mockUserId = cookieStore.get("mock_user_id")?.value;
  const mockUserEmail = cookieStore.get("mock_user_email")?.value;
  const mockUserName = cookieStore.get("mock_user_name")?.value;

  const client = createServerClient(
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
            // Server component — cookies can't be set
          }
        },
      },
    }
  );

  if (mockRole && mockUserId) {
    client.auth.getUser = async () => {
      return {
        data: {
          user: {
            id: mockUserId,
            email: mockUserEmail || "candidate@tao.org",
            aud: "authenticated",
            role: "authenticated",
            user_metadata: {
              full_name: mockUserName || "TAO User",
              role: mockRole,
            },
            app_metadata: {},
            created_at: new Date().toISOString(),
          } as any,
        },
        error: null,
      };
    };
  }

  return client;
}

export async function createServiceClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
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
            // no-op
          }
        },
      },
    }
  );
}
