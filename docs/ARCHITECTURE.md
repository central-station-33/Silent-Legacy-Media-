# Operational Architecture

```
   [ Apify Scrapers ]
  (News, SEC, IRS 990)
           │
           ▼
     [ Make.com ]  ◄── Scout Agent: aggregates & classifies data
           │
           ▼
     [ Claude API ] ◄── Fact & Writer Agents: verify & draft content
           │
           ▼
    [ Retool DB ]  ◄── Chief Editor Dashboard: 1-click approval
           │
           ▼
    [ WordPress ]  ◄── Pushes live to web, X, IG carousels, Shorts
```

## Stages

### 1. Ingestion (Apify)

Three actors, each on a 3-hour schedule, push raw JSON payloads to a single
Make.com webhook:

| Actor | Source | Feeds pillar |
|---|---|---|
| `apify/scout-news` | RSS/news feeds (local news, court records, press releases) | all — provides the "2nd source" corroboration |
| `apify/scout-sec-edgar` | SEC EDGAR full-text search for celebrity-backed LLC filings (Form D, 13D/G) | Pro, W |
| `apify/scout-local-registry` | Local Secretary of State business registries + municipal permit portals | Proof |

Each actor's `README.md` documents its input schema and the shape of the
payload it POSTs to Make.

### 2. Orchestration (Make.com)

One scenario (`make/scenarios/silent-legacy-pipeline.blueprint.json`),
webhook-triggered, chains three Claude API calls:

1. **Scout agent** — classifies the incoming story into `pro` / `w` /
   `proof` and extracts structured fields (subject, entity, asset, dollar
   amount if disclosed, sources).
2. **Verifier agent** — runs the anti-scam 3-Strike Rejection Rules
   (`proof` pillar) or a lighter corroboration check (`pro`/`w`), and
   returns `approved: true/false` with a reason.
3. **Writer agent** — for approved stories only, drafts a 250-word blog
   post, an X thread, and a short-form video script.

Rejected stories are logged and dropped. Approved output is POSTed to the
Retool webhook that inserts a pending story card.

### 3. Human editorial gate (Retool)

The Chief Editor Portal (spec in `retool/EDITOR_PORTAL_SPEC.md`) shows each
pending card: original source payload, AI-generated copy, and any pulled
visual assets, side by side.

- **Approve** → fires `wordpress/publish.js` (via a Make/Retool webhook) to
  publish.
- **Reject** → archives the draft with the editor's reason.

### 4. Distribution (WordPress + social)

`wordpress/publish.js` uses the WP REST API to create the post under the
correct pillar category (`wordpress/categories.json`), then Make.com
fans the same approved payload out to the X thread poster and drops the
video script into the faceless-video production queue.

## Environment variables

See [`.env.example`](../.env.example) for every credential each stage
needs.
