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

  const role = user?.user_metadata?.role || "candidate";
  const isAuthenticated = !!user;

  // 1. Redirect authenticated users away from auth pages
  if (isAuthenticated && (pathname.startsWith("/login") || pathname.startsWith("/register"))) {
    const dest =
      role === "admin"
        ? "/admin"
        : role === "recruiter"
        ? "/recruiter"
        : "/candidate";
    return NextResponse.redirect(new URL(dest, request.url));
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
        const redirectResponse = NextResponse.redirect(new URL("/login", request.url));
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
          return NextResponse.redirect(new URL(dest, request.url));
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
