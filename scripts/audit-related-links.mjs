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
  // small block
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
  // grid block
  const grids = html.split(/<section[^>]*data-relgrid[^>]*>/i).slice(1);
  for (const grid of grids) {
    const endIdx = grid.indexOf('</section>');
    const segment = endIdx >= 0 ? grid.slice(0, endIdx) : grid;
    const anchors = (segment.match(/<a\s+[^>]*href=/gi) || []).length;
    if (anchors > 6) {
      failures++;
      console.error(`Too many related grid links (${anchors}) in ${file}`);
    }
  }
}

if (failures) {
  console.error(`\u274c Related links audit failed: ${failures} block(s) exceed caps.`);
  process.exit(1);
} else {
  console.log('\u2705 Related links audit passed');
}
