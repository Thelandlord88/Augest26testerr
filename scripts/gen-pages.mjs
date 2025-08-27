import fs from 'node:fs';
import path from 'node:path';
import tag from '../data/tag.json' assert { type: 'json' };

const OUT_DIR = 'src/pages/services';

for (const [id, e] of Object.entries(tag.entities)) {
  if (e.type !== 'suburb') continue;

  for (const [sid, s] of Object.entries(tag.entities)) {
    if (s.type !== 'service') continue;

    const covers = tag.edges.some(([a, b, rel]) => a === `service:${s.slug}` && b === `suburb:${e.slug}` && rel === 'covers');
    if (!covers) continue;

    const dir = path.join(OUT_DIR, s.slug, e.slug);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      path.join(dir, 'index.astro'),
      `---\n// Auto-generated from TAG\nimport Layout from '../../../layouts/SuburbService.astro';\nconst service = ${JSON.stringify(s)};\nconst suburb = ${JSON.stringify(e)};\n---\n<Layout {service} {suburb} />\n`
    );
  }
}
