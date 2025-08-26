import fs from 'fs';
import path from 'path';
import getSuburbFaq from '../src/data/getSuburbFaq.js';

const suburbsPath = path.resolve('src/data/suburbs.json');
const suburbs = JSON.parse(fs.readFileSync(suburbsPath, 'utf-8'));

const out = {};
for (const sub of suburbs) {
  const slug = sub.slug || sub.name.toLowerCase().replace(/\s+/g, '-');
  out[slug] = getSuburbFaq(sub.name);
}

const outPath = path.resolve('src/data/faqs.compiled.json');
fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
console.log('✅ Built', outPath);
