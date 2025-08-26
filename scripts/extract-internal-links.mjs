// scripts/extract-internal-links.mjs
import fs from "node:fs";
import path from "node:path";

function* walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) yield* walk(p);
    else if (e.name.endsWith(".html")) yield p;
  }
}

function stripHashQuery(href) {
  return href.split("#")[0].split("?")[0];
}
function needsSlash(p) {
  if (!p) return false;
  if (p.endsWith("/")) return false;
  if (/\.[a-z0-9]+$/i.test(p)) return false;
  return true;
}
function normalizePath(href) {
  let p = stripHashQuery(href);
  try { p = decodeURI(p); } catch {}
  if (needsSlash(p)) p += "/";
  try { return encodeURI(p); } catch { return p; }
}

// compile _redirects source patterns → regexes
function compileSourceToRegex(src) {
  let rx = src.replace(/[-\/\\^$+?.()|[\]{}]/g, "\\$&");
  rx = rx.replace(/\\:splat/g, "(.+?)");
  rx = rx.replace(/\\:([a-z]+)/gi, "([^/]+)");
  rx = rx.replace(/\\\*/g, ".*");
  return new RegExp(`^${rx}$`, "i");
}

const redirectsText = fs.existsSync("public/_redirects")
  ? fs.readFileSync("public/_redirects", "utf8")
  : "";
const redirectSources = redirectsText
  .split("\n")
  .map(l => l.trim())
  .filter(l => l && !l.startsWith("#"))
  .map(l => l.split(/\s+/)[0]);

const sourceRegexes = redirectSources.map(compileSourceToRegex);
const isRedirectTarget = (href) => sourceRegexes.some(rx => rx.test(normalizePath(href)));

const rows = [];
for (const page of walk("dist")) {
  const html = fs.readFileSync(page, "utf8");
  const hrefs = [...html.matchAll(/<a\s+[^>]*href=["']([^"']+)["']/gi)].map(m => m[1]);
  for (const href of hrefs) {
    if (!href || href.startsWith("http") || href.startsWith("mailto:") || href.startsWith("tel:")) continue;
    if (!href.startsWith("/")) continue;
    rows.push({
      from: path.relative("dist", page).split(path.sep).join("/"),
      href,
      normalized: normalizePath(href),
      is_redirect_target: isRedirectTarget(href),
    });
  }
}

fs.mkdirSync("__ai", { recursive: true });
fs.writeFileSync("__ai/internal-links.json", JSON.stringify(rows, null, 2));
console.log(`Extracted ${rows.length} internal links → __ai/internal-links.json`);
