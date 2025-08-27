// scripts/validate-redirects.mjs
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.PREVIEW_URL || "http://localhost:4322";

const lines = fs.readFileSync(path.resolve("public/_redirects"), "utf8")
  .split("\n")
  .map(l => l.trim())
  .filter(l => l && !l.startsWith("#"));

function sampleFor(seg) {
  if (seg.startsWith(":service")) return "bond-cleaning";
  if (seg.startsWith(":cluster")) return "brisbane";
  if (seg.startsWith(":suburb"))  return "springfield";
  if (seg.includes("%20"))        return seg;
  return seg;
}
function expandSplat(src) {
  if (/^\/areas\//.test(src)) return "forest-lake/";
  if (/^\/blog\//.test(src))  return "category/checklist/";
  return "x/y/"; // exercise nested replacements
}
function compile(rule) {
  const parts = rule.split(/\s+/);
  if (parts.length < 2) return null;
  const [srcRaw, dstRaw] = parts;
  const code = parts[2] || "";
  return { srcRaw, dstRaw, code }; // ignore conditional flags for now
}

const tests = [];
for (const line of lines) {
  const r = compile(line);
  if (!r) continue;

  let src = r.srcRaw;
  if (src.includes("/*") || src.includes(":splat")) {
    const tail = expandSplat(src);
    src = src.replace("/*", `/${tail}`).replace(":splat", tail.replace(/\/$/, ""));
  }
  src = src.replace(/:([a-z]+)/g, (_, name) => sampleFor(":"+name));

  let dst = r.dstRaw;
  dst = dst.replace(":splat", expandSplat(r.srcRaw).replace(/\/$/, ""))
           .replace(/:service/g, "bond-cleaning")
           .replace(/:cluster/g, "brisbane")
           .replace(/:suburb/g,  "springfield");

  tests.push({ from: src, to: dst, rule: line });
}

function norm(u) {
  try { u = new URL(u, BASE).pathname; } catch {}
  if (!/\.[a-z0-9]+$/i.test(u) && !/[?#]$/.test(u) && !u.endsWith("/")) u += "/";
  return u;
}

let failures = 0;
let log = `# validate-redirects — ${new Date().toISOString()}\nBase: ${BASE}\n\n`;
for (const t of tests) {
  try {
    const res = await fetch(`${BASE}${t.from}`, { method: "HEAD", redirect: "manual" });
    const code = String(res.status);
    const loc  = res.headers.get("location") || "";
    const ok = code.startsWith("30") && norm(loc) === norm(t.to);
    log += `${t.from} -> [${code}] ${loc}  ${ok ? "✅" : `❌ via ${t.rule}`}\n`;
    if (!ok) failures++;
  } catch (e) {
    log += `${t.from} -> error: ${e.message}\n`;
    failures++;
  }
}
fs.mkdirSync("__ai", { recursive: true });
fs.writeFileSync("__ai/redirects-validate.txt", log);
console.log(`Wrote __ai/redirects-validate.txt (${failures} failure(s))`);
if (failures) process.exit(1);
