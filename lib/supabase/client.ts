import { createBrowserClient } from "@supabase/ssr";

function getCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(";").shift();
  return undefined;
}

// Safe client — returns null if env vars not set (build time)
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    // Return a dummy client shape that won't throw at build time
    // All actual calls happen in the browser where env vars will be present
    return null as never;
  }

  const client = createBrowserClient(url, key);

  if (typeof document !== "undefined") {
    const mockRole = getCookie("user_role");
    const mockUserId = getCookie("mock_user_id");
    const mockUserEmail = getCookie("mock_user_email");
    const mockUserName = getCookie("mock_user_name");

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
  }

  return client;
}
