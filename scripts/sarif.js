// Lightweight SARIF helper
import { promises as fs } from 'node:fs';
import path from 'node:path';

export function createSarif({ toolName = 'AI Reviewer', rules = [], results = [] } = {}) {
  const uniqueRulesMap = new Map();
  for (const r of rules) uniqueRulesMap.set(r.id, r);
  for (const res of results) if (res.ruleId && !uniqueRulesMap.has(res.ruleId)) {
    uniqueRulesMap.set(res.ruleId, rule({ id: res.ruleId, name: res.ruleId }));
  }
  const uniqueRules = Array.from(uniqueRulesMap.values());
  return {
    $schema: 'https://json.schemastore.org/sarif-2.1.0.json',
    version: '2.1.0',
    runs: [
      {
        tool: {
          driver: {
            name: toolName,
            rules: uniqueRules,
          },
        },
        results,
      },
    ],
  };
}

export function rule({ id, name, shortDescription = '', help = '' }) {
  return {
    id,
    name: name || id,
    shortDescription: { text: shortDescription || name || id },
    help: { text: help || shortDescription || name || id },
  };
}

export function result({ ruleId, message, level = 'note', file, startLine = 1, startColumn = 1, endLine, endColumn }) {
  const location = file
    ? [
        {
          physicalLocation: {
            artifactLocation: { uri: file.replace(/\\/g, '/') },
            region: {
              startLine,
              startColumn,
              ...(endLine ? { endLine } : {}),
              ...(endColumn ? { endColumn } : {}),
            },
          },
        },
      ]
    : [];
  return {
    ruleId,
    level,
    message: { text: message },
    locations: location,
  };
}

export async function writeSarif(filePath, sarif) {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(sarif, null, 2));
}

export default { createSarif, rule, result, writeSarif };
