import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Wraps supabase.auth.getUser() with a 5-second timeout and error handling.
 *
 * Raw getUser() calls can hang for minutes when Supabase is unreachable
 * (ECONNRESET), causing pages and middleware to crash with a 404.
 * This helper ensures we always get a result within 5 seconds — returning
 * null on timeout or network failure so callers can redirect gracefully.
 */
export async function safeGetUser(
  supabase: SupabaseClient
): Promise<Awaited<ReturnType<SupabaseClient["auth"]["getUser"]>>["data"]["user"]> {
  try {
    const result = await Promise.race([
      supabase.auth.getUser(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Auth timeout")), 5000)
      ),
    ]) as Awaited<ReturnType<SupabaseClient["auth"]["getUser"]>>;
    return result.data?.user ?? null;
  } catch {
    return null;
  }
}
