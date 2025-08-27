// scripts/validate-suburb-pages.js
// Validates that all dynamic suburb pages use only suburbs from suburbs.json

import fs from 'fs';
import path from 'path';

const suburbsPath = path.resolve('src/data/suburbs.json');
const pagesDir = path.resolve('src/pages/bond-cleaning');

const suburbs = JSON.parse(fs.readFileSync(suburbsPath, 'utf8'));
const validSuburbNames = new Set(suburbs.map(s => s.name));

function getDynamicSuburbPages(dir) {
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);
}

const foundPages = getDynamicSuburbPages(pagesDir);
const invalid = foundPages.filter(suburb => !validSuburbNames.has(suburb));

if (invalid.length > 0) {
  console.error('Invalid suburb pages found:', invalid);
  process.exit(1);
} else {
  console.log('All dynamic suburb pages are valid.');
}
