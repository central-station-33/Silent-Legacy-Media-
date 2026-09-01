import "server-only";
import { createClient } from "@supabase/supabase-js";

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

// Server-only client, using the service_role key -- this bypasses RLS
// entirely, which is why it must never reach the browser (the
// "server-only" import above throws at build time if anything tries to
// pull this into a client bundle). All access control lives at the app
// layer (middleware.ts's password gate) and in the query code itself,
// not in Postgres policies. RLS on these tables denies the anon role
// outright (see the Supabase migration in HANDOFF.md), so the old anon
// key can no longer read or write anything even if it leaked.
export function supabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set");
  }
  return createClient(url, key, {
    auth: { persistSession: false },
  });
}
