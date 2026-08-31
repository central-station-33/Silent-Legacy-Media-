# Chief Editor Portal — Retool app spec

Single-dashboard editorial control: one screen, a queue table, a
side-by-side detail view, and two buttons.

## Data source

A `silent_legacy_stories` table (Retool DB, or any Postgres/Supabase
resource wired into Retool) with columns:

| column | type | notes |
|---|---|---|
| `id` | uuid, pk | |
| `status` | text | `pending` \| `approved` \| `rejected` |
| `pillar` | text | `pro` \| `w` \| `proof` |
| `scout` | jsonb | Scout agent output |
| `verifier` | jsonb | Verifier agent output (`approved`, `failedRules`, `confidence`, `editorNote`) |
| `content` | jsonb | Writer agent output (`blogPost`, `xThread`, `videoScript`) |
| `editor_note` | text, nullable | human editor's reason on reject |
| `created_at` | timestamptz | |
| `decided_at` | timestamptz, nullable | |
| `decided_by` | text, nullable | editor's identity |

The Make.com pipeline's final step (`silent-legacy-pipeline.blueprint.json`
step 12 / `make/scenarios/README.md`) POSTs a new row here with
`status: "pending"` for every story that clears the Verifier agent.

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
  - **Approve** button — enabled only while `status = pending`. On click:
    1. Save any edits made to the `content` fields back to the row.
    2. Set `status = approved`, `decided_at = now()`,
       `decided_by = {{current_user.email}}`.
    3. Fire the "publish" workflow (Retool Workflow or a Make.com HTTP
       call) with the row's `pillar` and (possibly edited) `content`,
       which runs `wordpress/publish.js`'s logic to create the WP post
       and hands the `xThread`/`videoScript` off to their respective
       distribution queues.
  - **Reject** button — opens a required reason field, then sets
    `status = rejected`, `editor_note`, `decided_at`, `decided_by`. No
    downstream call.

## Webhook contract (Make → Retool, on ingest)

```json
POST {{RETOOL_WEBHOOK_URL}}
{
  "status": "pending",
  "pillar": "pro" | "w" | "proof",
  "scout": { "...": "Scout agent output" },
  "verifier": { "...": "Verifier agent output" },
  "content": { "...": "Writer agent output" }
}
```

## Webhook contract (Retool → publish, on Approve)

```json
POST {{MAKE_PUBLISH_WEBHOOK_URL or direct WordPress publisher}}
{
  "storyId": "uuid",
  "pillar": "pro" | "w" | "proof",
  "content": { "blogPost": {...}, "xThread": [...], "videoScript": {...} }
}
```

This shape matches the input `wordpress/publish.js` expects — see that
file's header comment.
