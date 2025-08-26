
// scripts/validate-footer.js
// SEO-safe dynamic footer validator
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import slugify from '../src/utils/slugify.js';

// ES module compatible __dirname
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load data manifest
const dataManifest = JSON.parse(fs.readFileSync(path.join(__dirname, '../src/data/meta-manifest.json'), 'utf8'));

// Load data files using manifest
const topics = JSON.parse(fs.readFileSync(path.join(__dirname, '../', dataManifest.topics), 'utf8'));
const areaMap = JSON.parse(fs.readFileSync(path.join(__dirname, '../', dataManifest.geoClusters), 'utf8'));

function loadTSArray(file, varName) {
  const raw = fs.readFileSync(path.resolve(file), 'utf-8');
  const match = raw.match(new RegExp(`export const ${varName} = (\[.*\]);`, 's'));
  if (!match) throw new Error(`Could not parse ${varName} from ${file}`);
  return eval(match[1]);
}
function loadTSObject(file, varName) {
  const raw = fs.readFileSync(path.resolve(file), 'utf-8');
  const match = raw.match(new RegExp(`export const ${varName} = (\{[\s\S]*?\});`, 'm'));
  if (!match) throw new Error(`Could not parse ${varName} from ${file}`);
  return eval('(' + match[1] + ')');
}

const maxPerCat = 6;
const categories = Array.from(new Set(topics.map(t => t.category)));

// Build canonical cluster list and alias map from areas.clusters.json
function canonicalFromName(nameOrKey) {
  const s = slugify(nameOrKey || '');
  if (s.startsWith('ipswich')) return 'ipswich';
  if (s.startsWith('brisbane')) return 'brisbane';
  if (s.startsWith('logan')) return 'logan';
  return s;
}
const clusterEntries = Object.entries(areaMap).map(([key, cfg]) => {
  const canonical = canonicalFromName(cfg.name || key);
  const aliases = [slugify(key), ...(cfg.aliases || []).map(slugify)];
  return { canonical, aliases: Array.from(new Set(aliases)) };
});
const clusters = Array.from(new Set(clusterEntries.map(e => e.canonical)));
const canonicalToAliases = clusterEntries.reduce((m, e) => { m[e.canonical] = e.aliases; return m; }, {});

const errors = { Anchor: [], Schema: [], URL: [], Keyword: [], Meta: [], Sitemap: [], Accessibility: [], LinkExplosion: [], DuplicateSlug: [] };
const warnings = [];

// 1. Link Explosion (warning-only; actual footer may curate per-cluster)
for (const cat of categories) {
  let links = 0;
  for (const cluster of clusters) {
    links += topics.filter(t => t.category === cat).length;
  }
  if (links > maxPerCat * clusters.length) {
    warnings.push(`LinkExplosion: Category "${cat}" has ${links} potential links (soft cap: ${maxPerCat * clusters.length})`);
  }
}

// 2. Duplicate Slugs
const seen = new Set();
for (const cluster of clusters) {
  for (const topic of topics) {
    const url = `/blog/${slugify(cluster)}/${topic.slug}`;
    if (seen.has(url)) {
      errors.DuplicateSlug.push(`Duplicate blog URL: ${url}`);
    }
    seen.add(url);
  }
}

// 3. Anchor Text Optimization
const anchorTextCount = {};
for (const topic of topics) {
  const anchor = topic.title;
  if (anchor.length > 60) errors.Anchor.push(`Anchor text too long (${anchor.length}): "${anchor}"`);
  if (anchor.length < 10) errors.Anchor.push(`Anchor text too short (${anchor.length}): "${anchor}"`);
  anchorTextCount[anchor] = (anchorTextCount[anchor] || 0) + 1;
}
for (const [anchor, count] of Object.entries(anchorTextCount)) {
  if (count > 3) errors.Anchor.push(`Anchor text "${anchor}" used ${count} times (max 3)`);
  if (count > 50) warnings.push(`Anchor text "${anchor}" used ${count} times (may be intentional)`);
}

// 4. Schema Field Validation
for (const topic of topics) {
  if (!topic.slug || !topic.title || !topic.category) {
    errors.Schema.push(`Missing required field in topic: ${JSON.stringify(topic)}`);
  }
}

// 5. URL/Slug Linting
for (const topic of topics) {
  if (/[^a-zA-Z0-9\-]/.test(topic.slug)) errors.URL.push(`Slug has non-URL-safe chars: "${topic.slug}"`);
  if (/\s/.test(topic.slug)) errors.URL.push(`Slug has spaces: "${topic.slug}"`);
}

// 6. Keyword Cannibalization
const keywordCount = {};
for (const topic of topics) {
  const keyword = topic.slug.split('-')[0];
  keywordCount[keyword] = (keywordCount[keyword] || 0) + 1;
}
for (const [kw, count] of Object.entries(keywordCount)) {
  if (count > 3) errors.Keyword.push(`Primary keyword "${kw}" appears in ${count} slugs (max 3)`);
}

// 7. Meta/OG/Title Duplication
let metaManifest;
try {
  metaManifest = JSON.parse(fs.readFileSync(path.resolve('meta-manifest.json'), 'utf-8'));
} catch (e) {
  warnings.push('meta-manifest.json not found, skipping meta/OG/title duplication check.');
}
if (metaManifest && metaManifest.pages) {
  const titles = {};
  const metas = {};
  const ogs = {};
  for (const page of metaManifest.pages) {
    if (page.title) titles[page.title] = (titles[page.title] || 0) + 1;
    if (page.meta) metas[page.meta] = (metas[page.meta] || 0) + 1;
    if (page.og) ogs[page.og] = (ogs[page.og] || 0) + 1;
  }
  for (const [t, c] of Object.entries(titles)) if (c > 1) errors.Meta.push(`Duplicate <title>: "${t}" (${c} times)`);
  for (const [m, c] of Object.entries(metas)) if (c > 1) errors.Meta.push(`Duplicate meta description: "${m}" (${c} times)`);
  for (const [o, c] of Object.entries(ogs)) if (c > 1) errors.Meta.push(`Duplicate og:title: "${o}" (${c} times)`);
}

// 8. Sitemap Inclusion
let sitemapLocs = [];
try {
  const sitemap = fs.readFileSync(path.resolve('sitemap.xml'), 'utf-8');
  sitemapLocs = Array.from(sitemap.matchAll(/<loc>(.*?)<\/loc>/g)).map(m => m[1]);
} catch (e) {
  warnings.push('sitemap.xml not found, skipping sitemap inclusion check.');
}
if (sitemapLocs.length) {
  for (const cluster of clusters) {
    for (const topic of topics) {
      const primary = `/blog/${slugify(cluster)}/${topic.slug}`;
      const aliasUrls = (canonicalToAliases[cluster] || []).map(a => `/blog/${a}/${topic.slug}`);
      const anyMatch = [primary, ...aliasUrls].some(expect => sitemapLocs.some(loc => loc.endsWith(expect)));
      if (!anyMatch) {
        errors.Sitemap.push(`Footer URL missing from sitemap (checked canonical and aliases): ${primary}`);
      }
    }
  }
}

// 9. Accessibility: Warn if any footer group/category has zero topics
for (const cat of categories) {
  const count = topics.filter(t => t.category === cat).length;
  if (count === 0) warnings.push(`Category "${cat}" has zero topics (accessibility)`);
}

// Output grouped errors/warnings
let fail = false;
for (const [type, group] of Object.entries(errors)) {
  if (group.length) {
    fail = true;
    console.error(`\n=== ${type} Errors ===`);
    group.forEach(e => console.error(e));
  }
}
if (warnings.length) {
  console.warn('\n=== Warnings ===');
  warnings.forEach(w => console.warn(w));
}
console.log('\n=== Summary ===');
if (fail) {
  console.error('Footer validation FAILED. See errors above.');
  process.exit(1);
} else {
  console.log('Footer validation PASSED.');
  process.exit(0);
}
