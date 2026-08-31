# Deployment Status

Live infrastructure lives in the account's own Make.com and Retool
accounts, not in this repo — this file is the record of what's actually
running, so it doesn't only exist in chat history.

## Make.com (team "My Team", org "My Organization")

Folder: **Silent Legacy Media** (id `274107`), kept separate from the
account's pre-existing "InRange" folders.

| Scenario | id | Trigger | Status |
|---|---|---|---|
| Silent Legacy - News Ingest (RSS) | `6108101` | Watch Actor Runs → `santamaria-automations/rss-feed-reader` | Active, untested end-to-end (see gap below) |
| Silent Legacy - SEC EDGAR Ingest | `6108115` | Watch Actor Runs → `constant_quadruped/sec-edgar-filings-scraper` | Active, untested end-to-end (see gap below) |
| Silent Legacy - Business Registry Ingest | `6108117` | Watch Actor Runs → `scrapebench/socrata-multi-state-corporate-business-entity-registry` | Active, untested end-to-end (see gap below) |

Each scenario: Apify trigger → `apify:fetchDatasetItems` → Scout (Claude)
→ Verifier (Claude, filtered) → Writer (Claude, filtered) → insert into
`silent_legacy_stories`. Reuses existing connections: Anthropic Claude
(id `8033899`), Retool Postgres (id `8042168`), Apify (id `7147127`,
"Pull Realtor Agent Data").

Apify watch hooks (Make hook ids, each tied to one actor under connection
`7147127`): `2755905` (RSS), `2755908` (SEC EDGAR), `2755909` (business
registry).

## Retool Postgres

Table `silent_legacy_stories` created (see `retool/EDITOR_PORTAL_SPEC.md`
for schema) in the same database InRange already uses — verified via a
direct query, 0 rows as of this writing.

## Open gap: Apify account mismatch

The three scenarios are wired correctly and validate, but a live test
(running each Store actor through the Apify connector available in this
chat) did **not** trigger any of them. Root cause: Make's "Watch Actor
Runs" trigger only fires for runs launched under the **same Apify
account** as the Make connection backing it (`7147127`). The actor runs
used to test came through a different Apify credential (the OAuth
connector authorized in this chat), which appears to be a different
account/token than `7147127` — three of the four Apify connections
already stored in Make (`7143166`, `7039434`, `7000361`) also turned out
to have dead/invalid tokens when tested, so `7147127` was the only usable
one.

**To close this gap, one of:**

1. Set up the actual recurring schedules (Apify Console → each actor →
   Schedules, every 3h) under whichever Apify account owns connection
   `7147127` in Make — then real scheduled runs will fire the triggers
   correctly, no further change needed.
2. Get a fresh, valid Make connection for the same Apify account as the
   OAuth connector used in this chat (re-authorize one of the three dead
   connections, or create a new one), and re-point the three hooks
   (`2755905`, `2755908`, `2755909`) at it.

Either way, once schedules exist and point at the right account, the
pipeline should run unattended.

## Not yet done

- WordPress.com connector not enabled in this chat — publishing step
  untested against a live site.
- No subject-history aggregation for the Verifier's 2-source check (each
  story is verified against only its own single source record for now —
  see `make/scenarios/README.md`).
- Retool Chief Editor Portal UI itself not built (spec only).
