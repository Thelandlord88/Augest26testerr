#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const DIST = 'dist';
if (!fs.existsSync(DIST)) {
  console.error('[audit-cross-links] dist/ not found. Build first.');
  process.exit(2);
}
const BLOG_BASE = (process.env.BLOG_BASE || '/blog/').toString().replace(/\/+$/, '') || '/blog';

function walk(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else if (e.isFile() && e.name.endsWith('.html')) out.push(p);
  }
  return out;
}
function slugify(s){return String(s).trim().toLowerCase().replace(/\s+/g,'-');}
function resolveClusterSlug(s){return String(s||'').toLowerCase();}
function loadClusterMap(){const map=new Map(); try{const raw=JSON.parse(fs.readFileSync('content/areas.clusters.json','utf8')); const clusters=Array.isArray(raw?.clusters)?raw.clusters:[]; for(const c of clusters){const clusterSlug=resolveClusterSlug(c.slug); for(const sub of (c.suburbs||[])) map.set(slugify(sub), clusterSlug);} }catch{} return map;}
function extractNav(html){const m=html.match(/<nav[^>]*data-relservices[^>]*>([\s\S]*?)<\/nav>/i); return m?m[1]:'';}

const clusterMap = loadClusterMap();
// Build service -> cluster -> hasCoverage map from coverage file
let coverageData = {};
try { coverageData = JSON.parse(fs.readFileSync('src/data/serviceCoverage.json','utf8')); } catch {}
const clusterCoverage = {}; // svc -> Set(clusters)
for (const [svc, subs] of Object.entries(coverageData)) {
  const set = new Set();
  if (Array.isArray(subs)) {
    for (const s of subs) {
      const cl = clusterMap.get(slugify(s));
      if (cl) set.add(cl);
    }
  }
  clusterCoverage[svc] = set;
}
const files = walk(DIST).filter(f => /\/services\/[a-z0-9-]+\/[a-z0-9-]+\/index\.html$/.test(f));
if (!files.length) {
  console.error('[audit-cross-links] No built service suburb pages found under dist/. Run build first.');
  process.exit(2);
}
const failures=[];
for (const file of files){
  const html=fs.readFileSync(file,'utf8');
  const route='/' + file.replace(/^dist\//,'').replace(/index\.html$/,'');
  const nav=extractNav(html);
  const m=route.match(/^\/services\/([a-z0-9-]+)\/([a-z0-9-]+)\//);
  if(!m) continue; const currentService=m[1]; const suburb=m[2]; const cluster=clusterMap.get(suburb); const targets=['spring-cleaning','bathroom-deep-clean'].filter(s=>s!==currentService); const hrefs=Array.from(nav.matchAll(/<a[^>]*href=["']([^"'#]+)["']/gi)).map(m=>m[1]); const blogExpected=cluster?`${BLOG_BASE}/${cluster}/`:null;
  if(!nav){failures.push({route,reason:'Missing nav[data-relservices]'}); continue;}
  for(const svc of targets){
    const re=new RegExp(`^/services/${svc}/[a-z0-9-]+/$`);
    const has = hrefs.some(h=>re.test(h));
    const clusterHas = (clusterCoverage[svc]||new Set()).has(cluster);
    if(!has && clusterHas) failures.push({route,reason:`Missing cross link for ${svc}`});
  }
  if(blogExpected && !hrefs.includes(blogExpected)) failures.push({route,reason:`Missing local guides link (${blogExpected})`});
}
if(failures.length){fs.mkdirSync('__ai',{recursive:true}); fs.writeFileSync('__ai/cross-links-failures.json', JSON.stringify({failures},null,2)); console.error(`[audit-cross-links] ${failures.length} page(s) failed cross link audit.`); for(const f of failures.slice(0,10)) console.error(' -', f.route, '=>', f.reason); process.exit(1);} else {console.log(`[audit-cross-links] ${files.length} service pages passed cross link audit.`);}
