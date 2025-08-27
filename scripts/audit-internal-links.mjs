#!/usr/bin/env node
// Audit built pages for in-content internal links and provide suggested link blocks
// - Scans dist/**.html
// - Counts internal links within <main id="main">…</main>
// - Reports pages with zero internal links, explaining likely cause
// - Generates HTML snippets per affected route under __ai/internal-link-suggestions/
// - Writes summary JSON and text reports in __ai/

import fs from 'node:fs';
import path from 'node:path';
import { normRoute } from './routes-util.mjs';

const DIST = 'dist';
const OUT_DIR = '__ai';
const SUGGEST_DIR = path.join(OUT_DIR, 'internal-link-suggestions');
const REPORT_JSON = path.join(OUT_DIR, 'internal-links-report.json');
const REPORT_TXT = path.join(OUT_DIR, 'internal-links-missing.txt');

if (!fs.existsSync(DIST)) {
  console.error('[audit-internal-links] dist/ not found. Build the site first.');
  process.exit(2);
}

function walk(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else if (e.isFile() && e.name.toLowerCase().endsWith('.html')) out.push(p);
  }
  return out;
}

function read(file) {
  try { return fs.readFileSync(file, 'utf8'); } catch { return ''; }
}

// Extract inner HTML for <main id="main"> … </main>
function extractMain(html) {
  const m = html.match(/<main\b[^>]*id=["']main["'][^>]*>([\s\S]*?)<\/main>/i);
  return m ? m[1] : '';
}

// Find internal links (root-relative) inside a chunk of HTML
function findInternalLinks(html) {
  const re = /<a\b[^>]*href=["']([^"'#<>()\s]+)["'][^>]*>/gi;
  const links = [];
  let m;
  while ((m = re.exec(html))) {
    const href = m[1];
    if (href && href.startsWith('/') && !href.startsWith('//')) links.push(href);
  }
  return links;
}

// Build cluster map (suburb -> canonical cluster) from content JSON files
function slugify(s) { return String(s).trim().toLowerCase().replace(/\s+/g, '-'); }
function loadClusterMap() {
  const map = new Map(); // suburbSlug -> clusterSlug (canonical)
  try {
    const raw = JSON.parse(fs.readFileSync('content/areas.clusters.json', 'utf8'));
    const clusters = Array.isArray(raw?.clusters) ? raw.clusters : [];
    for (const c of clusters) {
      const canon = resolveClusterSlug(c.slug);
      for (const name of (c.suburbs || [])) map.set(slugify(name), canon);
    }
  } catch {}
  return map;
}
// Canonicalize cluster aliases
function resolveClusterSlug(s) {
  const x = String(s || '').toLowerCase();
  if (x === 'ipswich-region') return 'ipswich';
  if (x === 'brisbane-west' || x === 'brisbane_west') return 'brisbane';
  return x;
}

// Suggest internal links per route
function suggestLinks(route, clusterMap) {
  const BLOG_BASE = (process.env.BLOG_BASE || '/blog/').toString().replace(/\/+$/, '/') || '/blog/';
  const out = [];
  const mSvc = route.match(/^\/services\/([a-z0-9-]+)\/([a-z0-9-]+)\/$/);
  const mAreaCluster = route.match(/^\/areas\/([a-z0-9-_]+)\/$/);
  const mAreaDetail = route.match(/^\/areas\/([a-z0-9-_]+)\/([a-z0-9-]+)\/$/);
  const mBlogCluster = route.match(/^\/(?:blog|guides)\/([a-z0-9-_]+)\/$/);
  const mBlogPost = route.match(/^\/(?:blog|guides)\/([a-z0-9-_]+)\/([a-z0-9-]+)\/$/);

  if (mSvc) {
    const svc = mSvc[1];
    const suburb = mSvc[2];
    // Cross-service links for the same suburb
    const cross = ['spring-cleaning', 'bathroom-deep-clean'].filter(s => s !== svc);
    for (const s of cross) out.push({ href: `/services/${s}/${suburb}/`, label: titleCase(s) + ' in ' + titleCase(suburb) });
    // Local guides (cluster)
    const cluster = clusterMap.get(suburb);
    if (cluster) out.push({ href: `/${BLOG_BASE.replace(/^\//,'')}${cluster}/`, label: 'Local guides' });
  } else if (mAreaDetail) {
    const cluster = resolveClusterSlug(mAreaDetail[1]);
    const suburb = mAreaDetail[2];
    out.push({ href: `/services/bond-cleaning/${suburb}/`, label: 'Bond Cleaning in ' + titleCase(suburb) });
    out.push({ href: `/services/spring-cleaning/${suburb}/`, label: 'Spring Cleaning in ' + titleCase(suburb) });
    out.push({ href: `/${BLOG_BASE.replace(/^\//,'')}${cluster}/`, label: 'Local guides' });
  } else if (mAreaCluster) {
    const cluster = resolveClusterSlug(mAreaCluster[1]);
    out.push({ href: '/services/bond-cleaning/', label: 'Bond Cleaning services' });
    out.push({ href: `/${BLOG_BASE.replace(/^\//,'')}${cluster}/`, label: 'Local guides' });
  } else if (mBlogPost || mBlogCluster) {
    out.push({ href: '/quote/', label: 'Get a Quote' });
    out.push({ href: '/areas/', label: 'Service Areas' });
  } else {
    // Generic fallbacks
    out.push({ href: '/services/bond-cleaning/', label: 'Bond Cleaning' });
    out.push({ href: '/areas/', label: 'Service Areas' });
  }
  // De-dupe by href
  const seen = new Set();
  return out.filter(x => !seen.has(x.href) && seen.add(x.href));
}

function titleCase(s) { return String(s).split('-').map(w => w ? w[0].toUpperCase()+w.slice(1) : '').join(' '); }

function sanitizeRoute(route) {
  if (route === '/') return 'root';
  return route.replace(/^\/+|\/+$/g, '').replace(/\//g, '__');
}

function main() {
  const clusterMap = loadClusterMap();

  const files = walk(DIST);
  const IGNORE = new Set([ '/privacy/', '/robots.txt', '/404/', '/500/' ]);
  const missing = [];
  const analyzed = [];

  for (const f of files) {
    const route = normRoute(f);
    if (IGNORE.has(route)) continue;
    const html = read(f);
    const main = extractMain(html) || html; // fallback to whole page
    const links = findInternalLinks(main);
    const count = links.length;
    const item = { route, file: f, inContentLinks: count };
    analyzed.push(item);
    if (count === 0) {
      // Heuristic reason
      let reason = 'No internal links found in main content.';
      if (/^\/services\//.test(route)) reason += ' Likely missing CrossServiceLinks/RelatedLinks section.';
      else if (/^\/areas\//.test(route)) reason += ' Area template may lack related links or service CTAs.';
      else if (/^\/(blog|guides)\//.test(route)) reason += ' Post template may lack related posts or in-copy links.';
      const suggestions = suggestLinks(route, clusterMap);
      missing.push({ ...item, reason, suggestions });
    }
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.mkdirSync(SUGGEST_DIR, { recursive: true });

  // Write per-route suggestion snippets
  for (const m of missing) {
    const name = sanitizeRoute(m.route) + '.html';
    const lines = [
      '<nav class="related-links" aria-label="Suggested links">',
      '  <ul>'
    ];
    for (const s of m.suggestions) {
      lines.push(`    <li><a href="${s.href}" class="text-blue-700 underline hover:no-underline">${s.label}</a></li>`);
    }
    lines.push('  </ul>', '</nav>', '');
    fs.writeFileSync(path.join(SUGGEST_DIR, name), lines.join('\n'));
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    scanned: analyzed.length,
    missing: missing.length,
    items: missing
  };
  fs.writeFileSync(REPORT_JSON, JSON.stringify(summary, null, 2) + '\n');
  fs.writeFileSync(REPORT_TXT, missing.map(m => `${m.route} — ${m.reason}`).join('\n') + (missing.length ? '\n' : ''));

  if (missing.length) {
    console.error(`[audit-internal-links] ${missing.length} page(s) with zero in-content internal links. See ${REPORT_JSON} and ${SUGGEST_DIR}/`);
    process.exit(1);
  }
  console.log(`[audit-internal-links] All ${analyzed.length} pages contain in-content internal links.`);
}

main();
