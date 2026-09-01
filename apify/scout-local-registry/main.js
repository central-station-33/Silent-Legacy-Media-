import { Actor } from 'apify';

await Actor.init();

const input = (await Actor.getInput()) ?? {};
const {
    registries = [],
    makeWebhookUrl = process.env.MAKE_WEBHOOK_URL,
    lookbackHours = 3,
} = input;

if (!makeWebhookUrl) {
    throw new Error('No Make.com webhook URL set (input.makeWebhookUrl or MAKE_WEBHOOK_URL env var).');
}

function getByPath(obj, path) {
    return path.split('.').reduce((acc, key) => acc?.[key], obj);
}

const cutoff = Date.now() - lookbackHours * 60 * 60 * 1000;
const seen = (await Actor.getValue('SEEN_RECORDS')) ?? [];
const seenSet = new Set(seen);

const freshRecords = [];

for (const registry of registries) {
    const { name, watchTerms = [], urlTemplate, resultsPath, type } = registry;

    for (const term of watchTerms) {
        const url = urlTemplate.replace('{term}', encodeURIComponent(term));
        let payload;
        try {
            const res = await fetch(url, { headers: { 'User-Agent': 'Silent Legacy Media scout@silentlegacy.media' } });
            if (!res.ok) {
                Actor.log.warning(`${name} search failed for "${term}": ${res.status}`);
                continue;
            }
            payload = await res.json();
        } catch (err) {
            Actor.log.warning(`${name} request errored for "${term}": ${err.message}`);
            continue;
        }

        const results = (resultsPath ? getByPath(payload, resultsPath) : payload) ?? [];
        for (const record of results) {
            const recordId = `${name}:${record.id ?? record.filingNumber ?? record.permitNumber ?? JSON.stringify(record).slice(0, 64)}`;
            if (seenSet.has(recordId)) continue;

            const filedAt = record.filedAt ?? record.dateFiled ?? record.issuedAt ?? null;
            if (filedAt && new Date(filedAt).getTime() < cutoff) continue;

            freshRecords.push({
                source: 'local-registry',
                registryType: type,
                registryName: name,
                watchTerm: term,
                record,
            });
            seenSet.add(recordId);
        }
    }
}

Actor.log.info(`Found ${freshRecords.length} fresh record(s) across ${registries.length} registry source(s).`);

for (const record of freshRecords) {
    await fetch(makeWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record),
    });
    await Actor.pushData(record);
}

await Actor.setValue('SEEN_RECORDS', [...seenSet].slice(-5000));

await Actor.exit();
