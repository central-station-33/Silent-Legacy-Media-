# Silent Legacy — web app

Replaces both Retool apps (the manual drafts tool and the never-built
Chief Editor Portal spec) with one Next.js app. See `../HANDOFF.md`'s
"Retool retired" section for why and what changed.

## Pages

- `/drafts` — manual draft CRUD: create, edit, approve, reject, search +
  filter, CSV export, KPI counts.
- `/queue` — the AI-pipeline editorial queue (`silent_legacy_stories`):
  queue list + detail panel, editable AI-drafted content, approve
  (computes a staggered publish slot, notifies Make's Publish Trigger
  webhook) / reject with a required reason.

Both are gated by a single shared password (see `middleware.ts` /
`lib/auth.ts`) — there's no per-user auth. `decided_by` on the queue is
a free-text name field the approver types in, not a real identity.

## Data

A dedicated Supabase Postgres project backs this app (schema: `drafts`,
`silent_legacy_stories`, `silent_legacy_raw_items`). RLS is enabled with
policies granting the `anon` role full access — the app relies entirely
on `SUPABASE_ANON_KEY` never being sent to the browser (it's read only in
server-side code under `lib/supabase.ts`, which is marked `server-only`).
This is a deliberate simplification for a small internal tool, not a
hardened setup. To harden later: switch to the `service_role` key (kept
as a Vercel-only secret) and drop the `anon` policies, or add real
Supabase Auth and scope RLS to `authenticated`.

**The live Make.com scenarios do not write here yet.** They still target
the original Retool-managed Postgres. See HANDOFF.md for what needs to
happen before `/queue` shows real pipeline output.

## Environment variables

See `.env.example`. Required:

- `SUPABASE_URL`, `SUPABASE_ANON_KEY` — server-only, from the Supabase
  project's API settings.
- `APP_PASSWORD` — the shared password for the login gate.
- `SESSION_SECRET` — random string used to sign the session cookie.
- `MAKE_PUBLISH_TRIGGER_WEBHOOK_URL` — optional; if unset, approving a
  queue story just updates the database without notifying Make.

## Local development

```
npm install
cp .env.example .env.local   # fill in real values
npm run dev
```

## Deploy

Deployed on Vercel, connected to this repo's `web/` directory as the
project root. Any push to the tracked branch redeploys.
