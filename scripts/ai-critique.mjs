#!/usr/bin/env node
import 'dotenv/config';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createSarif, rule, result, writeSarif } from './sarif.js';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const OUT_PATH = process.env.AI_SARIF_OUT || 'sarif/ai-critique.sarif';

async function findPngs(root) {
  async function* walk(dir) {
    let entries = [];
    try { entries = await fs.readdir(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) yield* walk(full);
      else if (e.isFile() && full.toLowerCase().endsWith('.png')) yield full;
    }
  }
  const files = [];
  for await (const f of walk(root)) files.push(f);
  return files;
}

async function gatherScreenshots() {
  const candidates = ['test-results', 'playwright-report', 'tests/visual.spec.ts-snapshots'];
  const found = [];
  for (const c of candidates) {
    const p = path.resolve(c);
    try {
      const stat = await fs.stat(p);
      if (stat.isDirectory()) {
        const pngs = await findPngs(p);
        found.push(...pngs);
      }
    } catch {}
  }
  // Unique and limit
  const uniq = Array.from(new Set(found));
  const MAX = 12;
  return uniq.slice(0, MAX);
}

function toDataUrlBase64(buffer) {
  const b64 = buffer.toString('base64');
  return `data:image/png;base64,${b64}`;
}

async function run() {
  const screenshots = await gatherScreenshots();
  if (screenshots.length === 0) {
    console.log('[ai-critique] No screenshots found. Emitting guidance note.');
    const sar = createSarif({ toolName: 'AI Visual UX Reviewer', rules: [rule({ id: 'visual-qa', name: 'Visual UX review' })], results: [
      result({ ruleId: 'visual-qa', message: 'No screenshots detected. Run Playwright tests (visual.spec.ts) to generate snapshots for AI review.', level: 'note', file: 'tests/visual.spec.ts', startLine: 1, startColumn: 1 })
    ]});
    await writeSarif(OUT_PATH, sar);
    return;
  }

  if (!OPENAI_API_KEY) {
    console.log('[ai-critique] OPENAI_API_KEY not set. Emitting static checklist notes.');
    const rules = [rule({ id: 'visual-qa', name: 'Visual UX review' })];
    const results = screenshots.map(f => result({ ruleId: 'visual-qa', message: 'Manual check: verify contrast, spacing, and overlapping elements.', level: 'note', file: f, startLine: 1, startColumn: 1 }));
    const sar = createSarif({ toolName: 'AI Visual UX Reviewer', rules, results });
    await writeSarif(OUT_PATH, sar);
    return;
  }

  const { default: OpenAI } = await import('openai');
  const client = new OpenAI({ apiKey: OPENAI_API_KEY });

  const images = [];
  for (const f of screenshots) {
    const buf = await fs.readFile(f);
    images.push({ file: f, dataUrl: toDataUrlBase64(buf) });
  }

  const prompt = `You are a meticulous visual QA reviewer. Inspect screenshots for:
- Text visibility and contrast issues
- Overlapping or clipped elements
- Misaligned buttons/inputs, inconsistent spacing, broken grids
- Illegible or low-quality images
- Obvious layout regressions across viewports

Return ONLY JSON as an array of findings objects with keys: file (string), severity (one of note, warning, error), message (short actionable text). Keep it concise.`;

  const messages = [
    { role: 'system', content: 'You output strictly JSON.' },
    { role: 'user', content: [
      { type: 'text', text: prompt },
      ...images.map(img => ({ type: 'image_url', image_url: { url: img.dataUrl } })),
    ]},
  ];

  let aiJson = '[]';
  try {
    const resp = await client.chat.completions.create({ model: MODEL, messages });
    aiJson = resp.choices?.[0]?.message?.content?.trim() || '[]';
  } catch (e) {
    console.warn('[ai-critique] OpenAI request failed, emitting empty SARIF:', e?.message || e);
  }

  let findings = [];
  try { findings = JSON.parse(aiJson); } catch { findings = []; }
  if (!Array.isArray(findings)) findings = [];

  const rules = [
    rule({ id: 'visual-qa', name: 'Visual UX review' }),
  ];
  const results = [];
  // Fallback: if AI produced no findings, emit generic checklist notes per screenshot
  if (findings.length === 0) {
    for (const img of images.slice(0, 6)) {
      results.push(result({ ruleId: 'visual-qa', message: 'Checklist: check contrast, overlaps, alignment, and responsiveness on this screen.', level: 'note', file: img.file, startLine: 1, startColumn: 1 }));
    }
  }

  for (const f of findings) {
    if (!f || typeof f !== 'object') continue;
    const file = f.file || images[0]?.file;
    const severity = ['note', 'warning', 'error'].includes(f.severity) ? f.severity : 'note';
    const message = typeof f.message === 'string' ? f.message : 'Visual observation';
    results.push(result({ ruleId: 'visual-qa', message, level: severity, file, startLine: 1, startColumn: 1 }));
  }

  const sar = createSarif({ toolName: 'AI Visual UX Reviewer', rules, results });
  await writeSarif(OUT_PATH, sar);
  console.log(`[ai-critique] Wrote ${results.length} findings to ${OUT_PATH}`);
}

run().catch(err => {
  console.error('[ai-critique] Fatal error', err);
  process.exit(0); // soft-exit
});
