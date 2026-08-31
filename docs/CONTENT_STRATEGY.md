# Content Strategy: Weekly Batch + Archive Sourcing

Two changes to the original real-time design, layered on top of it
without replacing anything: a weekly ingestion cadence instead of
continuous polling, and a deliberate push into historical ("quiet")
stories rather than only breaking events.

## Why weekly, not real-time

Silent Legacy covers durable wealth, not news cycles — a 2-year-old
commercial real estate acquisition holds the same value to a reader as
one from yesterday. That means there's no real cost to batching:

- **Timing:** run all 5 Apify actors Sunday 11 PM EST or Monday 5 AM EST.
  This window captures the weekend's local news features, regional
  business journal pieces, and weekly public-record updates before the
  work week starts.
- **Batch flow:** one weekly run produces ~20-30 candidate stories in the
  `silent_legacy_stories` queue (Retool). The Chief Editor spends ~30
  minutes Monday morning reviewing/approving, then the approved batch is
  scheduled to publish 3-4 posts/day through the week rather than all at
  once (see "Trickle publishing" below).
- **Cost:** batching cuts Apify compute and Make operations by roughly
  85% versus continuous 3-hour polling, since each actor runs once a
  week instead of ~56 times.

**To switch to this cadence:** change each actor's schedule in Apify
Console from every-3-hours to weekly (Sunday 11 PM EST / Monday 5 AM
EST). The Make scenarios themselves don't change — they're triggered by
"actor run finished" regardless of how often that happens, so this is a
schedule-only change on the Apify side.

### Trickle publishing (not yet built)

The original design published a story immediately on Retool "Approve."
For weekly batches, approved stories should instead queue with a
`scheduled_publish_at` timestamp and go out 3-4/day — see
`retool/EDITOR_PORTAL_SPEC.md` for the schema addition and
`wordpress/publish.js` for where a scheduler would call in. Not built yet
since WordPress isn't connected in this environment; the "Approve" flow
still needs this staggering logic added when that's wired up.

## Archive/"quiet story" sourcing

Two new ingestion sources support this, added alongside the original
three (see `docs/DEPLOYMENT_STATUS.md` for what's live):

| Source | Actor | What it surfaces |
|---|---|---|
| IRS Form 990 filings | `devilscrapes/irs-990-officer-comp` | Nonprofit/foundation grant amounts, officer & board compensation, multi-year asset trends — mainstream media rarely reads these line by line |
| Property deed/lien records | `shelvick/property-deed-records` | Commercial property transfers, LLC-held real estate, liens — searchable by owner/LLC name with a date range |

Both actors accept a historical date range (`startYear`/`endYear` for
990s, `dateFrom`/`dateTo` for deeds), so a single run can pull 1-5 years
of history rather than only the latest week.

**Query bank** — terms to seed watch lists / search queries with, per the
brief:

- Deed/registry party searches: `"quietly purchased"`, `"majority stake"`,
  `"bought block"`, `"trade apprenticeship"` — as free-text search terms
  where an actor supports them (news/RSS search, business-journal
  archives), or as narrative cues the Scout agent should recognize when
  they appear in scraped text.
- Date ranges: `2021..2025` for 990s and deed lookups — wide enough to
  catch a multi-year compounding story, narrow enough to stay relevant.
- For business journals and university alumni magazines specifically:
  no dedicated Apify actor exists for these (they're not databases, they're
  editorial archives). The closest fit in this account's toolset is a
  Google-Search-backed scraper (e.g. `apify/google-search-scraper` or the
  RAG web browser tool) run with a query like `"quietly acquired" OR
  "majority stake" 2022..2025 site:bizjournals.com`. Not wired into a
  scheduled Make scenario yet — worth adding once the query patterns that
  work best are known from the two structured sources above.

## The "Where Are They Now?" framing

Implemented directly in the Scout and Writer prompts (`prompts/`):

- **Scout** now extracts `eventDate` from the source record and sets
  `framing: "current"` or `"archive"` (any event more than 90 days old).
  This is informational, not a rejection criterion.
- **Writer** branches on `framing`. For `"archive"` stories it opens with
  the original event and pivots to a long-term-compounding angle: *"In
  {year}, {subject} quietly acquired {asset}. Here's how that
  {dollarAmount} play looks {N} years later."* If there's no follow-up
  data on the asset's current status, it leans on the durability of the
  original decision rather than inventing an update.
- **Verifier** is unchanged in substance but now explicitly notes that a
  990 filing or deed record scraped as the *source* itself satisfies the
  "Public Record Lock" rule directly, and that archive-framed stories
  still need the same 2-Source Rule as current ones — age doesn't lower
  the bar.
