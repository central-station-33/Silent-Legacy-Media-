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

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the full data flow and
[`docs/SETUP.md`](docs/SETUP.md) for how to stand up each piece.

## Repo layout

```
docs/                    Brand blueprint, architecture, setup guide
apify/scout-news/        RSS/news scraper actor
apify/scout-sec-edgar/   SEC EDGAR celebrity-LLC filing scraper actor
apify/scout-local-registry/  Local business registry / permit scraper actor
prompts/                 Claude agent prompts (Scout, Verifier, Writer)
make/scenarios/          Make.com scenario blueprint (importable JSON)
retool/                  Chief Editor Portal spec + webhook contract
wordpress/               REST API publisher + category taxonomy
.env.example             Required environment variables
```
