# wordpress

WordPress REST API publishing for Silent Legacy. Pure Node (18+), no
dependencies — uses the built-in `fetch`.

- `categories.json` — the three pillar categories (`pro`, `w`, `proof`).
- `setup-categories.js` — one-time script to create them in WordPress.
- `publish.js` — publishes an approved story (the "Retool → publish"
  payload, see `../retool/EDITOR_PORTAL_SPEC.md`) as a WP post under the
  right pillar category, and passes the `xThread`/`videoScript` through
  in its output for the caller to route to social/video queues.
- `wp-client.js` — shared authenticated-fetch helper (WP Application
  Passwords over Basic Auth).

## Usage

```bash
export WORDPRESS_URL=https://your-site.com
export WORDPRESS_USER=publisher
export WORDPRESS_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx

node setup-categories.js          # one-time
node publish.js < payload.json    # publish a story
node publish.js --payload payload.json --dry-run   # preview, no network call
```
