# Make.com scenario blueprint

`silent-legacy-pipeline.blueprint.json` is a **readable spec** of the
scenario's modules, order, and routing logic — not a literal Make.com
export (Make's native blueprint format uses internal module IDs specific
to an account and isn't hand-writable). Use it as the build spec: recreate
each module in the Make scenario editor in the order and with the
parameters shown, then export the real blueprint from Make once built and
commit that alongside this file for future reference.

## Modules, in order

1. **Custom Webhook** — single ingestion point for all three Apify actors.
2. **HTTP → Claude Scout agent** (`prompts/scout-agent.md`) — classify +
   extract structured fields.
3. **Parse JSON** the Scout response.
4. **Router** — if `reject: true`, stop (optionally log to a "rejected"
   Make Data Store for audit).
5. **HTTP → Claude Verifier agent** (`prompts/verifier-agent.md`) —
   anti-scam gate. For `pillar: "proof"`, first look up other records
   already seen for the same `subject` (a Make Data Store keyed on
   subject name, written to by every Scout call) and pass them in so the
   2-Source Rule can actually be evaluated.
6. **Parse JSON** the Verifier response.
7. **Router** — if `approved: false`, stop (log `failedRules` +
   `editorNote` for audit).
8. **HTTP → Claude Writer agent** (`prompts/writer-agent.md`) — draft
   blog/X/video copy.
9. **Parse JSON** the Writer response.
10. **HTTP → Retool webhook** — insert a `status: pending` row with the
    Scout, Verifier, and Writer output bundled together (contract in
    `retool/EDITOR_PORTAL_SPEC.md`).

## Subject-history data store

Add a Make Data Store (`silent_legacy_subject_history`) keyed on
`subject`, written to after every successful Scout parse (step 3) with
`{ subject, pillar, sourceLinks, seenAt }`. The Verifier step reads all
rows for the current `subject` before its HTTP call so it has real
corroborating records to check the 2-Source Rule against, instead of
relying on a single Apify payload.
