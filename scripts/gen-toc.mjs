// scripts/gen-toc.mjs
import fs from "node:fs";

const FILE = "README.md";
const md = fs.readFileSync(FILE, "utf8");

// GitHub-like slugger with de-dup
const seen = new Map();
function slugify(text) {
  let slug = text
    .toLowerCase()
    .replace(/[`*_~]/g, "")
    .replace(/[^\p{Letter}\p{Number}\s-]/gu, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
  const n = (seen.get(slug) || 0) + 1;
  seen.set(slug, n);
  return n > 1 ? `${slug}-${n}` : slug;
}

// Collect H2–H4 headings, skipping the TOC block and fenced code
const lines = md.split("\n");
const heads = [];
let inTOC = false;
let inCode = false;

for (const line of lines) {
  if (/^```/.test(line)) { inCode = !inCode; continue; }
  if (/<!--\s*toc:start\s*-->/i.test(line)) { inTOC = true; continue; }
  if (/<!--\s*toc:end\s*-->/i.test(line))   { inTOC = false; continue; }
  if (inTOC || inCode) continue;

  const m = /^(#{2,4})\s+(.+?)\s*$/.exec(line);
  if (m) heads.push({ level: m[1].length, text: m[2] });
}

if (!heads.length) {
  console.log("No headings found for TOC.");
  process.exit(0);
}

const base = Math.min(...heads.map(h => h.level));
const toc = heads.map(h => {
  const indent = "  ".repeat(h.level - base);
  const anchor = slugify(h.text);
  return `${indent}- [${h.text}](#${anchor})`;
}).join("\n");

const out = md.replace(
  /(<!--\s*toc:start\s*-->)[\s\S]*?(<!--\s*toc:end\s*-->)/i,
  `$1\n${toc}\n$2`
);

fs.writeFileSync(FILE, out);
console.log("TOC updated.");
