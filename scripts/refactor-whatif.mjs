// scripts/refactor-whatif.mjs (universal)
// Validates redirects for ANY rename on a preview:
//   --base=blog:articles --base=areas:locations --base=services:cleaning-services
//   --cluster=old-slug:new-slug
//   --service=bond-cleaning:end-of-lease-cleaning
//   --page=quote:get-quote
//   --sample-slug=... --sample-suburb=... --preview=https://<preview>.netlify.app

import fs from "node:fs";

const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const [k, v] = a.replace(/^--/, "").split("="); return [k, v ?? "true"]; 
}));

const BASE = args.preview || process.env.PREVIEW_URL || "http://localhost:4322";

// ---- parse flags ----
function parsePairs(flag) {
  return []
    .concat([args[flag]].flat())
    .filter(Boolean)
    .flatMap(v => String(v).split(","))
    .map(s => s.split(":").map(x => x.trim()))
    .filter(([a,b]) => a && b)
    .map(([from,to]) => ({ from, to }));
}
const basePairs    = parsePairs("base");    // e.g. blog:example, areas:locations, services:cleaning-services
const clusterPairs = parsePairs("cluster"); // e.g. old:new
const servicePairs = parsePairs("service"); // e.g. bond-cleaning:end-of-lease-cleaning
const pagePairs    = parsePairs("page");    // e.g. quote:get-quote

const sample = {
  slug:   args["sample-slug"]   || "bond-cleaning-checklist",
  suburb: args["sample-suburb"] || "forest-lake",
  cluster: "ipswich",
};

const aliasVariants = (slug) => [slug, slug.replace(/-/g,"_"), slug.replace(/-/g,"%20")];

function ensureSlash(p){ if(!/\.[a-z0-9]+$/i.test(p)&&!/[?#]$/.test(p)&&!p.endsWith("/")) return p+"/"; return p; }
function norm(u){
  try{ u = new URL(u, BASE).pathname; }catch{}
  try{ u = decodeURI(u); }catch{}
  return ensureSlash(u);
}
async function headOrGet(url){
  let res;
  try{
    res = await fetch(url,{method:"HEAD",redirect:"manual"});
    if(!String(res.status).startsWith("30") || !res.headers.get("location")){
      res = await fetch(url,{method:"GET",redirect:"manual"});
    }
  }catch{
    res = await fetch(url,{method:"GET",redirect:"manual"});
  }
  return res;
}

// helpers to know current/new bases
function baseMap(defaults){
  const map = new Map(Object.entries(defaults));
  for(const {from,to} of basePairs){ map.set(from, to); }
  return map;
}
const basesNew = baseMap({ blog:"blog", areas:"areas", services:"services" });

const tests = [];

// ---- base segment renames ----
for (const {from, to} of basePairs){
  tests.push({ from: `/${from}`, to: `/${to}/` }, { from: `/${from}/`, to: `/${to}/` });

  if (from.toLowerCase() === "blog"){
    tests.push(
      { from: `/${from}/${sample.cluster}/`, to: `/${to}/${sample.cluster}/` },
      { from: `/${from}/${sample.cluster}/${sample.slug}/`, to: `/${to}/${sample.cluster}/${sample.slug}/` },
      { from: `/${from}/${sample.cluster}/category/checklist/`, to: `/${to}/${sample.cluster}/category/checklist/` },
    );
  }
  if (from.toLowerCase() === "areas"){
    tests.push(
      { from: `/${from}/${sample.cluster}/${sample.suburb}/`, to: `/${to}/${sample.cluster}/${sample.suburb}/` },
    );
  }
  if (from.toLowerCase() === "services"){
    const svc = (servicePairs[0]?.to) || (servicePairs[0]?.from) || "bond-cleaning";
    tests.push(
      { from: `/${from}/${svc}/`, to: `/${to}/${svc}/` },
      { from: `/${from}/${svc}/${sample.suburb}/`, to: `/${to}/${svc}/${sample.suburb}/` },
    );
  }
}

// ---- cluster renames across blog + areas + legacy service shape ----
const blogBaseNew = basesNew.get("blog");
const areasBaseNew = basesNew.get("areas");
for (const {from, to} of clusterPairs){
  for(const v of aliasVariants(from)){
    tests.push(
      // blog hubs + posts
      { from: `/blog/${v}/`, to: `/${blogBaseNew}/${to}/` },
      { from: `/blog/${v}/${sample.slug}/`, to: `/${blogBaseNew}/${to}/${sample.slug}/` },
      { from: `/blog/${v}/category/checklist/`, to: `/${blogBaseNew}/${to}/category/checklist/` },

      // areas
      { from: `/areas/${v}/${sample.suburb}/`, to: `/${areasBaseNew}/${to}/${sample.suburb}/` },

      // legacy service path (cluster in URL) → suburb-only
      { from: `/services/bond-cleaning/${v}/springfield/`, to: `/services/bond-cleaning/springfield/` },
    );
  }
}

// ---- service slug renames (hub + suburb) ----
const servicesBaseNew = basesNew.get("services");
for (const {from, to} of servicePairs){
  tests.push(
    { from: `/services/${from}/`, to: `/${servicesBaseNew}/${to}/` },
    { from: `/services/${from}/${sample.suburb}/`, to: `/${servicesBaseNew}/${to}/${sample.suburb}/` },
  );
}

// ---- one-off page slug renames ----
for (const {from, to} of pagePairs){
  tests.push({ from: `/${from}`, to: `/${to}/` }, { from: `/${from}/`, to: `/${to}/` });
}

// ---- execute ----
let failures = 0;
let out = `# Refactor what-if — ${new Date().toISOString()}\nBase: ${BASE}\nBases: ${JSON.stringify(Object.fromEntries(basesNew))}\nClusters: ${JSON.stringify(clusterPairs)}\nServices: ${JSON.stringify(servicePairs)}\nPages: ${JSON.stringify(pagePairs)}\nSamples: ${JSON.stringify(sample)}\n\n`;

for (const t of tests) {
  try{
    const res = await headOrGet(`${BASE}${t.from}`);
    const code = String(res.status);
    const loc = res.headers.get("location") || "";
    const ok  = code.startsWith("30") && norm(loc) === norm(t.to);
    out += `${t.from} -> [${code}] ${loc}  ${ok ? "✅" : `❌ expected ${t.to}`}\n`;
    if (!ok) failures++;
  }catch(e){
    out += `${t.from} -> error: ${e?.message || e} ❌\n`;
    failures++;
  }
}

fs.mkdirSync("__ai", { recursive: true });
const fname = `__ai/refactor-whatif-universal.txt`;
fs.writeFileSync(fname, out);
console.log(`Wrote ${fname} (${failures} failure(s))`);
if (failures) process.exit(1);
