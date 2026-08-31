# scout-news

Polls RSS/Atom feeds (local news outlets, court-record feeds, press-release
wires) every 3 hours and POSTs new items to the Make.com pipeline webhook.
This is the primary source of the "2-Source Rule" corroboration used by the
Verifier agent.

## Input

See [`input_schema.json`](./input_schema.json). Key fields:

- `feedUrls` — list of RSS/Atom feed URLs to poll.
- `makeWebhookUrl` — Make.com webhook to POST new items to (or set
  `MAKE_WEBHOOK_URL` as an actor env var).
- `lookbackHours` — only push items published within this window (default
  3, matching the schedule interval).

## Output payload

Each POST body:

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
across runs so a 3-hour schedule doesn't re-push the same item.
