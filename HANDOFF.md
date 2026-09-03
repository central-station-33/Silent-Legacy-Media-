# Silent Legacy — Handoff

_Last updated: 2026-09-01_

This is the single document to read to pick this project back up. It
covers what's live, what's tested, what's not built, why the
architecture looks the way it does, and every credential/ID you need to
preserve. `docs/DEPLOYMENT_STATUS.md` is the more detailed, continuously-
updated companion to this file (scenario-by-scenario); this file is the
one-time orientation read.

## 2026-09-01: Retool retired, `web/` replaces it, repos consolidated

Two things changed today that everything below predates:

1. **Two GitHub repos existed for this project** — `Silent-Legacy-Media`
   (no dash, an empty stub) and this repo, `Silent-Legacy-Media-` (trailing
   dash, this repo's actual content). The no-dash repo has since been
   **deleted** (by whom/when isn't recorded here), which settles the
   question on its own: **this repo, `Silent-Legacy-Media-`, is the sole
   canonical repo going forward.** A `web/` app was built and briefly
   pushed to the no-dash repo before its deletion; that work is carried
   forward into this repo via this same change so nothing was lost.
2. **Retool is retired.** There were actually *two* separate,
   undocumented-until-now Retool efforts:
   - The Chief Editor Portal described in `retool/EDITOR_PORTAL_SPEC.md`
     (below) — driven by `silent_legacy_stories`, the AI pipeline's
     editorial queue. This was genuinely never built.
   - A second, simpler Retool app (`draftsEditorPage`, table `drafts`,
     manual create/edit/approve/reject) that *was* built, separately,
     and was never recorded in this repo. Its own README documented that
     its Make.com sync was broken (401 Unauthorized) and unbuilt beyond
     a spec.

   Both are now replaced by a single custom app in `web/` — a Next.js
   (App Router, TypeScript, Tailwind) app covering **both** the manual
   drafts workflow and the AI-pipeline editorial queue in one place:
   - `/drafts` — the manual CRUD workflow (create/edit/approve/reject,
     KPIs, search + pillar/status filters, CSV export) — a straight port
     of the old Retool app's functionality onto the `drafts` table.
   - `/queue` — the Chief Editor Portal from `retool/EDITOR_PORTAL_SPEC.md`,
     finally built: queue table + detail panel, editable AI-drafted
     content, Approve (computes a staggered publish slot, notifies the
     Make "Publish Trigger" webhook) / Reject (required reason) against
     `silent_legacy_stories`.
   - Access control: a single shared password gate (`APP_PASSWORD`,
     `SESSION_SECRET` env vars, signed cookie, see `web/middleware.ts`) —
     not real per-user auth. Fine for a small internal team; add
     Supabase Auth first if that ever needs to change.
   - Data: a **new**, dedicated Supabase Postgres project
     (`silent-legacy-media`, project ref `rwnyyzayyrgvaaujryly`), not the
     Retool-managed Postgres the Make scenarios currently write to. RLS
     is enabled with `anon`-role policies (see the migration in
     `web/README.md` if added, or Supabase project history) — the
     `anon` key is kept as a server-only env var (never `NEXT_PUBLIC_`)
     and the app never ships it to the browser, but this is a known
     simplification, not a hardened setup. See `web/lib/supabase.ts`'s
     comment for the tradeoff.

   **This means the live Make scenarios (Layer 1 ingestion, Layer 2
   processing — see "Make.com — what's live" below) still write to the
   *old* Retool-managed Postgres, not this new Supabase database.**
   `/queue` in the new app will show nothing until either (a) the Make
   scenarios' Postgres connection is re-pointed at the new Supabase
   project, or (b) `silent_legacy_stories` is migrated over. That
   re-pointing is a live-infrastructure change to a working pipeline and
   deliberately wasn't done as part of this replacement — do it
   intentionally, not as a side effect of a doc read.

   See `web/README.md` for exact Vercel/Supabase env var setup.

   **Vercel note:** the `silent-legacy-media` Vercel project's Git
   integration was, at time of writing, pointed at this repo's other
   branch (`claude/silent-legacy-launch-gvn3z1`, docs-only) rather than
   wherever this change lands — that's why production briefly served a
   404 (no app on that branch, so no route matched `/`). Point the
   Vercel project's Git integration at this repo's actual default
   branch (whatever this PR merges into) before expecting `/drafts` or
   `/queue` to load.

## What Silent Legacy is

A verified-wealth media brand — "No Gossip. Just Legacy." Three pillars:

- **Pro** — athletes & entertainers acquiring real estate, franchises, tech
  equity, or startup stakes.
- **W** — female athletes, founders, and leaders closing high-impact
  commercial or equity deals.
- **Proof** — everyday people building non-gimmick wealth (laundromats,
  trade fleets, housing trusts, community funding).

Every story must clear an anti-scam gate before it's even considered
(see Verifier, below) and a human Chief Editor before it ever publishes.
Nothing auto-publishes.

## The pipeline, end to end

```
Apify actors (6 sources, scheduled)
        │  native "Watch Actor Runs" trigger
        ▼
Layer 1 — Ingestion (5 Make scenarios, Claude-free)
        │  writes raw items to Postgres, status='scraped'
        ▼
silent_legacy_raw_items  (staging table)
        │
        ▼
Layer 2 — Processing (1 Make scenario, own 10-min schedule)
        │  Scout → Verifier → Writer (all Claude)
        ▼
silent_legacy_stories  (editorial queue, status='pending')
        │
        ▼
Retool Chief Editor Portal  ← NOT BUILT (spec only, see below)
        │  Approve / Reject
        ▼
WordPress  ← NOT CONNECTED (publish step untested)
```

## Repo structure

```
prompts/                  Scout / Verifier / Writer system prompts (source of truth —
                           kept byte-identical to what's live in Make; see "Prompt sync" below)
config/
  rss-feeds.json           14 live-tested RSS feeds + a documented "don't retry" list
  watchlist.json            Unverified search seeds for the 4 name/query-driven Apify actors
  README.md                 How to use both, plus the Form D two-strategy note
apify/
  scout-news/                RSS source actor code (superseded live by a Store actor — see below)
  scout-sec-edgar/           SEC EDGAR source actor code
  scout-local-registry/      Business-registry source actor code
wordpress/                 publish.js, setup-categories.js, wp-client.js — written, never run
                           against a live site (WordPress.com never connected)
retool/EDITOR_PORTAL_SPEC.md   Full UI spec for the editor portal — not yet built in Retool
docs/
  BRAND_BLUEPRINT.md         Brand voice/positioning
  CONTENT_STRATEGY.md        Cadence, pillars, editorial-focus rationale
  ARCHITECTURE.md            System design narrative
  SETUP.md                   Setup walkthrough
  DEPLOYMENT_STATUS.md        Live infra record — scenario IDs, connection IDs, what's
                              confirmed working, what's not done. Treat as more current
                              than this file for infra specifics.
make/scenarios/README.md    Pointer to the docs above (scenarios themselves live in Make, not as files)
```

**Important:** the actual pipeline logic (Make scenario blueprints) lives
in the Make.com account, not in this repo, except as prose descriptions
in `docs/DEPLOYMENT_STATUS.md`. There's no blueprint-as-code / IaC layer
— changes are made live via the Make UI or API and then documented here.

## Make.com — what's live

Everything lives in one dedicated folder, **"Silent Legacy Media"**
(folder id `274107`), kept separate from other automations already on
this Make account. The account is shared with other, unrelated
automations that predate this project — don't touch anything outside
this folder, and be aware at least one connection/hook naming pattern
elsewhere on the account is unrelated to Silent Legacy.

### Architecture: two decoupled layers

This wasn't the original design — it's the fix for a real
execution-timeout risk. Originally each ingestion scenario ran
Scout→Verifier→Writer inline, one Claude call chain per scraped item.
That's fine at 3-hourly cadence with a handful of items, but the content
strategy moved to a **weekly** cadence (see `docs/CONTENT_STRATEGY.md`),
meaning a single Apify run can return dozens of items — enough
sequential Claude calls in one Make execution to risk hitting Make's
execution timeout mid-run and losing the whole batch.

The fix: split ingestion (cheap, fast, Claude-free) from AI processing
(the slow part), and give processing its own schedule with a bounded
batch size per run, so no single execution ever does unbounded work.

- **Layer 1 — Ingestion** (5 scenarios, one per source): triggered by
  Apify's native `apify:finishedActorRuns` ("Watch Actor Runs") trigger,
  fetches the dataset, and inserts one row per item into
  `silent_legacy_raw_items` with `status='scraped'`. No Claude calls —
  even a 100-item run finishes in seconds.
- **Layer 2 — Processing** (1 scenario, id `6112415`): no app trigger,
  runs on its own Make schedule (every 10 minutes). Each run selects up
  to 8 `'scraped'` rows, claims them, and runs them through
  Scout→Verifier→Writer→insert. Batch size and interval are both tunable.

Scenario/connection/hook IDs, per-scenario confirmed-working status, and
the IRS-990-actor quirk (it self-reports `FAILED` even on successful
scrapes — a red herring, not a real failure) are all tracked in
`docs/DEPLOYMENT_STATUS.md` and won't be duplicated here since that file
is updated live and this one isn't.

### The one bug you need to know about (fixed, but instructive)

For most of the build, `silent_legacy_stories` stayed at 0 rows. The
apparent explanation — "Scout is correctly rejecting everything" — was
wrong. **Scout was never being called at all.**

Root cause: Make's `postgres:Query` module (a SELECT) emits **one bundle
per row**, with columns addressable directly (`{{1.id}}`, `{{1.source_type}}`,
...). It does **not** populate a `.result` array the way an HTTP module
does. The Processing scenario fed a `builtin:BasicFeeder` from
`{{1.result}}`, which was always empty, so the feeder emitted zero
bundles and everything downstream — Scout, Verifier, Writer, the insert
— silently never ran. Run stats (~9 operations, short duration) looked
plausible enough that this went unnoticed for a while.

It was found by building a throwaway debug scenario that wrote
`{{toString(1)}}`, `{{1.id}}`, and `{{1.result}}` into a scratch table —
proving definitively that the Postgres module is multi-bundle and has no
`.result`, rather than continuing to guess from execution logs.

**Fix:** the `BasicFeeder` was removed; every downstream module now
references `{{1.<column>}}` directly from the SELECT module. This is
pushed live to scenario `6112415` but **has not yet been re-verified
with a real end-to-end run** (the verification run was interrupted by
two transient `api.anthropic.com` 502s and then a request to stop and
pivot to something else). **This is the top-priority item to check
first when resuming work** — run scenario `6112415`, confirm
`scout_result` populates on the claimed rows, and confirm at least one
row lands in `silent_legacy_stories`.

If anything about a `postgres:Query` module elsewhere in this Make
account looks wrong in the same way (a `BasicFeeder` reading
`{{N.result}}` off a Postgres SELECT), that's the same bug — worth
checking, but out of scope to fix here since it'd belong to a different
project on the account.

### Prompt sync

`prompts/*.md` in this repo are meant to be byte-identical (aside from
the repo's own line-wrapping) to what's actually configured in the live
Scout/Verifier/Writer modules. When updating a live prompt, extract the
exact string that's already live (e.g. from whatever script last built
the blueprint) rather than pasting from the wrapped `.md` prose — the
markdown files have manual line breaks mid-paragraph for readability
that must not leak into the live system prompt as literal newlines.

## Apify — what's live

6 sources feed the pipeline: RSS news, SEC EDGAR, SEC Form D, business
registry, IRS 990, and property deeds. All run under one Apify account;
the connection/hook IDs are in `docs/DEPLOYMENT_STATUS.md`.

**Not done: no schedules exist yet.** Every actor currently only runs
when triggered manually. Setting up weekly schedules (Apify Console →
each actor → Create Task → paste input from `config/` → Schedule tab) is
a manual step that has to happen in the Apify Console UI — not something
done from this chat. Recommended cadence and per-actor lookback-window
settings are documented in `docs/CONTENT_STRATEGY.md` and
`docs/DEPLOYMENT_STATUS.md`.

**Not done: the custom actor.** `slm27/Silent-Legacy-Media` exists in
the account as a placeholder (still running Apify's default template
code, returns 0 items) and was meant to receive this repo's own
`apify/scout-news` source to replace the generic Store RSS actor. Not
blocking — the Store actor works fine in the meantime — but worth
finishing if you want to drop the Store-actor dependency.

`config/rss-feeds.json` and `config/watchlist.json` are the
version-controlled source of truth for what to paste into each actor's
input — see `config/README.md` for how to use them, especially the
Form D "targeted vs. sweep" search strategy (athletes/entertainers
usually show up in a Form D filing's `relatedPersons`, not as the
issuer, so a plain issuer-name search alone will miss most of them).

## Retool / Postgres — what's live

Two tables in the account's shared Retool Postgres database:

- **`silent_legacy_stories`** — the editorial queue. Schema, the Approve/
  Reject action logic, and the full screen layout are specified in
  `retool/EDITOR_PORTAL_SPEC.md`. Columns include `status`, `pillar`,
  `scout`/`verifier`/`content` (jsonb, one per agent), `editor_note`,
  `scheduled_publish_at`/`published_at` (added 2026-08-31 for trickle
  publishing).
- **`silent_legacy_raw_items`** — the Layer 1 → Layer 2 staging table
  added 2026-09-01. `source_type`, `raw_payload` (jsonb), `status`
  (`scraped` → `processing` → `processed`), `scout_result` (jsonb —
  records Scout's verdict for every item, accepted or rejected, so
  rejections are diagnosable rather than silent), `scraped_at`,
  `processed_at`.

**Not done: the Retool app itself.** `retool/EDITOR_PORTAL_SPEC.md` is a
complete spec — data source, columns, screen layout, Approve/Reject
button logic, the publish webhook contract — but no Retool app has
actually been built from it yet. The spec calls for Retool to talk to
this Postgres database **directly** (Retool's own Postgres resource),
not through the Make API, since Retool and Make already share the same
database — only the publish hand-off goes through Make.

**Known gap:** rows rejected by Scout or Verifier stay at
`status = 'processing'` in `silent_legacy_raw_items` rather than moving
to a distinct terminal state — they're correctly excluded from
reprocessing, but you can't yet distinguish "rejected" from "a run
crashed mid-batch" by querying status alone. Fine for now; worth adding
a distinct status value later if that visibility matters.

## WordPress — superseded by Ghost, never connected

`wordpress/publish.js`, `setup-categories.js`, and `wp-client.js` are
written but have never run against a live site — the WordPress.com
connector was never enabled. **The decision was since made to publish to
Ghost instead of WordPress** (see "Ghost — publishing target" below), so
this code is now dead — kept only for historical reference, not something
to finish.

## Ghost — publishing target (needs a site set up)

Ghost(Pro) was chosen as the publish target, replacing WordPress. As of
this writing **no Ghost site exists yet** — that's a manual signup step
(ghost.org/pricing) someone with billing access needs to do, then grab an
Admin API key from Settings → Integrations → Add custom integration.

The integration code is built and waiting on those credentials
(`web/lib/ghost.ts`, JWT-signed Admin API client, `?source=html` post
creation so no Lexical document building is needed):

- **`/drafts`** publishes immediately on Approve (`web/app/drafts/actions.ts`).
  No-ops until `GHOST_API_URL`/`GHOST_ADMIN_API_KEY` are set — the draft
  still gets marked Approved, just without a real post. Once Ghost is
  live, a failed publish keeps the draft at `Pending` instead of silently
  approving unpublished content.
- **`/queue`** keeps the original staggered "trickle publish" design from
  `retool/EDITOR_PORTAL_SPEC.md` (3-4/day across the week, not a dump of
  20-30 at once): Approve only computes `scheduled_publish_at`. A new
  route, `POST /api/publish-due` (protected by `PUBLISH_CRON_SECRET`),
  does the actual publishing for whatever's due — but **nothing calls it
  yet**. It needs an external scheduler hitting it every 15-30 minutes:
  Supabase pg_cron + pg_net (free, no extra hosting) or a Vercel Cron Job
  (works the same way, but Hobby plan crons are limited to once/day,
  which is too infrequent for same-day trickle publishing — needs Pro).
  See `web/README.md`'s "Publishing (Ghost)" section for exact setup.

**Priority order once a Ghost site exists:**
1. Set `GHOST_API_URL` / `GHOST_ADMIN_API_KEY` in Vercel, redeploy.
2. Test one Approve on `/drafts` — confirm a real post lands in Ghost.
3. Set `PUBLISH_CRON_SECRET`, wire up the scheduler (pg_cron or Vercel
   Cron) to call `/api/publish-due`, confirm an approved-and-due
   `/queue` story actually publishes on the next tick.

## Key architectural decisions and why

- **Native Apify triggers, not manual webhooks.** Early actor code
  posted results to a Make webhook manually. Switched to Make's built-in
  `apify:finishedActorRuns` trigger instead — simpler, no custom HTTP
  code to maintain in the actor, and it fires on every terminal run
  status (even an actor's own quirky self-reported "FAILED", as
  confirmed live with the IRS 990 actor).
- **Two-layer ingestion/processing split**, not one scenario per source
  running Scout→Verifier→Writer inline. See "Architecture" above — this
  exists purely to make execution-timeout risk independent of batch
  size, which matters once cadence moved from 3-hourly to weekly.
- **Claim-and-process pattern** (`UPDATE ... SET status='processing'
  WHERE id = ...` before Scout runs) rather than a single SELECT-and-go,
  so a concurrent Processing run (e.g. if the interval is ever shortened)
  can't double-process the same row. (An `UPDATE ... RETURNING` variant
  was tried first to combine the claim and the row-fetch in one step, but
  it has the same "no `.result` array" limitation as a plain SELECT —
  replaced with SELECT-then-per-row-UPDATE.)
- **`scout_result` recorded unfiltered, for every item** — not just for
  accepted ones. This is a deliberate observability choice: without it,
  a rejected item is a black box (was it actually reviewed and rejected,
  or did something upstream silently break — as the BasicFeeder bug
  above demonstrated actually happening).
- **Sourcing priority, not an exclusion filter, for the diversity
  mandate.** Scout's prompt instructs it to resolve borderline
  "worth covering?" calls in favor of underrepresented subjects (people
  of color globally, women), but never to reject, downgrade, or apply a
  stricter bar to anyone on account of race, nationality, or gender. This
  was a deliberate wording choice to keep the mechanism additive only.
- **Form D "targeted + sweep" dual strategy.** A Form D filing's issuer
  is the company raising money, not necessarily the notable person — the
  athlete/entertainer angle usually shows up in the filing's
  `relatedPersons` list (Executive Officer / Director / Promoter). A
  name-search actor alone would miss that, so the watchlist config
  documents running both a targeted issuer-name search (known
  funds/vehicles) and periodic broad sweeps that let Scout scan
  `relatedPersons` on every filing for recognizable names.
- **Timing is not a rejection filter.** Because Silent Legacy has no
  breaking-news pressure, Scout tags stories `"current"` or `"archive"`
  (>90 days old) purely for the Writer's framing choice (retrospective
  "Where Are They Now" style vs. straight report) — age never affects
  whether a story gets covered.

## Credentials, connections, and naming conventions to preserve

All IDs below are in the live Make.com account; treat
`docs/DEPLOYMENT_STATUS.md` as the authoritative, continuously-updated
copy of this table if the two ever diverge.

| Thing | ID / value |
|---|---|
| Make folder | "Silent Legacy Media", id `274107` |
| Layer 2 Processing scenario | "Silent Legacy - Process Raw Items", id `6112415` |
| Anthropic Claude connection | id `8033899` |
| Retool Postgres connection | id `8042168` |
| Apify connection | id `7039434` ("My Apify API") |
| Apify account | `chrisroman193@gmail.com` |
| Custom Apify actor (placeholder) | `slm27/Silent-Legacy-Media`, id `dkIen5rdPTCa9mF60` |
| Postgres tables | `silent_legacy_stories`, `silent_legacy_raw_items` |

Naming convention: every Silent Legacy Make scenario name is prefixed
`"Silent Legacy - "`. Keep using that prefix for anything new so
scenarios stay identifiable at a glance among other automations on the
same account.

**Retired, do not reuse:** connection `7147127` ("Pull Realtor Agent
Data") and hooks `2755905`/`2755908`/`2755909` — these were the original
wiring, built before discovering they pointed at a different Apify
account than the one the actors actually run under. Deleted/re-pointed;
kept only as a note so nobody re-adds them by accident.

Two throwaway debug artifacts from finding the BasicFeeder bug are still
sitting in the account and can be deleted whenever convenient: scenario
id `6112987` ("ZZ Debug - probe postgres output shape") and table
`debug_probe`.

## What's working and tested (confirmed with real data)

- All 5 Layer-1 ingestion scenarios: confirmed firing end-to-end from
  real Apify runs (`authorId: null` in the execution log, i.e. genuinely
  schedule/webhook-triggered, not a manual test run).
- Apify → Make trigger wiring on the correct account (`7039434` /
  `chrisroman193@gmail.com`).
- SEC Form D actor returns `relatedPersons` with names, roles, offering
  amounts, and the SEC filing URL — the "quiet cap-table" signal the
  editorial mandate depends on.
- 14 RSS feeds in `config/rss-feeds.json` — individually live-tested,
  returning real items.

## What's not done (priority order for resuming)

1. **Re-verify the Layer 2 processor fix** — run scenario `6112415` for
   real, confirm `scout_result` populates and at least one row reaches
   `silent_legacy_stories`. Was interrupted mid-verification; nothing
   after the BasicFeeder fix has been confirmed with live data yet.
2. Set up Apify weekly schedules (manual, in Apify Console) — the one
   remaining step blocking unattended operation.
3. Set up Ghost(Pro), set `GHOST_API_URL`/`GHOST_ADMIN_API_KEY` in
   Vercel, then wire a scheduler (Supabase pg_cron or Vercel Cron) to
   call `/api/publish-due` — see "Ghost — publishing target" above. The
   app-side code for both immediate (`/drafts`) and staggered
   (`/queue`) publishing is already built and waiting on this.
4. ~~Build the actual Retool Chief Editor Portal app from the spec~~ —
   done, see "Retool retired" above (`web/queue`).
5. Re-point the live Make.com scenarios' Postgres connection at the new
   Supabase project (see "Retool retired" above) — `/queue` is empty
   until this happens.
6. Paste the real `apify/scout-news` source into the custom actor
   `slm27/Silent-Legacy-Media` (optional — Store actor works fine
   meanwhile).
7. Subject-history aggregation for the Verifier's 2-Source Rule (right
   now each story is verified against only its own single source
   record).
8. Distinct terminal status for rejected raw items (currently stuck at
   `'processing'`, see "Known gap" above).
9. Delete the two debug artifacts (`6112987` scenario, `debug_probe` table).

## 2026-09-03: SEC EDGAR insider data — verified live, sourcing caveat

The SEC EDGAR ingest (`6108115`) now carries Form 4 insider-trading data
through to `raw_items` under `raw_payload -> 'insider'`, and the Scout
prompt has a matching extraction note telling it to treat a named owner
as the story `subject` with the filing company as `entity`.

**Verified on live data.** Actor run `do7A6b8L5Ua4F0O0C` returned 8 Form 4
filings; all 8 landed in `raw_items` with `insider.ownerName` and
`insider.primaryOwnerName` populated. This was the scenario's first-ever
execution. It also settles two open syntax questions: nested dot access
(`{{2.insiderTrading.summary.reportingOwner}}`) and nested array access
(`{{2.insiderTrading.reportingOwners[1].name}}`) both resolve correctly
in a raw Make blueprint.

**NOTE — the people in that test batch are not pro athletes or
entertainers.** All 8 rows are NIKE corporate executives (Mark Parker,
Amy Montagne, Matthew Friend, Robert Leinwand, and others), and every
one is a *sale*, not a purchase: `sharesBought: 0`, `valueBought: 0`,
negative `netShares` — routine vesting and tax withholding. Scout should
reject all 8, which is the correct editorial call. They are not Silent
Legacy subjects and nothing in this batch is publishable.

The test proved the plumbing, not the sourcing. Ticker-based Form 4
search surfaces a company's *own* officers. To reach athletes and
entertainers the actor must be pointed at the individuals themselves
(search by their CIK) or at companies where they are known to hold a
board seat or an equity stake. That is a sourcing decision, not an
engineering one, and it is still open.

Also unfixed and deliberately so: `insider.isDirector` / `insider.isOfficer`
return `"false"` even for an Executive Chairman — those two booleans do
not map correctly off `reportingOwners[1]`. They are redundant, since
`insider.ownerTitle` carries the same information in better form, so the
intended fix is to delete them rather than repair them.
