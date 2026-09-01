# Deployment Status

Live infrastructure lives in the account's own Make.com and Retool
accounts, not in this repo — this file is the record of what's actually
running, so it doesn't only exist in chat history.

## Make.com (team "My Team", org "My Organization")

Folder: **Silent Legacy Media** (id `274107`), kept separate from the
account's pre-existing "InRange" folders.

**Architecture (updated 2026-09-01): ingestion and AI processing are
decoupled into two layers**, to guarantee no execution ever times out
regardless of how many items a run produces (relevant now that the
weekly cadence means a single Apify run can return far more items than
the original 3-hourly design assumed). Layer 1 (5 scenarios) is fast and
Claude-free; layer 2 (1 scenario) processes a bounded batch on its own
schedule.

**Layer 1 — Ingestion** (one per source, unchanged trigger, simplified
body):

| Scenario | id | Trigger | Status |
|---|---|---|---|
| Silent Legacy - News Ingest (RSS) | `6108101` | Watch Actor Runs → `santamaria-automations/rss-feed-reader` | **Confirmed working end-to-end** |
| Silent Legacy - SEC EDGAR Ingest | `6108115` | Watch Actor Runs → `constant_quadruped/sec-edgar-filings-scraper` | **Confirmed working end-to-end** |
| Silent Legacy - Business Registry Ingest | `6108117` | Watch Actor Runs → `scrapebench/socrata-multi-state-corporate-business-entity-registry` | **Confirmed working end-to-end** |
| Silent Legacy - IRS 990 Ingest | `6109437` | Watch Actor Runs → `devilscrapes/irs-990-officer-comp` | **Confirmed firing end-to-end** (see note below) |
| Silent Legacy - Property Deed Ingest | `6109447` | Watch Actor Runs → `shelvick/property-deed-records` | **Confirmed working end-to-end** |

Each: `apify:finishedActorRuns` (trigger) → `apify:fetchDatasetItems` →
one `postgres:Query` INSERT per item into a new staging table,
`silent_legacy_raw_items` (`source_type`, `raw_payload` jsonb, `status`
default `'scraped'`, `scraped_at`, `processed_at`). No Claude calls here
— even a 100-item run finishes in a few seconds since it's just cheap
Postgres inserts, so there's no timeout exposure no matter how large a
weekly batch gets.

**Layer 2 — Processing** (id `6112415`, "Silent Legacy - Process Raw
Items"): no app trigger — starts directly with a `postgres:Query` and
runs on Make's own schedule (`indefinitely`, every 600s / 10 min,
tunable). Each run:

1. `SELECT id, source_type, raw_payload ... WHERE status = 'scraped'
   ORDER BY scraped_at ASC LIMIT 8`. Make's Postgres module emits **one
   bundle per row**, so every module below runs once per row — there is
   deliberately **no iterator/feeder** (see "Resolved 2026-09-01" below
   for why that matters).
2. `UPDATE ... SET status = 'processing' WHERE id = '{{1.id}}'` — claims
   the row so a concurrent run can't pick it up again.
3. **Scout** (Claude), using `{{1.source_type}}` and
   `{{toString(1.raw_payload)}}` — one shared prompt serves all six
   source types instead of six near-duplicate copies.
4. `UPDATE ... SET scout_result = <Scout's JSON>, status = 'processed'`
   — **unfiltered, so it records a verdict for every item**, accepted or
   rejected. This is the observability hook: `scout_result` is how you
   see *why* something was rejected.
5. **Verifier** (Claude) — filtered to `{{3.reject}} = false`.
6. **Writer** (Claude) — filtered to `{{5.approved}} = true`.
7. `INSERT INTO silent_legacy_stories ...` — the pending editorial row.

Reuses existing connections: Anthropic Claude (id `8033899`), Retool
Postgres (id `8042168`). Batch size (8) and interval (10 min) are both
tunable if throughput needs adjusting — smaller/more frequent is safer
against timeouts, larger/less frequent clears a weekly backlog faster.

**Apify connection: `7039434`** ("My Apify API"), authenticated as the
`chrisroman193@gmail.com` account — the account that owns the actors and
that this chat's Apify connector runs against. Watch hooks (Make hook
ids): `2756397` (RSS), `2756398` (SEC EDGAR), `2756401` (business
registry), `2756475` (IRS 990), `2756476` (property deed).

(2026-08-31 verification note: before the layer-1/layer-2 split above,
all 5 ingestion scenarios ran Scout/Verifier/Writer inline and were
confirmed firing correctly via real Apify runs — superseded by the
architecture change but kept here as prior evidence the trigger wiring
itself is sound.)

**Note on the IRS 990 actor:** `devilscrapes/irs-990-officer-comp`
reports its own run status as `FAILED` even when it successfully scrapes
data (its `statusMessage` says "Done — N filing-year row(s) scraped..."
on the same "failed" runs) — a quirk of the actor, not a real failure.
Confirmed Make's "Watch Actor Runs" trigger fires regardless of the
actor's self-reported status, so this doesn't block the pipeline. Just
don't be alarmed seeing red "Failed" runs for this actor in Apify
Console.

### Previously used, now retired

Connection `7147127` ("Pull Realtor Agent Data") and its 3 watch hooks
(`2755905`, `2755908`, `2755909`) were the original wiring, built before
discovering that connection belonged to a different Apify account than
the one the actors/schedules would actually run under. Hooks were
deleted and the scenarios re-pointed to `7039434` instead — see git
history on this file for the full account-mismatch debugging story if
it's ever useful again.

## Apify

Actors run under the `chrisroman193@gmail.com` account (same one behind
connection `7039434`). This is also where the recurring **schedules**
need to be set up (Apify Console → each actor → Actions → Create Task →
paste input → Schedule tab) — nothing else is blocking that; once
schedules exist, the pipeline runs unattended. Per
`docs/CONTENT_STRATEGY.md`, the current recommendation is **weekly**
(Sunday 11 PM EST / Monday 5 AM EST) for all 5 actors, not the original
every-3-hours — cheaper and no less timely for Silent Legacy's
non-breaking-news editorial angle. Widen each actor's own lookback/date
inputs accordingly (e.g. `lookbackHours: 168` for RSS, a 7-day
`sinceDate`/`dateFrom` for the others) so a weekly run doesn't miss
anything between runs.

A custom actor (`slm27/Silent-Legacy-Media`, id `dkIen5rdPTCa9mF60`) also
exists in this account, intended to replace the Store RSS actor with the
repo's own `apify/scout-news` source (dedup via key-value store, no
Store-actor limitations). As of this writing it still runs Apify's
default placeholder code (0 items returned even with a 30-day lookback)
— the real `main.js`/`package.json` from `apify/scout-news` still needs
to be pasted into its Source tab and rebuilt. Not blocking: the pipeline
runs fine on the Store actor in the meantime.

## Retool Postgres

Two tables in the same database InRange already uses:

- `silent_legacy_stories` — the editorial queue (see
  `retool/EDITOR_PORTAL_SPEC.md` for schema). `scheduled_publish_at` and
  `published_at` columns added 2026-08-31 to support trickle publishing
  (see `docs/CONTENT_STRATEGY.md`).
- `silent_legacy_raw_items` — new 2026-09-01, the ingestion staging table
  feeding the Processing scenario (see "Layer 1 — Ingestion" above for
  schema).

## Not yet done

- WordPress.com connector not enabled in this chat — publishing step
  untested against a live site.
- Custom `scout-news` actor still needs real source code pasted in (see
  above) if you want to move off the Store RSS actor.
- No subject-history aggregation for the Verifier's 2-source check (each
  story is verified against only its own single source record for now —
  see `make/scenarios/README.md`).
- Retool Chief Editor Portal UI itself not built (spec only).
- No actor schedules yet — ingestion only runs when an actor is triggered
  manually until schedules are set up in Apify Console (see "Apify"
  above for the recommended weekly cadence).
- Trickle-publish Make scenario (poll `approved` + due
  `scheduled_publish_at` rows, publish, mark `published_at`) not built —
  needs WordPress connected first.
- No dedicated archive-search source for business journals/alumni
  magazines yet (no matching Apify actor exists) — see the query-bank
  note in `docs/CONTENT_STRATEGY.md` for the Google-Search-based fallback
  if that's wanted later.
- Raw items rejected by Scout/Verifier stay at `status = 'processing'`
  rather than a distinct terminal state (e.g. `'rejected'`) — they're
  correctly excluded from reprocessing, but there's no way yet to
  distinguish "rejected" from "a Processing run crashed mid-batch" by
  querying status alone. Fine for now; worth adding a distinct status
  value and/or a stale-`'processing'` cleanup query if that visibility
  matters later.

## Resolved 2026-09-01: the processor never called Claude at all

For most of this build, `silent_legacy_stories` stayed at 0 rows and every
item looked "rejected by Scout." That reading was wrong. **Scout was never
invoked.** The Processing scenario was silently doing nothing past its
second module.

**Root cause.** Make's `postgres:Query` module emits **one bundle per
row**, with the columns addressable directly (`{{1.id}}`,
`{{1.source_type}}`, ...). It does **not** return a `.result` array. The
scenario fed a `builtin:BasicFeeder` from `{{1.result}}`, which was always
empty, so the feeder emitted zero bundles and every module after it —
Scout, Verifier, Writer, the inserts — never ran.

This was masked by two misleading signals:

- Runs reported ~9 operations and ~700 bytes transfer, which looked like
  Claude activity. It was actually the SELECT plus one feeder invocation
  per returned row.
- Run durations of 1.5-2s were far too short for 8 sequential Sonnet
  calls. That was noticed at the time and wrongly dismissed.

**How it was found.** A throwaway probe scenario wrote
`{{toString(1)}}`, `{{1.id}}` and `{{1.result}}` into a `debug_probe`
table. Result: `{{1.id}}` was a real UUID, `{{1.result}}` was empty, and
the probe's second module ran once per row — proving the module is
multi-bundle and there is no `.result`.

**Fix.** The `BasicFeeder` was removed entirely; downstream modules now
reference `{{1.<column>}}` directly.

**Note for the InRange scenarios:** `InRange - S3: CC Scoring + Lead
Delivery to Retool` uses the same `postgres:Query` → `BasicFeeder` over
`{{1.result}}` pattern and is likely broken in exactly this way. Worth
checking — it was not touched here since it belongs to the other project.
(The pattern is fine for HTTP modules, e.g. InRange S2's feeder over
`{{2.data}}` — `http:ActionSendData` really does return a single bundle
with an array inside. It is specifically the Postgres module that differs.)

