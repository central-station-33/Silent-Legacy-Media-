import { Actor } from 'apify';
import Parser from 'rss-parser';

await Actor.init();

const input = (await Actor.getInput()) ?? {};
const {
    feedUrls = [],
    makeWebhookUrl = process.env.MAKE_WEBHOOK_URL,
    lookbackHours = 3,
} = input;

if (!makeWebhookUrl) {
    throw new Error('No Make.com webhook URL set (input.makeWebhookUrl or MAKE_WEBHOOK_URL env var).');
}

const cutoff = Date.now() - lookbackHours * 60 * 60 * 1000;
const parser = new Parser();
const seen = (await Actor.getValue('SEEN_LINKS')) ?? [];
const seenSet = new Set(seen);

const freshItems = [];

for (const feedUrl of feedUrls) {
    try {
        const feed = await parser.parseURL(feedUrl);
        for (const item of feed.items) {
            const publishedAt = item.isoDate ? new Date(item.isoDate).getTime() : Date.now();
            if (publishedAt < cutoff) continue;
            if (seenSet.has(item.link)) continue;

            freshItems.push({
                source: 'news',
                feedUrl,
                title: item.title,
                link: item.link,
                summary: item.contentSnippet ?? item.content ?? '',
                publishedAt: new Date(publishedAt).toISOString(),
            });
            seenSet.add(item.link);
        }
    } catch (err) {
        Actor.log.warning(`Failed to parse feed ${feedUrl}: ${err.message}`);
    }
}

Actor.log.info(`Found ${freshItems.length} fresh item(s) across ${feedUrls.length} feed(s).`);

for (const item of freshItems) {
    await fetch(makeWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
    });
    await Actor.pushData(item);
}

// Cap the seen-links dedup store so it doesn't grow unbounded run over run.
await Actor.setValue('SEEN_LINKS', [...seenSet].slice(-5000));

await Actor.exit();
