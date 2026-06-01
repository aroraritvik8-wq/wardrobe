// This file creates the connection to your Supabase database.
//
// IMPORTANT: this runs only on the server (inside API routes), never in the
// browser. That keeps your secret key private. The browser never sees it.

import { createClient } from "@supabase/supabase-js";

// We read two secret values from the .env.local file (you create that file
// during setup — see SETUP.md). We DON'T read them at the top of the file,
// because then the app would refuse to even build without them. Instead we
// read them inside a function that runs only when a request comes in.
export function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Supabase is not configured. Create a file called .env.local in the " +
        "wardrobe folder and add NEXT_PUBLIC_SUPABASE_URL and " +
        "SUPABASE_SERVICE_ROLE_KEY. See SETUP.md for the exact steps."
    );
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}
