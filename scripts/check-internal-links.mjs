import fs from 'fs';
import path from 'path';

const DIST = 'dist';
const htmlFiles = [];
function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    const fp = path.join(dir, name);
    const st = fs.statSync(fp);
    if (st.isDirectory()) walk(fp);
    else if (name.endsWith('.html')) htmlFiles.push(fp);
  }
}
walk(DIST);

const internal = new Set();
for (const file of htmlFiles) {
  const html = fs.readFileSync(file, 'utf8');
  // capture href values in single or double quotes
  const re = /<a\s+[^>]*href=['"]([^'"<>]+)['"]/gi;
  let m;
  while ((m = re.exec(html))) {
    const href = m[1];
    // Only consider root-relative internal links
    if (href && href.startsWith('/') && !href.startsWith('//')) internal.add(href);
  }
}
function hasExt(p) {
  return /\.[a-z0-9]+$/i.test(p);
}
function normalizeHref(u) {
  if (!u) return u;
  // Drop query and hash fragments
  const iHash = u.indexOf('#');
  if (iHash !== -1) u = u.slice(0, iHash);
  const iQ = u.indexOf('?');
  if (iQ !== -1) u = u.slice(0, iQ);
  try { u = decodeURI(u); } catch {}
  // Collapse duplicate slashes (root-relative only)
  u = u.replace(/\/+/g, '/');
  // Ensure directory-style links have trailing slash (e.g., /blog -> /blog/)
  if (!hasExt(u) && !u.endsWith('/')) u += '/';
  try { return encodeURI(u); } catch { return u; }
}

const toPath = (u) => {
  let p = normalizeHref(u);
  if (p.startsWith('/')) p = p.slice(1);
  if (p.endsWith('/')) p += 'index.html';
  return path.join(DIST, p);
};

let bad = 0;
for (const href of internal) {
  const fp = toPath(href);
  if (!fs.existsSync(fp)) {
    bad++;
    console.error(`❌ Missing file for link: ${href} -> ${fp}`);
  }
}
if (bad) process.exit(1);
console.log(`✅ All ${internal.size} internal links resolve to files.`);
