# Chief Editor Portal — Retool app spec

Single-dashboard editorial control: one screen, a queue table, a
side-by-side detail view, and two buttons.

## Data source

`silent_legacy_stories` lives in Retool's own Postgres database (the
same one Make's connection `8042168` already points at) — the Retool app
should query and update it via Retool's built-in Postgres resource
directly, **not** through Make's API. Make is only involved on the
publish side (see "Publish flow" below); reading/filtering/editing the
queue is a plain Retool ↔ its-own-database connection with no extra
credentials to set up.

Columns:

| column | type | notes |
|---|---|---|
| `id` | uuid, pk | |
| `status` | text | `pending` \| `approved` \| `rejected` |
| `pillar` | text | `pro` \| `w` \| `proof` |
| `scout` | jsonb | Scout agent output |
| `verifier` | jsonb | Verifier agent output (`approved`, `failedRules`, `confidence`, `editorNote`) |
| `content` | jsonb | Writer agent output (`blogPost`, `xThread`, `videoScript`) |
| `editor_note` | text, nullable | human editor's reason on reject |
| `scheduled_publish_at` | timestamptz, nullable | when this story should actually go live — see "Trickle publishing" below |
| `published_at` | timestamptz, nullable | set once the trickle-publish scenario actually posts it |
| `created_at` | timestamptz | |
| `decided_at` | timestamptz, nullable | |
| `decided_by` | text, nullable | editor's identity |

Each Make.com ingest scenario (see `docs/DEPLOYMENT_STATUS.md` for the
current list — one per source) inserts a row here directly via a Postgres
module with `status: 'pending'` for every story that clears the Verifier
agent. There is no separate ingest webhook; Make writes to this table
directly using the same Postgres connection Retool reads from.

### Publish flow (trickle publishing, weekly batch mode)

With the weekly ingestion cadence (`docs/CONTENT_STRATEGY.md`), a single
run produces ~20-30 pending stories at once. Two Make scenarios split the
work — **neither is built yet**, both depend on WordPress being
connected first:

1. **"Silent Legacy - Publish Trigger"** (webhook-triggered, fired by
   Retool's Approve action — see "Actions" below). Receives
   `{storyId, pillar, content, scheduledPublishAt}`. This is the
   Make-side hand-off point; it doesn't need to publish immediately —
   its job is just to acknowledge receipt (and can do so, e.g., for
   logging/notifications). The row itself is already written by Retool
   directly (see below), so this scenario doesn't need to touch Postgres
   unless you want a second source of truth.
2. **"Silent Legacy - Trickle Publish"** (Make Schedule trigger, e.g.
   hourly — not tied to any Apify actor). Queries
   `silent_legacy_stories` for `status = 'approved' AND
   scheduled_publish_at <= now() AND published_at IS NULL`, publishes
   each via `wordpress/publish.js`'s logic (ported into a Make
   `http:ActionSendData` module calling the WP REST API directly, same
   payload shape), and sets `published_at = now()`. This is what actually
   staggers posts across the week — the webhook in step 1 only captures
   the *intent* to publish on schedule.

This keeps the "Approve" click cheap for the editor (batch-select and
approve up to 30 stories in one sitting) while spreading actual
publication out.

## Screen layout

- **Left: queue table** — one row per pending story: `pillar` badge,
  `scout.subject`, `verifier.confidence`, `created_at`. Filterable by
  pillar. Sorted oldest first.
- **Right: detail panel** (populated by the selected row):
  - **Source** — raw `scout` JSON, plus every link in
    `scout.sourceLinks`, rendered as clickable chips.
  - **AI draft** — `content.blogPost.headline` / `.body`, the
    `content.xThread` array, and `content.videoScript` fields, each in an
    editable text area so the editor can hand-correct copy before
    approving.
  - **Verifier notes** — `verifier.editorNote` and any `failedRules`
    (should be empty for anything that reached this queue, but surfaced
    for transparency).
- **Actions**:
  - **Approve** button — enabled only while `status = pending`. On click
    (all via Retool's direct Postgres resource, per "Data source" above):
    1. Save any edits made to the `content` fields back to the row.
    2. Compute the next available staggered slot (3-4/day across the
       week) and write `status = 'approved'`, `decided_at = now()`,
       `decided_by = {{current_user.email}}`, `scheduled_publish_at =
       <computed slot>`.
    3. Call the "Silent Legacy - Publish Trigger" Make webhook (see
       "Publish flow" above) with the payload below — this is a
       notification hand-off, not the actual publish; the Trickle Publish
       scenario does the timed posting.
  - **Reject** button — opens a required reason field, then sets
    `status = rejected`, `editor_note`, `decided_at`, `decided_by`. No
    downstream call.

## Webhook contract (Retool → Make, on Approve)

```json
POST {{MAKE_PUBLISH_TRIGGER_WEBHOOK_URL}}
{
  "storyId": "uuid",
  "pillar": "pro" | "w" | "proof",
  "scheduledPublishAt": "2026-09-08T14:00:00Z",
  "content": { "blogPost": {...}, "xThread": [...], "videoScript": {...} }
}
```

The `content` shape matches what `wordpress/publish.js` expects — see
that file's header comment — since the Trickle Publish scenario's actual
WordPress call reuses the same payload shape (ported into a Make HTTP
module rather than calling the Node script directly).
