// A Supabase client for the BROWSER (client components). Used for signing in
// with Google and signing out. Uses the public anon key — safe to expose.

import { createBrowserClient } from "@supabase/ssr";

export function getBrowserSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
