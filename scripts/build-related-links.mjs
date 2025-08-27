import fs from 'node:fs';
import tag from '../data/tag.json' assert { type: 'json' };

const neighbors = (slug) =>
  tag.edges
    .filter(([a, b, rel]) => rel === 'nearby' && (a === `suburb:${slug}` || b === `suburb:${slug}`))
    .map(([a, b]) => (a.endsWith(slug) ? b : a).replace('suburb:', ''));

const out = {};
for (const [id, e] of Object.entries(tag.entities)) {
  if (e.type !== 'suburb') continue;
  out[e.slug] = neighbors(e.slug).slice(0, 4);
}
fs.mkdirSync('src/data', { recursive: true });
fs.writeFileSync('src/data/related-links.json', JSON.stringify(out, null, 2));
