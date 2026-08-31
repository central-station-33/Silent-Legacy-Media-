# Setup Guide

Stand the stack up in this order — each stage depends on the one before it
having a live endpoint to call.

## 1. Apify

1. Create three actors from `apify/scout-news`, `apify/scout-sec-edgar`,
   and `apify/scout-local-registry` (`apify push` from each directory, or
   paste `main.js` into a new actor in the Apify console).
2. Set each actor's schedule to every 3 hours (Apify Console → Schedules).
3. Set the `MAKE_WEBHOOK_URL` input/env var on each actor to the webhook
   URL created in step 2 below.

## 2. Make.com

1. Build a new scenario following the module-by-module spec in
   `make/scenarios/silent-legacy-pipeline.blueprint.json` and
   `make/scenarios/README.md`.
2. Point the trigger's "Custom Webhook" module at a new webhook and copy
   its URL into every Apify actor's `MAKE_WEBHOOK_URL`.
3. Add your Anthropic API key to the HTTP modules that call
   `api.anthropic.com`, using the system prompts in `prompts/`.
4. Set the "Push to Retool" HTTP module's URL to the endpoint from step 3
   below.
5. Activate the scenario, then export its real blueprint from Make and
   commit it alongside the spec file for future reference.

## 3. Retool

1. Build the Chief Editor Portal per `retool/EDITOR_PORTAL_SPEC.md` —
   a table of pending stories backed by a Retool database (or Supabase/
   Postgres resource) with `status: pending | approved | rejected`.
2. Wire the **Approve** button to a workflow that POSTs the story payload
   to the Make.com "publish" webhook (which calls `wordpress/publish.js`
   logic via an HTTP module, or triggers a second scenario that runs it).
3. Wire **Reject** to update `status = rejected` with the editor's note.

## 4. WordPress

1. Create three categories — `Pro`, `W`, `Proof` — matching
   `wordpress/categories.json` (or run
   `node wordpress/setup-categories.js` once `.env` is filled in).
2. Create an Application Password for a publishing user
   (Users → Profile → Application Passwords).
3. Fill in `WORDPRESS_URL`, `WORDPRESS_USER`, `WORDPRESS_APP_PASSWORD` in
   `.env`.
4. Point the Retool/Make "publish" step at `node wordpress/publish.js`
   (or port its logic into a Make HTTP module — the payload shape is the
   same either way).

## Local development

```bash
cp .env.example .env   # fill in real credentials
cd wordpress && npm install
node setup-categories.js   # one-time
node publish.js --dry-run  # verify payload shape without posting
```
