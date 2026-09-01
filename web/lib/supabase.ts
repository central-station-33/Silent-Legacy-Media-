import "server-only";
import { createClient } from "@supabase/supabase-js";

// Server-only client. SUPABASE_ANON_KEY must never be prefixed with
// NEXT_PUBLIC_ or otherwise sent to the browser -- every table it touches
// relies on RLS policies scoped to the anon role (see the Supabase migration
// in HANDOFF.md), and the app's own password gate (middleware.ts) is the only
// thing standing between a visitor and these tables.
export function supabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL / SUPABASE_ANON_KEY are not set");
  }
  return createClient(url, key, {
    auth: { persistSession: false },
  });
}
