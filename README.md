# Silent Legacy Media

> "No Gossip. Just Legacy."

Silent Legacy is a verified-wealth media house covering under-the-radar equity
moves, real estate, and business ownership — never gossip, never gurus. This
repo is the operational scaffold for the brand: ingestion, AI editorial
pipeline, human approval layer, and multi-channel publishing.

See `HANDOFF.md` for the full picture (what's live, what's not, why) —
start there.

## Pillars

| Pillar | Focus |
|---|---|
| **Legacy: Pro** | Athletes & entertainers acquiring real estate, franchise networks, tech equity |
| **Legacy: W** | Female athletes and founders closing high-impact commercial deals |
| **Legacy: Proof** | Everyday wealth builders (laundromats, trade fleets, housing trusts) with verified proof of work |

Full positioning and the anti-scam verification rules live in
[`docs/BRAND_BLUEPRINT.md`](docs/BRAND_BLUEPRINT.md).

## Pipeline

```
Apify (scrapers) → Make.com (orchestration) → Claude API (Scout/Verifier/Writer agents)
  → web/ Editorial Queue (Chief Editor approval) → WordPress (publish) → X / IG / Shorts
```

`web/` is a custom Next.js app that replaces the Retool Chief Editor
Portal (see `HANDOFF.md`'s "Retool retired" section for why) — one app
covering both the manual drafts workflow and the AI-pipeline editorial
queue. See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the full
data flow, [`docs/SETUP.md`](docs/SETUP.md) for how to stand up each
piece, [`docs/DEPLOYMENT_STATUS.md`](docs/DEPLOYMENT_STATUS.md) for
what's actually live right now, and
[`docs/CONTENT_STRATEGY.md`](docs/CONTENT_STRATEGY.md) for the
weekly-batch cadence and "quiet story" archive sourcing angle.

Six ingestion sources feed the pipeline: news/RSS, SEC filings (EDGAR +
Form D), business registries, IRS Form 990 nonprofit filings, and
property deed/lien records — the last two specifically for sourcing
older, already-settled wealth stories rather than only breaking events.

## Repo layout

```
web/                     Editorial control-center app (replaces Retool) — see web/README.md
docs/                    Brand blueprint, architecture, setup guide, content strategy, live deployment status
config/                  RSS feed list, search watchlist, config docs
apify/scout-news/        RSS/news scraper actor (reference; Store actor deployed instead)
apify/scout-sec-edgar/   SEC EDGAR filing scraper actor (reference; Store actor deployed instead)
apify/scout-local-registry/  Local business registry / permit scraper actor (fallback; no Store equivalent for permits)
prompts/                 Claude agent prompts (Scout, Verifier, Writer)
make/scenarios/          Make.com scenario build spec (readable, not a literal export)
retool/                  Original Chief Editor Portal spec — superseded by web/, kept for historical reference
wordpress/               REST API publisher + category taxonomy
HANDOFF.md               One-time orientation read; start here
.env.example             Required environment variables (see also web/.env.example)
```
