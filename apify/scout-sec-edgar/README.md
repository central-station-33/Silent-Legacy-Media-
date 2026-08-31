# scout-sec-edgar

Polls the [SEC EDGAR full-text search API](https://www.sec.gov/cgi-bin/srqsb)
every 3 hours for new filings (Form D, 13D/G, S-1 by default) that mention a
watched celebrity name or known holding-company LLC, and POSTs matches to
the Silent Legacy Make.com pipeline. Primary feeder for `Legacy: Pro` and
`Legacy: W`.

## Input

See [`input_schema.json`](./input_schema.json). Key fields:

- `watchTerms` — celebrity names / entity names to search for.
- `formTypes` — SEC form types to restrict to (default: `D`, `SC 13D`,
  `SC 13G`, `S-1`).
- `makeWebhookUrl` — Make.com webhook to POST new filings to (or set
  `MAKE_WEBHOOK_URL` as an actor env var).

## Output payload

```json
{
  "source": "sec-edgar",
  "watchTerm": "...",
  "accession": "0001234567-26-000123",
  "formType": "D",
  "entity": "...",
  "filedAt": "2026-08-30",
  "link": "https://www.sec.gov/Archives/edgar/data/..."
}
```

## Dedup

Seen accession numbers are stored in the actor's key-value store under
`SEEN_ACCESSIONS` across runs.
