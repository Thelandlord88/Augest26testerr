#!/usr/bin/env node
// scripts/generate-faqs.mjs
// Generate a lightweight FAQ JSON from data dumps and content folders.
import fs from 'node:fs';
import path from 'node:path';

const OUT_DIR = path.join(process.cwd(), 'src', 'content');
const OUT_FILE = path.join(OUT_DIR, 'generated-faqs.json');

function gatherFromDataDumps() {
  const candidates = [];
  const dd = path.join(process.cwd(), 'Data dump');
  const dd2 = path.join(process.cwd(), 'datadump2');
  [dd, dd2].forEach(dir => {
    try {
      for (const f of fs.readdirSync(dir)) {
        const p = path.join(dir, f);
        if (!fs.statSync(p).isFile()) continue;
        const name = f.toLowerCase();
        if (name.includes('faq') || name.includes('faqs') || name.includes('question')) {
          try { candidates.push(fs.readFileSync(p, 'utf8')); } catch {}
        }
        // Pull short Q/A like lines from readme-like files
        if (name.endsWith('.txt') || name.endsWith('.md')) {
          try { candidates.push(fs.readFileSync(p, 'utf8')); } catch {}
        }
      }
    } catch (e) {
      // skip
    }
  });
  return candidates.join('\n\n');
}

function extractQAs(text) {
  const out = [];
  // simple heuristics: lines that start with Q: or Question: or - Q or * Q
  const lines = text.split(/\r?\n/).map(l => l.trim());
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    const qMatch = l.match(/^(?:Q:|Question:|Q\.|\- Q:|\* Q:|Q\))\s*(.+)/i);
    if (qMatch) {
      const question = qMatch[1].trim();
      // next non-empty lines up to 3 lines are answer
      const answers = [];
      for (let j = i+1; j < Math.min(lines.length, i+6); j++) {
        if (!lines[j]) break;
        answers.push(lines[j]);
      }
      if (answers.length) {
        out.push({ question, answer: answers.join(' ') });
      }
    }
  }

  // fallback: extract simple "What is X?" patterns
  const qaRe = /([A-Z][^?\.]{2,}?\?)\s*(?:\n|\r|\s){0,2}([A-Z][^.\n]{20,200}\.)/gms;
  let m;
  while ((m = qaRe.exec(text))) {
    const q = m[1].replace(/\n/g,' ').trim();
    const a = m[2].replace(/\n/g,' ').trim();
    if (q && a) out.push({ question: q, answer: a });
    if (out.length > 25) break;
  }
  return out;
}

function run() {
  const raw = gatherFromDataDumps();
  const qas = extractQAs(raw);
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(qas.slice(0,30), null, 2), 'utf8');
  console.log(`Wrote ${OUT_FILE} with ${qas.length} Q/A pairs (trimmed to 30).`);
}

run();
