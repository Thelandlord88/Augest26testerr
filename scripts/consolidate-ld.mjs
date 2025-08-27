#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const DIST = 'dist';

// Rewrites: split into safe HTML-level rewrites and JSON-only rewrites.
// The 3-segment services rewrite must NOT be run on raw HTML because it can span
// across attribute boundaries and corrupt markup. Keep it JSON-only.
const REWRITES_HTML = [
  [/\/blog\/ipswich-region\b/g, '/blog/ipswich'],
  [/\/blog\/brisbane-west\b/g, '/blog/brisbane'],
  [/\/areas\/ipswich-region\b/g, '/areas/ipswich'],
  [/\/areas\/brisbane-west\b/g, '/areas/brisbane'],
];

const REWRITES_JSON = [
  ...REWRITES_HTML,
  [/\/services\/([^/]+)\/([^/]+)\/([^/]+)\/?/g, (_m, svc, _cluster, suburb) => `/services/${svc}/${suburb}/`],
];

function* walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    const fp = path.join(dir, name);
    const st = fs.statSync(fp);
    if (st.isDirectory()) yield* walk(fp);
    else if (name.endsWith('.html')) yield fp;
  }
}

const SCRIPT_RE = /<script[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi;
const SCRIPT_CAPTURE_RE = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

function findLdScripts(html) {
  const out = [];
  let m;
  while ((m = SCRIPT_CAPTURE_RE.exec(html))) out.push(m);
  return out;
}

function canonUrl(str) {
  if (typeof str !== 'string') return str;
  return REWRITES_JSON.reduce((acc, [pat, rep]) => acc.replace(pat, rep), str);
}

function deepCanon(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === 'string') obj[k] = canonUrl(v);
    else if (v && typeof v === 'object') obj[k] = deepCanon(v);
  }
  return obj;
}

let pagesWithMulti = 0;
let pagesUpdated = 0;

for (const file of walk(DIST)) {
  let html = fs.readFileSync(file, 'utf8');
  // Apply only the safe HTML-level rewrites; avoid complex service triplet rewrite here.
  let rewrittenHtml = REWRITES_HTML.reduce((acc, [pat, rep]) => acc.replace(pat, rep), html);

  // Work from the rewritten HTML for script discovery to keep indices aligned
  const blocks = findLdScripts(rewrittenHtml);

  if (blocks.length > 1) {
    pagesWithMulti++;
  }

  if (blocks.length >= 1) {
    // Parse all JSON-LD blocks; normalize URLs and merge as a single @graph
    const nodes = [];
    for (const b of blocks) {
      try {
        const json = JSON.parse(b[1]);
        const arr = Array.isArray(json)
          ? json
          : (json && json['@graph']) ? json['@graph'] : [json];
        for (const n of arr) nodes.push(deepCanon(n));
      } catch {
        // ignore parse errors
      }
    }
    // Deduplicate by @id, else rough key from @type+name+url
    const seen = new Set();
    const merged = [];
    for (const n of nodes) {
      const types = Array.isArray(n?.['@type']) ? n['@type'].slice().sort().join('|') : (n?.['@type'] || '');
      const key = n?.['@id'] || `${types}|${n?.name || ''}|${n?.url || ''}`;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(n);
    }
    const graph = JSON.stringify({ '@context': 'https://schema.org', '@graph': merged }, null, 2);

    // Remove all JSON-LD scripts safely, then inject one consolidated block before </head> (or </body> as fallback)
    let out = rewrittenHtml.replace(SCRIPT_RE, '');
    const inject = `\n<script type="application/ld+json">\n${graph}\n</script>\n`;
    if (out.includes('</head>')) {
      out = out.replace('</head>', `${inject}</head>`);
    } else if (out.includes('</body>')) {
      out = out.replace('</body>', `${inject}</body>`);
    } else {
      out = out + inject;
    }
    if (out !== html) {
      fs.writeFileSync(file, out);
      pagesUpdated++;
      continue;
    }
  }

  // If no LD scripts were present, still write out the alias rewrites if they changed anything
  if (rewrittenHtml !== html) {
    fs.writeFileSync(file, rewrittenHtml);
    pagesUpdated++;
  }
}

console.log(`consolidate-ld: pages with multi-scripts=${pagesWithMulti}, pages updated=${pagesUpdated}`);
