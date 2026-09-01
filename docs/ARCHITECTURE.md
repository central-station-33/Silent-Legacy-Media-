# Operational Architecture

```
   [ Apify Store Actors ]
 (News, SEC, Registry, 990, Deeds)
           │  "actor run finished" (native Make/Apify integration)
           ▼
  [ Make: 5 Ingestion scenarios ]  ◄── fetch dataset, stage raw items
           │                            (no Claude calls — fast, no timeout risk)
           ▼
   [ silent_legacy_raw_items ]  ◄── staging table
           │
           ▼ (Make's own schedule, bounded batch)
  [ Make: Process Raw Items ]  ◄── Scout → Verifier → Writer (Claude)
           │
           ▼
    [ Retool DB ]  ◄── silent_legacy_stories: Chief Editor approval queue
           │
           ▼
    [ WordPress ]  ◄── (not yet connected) publish + fan out to X, IG, Shorts
```

This reflects what's actually deployed — see
[`docs/DEPLOYMENT_STATUS.md`](DEPLOYMENT_STATUS.md) for live IDs, and
[`docs/CONTENT_STRATEGY.md`](CONTENT_STRATEGY.md) for the weekly-batch
cadence and archive-story angle layered on top of this.

## Stages

### 1. Ingestion (Apify)

Five Apify Store actors, one per source:

| Source | Actor | Feeds pillar |
|---|---|---|
| News/press | `santamaria-automations/rss-feed-reader` | all — provides the "2nd source" corroboration |
| SEC filings | `constant_quadruped/sec-edgar-filings-scraper` | Pro, W |
| Business registry | `scrapebench/socrata-multi-state-corporate-business-entity-registry` (CO/CT/OR) | Proof |
| IRS Form 990 filings | `devilscrapes/irs-990-officer-comp` | archive/quiet stories — nonprofit/foundation grants & assets |
| Property deed/lien records | `shelvick/property-deed-records` | archive/quiet stories — commercial real estate & LLC-held property |

The custom actors in `apify/` (`scout-news`, `scout-sec-edgar`,
`scout-local-registry`) were the original design and remain as reference/
fallback for cases the Store actors don't cover well (e.g. municipal
permits), but aren't the ones deployed — see `docs/DEPLOYMENT_STATUS.md`.

### 2. Orchestration (Make.com) — decoupled into ingestion and processing

Ingestion and AI processing are split into two layers so that no
execution can ever time out, regardless of how many items an Apify run
returns (a real risk once weekly batches replaced 3-hourly polling — see
`docs/DEPLOYMENT_STATUS.md` for the full reasoning).

**Layer 1 — five near-identical Ingestion scenarios** (one per source),
each triggered by Make's native **"Watch Actor Runs"** integration — no
custom webhook, no API token handling:

1. **`apify:fetchDatasetItems`** pulls the run's output; each row becomes
   its own item.
2. **Postgres insert** — writes the raw item into `silent_legacy_raw_items`
   (`status: 'scraped'`). No Claude calls in this layer at all.

**Layer 2 — one shared Processing scenario**, on its own 10-minute
schedule (not tied to any Apify actor):

1. Atomically claims a bounded batch (8 rows) of `'scraped'` items via
   `UPDATE ... SET status = 'processing' ... FOR UPDATE SKIP LOCKED
   RETURNING ...`, so overlapping runs never double-process a row.
2. **Scout agent** (Claude) classifies into `pro` / `w` / `proof`,
   extracts structured fields, and tags `framing: "current" | "archive"`
   based on how old the underlying event is.
3. **Verifier agent** (Claude, only runs if Scout didn't reject) — the
   anti-scam 3-Strike Rejection Rules (`proof` pillar) or a lighter
   corroboration check (`pro`/`w`).
4. **Writer agent** (Claude, only runs if Verifier approved) — drafts a
   blog post, X thread, and video script, using retrospective "Where Are
   They Now" framing for archive stories.
5. **Postgres insert** — writes the story into `silent_legacy_stories`
   with `status: 'pending'`, and marks the raw item `'processed'`.

Rejected/unapproved items simply stop mid-scenario (a filter on the next
module) — nothing is written to `silent_legacy_stories` for them, and
they stay `'processing'` in the raw-items table (excluded from
reprocessing either way).

### 3. Human editorial gate (Retool)

The Chief Editor Portal (spec in `retool/EDITOR_PORTAL_SPEC.md`) shows
each pending row: original source payload, AI-generated copy, and
Verifier notes, side by side.

- **Approve** → sets `status = 'approved'` and (in weekly-batch mode) a
  staggered `scheduled_publish_at`; a not-yet-built trickle-publish
  scenario picks these up on schedule and calls `wordpress/publish.js`'s
  logic.
- **Reject** → archives the draft with the editor's reason.

### 4. Distribution (WordPress + social)

`wordpress/publish.js` uses the WP REST API to create the post under the
correct pillar category (`wordpress/categories.json`). Fan-out to X and
the faceless-video queue is not yet built — WordPress.com isn't connected
in this environment yet, so this stage is spec-only for now.

## Environment variables

See [`.env.example`](../.env.example) for every credential each stage
needs (relevant to the `wordpress/` scripts specifically — the live Make
pipeline reuses connections already stored in the account's Make
workspace, not these env vars).
