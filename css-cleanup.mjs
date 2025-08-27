#!/usr/bin/env node

/**
 * CSS Cleanup Script - Replace undefined custom color classes
 * 
 * Replaces problematic custom classes with Tailwind utilities or semantic helpers:
 * - text-fresh-sky → text-sky-500 or text-brand-icon
 * - text-deep-navy → text-slate-900 
 * - bg-fresh-sky → bg-sky-500
 * - bg-deep-navy → bg-slate-900
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { globby } from 'globby';

const replacements = {
  // Colors that don't exist in Tailwind
  'text-fresh-sky': 'text-sky-500',
  'text-deep-navy': 'text-slate-900',
  'bg-fresh-sky': 'bg-sky-500', 
  'bg-deep-navy': 'bg-slate-900',
  'border-fresh-sky': 'border-sky-500',
  'border-deep-navy': 'border-slate-900',
  'from-fresh-sky': 'from-sky-500',
  'to-deep-navy': 'to-slate-900',
  
  // Legacy colors that should use semantic helpers
  'hover:text-fresh-sky': 'hover:text-sky-600',
  'text-gray-warm-700': 'text-slate-700',
  'text-gray-warm-800': 'text-slate-800',
  'border-gray-warm-200': 'border-slate-200',
  'bg-light-gray': 'bg-slate-50'
};

async function replaceInFiles() {
  console.log('🔧 Starting CSS cleanup...');
  
  const files = await globby([
    'src/**/*.{astro,html,js,ts,tsx,jsx}',
    '!src/**/*.d.ts',
    '!node_modules/**'
  ]);

  let totalReplacements = 0;
  let filesChanged = 0;

  for (const file of files) {
    let content = readFileSync(file, 'utf8');
    let fileChanged = false;
    let fileReplacements = 0;

    for (const [oldClass, newClass] of Object.entries(replacements)) {
      const regex = new RegExp(`\\b${oldClass}\\b`, 'g');
      const matches = content.match(regex);
      
      if (matches) {
        content = content.replace(regex, newClass);
        fileReplacements += matches.length;
        fileChanged = true;
      }
    }

    if (fileChanged) {
      writeFileSync(file, content, 'utf8');
      console.log(`✅ ${file}: ${fileReplacements} replacements`);
      filesChanged++;
      totalReplacements += fileReplacements;
    }
  }

  console.log(`\n🎉 Cleanup complete!`);
  console.log(`📊 ${filesChanged} files changed, ${totalReplacements} total replacements`);
  
  if (totalReplacements === 0) {
    console.log('✨ No undefined classes found - your CSS is clean!');
  }
}

// Forbidden class scanner
async function scanForForbidden() {
  console.log('\n🚨 Scanning for forbidden classes...');
  
  const forbidden = [
    'fresh-sky', 'deep-navy', 'gray-warm-', 'light-gray'
  ];
  
  const files = await globby([
    'src/**/*.{astro,html,js,ts,tsx,jsx}',
    '!src/**/*.d.ts',
    '!node_modules/**'
  ]);

  let violations = [];

  for (const file of files) {
    const content = readFileSync(file, 'utf8');
    
    for (const pattern of forbidden) {
      const regex = new RegExp(`class="[^"]*${pattern}[^"]*"`, 'g');
      const matches = [...content.matchAll(regex)];
      
      if (matches.length > 0) {
        violations.push({
          file,
          pattern,
          matches: matches.map(m => m[0])
        });
      }
    }
  }

  if (violations.length > 0) {
    console.log('❌ Found forbidden classes:');
    violations.forEach(v => {
      console.log(`   ${v.file}: ${v.pattern}`);
      v.matches.forEach(m => console.log(`     ${m}`));
    });
    process.exit(1);
  } else {
    console.log('✅ No forbidden classes found!');
  }
}

// Main execution
const command = process.argv[2];

if (command === 'scan') {
  await scanForForbidden();
} else {
  await replaceInFiles();
  await scanForForbidden();
}
