# Setup Guide

## Current deployment status

The pipeline is live in the account's Make.com workspace, under the
**"Silent Legacy Media"** folder, across all 5 sources. See
[`docs/DEPLOYMENT_STATUS.md`](DEPLOYMENT_STATUS.md) for exactly what's
running and the IDs involved, and
[`docs/CONTENT_STRATEGY.md`](CONTENT_STRATEGY.md) for the weekly-batch
cadence and archive-story sourcing strategy layered on top of this.

The sections below describe the stack end-to-end for anyone standing it
up from scratch, or extending it (e.g. adding a 6th source). They reflect
what's actually deployed, not the original custom-Apify-actor design in
`apify/` (kept in the repo as reference/fallback — see note in step 1).

## 1. Ingestion — Apify

The deployed pipeline uses five actors from the **Apify Store** rather
than the custom actors in `apify/` (Store actors avoid needing a push/
deploy workflow, and Make can watch them natively):

| Source | Actor | Notes |
|---|---|---|
| News/press | [`santamaria-automations/rss-feed-reader`](https://apify.com/santamaria-automations/rss-feed-reader) | `feedUrls`, `maxItemsPerFeed`, `filterByDate` |
| SEC filings | [`constant_quadruped/sec-edgar-filings-scraper`](https://apify.com/constant_quadruped/sec-edgar-filings-scraper) | free; search by `ticker`/`cik`/`companyName`, NOT Form D — use `SC 13D`/`SC 13G`/`S-1` |
| Business registry | [`scrapebench/socrata-multi-state-corporate-business-entity-registry`](https://apify.com/scrapebench/socrata-multi-state-corporate-business-entity-registry) | CO/CT/OR only; `sinceDate` for delta pulls |
| IRS Form 990 filings | [`devilscrapes/irs-990-officer-comp`](https://apify.com/devilscrapes/irs-990-officer-comp) | `searchQuery` (org name) or `eins`; `startYear`/`endYear` for historical range. Reports its own run status as `FAILED` even on success — a known quirk, not a real failure (see `docs/DEPLOYMENT_STATUS.md`) |
| Property deed/lien records | [`shelvick/property-deed-records`](https://apify.com/shelvick/property-deed-records) | `partyLookups` (LLC/owner name) or `addresses`; `dateFrom`/`dateTo` for historical range |

There is no Store actor covering municipal **permits** — the custom
`apify/scout-local-registry` actor (generic, configurable per registry
endpoint) is the fallback if that coverage matters later; it isn't
deployed. `apify/scout-news` and `apify/scout-sec-edgar` are likewise
unused now that Store equivalents cover the same ground, but are kept in
case you outgrow the Store actors' rate limits or field coverage. There's
also no dedicated actor for business-journal/alumni-magazine archives —
see the query-bank note in `docs/CONTENT_STRATEGY.md`.

**To get recurring, real ingestion running**, each of the five Store
actors needs a **schedule** (or an Actor Task on a schedule) in Apify
Console, running under the Apify account behind Make connection id
`7039434` ("My Apify API"). Recommended cadence per
`docs/CONTENT_STRATEGY.md`: weekly (Sunday 11 PM EST / Monday 5 AM EST)
rather than continuous polling — widen each actor's own lookback/date
range accordingly so a week's worth of activity isn't missed between
runs.

## 2. Orchestration — Make.com

Ingestion and AI processing are two separate layers (see
`docs/ARCHITECTURE.md` for why — in short, decoupling them guarantees no
execution times out no matter how large a weekly batch gets).

**Five Ingestion scenarios** (one per source) live in the "Silent Legacy
Media" folder, each:

1. **Trigger**: `apify:finishedActorRuns` ("Watch Actor Runs") — native
   Make/Apify integration, fires whenever that specific actor finishes a
   run under the connected Apify account. No webhook URL or API token to
   manage by hand.
2. **`apify:fetchDatasetItems`** ("Get Dataset Items") — pulls the run's
   dataset via the same connection; each item becomes its own bundle.
3. **`postgres:Query`** — inserts the raw item into `silent_legacy_raw_items`
   (`status: 'scraped'`). That's it — no Claude calls in this layer.

To extend to a 6th source: duplicate one of these scenarios and point its
trigger at a new "Watch Actor Runs" hook for the new actor; the literal
source-type string is baked into the `INSERT`'s value, not into a prompt.

**One Processing scenario** ("Silent Legacy - Process Raw Items") runs
on its own 10-minute schedule (not tied to any Apify actor):

1. **`postgres:Query`** — atomically claims a bounded batch (8 rows) of
   `'scraped'` items with `UPDATE ... FOR UPDATE SKIP LOCKED RETURNING
   ...`, so overlapping runs can't double-process a row.
2. **`builtin:BasicFeeder`** — iterates the claimed batch.
3. **Scout** (`anthropic-claude:createAMessage`) — classifies + extracts,
   per `prompts/scout-agent.md`, using the claimed row's `source_type`
   and `raw_payload` dynamically (one shared prompt now serves all 5
   sources, instead of 5 near-duplicate copies).
4. **Verifier** (filtered to run only if Scout didn't reject) — anti-scam
   gate, per `prompts/verifier-agent.md`.
5. **Writer** (filtered to run only if Verifier approved) — drafts copy,
   per `prompts/writer-agent.md`.
6. **`postgres:Query`** — inserts the pending story into
   `silent_legacy_stories`.
7. **`postgres:Query`** — marks the raw item `'processed'` (success path
   only; rejected items stay `'processing'`, which is enough to keep them
   out of future batches).

Batch size and interval are both tunable directly on this one scenario if
throughput needs adjusting.

## 3. Editorial queue — Retool

`silent_legacy_stories` table already exists in the account's existing
Retool Postgres database (reusing the connection already in Make — no new
credentials). Schema and full Chief Editor Portal spec (table view,
Approve/Reject actions, webhook contracts) is in
[`retool/EDITOR_PORTAL_SPEC.md`](../retool/EDITOR_PORTAL_SPEC.md). The
Retool app UI itself still needs to be built in Retool — that's outside
what's scriptable from here.

## 4. Distribution — WordPress

Not yet connected (WordPress.com connector needs to be enabled). Once it
is:

1. Create three categories — `Pro`, `W`, `Proof` — matching
   `wordpress/categories.json` (or run
   `node wordpress/setup-categories.js` once `.env` is filled in).
2. Create an Application Password for a publishing user
   (Users → Profile → Application Passwords).
3. Fill in `WORDPRESS_URL`, `WORDPRESS_USER`, `WORDPRESS_APP_PASSWORD` in
   `.env`.
4. Wire the Retool "Approve" action to call `wordpress/publish.js`'s logic
   (directly, or ported into a Make module) with the row's `content` and
   `pillar`.

## Local development

```bash
cp .env.example .env   # fill in real credentials
cd wordpress && npm install
node setup-categories.js   # one-time
node publish.js --dry-run  # verify payload shape without posting
```
