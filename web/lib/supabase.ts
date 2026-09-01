import "server-only";
import { createClient } from "@supabase/supabase-js";

// Server-only client. SUPABASE_ANON_KEY must never be prefixed with
// NEXT_PUBLIC_ or otherwise sent to the browser -- every table it touches
// relies on RLS policies scoped to the anon role (see the Supabase migration
// in HANDOFF.md), and the app's own password gate (middleware.ts) is the only
// thing standing between a visitor and these tables.
// PostgREST's .or()/.filter() DSL treats `,`, `(`, `)`, and `.` as syntax,
// not data -- interpolating a raw search term into an .or() string (as
// both /drafts and its CSV export do, to search several columns with one
// input) lets a value containing those characters inject extra filter
// clauses PostgREST will happily evaluate, e.g. a search for
// `x,status.eq.Rejected` widening the filter to match every rejected row
// regardless of the actual search term. PostgREST's fix for this is the
// same as CSV/JSON: wrap the value in double quotes and escape `\` and `"`
// inside it.
export function escapePostgrestValue(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

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
