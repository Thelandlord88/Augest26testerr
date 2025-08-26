// scripts/audit-related-links.mjs
import fs from 'fs';
import path from 'path';

const DIST = 'dist';
let failures = 0;

function* walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    const fp = path.join(dir, name);
    const st = fs.statSync(fp);
    if (st.isDirectory()) yield* walk(fp);
    else if (name.endsWith('.html')) yield fp;
  }
}

for (const file of walk(DIST)) {
  const html = fs.readFileSync(file, 'utf8');
  const blocks = html.split(/<nav[^>]*data-relblock[^>]*>/i).slice(1);
  for (const block of blocks) {
    const endIdx = block.indexOf('</nav>');
    const segment = endIdx >= 0 ? block.slice(0, endIdx) : block;
    const anchors = (segment.match(/<a\s+[^>]*href=/gi) || []).length;
    if (anchors > 3) {
      failures++;
      console.error(`Too many related links (${anchors}) in ${file}`);
    }
  }
}

if (failures) {
  console.error(`❌ Related links audit failed: ${failures} block(s) exceed 3 links.`);
  process.exit(1);
} else {
  console.log('✅ Related links audit passed');
}