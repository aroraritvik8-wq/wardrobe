// A Supabase client bound to the logged-in user's session (read from cookies).
// Use this in API routes / server code for anything user-specific: Row Level
// Security then makes every query automatically see ONLY that user's rows.

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function getServerSupabase() {
  const cookieStore = await cookies();
  return createServerClient(URL, ANON, {
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
          // Called from a Server Component — the middleware refreshes sessions.
        }
      },
    },
  });
}

// Returns { supabase, user }. user is null when nobody is signed in.
export async function requireUser() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}
