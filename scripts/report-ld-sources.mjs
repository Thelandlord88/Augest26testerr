// scripts/report-ld-sources.mjs
/**
 * Inventory of source files that generate or inject JSON-LD.
 * Heuristics:
 *  - Files containing <script type="application/ld+json">
 *  - Known schema helpers (imports of schemaGraph.js / schema.js / schemamanager.js / seoSchema.js)
 *  - Known component/layout directories
 *
 * Writes:
 *   __ai/ld-sources.txt  - human summary (by category, with counts)
 *   __ai/ld-sources.json - structured categories for automation
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOTS = ['src', 'scripts'];
const OUT_DIR = '__ai';

const CATEGORIES = {
  generators: [],
  layouts: [],
  components: [],
  pages: [],
  legacy: [],
  tooling: [],
};

const LD_SCRIPT_RX = /type=["']application\/ld\+json["']/i;
const HELPER_HINTS = [/schemaGraph\.js/i, /schema\.js/i, /schemamanager\.js/i, /seoSchema\.js/i];
// Evidence that a helper is actually used to emit LD, not just imported
const CALL_HINTS = /\b(SchemaGraph|Schema)\b|\bbuildGraph\s*\(|\bfaqPageNode\s*\(|\bcollectionPageNode\s*\(|\bserviceAndOfferNodes\s*\(|\blocalBusinessNode\s*\(|\bsuburbServiceGraph\s*\(|set:html\s*=\s*\{\s*JSON\.stringify\s*\(/i;

function* walk(dir){
  for (const e of fs.readdirSync(dir, { withFileTypes: true })){
    if (e.isDirectory() && ['node_modules','.astro','dist','__ai','.git'].includes(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else if (/\.(astro|js|ts|mjs|cjs|jsx|tsx|json)$/i.test(e.name)) yield p;
  }
}
const rel = (p)=> p.split(path.sep).join('/');

function categorize(file){
  const f = rel(file);
  if (/\.notusing\./i.test(f)) { CATEGORIES.legacy.push(f); return; }
  const isScript = f.startsWith('scripts/');
  const isSrc = f.startsWith('src/');
  const txt = fs.readFileSync(file, 'utf8');
  const hasLd = isSrc && LD_SCRIPT_RX.test(txt);
  const hasHelper = isSrc && HELPER_HINTS.some(rx => rx.test(txt));
  const usesHelperCalls = isSrc && CALL_HINTS.test(txt);
  const emitsLd = hasLd || (hasHelper && usesHelperCalls);

  if (isScript && /report-ld|validate-schema|schema|assert-ld-health/i.test(f)) { CATEGORIES.tooling.push(f); return; }
  if (/^src\/utils\/(schemaGraph|schema|schemamanager)\.js$/i.test(f) || /^src\/lib\/seoSchema\.js$/i.test(f)) { CATEGORIES.generators.push(f); return; }
  if (/^src\/layouts\//i.test(f)) { if (emitsLd) CATEGORIES.layouts.push(f); return; }
  if (/^src\/components\//i.test(f)) { if (emitsLd) CATEGORIES.components.push(f); return; }
  if (/^src\/pages\//i.test(f)) { if (emitsLd) CATEGORIES.pages.push(f); return; }
}

for (const root of ROOTS){ if (!fs.existsSync(root)) continue; for (const f of walk(root)) categorize(f); }

fs.mkdirSync(OUT_DIR, { recursive: true });
const json = {
  timestamp: new Date().toISOString(),
  counts: Object.fromEntries(Object.entries(CATEGORIES).map(([k,v]) => [k, v.length])),
  files: CATEGORIES,
};
// add total in counts for convenience
json.counts.total = Object.values(CATEGORIES).reduce((a, v) => a + v.length, 0);

fs.writeFileSync(path.join(OUT_DIR, 'ld-sources.json'), JSON.stringify(json, null, 2) + '\n');

let txt = `# Schema.org/JSON-LD Source Inventory — ${new Date().toISOString()}\n\n`;
const labels = {
  generators: '🧩 Generators & helpers',
  layouts: '🌐 Layouts & global injectors',
  components: '🧱 Components',
  pages: '📄 Pages emitting schema',
  legacy: '⚠️ Legacy / notusing',
  tooling: '📋 Reports & tooling',
};
for (const [key, arr] of Object.entries(CATEGORIES)){
  txt += `## ${labels[key]} (${arr.length})\n`;
  txt += arr.length ? arr.map(f=>`- ${f}`).join('\n') + '\n' : '_none_\n';
  txt += '\n';
}
const total = Object.values(CATEGORIES).reduce((a, v) => a + v.length, 0);
txt += `## 📊 Totals\n- Generators/helpers: ${CATEGORIES.generators.length}\n- Layouts: ${CATEGORIES.layouts.length}\n- Components: ${CATEGORIES.components.length}\n- Pages: ${CATEGORIES.pages.length}\n- Legacy: ${CATEGORIES.legacy.length}\n- Tooling: ${CATEGORIES.tooling.length}\n- **Total**: ${total}\n`;
fs.writeFileSync(path.join(OUT_DIR, 'ld-sources.txt'), txt);
console.log('✅ Wrote __ai/ld-sources.txt and __ai/ld-sources.json');
