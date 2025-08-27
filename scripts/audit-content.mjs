import fs from 'node:fs';
import path from 'node:path';

const DIST = 'dist';
let fail = false;

function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    const fp = path.join(dir, name);
    const st = fs.statSync(fp);
    if (st.isDirectory()) walk(fp);
    else if (name.endsWith('.html')) check(fp);
  }
}

function check(file) {
  const html = fs.readFileSync(file, 'utf8');
  const mainMatch = html.match(/<main[\s\S]*?>[\s\S]*?<\/main>/i);
  const main = mainMatch ? mainMatch[0] : '';
  const text = main.replace(/<[^>]*>/g, ' ');
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const links = (main.match(/<a\s+[^>]*href=['"][^'"]+['"][^>]*>/gi) || []).length;
  if (words < 700 || links < 3) {
    console.error('[audit]', file, { words, links });
    fail = true;
  }
}

walk(DIST);
if (fail) process.exit(1);
