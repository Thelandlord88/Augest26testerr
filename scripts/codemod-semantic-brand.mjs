#!/usr/bin/env node
/**
 * Codemod: Replace tailwind sky-* brand usages with semantic brand utilities.
 * Safe idempotent transforms.
 */
import fs from 'node:fs';
import path from 'node:path';

const exts = new Set(['.astro','.tsx','.jsx','.ts','.js','.mdx','.html']);
const root = path.resolve('src');
const changed = [];

/** Read all target files */
function walk(dir){
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    const full = path.join(dir, entry.name);
    if(entry.isDirectory()) walk(full); else if(exts.has(path.extname(entry.name))) processFile(full);
  }
}

function replaceClassAttr(content){
  // Button cluster detection regex executed later per attribute.
  return content.replace(/class\s*=\s*"([^"]*)"/g,(m,cls)=>{
    let original = cls;
    // 1. link-brand replacements (text + optional hover variant cluster)
    cls = cls.replace(/text-sky-(?:500|600|700)(?:\s+hover:text-sky-(?:600|700|800))?/g,'link-brand');
    // 2. ring focus color
    cls = cls.replace(/(?:focus-visible:)?ring-sky-\d{2,3}(?:\/\d+)?/g,'ring-brand');
    // 3. icon/text brand (remaining text-sky-* 4/5/6/7)
    cls = cls.replace(/(?<!link-brand\s)text-sky-(?:400|500|600|700)/g,'text-brand-icon');
    // 4. soft background
    cls = cls.replace(/bg-sky-50/g,'bg-brand-soft');
    // 5. badge soft heuristic: if contains both bg-brand-soft and text-sky-800 (pre change) we mark after; remove lingering text-sky-800
    if(/bg-brand-soft/.test(cls) && /text-sky-800/.test(cls)){
      cls = cls.replace(/text-sky-800/g,'').trim();
      if(!/badge-brand-soft/.test(cls)) cls += ' badge-brand-soft';
    }
    // 6. borders & rings
    cls = cls.replace(/(border|ring)-sky-\d{2,3}(?:\/\d+)?/g,(_,p1)=>`${p1}-brand`);
    // 7. buttons: if contains bg-sky-(600|700|800) & hover:bg-sky-(700|800|900) & text-white then replace cluster
    const buttonPatternBg = /bg-sky-(600|700|800)/g;
    const buttonPatternHover = /hover:bg-sky-(700|800|900)/g;
    if(buttonPatternBg.test(cls) && buttonPatternHover.test(cls)){
      cls = cls.replace(buttonPatternBg,'').replace(buttonPatternHover,'').replace(/text-white/g,'').trim();
      if(!/btn-brand/.test(cls)) cls += ' btn-brand';
    }
    // 8. Strip any duplicate whitespace
    cls = cls.replace(/\s{2,}/g,' ').trim();
    if(cls !== original) return `class="${cls}"`;
    return m;
  });
}

function processFile(file){
  let content = fs.readFileSync(file,'utf8');
  const updated = replaceClassAttr(content);
  if(updated !== content){
    fs.copyFileSync(file, file + '.bak');
    fs.writeFileSync(file, updated, 'utf8');
    changed.push(file);
  }
}

if(fs.existsSync(root)) walk(root);

// Residual sky-* scan
const residual = [];
for(const f of changed){
  const c = fs.readFileSync(f,'utf8');
  if(/(bg|text|ring|border)-sky-/.test(c)) residual.push(f);
}

console.log(`Codemod complete. Files changed: ${changed.length}`);
if(residual.length){
  console.log('Residual sky-* classes (inspect manually, possibly gradients or intentional):');
  residual.forEach(f=>console.log('  ',f));
}
