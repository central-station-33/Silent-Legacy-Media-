# Make.com scenarios

`silent-legacy-pipeline.blueprint.json` is the **original design spec**
(single webhook-triggered scenario, HTTP calls to Claude) — kept for
history, but **superseded**. What's actually deployed is different in
two ways:

1. Ingestion uses Make's native `apify:finishedActorRuns` ("Watch Actor
   Runs") trigger per source instead of a shared custom webhook, and
   calls Claude via the native `anthropic-claude:createAMessage` module
   instead of raw HTTP.
2. Ingestion and AI processing are split into two layers — five
   Ingestion scenarios that just stage raw scraped items, and one shared
   Processing scenario that runs Scout → Verifier → Writer on a bounded,
   scheduled batch — so a large weekly batch can never time out an
   execution.

For the current, accurate module-by-module design, see
[`docs/ARCHITECTURE.md`](../../docs/ARCHITECTURE.md) (stage 2) and
[`docs/DEPLOYMENT_STATUS.md`](../../docs/DEPLOYMENT_STATUS.md) (live
scenario IDs, connections, and hook IDs). The subject-history Data Store
idea in the original design (for the Verifier's 2-source cross-checking)
was never built — still a valid future improvement, see
`docs/DEPLOYMENT_STATUS.md`'s "Not yet done" section.
