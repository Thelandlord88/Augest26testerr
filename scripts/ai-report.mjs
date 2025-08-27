#!/usr/bin/env node
import { promises as fsp } from 'node:fs';
import fs from 'node:fs';

const paths = [
  'sarif/ai-critique.sarif',
  'sarif/ai-copy-lint.sarif',
  'sarif/ai-enrichment.sarif',
].filter(p => fs.existsSync(p));

let out = '### 🤖 AI Review Summary\n\n';
for (const p of paths) {
  const raw = await fsp.readFile(p, 'utf8');
  const sar = JSON.parse(raw);
  const name = sar?.runs?.[0]?.tool?.driver?.name || p;
  const results = sar?.runs?.[0]?.results || [];
  const top = results.slice(0, 10).map(r => `- ${r.level || 'note'} — [${r.ruleId}] ${r.message?.text || r.message}`);
  out += `**${name}**: ${results.length} finding(s)\n${top.join('\n')}\n\n`;
}

console.log(out);

// Optionally persist for a PR comment step
try {
  await fsp.writeFile('ai-comment.md', out);
} catch {}
