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

## Publishing (Ghost)

Ghost replaces WordPress as the publish target (the `wordpress/` scripts
at the repo root are dead code now, kept only for historical reference).
Two different publish timings, matching how each page is used:

- **`/drafts`** publishes immediately on Approve — `approveDraft` calls
  Ghost synchronously (`lib/ghost.ts`) and stores `ghost_post_id` /
  `ghost_url` on the row. If Ghost isn't configured yet, this just no-ops
  (the draft still gets marked Approved). If Ghost *is* configured and
  the call fails, the error surfaces in the UI and the draft stays
  Pending — "Approved" is meant to mean "actually published."
- **`/queue`** keeps the original staggered "trickle publish" design (3-4
  posts/day across the week rather than dumping 20-30 at once): Approve
  only computes `scheduled_publish_at` and writes to the database. A
  separate route, `POST /api/publish-due`, does the actual publishing —
  it finds `approved` stories whose `scheduled_publish_at` has passed and
  publishes each to Ghost. Something needs to call that route on a
  schedule (it does nothing on its own):
  - **Supabase pg_cron + pg_net** (no extra hosting): enable both
    extensions in the Supabase dashboard, then schedule a job that POSTs
    to `https://<your-vercel-domain>/api/publish-due` with header
    `Authorization: Bearer <PUBLISH_CRON_SECRET>` every 15-30 minutes.
  - **Vercel Cron Jobs**: works the same way, but the Hobby plan limits
    cron jobs to once/day, which is too infrequent for same-day trickle
    publishing — needs the Pro plan for anything more frequent.

The route requires `Authorization: Bearer <PUBLISH_CRON_SECRET>` and does
real writes, so don't expose it without that header.

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
- `GHOST_API_URL`, `GHOST_ADMIN_API_KEY` — optional until Ghost(Pro) is
  set up; both features that publish (drafts approve, `/api/publish-due`)
  no-op on Ghost specifically until these are set.
- `PUBLISH_CRON_SECRET` — required for `/api/publish-due` to accept
  requests at all (returns 401 otherwise); not needed for `/drafts`.

## Local development

```
npm install
cp .env.example .env.local   # fill in real values
npm run dev
```

## Deploy

Deployed on Vercel, connected to this repo's `web/` directory as the
project root. Any push to the tracked branch redeploys.
