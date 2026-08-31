# Brand Blueprint

## Positioning

**Silent Legacy** — "No Gossip. Just Legacy."

An institutional-media-house feel with under-the-radar-equity stealth
positioning. The emotional range runs from NBA franchise owners to local
trade-business founders: wealth as quiet, verifiable, and built — never
flexed.

## Pillar architecture

```
                                  ┌───────────────────────────┐
                                  │       SILENT LEGACY       │
                                  │ "No Gossip. Just Legacy." │
                                  └─────────────┬─────────────┘
                                                │
         ┌──────────────────────────────────────┼──────────────────────────────────────┐
         ▼                                      ▼                                      ▼
┌───────────────────────────┐        ┌───────────────────────────┐        ┌───────────────────────────┐
│       LEGACY: PRO         │        │        LEGACY: W          │        │       LEGACY: PROOF       │
│  Athletes & Entertainers  │        │ Female Leaders & Athletes │        │ Everyday Wealth & Impact  │
│  (Venture, Real Estate)   │        │   (Equity, Asset Deals)   │        │ (Real Assets, Zero Scams) │
└───────────────────────────┘        └───────────────────────────┘        └───────────────────────────┘
```

- **Legacy: Pro** — High-net-worth athletes & entertainers acquiring real
  estate, franchise networks, and tech equity.
- **Legacy: W** — Dedicated focus on female athletes and founders closing
  high-impact commercial deals.
- **Legacy: Proof** — Everyday people building non-gimmick wealth
  (laundromats, trade fleets, local housing trusts, unsung community
  funding) with verified proof of work.

These three map directly to WordPress categories (see
[`wordpress/categories.json`](../wordpress/categories.json)) and to the
`pillar` field the Scout agent assigns to every story.

## Anti-scam "Proof of Work" verification logic

`Legacy: Proof` stories must survive the **3-Strike Rejection Rules** before
a human ever sees them. This is enforced by the Verifier agent
([`prompts/verifier-agent.md`](../prompts/verifier-agent.md)) and is a hard
gate, not a suggestion — a failed check auto-rejects the draft before it
reaches Retool.

1. **No Digital Product Sellers** — automatic hard flag if the subject
   sells courses, masterminds, signal groups, or crypto schemes.
2. **Public Record Lock** — property deeds, Secretary of State business
   registry entries, or municipal permits must match the story narrative.
3. **The 2-Source Rule** — the story must be independently confirmed by
   local news, court records, or an official press statement. A personal
   social media claim alone is never sufficient.

`Legacy: Pro` and `Legacy: W` stories go through the same Verifier pass but
are scored rather than hard-gated, since public-figure equity/real-estate
moves are typically already SEC/press-confirmed by the source feed.
