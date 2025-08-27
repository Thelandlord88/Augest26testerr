// scripts/redirect-canary.mjs
import fs from "node:fs";

const BASE = process.env.PREVIEW_URL || "http://localhost:4322";
const CHECKS = [
  ["/blog/ipswich-region/", "/blog/ipswich/"],
  ["/blog/brisbane-west/category/checklist/", "/blog/brisbane/category/checklist/"],
  ["/areas/brisbane%20west/forest-lake/", "/areas/brisbane/forest-lake/"],
  ["/bond-cleaners/springfield/", "/services/bond-cleaning/springfield/"],
  ["/services/bond-cleaning/brisbane/springfield/", "/services/bond-cleaning/springfield/"],
];

function norm(u) {
  try { u = new URL(u, BASE).pathname; } catch {}
  if (!/\.[a-z0-9]+$/i.test(u) && !/[?#]$/.test(u) && !u.endsWith("/")) u += "/";
  return u;
}

let out = `# Redirect canary — ${new Date().toISOString()}\nBase: ${BASE}\n`;
for (const [from, expected] of CHECKS) {
  try {
    const res = await fetch(`${BASE}${from}`, { method: "HEAD", redirect: "manual" });
    const code = String(res.status);
    const loc = res.headers.get("location") || "";
    const ok = code.startsWith("30") && norm(loc) === norm(expected);
    out += `${from} -> [${code}] ${loc} ${ok ? "✅" : `❌ (expected ${expected})`}\n`;
  } catch (e) {
    out += `${from} -> error: ${e.message}\n`;
  }
}
fs.mkdirSync("__ai", { recursive: true });
fs.appendFileSync("__ai/redirects-check.txt", out + "\n");
console.log("✅ Wrote __ai/redirects-check.txt");
