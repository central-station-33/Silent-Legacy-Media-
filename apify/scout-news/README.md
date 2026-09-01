# scout-news

Polls RSS/Atom feeds (local news outlets, court-record feeds, press-release
wires) every 3 hours and writes new items to the actor's dataset. This is
the primary source of the "2-Source Rule" corroboration used by the
Verifier agent.

Make's "Watch Actor Runs" trigger + "Get Dataset Items" module picks up
the dataset after each run — see `docs/DEPLOYMENT_STATUS.md` — so this
actor doesn't push anywhere itself; it just needs to run under the same
Apify account that Make's Apify connection is authenticated as.

## Input

See [`input_schema.json`](./input_schema.json). Key fields:

- `feedUrls` — list of RSS/Atom feed URLs to poll.
- `lookbackHours` — only return items published within this window (default
  3, matching the schedule interval).

## Output (one dataset row per item)

```json
{
  "source": "news",
  "feedUrl": "https://...",
  "title": "...",
  "link": "https://...",
  "summary": "...",
  "publishedAt": "2026-08-31T12:00:00.000Z"
}
```

## Dedup

Seen links are stored in the actor's key-value store under `SEEN_LINKS`
across runs so a 3-hour schedule doesn't re-return the same item.
