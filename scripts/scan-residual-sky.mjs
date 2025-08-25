#!/usr/bin/env node
import { readdirSync, readFileSync } from 'node:fs';
import { join, extname } from 'node:path';

const allow = [ /from-sky-\d{2,3}/, /to-sky-\d{2,3}/, /via-blue-500/ ];
const targetExts = new Set(['.astro','.tsx','.jsx','.ts','.js','.mdx','.html','.css']);

function walk(dir, acc=[]) {
  for(const ent of readdirSync(dir,{withFileTypes:true})){
    const p = join(dir, ent.name);
    if(ent.isDirectory()) {
      // Skip generated / archival mirrors
      if(p.startsWith('src' + join('/', '__ai')) || p.includes(`${join('src','__ai')}`)) continue;
      walk(p, acc);
    } else if(targetExts.has(extname(p))) acc.push(p);
  }
  return acc;
}

const hits = [];
for(const file of walk('src')){
  const txt = readFileSync(file,'utf8');
  const matches = txt.match(/\b(?:bg|text|ring|border)-sky-\d{2,3}\b/g);
  if(!matches) continue;
  const uniq = [...new Set(matches)];
  const bad = uniq.filter(t => !allow.some(rx => rx.test(t)));
  if(bad.length) hits.push({file, tokens: bad});
}

if(hits.length){
  console.error('Residual sky-* tokens found:');
  for(const h of hits){
    console.error(' -', h.file, '→', h.tokens.join(', '));
  }
  process.exit(1);
} else {
  console.log('✅ No residual non-allowed sky-* tokens.');
}
