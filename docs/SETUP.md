# Setup Guide

## Current deployment status

The pipeline is live in the account's Make.com workspace, under the
**"Silent Legacy Media"** folder. See
[`docs/DEPLOYMENT_STATUS.md`](DEPLOYMENT_STATUS.md) for exactly what's
running, the IDs involved, and the one open item blocking real traffic.

The sections below describe the stack end-to-end for anyone standing it
up from scratch, or extending it (e.g. adding a 4th source). They reflect
what's actually deployed, not the original custom-Apify-actor design in
`apify/` (kept in the repo as reference/fallback — see note in step 1).

## 1. Ingestion — Apify

The deployed pipeline uses three actors from the **Apify Store** rather
than the custom actors in `apify/` (Store actors avoid needing a push/
deploy workflow, and Make can watch them natively):

| Source | Actor | Notes |
|---|---|---|
| News/press | [`santamaria-automations/rss-feed-reader`](https://apify.com/santamaria-automations/rss-feed-reader) | `feedUrls`, `maxItemsPerFeed`, `filterByDate` |
| SEC filings | [`constant_quadruped/sec-edgar-filings-scraper`](https://apify.com/constant_quadruped/sec-edgar-filings-scraper) | free; search by `ticker`/`cik`/`companyName`, NOT Form D — use `SC 13D`/`SC 13G`/`S-1` |
| Business registry | [`scrapebench/socrata-multi-state-corporate-business-entity-registry`](https://apify.com/scrapebench/socrata-multi-state-corporate-business-entity-registry) | CO/CT/OR only; `sinceDate` for delta pulls |

There is no Store actor covering municipal **permits** — the custom
`apify/scout-local-registry` actor (generic, configurable per registry
endpoint) is the fallback if that coverage matters later; it isn't
deployed. `apify/scout-news` and `apify/scout-sec-edgar` are likewise
unused now that Store equivalents cover the same ground, but are kept in
case you outgrow the Store actors' rate limits or field coverage.

**To get recurring, real ingestion running**, each of the three Store
actors needs a **schedule** (or an Actor Task on a schedule) in Apify
Console, running under the **same Apify account** as the Make connection
that owns the "Watch Actor Runs" trigger (Make connection id `7147127`,
"Pull Realtor Agent Data"). This is the one open item — see
`docs/DEPLOYMENT_STATUS.md` for why and what to do about it.

## 2. Orchestration — Make.com

Three near-identical scenarios (one per source) live in the
"Silent Legacy Media" folder, each:

1. **Trigger**: `apify:finishedActorRuns` ("Watch Actor Runs") — native
   Make/Apify integration, fires whenever that specific actor finishes a
   run under the connected Apify account. No webhook URL or API token to
   manage by hand.
2. **`apify:fetchDatasetItems`** ("Get Dataset Items") — pulls the run's
   dataset via the same connection; each item becomes its own bundle for
   everything downstream (no manual loop/feeder needed).
3. **Scout** (`anthropic-claude:createAMessage`) — classifies + extracts,
   per `prompts/scout-agent.md`.
4. **Verifier** (filtered to run only if Scout didn't reject) — anti-scam
   gate, per `prompts/verifier-agent.md`.
5. **Writer** (filtered to run only if Verifier approved) — drafts copy,
   per `prompts/writer-agent.md`.
6. **`postgres:Query`** — inserts the pending story into
   `silent_legacy_stories` (see step 3).

To extend to a 4th source: duplicate one of these scenarios, point its
trigger at a new "Watch Actor Runs" hook for the new actor, and change the
literal `"Source type: ..."` string in the Scout call's user message.

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
