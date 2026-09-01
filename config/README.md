# Ingestion config — feeds and watchlists

These two files are the **search inputs** that feed the pipeline. Scout can
only classify what actually gets scraped, so what goes in here determines
what the editorial queue can possibly contain.

Neither file is read automatically by anything — Apify actor inputs are
configured in the Apify Console. These are the version-controlled source
of truth to paste from, so the roster doesn't live only in a Console form
field.

## `rss-feeds.json`

Every URL under `verified` was live-tested on 2026-09-01 and returned real
items. Paste them into the RSS actor's `feedUrls`.

The `failed_do_not_retry_without_fix` list records candidates that were
tested and **do not work**, with the reason (404, bot-blocked 403, or
unparseable) — including two (TechCabal, African Business) that still 403
through Apify's proxy. Kept deliberately so nobody burns time re-adding
them.

## `watchlist.json`

Search seeds for the four name/query-driven actors. **These are not
verified** — they're publicly-known funds, holding vehicles, and
foundations used as search terms. A stale or wrong name just returns no
rows, which costs nothing, so treat the list as a starting roster to
prune and extend based on what actually hits.

Nothing in that file is a published claim about any person or entity. It
only determines what gets *looked at*; the Verifier's anti-scam rules and
the human Chief Editor still gate everything that reaches publication.

### The Form D two-strategy note (important)

The Form D actor's `query` matches the **issuer** name, but athletes and
entertainers usually appear in a filing's `relatedPersons` (as Executive
Officer, Director, or Promoter) — not as the issuer. So targeted
name-search alone will miss most cap-table appearances. Run it both ways:

- **Targeted** — search the known fund/vehicle names in
  `form_d.issuer_name_queries`; these file their own Form Ds when raising.
- **Sweep** — broad periodic pulls with no query, bounded by
  `maxResults` and `minOfferingAmount`, letting Scout scan each filing's
  `relatedPersons` for recognizable names.

A live test confirmed the actor returns `relatedPersons` with full names
and roles, offering amounts, and the official SEC filing URL.

## Tuning loop

1. Run a weekly batch.
2. Look at what Scout rejected in `silent_legacy_raw_items` vs. what
   reached `silent_legacy_stories`.
3. Drop feeds/queries that never produce accepted stories; add sources
   near the ones that do.

The wire feeds (PR Newswire, Business Wire) are the obvious first
candidates to cut if Claude cost per batch runs high — they're very high
volume and mostly rejected, earning their place only as corroboration for
the Verifier's 2-Source Rule.
