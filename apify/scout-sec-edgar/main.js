import { Actor } from 'apify';

await Actor.init();

const input = (await Actor.getInput()) ?? {};
const {
    watchTerms = [],
    formTypes = ['D', 'SC 13D', 'SC 13G', 'S-1'],
    makeWebhookUrl = process.env.MAKE_WEBHOOK_URL,
    lookbackHours = 3,
} = input;

if (!makeWebhookUrl) {
    throw new Error('No Make.com webhook URL set (input.makeWebhookUrl or MAKE_WEBHOOK_URL env var).');
}

const startdt = new Date(Date.now() - lookbackHours * 60 * 60 * 1000).toISOString().slice(0, 10);
const enddt = new Date().toISOString().slice(0, 10);
const seen = (await Actor.getValue('SEEN_ACCESSIONS')) ?? [];
const seenSet = new Set(seen);

const freshFilings = [];

for (const term of watchTerms) {
    const url = new URL('https://efts.sec.gov/LATEST/search-index');
    url.searchParams.set('q', `"${term}"`);
    url.searchParams.set('forms', formTypes.join(','));
    url.searchParams.set('startdt', startdt);
    url.searchParams.set('enddt', enddt);

    const res = await fetch(url, { headers: { 'User-Agent': 'Silent Legacy Media scout@silentlegacy.media' } });
    if (!res.ok) {
        Actor.log.warning(`EDGAR search failed for "${term}": ${res.status}`);
        continue;
    }

    const { hits } = await res.json();
    for (const hit of hits?.hits ?? []) {
        const accession = hit._id;
        if (seenSet.has(accession)) continue;

        freshFilings.push({
            source: 'sec-edgar',
            watchTerm: term,
            accession,
            formType: hit._source.forms?.[0] ?? hit._source.file_type,
            entity: hit._source.display_names?.[0] ?? term,
            filedAt: hit._source.file_date,
            link: `https://www.sec.gov/Archives/edgar/data/${hit._source.ciks?.[0]}/${accession.replace(/-/g, '')}.txt`,
        });
        seenSet.add(accession);
    }
}

Actor.log.info(`Found ${freshFilings.length} fresh filing(s) across ${watchTerms.length} watch term(s).`);

for (const filing of freshFilings) {
    await fetch(makeWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(filing),
    });
    await Actor.pushData(filing);
}

await Actor.setValue('SEEN_ACCESSIONS', [...seenSet].slice(-5000));

await Actor.exit();
