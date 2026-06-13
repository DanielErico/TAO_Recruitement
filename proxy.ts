import { NextResponse, type NextRequest } from "next/server";
import type { UserRole } from "@/types";

// Dashboard route prefix → which roles can access it
const ROLE_ROUTES: Record<string, UserRole[]> = {
  "/admin": ["admin"],
  "/recruiter": ["admin", "recruiter"],
  "/candidate": ["candidate"],
};

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const roleCookie = request.cookies.get("user_role")?.value as UserRole | undefined;
  const userIdCookie = request.cookies.get("mock_user_id")?.value;

  const isAuthenticated = !!(roleCookie && userIdCookie);

  // ── 1. Redirect authenticated users away from auth pages ──
  if (isAuthenticated && (pathname.startsWith("/login") || pathname.startsWith("/register"))) {
    const dest =
      roleCookie === "admin"
        ? "/admin"
        : roleCookie === "recruiter"
        ? "/recruiter"
        : "/candidate";
    return NextResponse.redirect(new URL(dest, request.url));
  }

  // ── 2. Protect dashboard routes ──
  for (const [prefix, allowedRoles] of Object.entries(ROLE_ROUTES)) {
    if (pathname.startsWith(prefix)) {
      // Not logged in → send to login
      if (!isAuthenticated) {
        return NextResponse.redirect(new URL("/login", request.url));
      }

      // Wrong role → redirect to correct dashboard (only if not already there)
      if (!allowedRoles.includes(roleCookie!)) {
        const dest =
          roleCookie === "admin"
            ? "/admin"
            : roleCookie === "recruiter"
            ? "/recruiter"
            : "/candidate";

        if (!pathname.startsWith(dest)) {
          return NextResponse.redirect(new URL(dest, request.url));
        }
      }

      break;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Skip static assets
    "/((?!_next/static|_next/image|favicon.ico|logo.webp|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
