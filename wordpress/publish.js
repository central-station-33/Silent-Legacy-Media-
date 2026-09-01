// Publishes an approved Silent Legacy story to WordPress.
//
// Expects the "Retool -> publish" payload (see
// retool/EDITOR_PORTAL_SPEC.md) as JSON on stdin, or via --payload
// <file>. The xThread and videoScript are returned unchanged in stdout
// output so the caller (a Make.com HTTP module, typically) can route
// them to the social/video queues after this script only handles the
// WordPress post itself.
//
// Usage:
//   node publish.js < payload.json
//   node publish.js --payload payload.json
//   node publish.js --payload payload.json --dry-run
import { readFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { wpClient } from './wp-client.js';

function parseArgs(argv) {
    const args = { dryRun: false, payloadPath: null };
    for (let i = 0; i < argv.length; i++) {
        if (argv[i] === '--dry-run') args.dryRun = true;
        if (argv[i] === '--payload') args.payloadPath = argv[++i];
    }
    return args;
}

async function loadPayload(payloadPath) {
    if (payloadPath) return JSON.parse(await readFile(payloadPath, 'utf8'));
    const raw = readFileSync(0, 'utf8'); // stdin
    if (!raw.trim()) throw new Error('No payload provided on stdin or via --payload.');
    return JSON.parse(raw);
}

async function categoryIdForSlug(request, slug) {
    const categories = JSON.parse(await readFile(new URL('./categories.json', import.meta.url)));
    const match = categories.find((c) => c.slug === slug);
    if (!match) throw new Error(`Unknown pillar "${slug}" - not in categories.json.`);

    const existing = await request(`/categories?slug=${encodeURIComponent(slug)}`);
    if (existing.length === 0) {
        throw new Error(`Category "${slug}" not found in WordPress. Run setup-categories.js first.`);
    }
    return existing[0].id;
}

const { dryRun, payloadPath } = parseArgs(process.argv.slice(2));
const payload = await loadPayload(payloadPath);
const { storyId, pillar, content } = payload;

if (!pillar || !content?.blogPost) {
    throw new Error('Payload missing required "pillar" or "content.blogPost".');
}

const post = {
    title: content.blogPost.headline,
    content: content.blogPost.body,
    status: 'publish',
};

if (dryRun) {
    console.log(JSON.stringify({ dryRun: true, wouldPublish: post, pillar, storyId }, null, 2));
    process.exit(0);
}

const { request } = wpClient();
const categoryId = await categoryIdForSlug(request, pillar);
const created = await request('/posts', {
    method: 'POST',
    body: JSON.stringify({ ...post, categories: [categoryId] }),
});

console.log(JSON.stringify({
    storyId,
    pillar,
    postId: created.id,
    link: created.link,
    xThread: content.xThread,
    videoScript: content.videoScript,
}, null, 2));
