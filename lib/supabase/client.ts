import { createBrowserClient } from "@supabase/ssr";

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

  return client;
}
