# Silent Legacy

A verified-wealth media brand — "No Gossip. Just Legacy." See
`HANDOFF.md` for the full picture (what's live, what's not, why); this
file is just a map of the repo.

## Repo layout

- `web/` — the editorial control-center app (replaces Retool). See
  `web/README.md`.
- `apify/` — source actor code for the ingestion pipeline.
- `config/` — RSS feed list, search watchlist, config docs.
- `make/scenarios/` — pointer docs for the Make.com scenarios (the
  scenarios themselves live in the Make.com account, not as files here).
- `prompts/` — Scout / Verifier / Writer agent system prompts.
- `retool/` — the original Chief Editor Portal spec (superseded by
  `web/`; kept for historical reference).
- `wordpress/` — publish scripts for the WordPress publishing step.
- `docs/` — brand, content strategy, architecture, setup, and live
  deployment-status docs.
- `HANDOFF.md` — the one-time orientation read; start here.
