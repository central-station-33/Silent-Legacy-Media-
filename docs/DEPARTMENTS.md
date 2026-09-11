# Silent Legacy Media — Department Boundaries

**Status:** Active standard. Last updated 2026-09-11.
**Audience:** Anyone — human or agent — writing to Silent Legacy Media's Supabase project, Make organization, or this repository. This explicitly includes Cowork sessions.

## Why this exists

On 2026-09-11, research produced by a Cowork session for a *different* product (the E&A Investor Database) was written into `silent_legacy_raw_items` tagged `source_type: 'news'`. Nothing was malicious and nothing broke. But those rows were indistinguishable from scraped RSS journalism, and that distinction matters: the editorial pipeline's Verifier treats `news` as independent third-party reporting when applying its two-source rule.

The boundary that failed was a convention. There was no correct place for that data to go, and no field recording where it came from. This document exists so that never has to be reverse-engineered again.

## The core principle

There are two kinds of boundary:

- **Enforced** — the system rejects the violation. Postgres schema grants, RLS policies.
- **Conventional** — nothing stops you; only a reader of this document stops you. Make folders, directory names, naming prefixes.

Both are legitimate. But always know which one you are relying on, and never assume a conventional boundary will hold against an agent that has not read the convention.

## Departments

### 1. Newsletter — DORMANT as of 2026-09-11

The source-to-publish editorial pipeline. Ingests public records and news, runs candidates through Scout → Verifier → Jaques Mason → Writer, and surfaces them in an editorial queue for human approve/reject before publishing.

### 2. Storytelling Library — ACTIVE

Under construction by Cowork. Has no Supabase tables, no Make scenarios, and no repository directory of its own. **That absence is the single largest boundary risk right now** — work with no home tends to land in someone else's.

### Not a department: E&A Investor Database

A separate product that formerly shared this Supabase project (`ea_people`, `ea_investment_vehicles`, `ea_portfolio_investments`). As of 2026-09-11 all three tables read 0 rows, down from 75 / 110 / 167. Whether that reflects a deliberate migration out or data loss is unconfirmed. E&A is **not** a Silent Legacy department, and its research must not enter Silent Legacy tables without department-of-origin tagging.

---

## Supabase — project `rwnyyzayyrgvaaujryly`

Current ownership. Everything sits in the `public` schema:

| Table | Owner | Rows (2026-09-11) |
|---|---|---|
| `silent_legacy_raw_items` | Newsletter | 386 |
| `silent_legacy_stories` | Newsletter | 14 |
| `drafts` | Newsletter | 0 |
| `zz_debug_scout` | Newsletter (debug) | 2 |
| `ea_people`, `ea_investment_vehicles`, `ea_portfolio_investments` | E&A (external) | 0 |
| — | **Storytelling Library — none** | — |

**Boundary mechanism: Postgres schemas.** This is the only enforced boundary available at no cost. Target state is `newsletter.*` and `library.*`, with per-department database roles and schema-level `GRANT`s. Under that arrangement, a library credential is physically unable to write a newsletter table.

**Migration cost, stated honestly.** Moving tables is not a rename. The Next.js app queries `silent_legacy_stories`, `silent_legacy_raw_items`, and `drafts` by bare name (`web/app/queue/`, `web/app/drafts/`, `web/app/api/`); the Make scenarios hardcode the same names in raw SQL; and PostgREST must be configured to expose any new schema. Budget for application and scenario changes, not just a migration.

**Interim rule until schemas exist:** the Storytelling Library creates its own `library_*`-prefixed tables. Prefixes are conventional, not enforced — but a wrong-prefix write is at least *visible*, which the `news` incident was not.

---

## Make — organization `6256809`, team `1761681`

All Silent Legacy scenarios live in folder **274107 ("Silent Legacy Media")**. That folder boundary is currently clean and should stay that way.

| Scenario | ID | Schedule | Lifetime credits |
|---|---|---|---|
| Process Raw Items | 6112415 | `on-demand` | ~2,757 |
| News Ingest (RSS) | 6108101 | `immediately` | ~672 |
| SEC EDGAR Ingest | 6108115 | `immediately` | ~117 |
| Business Registry Ingest | 6108117 | `immediately` | ~109 |
| SEC Form D Ingest | 6112801 | `immediately` | ~89 |
| ZZ Debug – trigger RSS actor run | 6112987 | `on-demand` | ~10 |
| IRS 990 Ingest | 6109437 | `immediately` | ~5 |
| Property Deed Ingest | 6109447 | `immediately` | ~4 |

**A Make folder enforces nothing.** It is a label. Any session holding the Make API key can run any scenario in any folder. The InRange project already depends on this convention in the opposite direction — its routines are instructed never to touch folder 274107 — and that instruction is the only thing protecting the boundary.

**Credits pool at the organization level.** No folder, team, label, or naming convention gives a department its own budget. Silent Legacy and every other project in org 6256809 draw from one monthly allowance. Real spend isolation requires a separate Make organization and subscription. Plan accordingly: a cost blowup in any project is a cost blowup in all of them.

**The one enforceable lever is `scheduling.type`:**

- `on-demand` — runs only when explicitly triggered. Gated.
- `immediately` — fires automatically on its webhook. Ungated.

As of 2026-09-11, all six ingest scenarios are `immediately`; only Process Raw Items and the debug trigger are `on-demand`. **Ingestion is therefore autonomous while processing is gated.** Note what that means in practice: raw items accumulate without approval, and only the expensive stage requires a human.

---

## Repository — `central-station-33/silent-legacy-media`

Currently organized by **tool**, not by department:

```
apify/  config/  docs/  make/  prompts/  retool/  web/  wordpress/
```

Nothing in that tree says which department owns what. In practice `apify/`, `make/`, and `prompts/` are all Newsletter assets, and `web/` is the Newsletter's editorial queue application.

Target layout, department first:

```
newsletter/     apify, make, prompts, editorial web app
library/        storytelling library (Cowork)
shared/         brand voice, editorial standards, research standards
docs/           cross-department reference, including this file
```

`shared/` is load-bearing. Brand voice and evidentiary standards genuinely belong to both departments; with no shared home they get copy-pasted and drift apart silently.

Enforcement: git provides none within a single repository. `CODEOWNERS` can require review per path, which is semi-enforced. Separate repositories are the only fully enforced option, at the cost of shared-code friction.

---

## Cross-department rules

1. **Every write into a shared system records its department of origin.** A `department` field, an `origin` tag, a `source_type` prefix — the mechanism matters less than the property: any row can answer "who put me here." The `news` incident was expensive to diagnose purely because the rows could not answer that question.
2. **Never write to another department's tables.** If you need data to land there, ask its owner.
3. **Never reuse another department's `source_type` values.** A new kind of input gets a new value, not the nearest existing one.
4. **Make runs require explicit human approval**, capped at 250 credits per run. Anything that cannot be bounded to that cap gets fixed before it gets run, not run and watched.
5. **Scope your reads.** Account-level tools — trigger lists, scenario lists, the shared Supabase project — return other departments' and other projects' data by default. Filter it out; do not act or report on what is not yours.

---

## Newsletter: parked state as of 2026-09-11

Recorded so that nothing rots silently:

- 280 raw items in `scraped` status, unprocessed
- 14 stories: 12 `pending`, 2 `approved`. One approved story has never been published
- Duplicate story rows exist (Christian McCaffrey ×2, Nandita Shangari ×2) — the story `INSERT` has no dedup
- 14 items in the Process Raw Items dead-letter queue; 25 lifetime errors
- 3 Amar'e Stoudemire items, ingested via Cowork, unprocessed and mislabeled `source_type: 'news'`
- **Open bug:** the last approved run (2026-09-11) returned WARNING after 3.3 seconds. The Jaques Mason recursion cap (300 → 6 steps) and the sequential-processing fix, both applied the same day, are effectively untested.
