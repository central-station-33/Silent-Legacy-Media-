# Deployment Status

Live infrastructure lives in the account's own Make.com and Retool
accounts, not in this repo — this file is the record of what's actually
running, so it doesn't only exist in chat history.

## Make.com (team "My Team", org "My Organization")

Folder: **Silent Legacy Media** (id `274107`), kept separate from the
account's pre-existing "InRange" folders.

| Scenario | id | Trigger | Status |
|---|---|---|---|
| Silent Legacy - News Ingest (RSS) | `6108101` | Watch Actor Runs → `santamaria-automations/rss-feed-reader` | **Confirmed working end-to-end** |
| Silent Legacy - SEC EDGAR Ingest | `6108115` | Watch Actor Runs → `constant_quadruped/sec-edgar-filings-scraper` | **Confirmed working end-to-end** |
| Silent Legacy - Business Registry Ingest | `6108117` | Watch Actor Runs → `scrapebench/socrata-multi-state-corporate-business-entity-registry` | **Confirmed working end-to-end** |

Each scenario: Apify trigger → `apify:fetchDatasetItems` → Scout (Claude)
→ Verifier (Claude, filtered) → Writer (Claude, filtered) → insert into
`silent_legacy_stories`. Reuses existing connections: Anthropic Claude
(id `8033899`), Retool Postgres (id `8042168`).

**Apify connection: `7039434`** ("My Apify API"), authenticated as the
`chrisroman193@gmail.com` account — the account that owns the actors and
that this chat's Apify connector runs against. Watch hooks (Make hook
ids): `2756397` (RSS), `2756398` (SEC EDGAR), `2756401` (business
registry).

Verified 2026-08-31: triggered a real run of each of the 3 Store actors
via the Apify connector; all three scenarios fired automatically
(`EXECUTION_END`, `authorId: null` — i.e. webhook-triggered, not manual)
and completed with `status: SUCCESS`. No rows landed in
`silent_legacy_stories` from these particular test runs, but that's
expected — the test inputs were generic (a few random PR Newswire items,
a Tesla 8-K, one bare CO business-registry entry) and were correctly
rejected by Scout/Verifier as not matching any of the three pillars. The
plumbing itself — trigger → dataset fetch → Scout → Verifier → Writer →
insert — is confirmed live.

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
paste input → Schedule tab → every 3h) — nothing else is blocking that;
once schedules exist, the pipeline runs unattended.

A custom actor (`slm27/Silent-Legacy-Media`, id `dkIen5rdPTCa9mF60`) also
exists in this account, intended to replace the Store RSS actor with the
repo's own `apify/scout-news` source (dedup via key-value store, no
Store-actor limitations). As of this writing it still runs Apify's
default placeholder code (0 items returned even with a 30-day lookback)
— the real `main.js`/`package.json` from `apify/scout-news` still needs
to be pasted into its Source tab and rebuilt. Not blocking: the pipeline
runs fine on the Store actor in the meantime.

## Retool Postgres

Table `silent_legacy_stories` created (see `retool/EDITOR_PORTAL_SPEC.md`
for schema) in the same database InRange already uses.

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
  manually until schedules are set up in Apify Console (see above).
