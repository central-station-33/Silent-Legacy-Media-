// One-time setup: creates the Pro / W / Proof categories from
// categories.json if they don't already exist. Run with:
//   node setup-categories.js
import { readFile } from 'node:fs/promises';
import { wpClient } from './wp-client.js';

const categories = JSON.parse(await readFile(new URL('./categories.json', import.meta.url)));
const { request } = wpClient();

for (const category of categories) {
    const existing = await request(`/categories?slug=${encodeURIComponent(category.slug)}`);
    if (existing.length > 0) {
        console.log(`Category "${category.name}" already exists (id ${existing[0].id}).`);
        continue;
    }

    const created = await request('/categories', {
        method: 'POST',
        body: JSON.stringify(category),
    });
    console.log(`Created category "${created.name}" (id ${created.id}).`);
}
