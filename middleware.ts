import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Define response initially
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Authenticate user via Supabase Auth (verifies JWT session)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Prefer user_metadata.role (set at account creation), fall back to the
  // user_role cookie that /api/auth/login writes after a DB profile lookup.
  // This ensures recruiters created without metadata still get the right role.
  const cookieRole = request.cookies.get("user_role")?.value;
  const role = user?.user_metadata?.role || (user ? cookieRole : null) || "candidate";
  const isAuthenticated = !!user;

  // Helper to create a redirect response that preserves refreshed Supabase session cookies
  function redirectWithCookies(dest: string) {
    const redirectResponse = NextResponse.redirect(new URL(dest, request.url));
    response.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value, {
        path: cookie.path,
        domain: cookie.domain,
        maxAge: cookie.maxAge,
        secure: cookie.secure,
        sameSite: cookie.sameSite,
        expires: cookie.expires,
      });
    });
    return redirectResponse;
  }

  // 1. Redirect authenticated users away from auth pages
  if (isAuthenticated && (pathname.startsWith("/login") || pathname.startsWith("/register"))) {
    const dest =
      role === "admin"
        ? "/admin"
        : role === "recruiter"
        ? "/recruiter"
        : "/candidate";
    return redirectWithCookies(dest);
  }

  // 2. Protect dashboard routes
  const ROLE_ROUTES = {
    "/admin": ["admin"],
    "/recruiter": ["admin", "recruiter"],
    "/candidate": ["candidate"],
  };

  for (const [prefix, allowedRoles] of Object.entries(ROLE_ROUTES)) {
    if (pathname.startsWith(prefix)) {
      // Not logged in -> send to login
      if (!isAuthenticated) {
        const redirectResponse = redirectWithCookies("/login");
        redirectResponse.cookies.delete("user_role");
        return redirectResponse;
      }

      // Wrong role -> redirect to correct dashboard
      if (!allowedRoles.includes(role)) {
        const dest =
          role === "admin"
            ? "/admin"
            : role === "recruiter"
            ? "/recruiter"
            : "/candidate";

        if (!pathname.startsWith(dest)) {
          return redirectWithCookies(dest);
        }
      }
      break;
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/recruiter/:path*",
    "/candidate/:path*",
    "/login",
    "/register",
  ],
};
