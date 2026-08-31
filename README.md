# Silent Legacy Media

> "No Gossip. Just Legacy."

Silent Legacy is a verified-wealth media house covering under-the-radar equity
moves, real estate, and business ownership — never gossip, never gurus. This
repo is the operational scaffold for the brand: ingestion, AI editorial
pipeline, human approval layer, and multi-channel publishing.

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
  → Retool (Chief Editor approval) → WordPress (publish) → X / IG / Shorts
```

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the full data flow,
[`docs/SETUP.md`](docs/SETUP.md) for how to stand up each piece, and
[`docs/DEPLOYMENT_STATUS.md`](docs/DEPLOYMENT_STATUS.md) for what's
actually live right now (Make scenarios, Retool table, open gaps).

## Repo layout

```
docs/                    Brand blueprint, architecture, setup guide, live deployment status
apify/scout-news/        RSS/news scraper actor (reference; Store actor deployed instead)
apify/scout-sec-edgar/   SEC EDGAR filing scraper actor (reference; Store actor deployed instead)
apify/scout-local-registry/  Local business registry / permit scraper actor (fallback; no Store equivalent for permits)
prompts/                 Claude agent prompts (Scout, Verifier, Writer)
make/scenarios/          Make.com scenario build spec (readable, not a literal export)
retool/                  Chief Editor Portal spec + webhook contract
wordpress/               REST API publisher + category taxonomy
.env.example             Required environment variables
```
