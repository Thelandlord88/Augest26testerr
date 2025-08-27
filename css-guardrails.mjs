#!/usr/bin/env node

/**
 * CI Guardrail Script - Prevent CSS drift
 * 
 * Prevents problematic CSS patterns from creeping back into the codebase:
 * 1. Scans for forbidden custom color classes
 * 2. Validates that quote form styles stay scoped to [data-quote]
 * 3. Checks for residual sky-* utilities outside whitelisted files
 */

import { readFileSync } from 'node:fs';
import { globby } from 'globby';

// Forbidden patterns that should not exist in templates
const FORBIDDEN_PATTERNS = [
  'fresh-sky',
  'deep-navy', 
  'gray-warm-',
  'light-gray'
];

// Quote-specific classes that should only exist in scoped contexts
const QUOTE_CLASSES = [
  'q-shell',
  'q-spot', 
  'q-stepper-item',
  'q-step-num',
  'q-input',
  'q-btn',
  'q-chip',
  'q-label',
  'q-group',
  'q-opt'
];

// Files allowed to use sky-* utilities (whitelist)
const SKY_WHITELIST = [
  'src/styles/input.css',
  'src/components/ui/',
  'src/components/sections/HeroSection.astro'
];

async function runGuardChecks() {
  console.log('🛡️  Running CSS guardrail checks...\n');
  
  let hasViolations = false;
  
  // Check 1: Forbidden color classes
  const forbiddenViolations = await checkForbiddenClasses();
  if (forbiddenViolations.length > 0) {
    console.log('❌ FORBIDDEN CLASSES DETECTED:');
    forbiddenViolations.forEach(v => {
      console.log(`   ${v.file}: ${v.pattern}`);
    });
    hasViolations = true;
  } else {
    console.log('✅ No forbidden classes found');
  }
  
  // Check 2: Quote class scoping
  const scopingViolations = await checkQuoteClassScoping();
  if (scopingViolations.length > 0) {
    console.log('\n❌ UNSCOPED QUOTE CLASSES DETECTED:');
    scopingViolations.forEach(v => {
      console.log(`   ${v.file}: ${v.class} (should be scoped to [data-quote])`);
    });
    hasViolations = true;
  } else {
    console.log('✅ Quote classes properly scoped');
  }
  
  // Check 3: Sky utility usage
  const skyViolations = await checkSkyUtilityUsage();
  if (skyViolations.length > 0) {
    console.log('\n❌ UNWHITELISTED SKY-* UTILITIES:');
    skyViolations.forEach(v => {
      console.log(`   ${v.file}: ${v.classes.join(', ')}`);
    });
    hasViolations = true;
  } else {
    console.log('✅ Sky utilities within whitelist');
  }
  
  if (hasViolations) {
    console.log('\n💥 CSS GUARDRAIL FAILED');
    console.log('   Run `node scripts/css-cleanup.mjs` to fix forbidden classes');
    console.log('   Ensure quote classes are scoped to [data-quote] elements');
    console.log('   Move sky-* utilities to whitelisted files or use semantic classes');
    process.exit(1);
  } else {
    console.log('\n🎉 All CSS guardrail checks passed!');
  }
}

async function checkForbiddenClasses() {
  const files = await globby([
    'src/**/*.{astro,html,js,ts,tsx,jsx}',
    '!src/**/*.d.ts',
    '!node_modules/**',
    '!**/*.bak'
  ]);

  const violations = [];

  for (const file of files) {
    const content = readFileSync(file, 'utf8');
    
    for (const pattern of FORBIDDEN_PATTERNS) {
      const regex = new RegExp(`class="[^"]*${pattern}[^"]*"`, 'g');
      const matches = [...content.matchAll(regex)];
      
      if (matches.length > 0) {
        violations.push({ file, pattern });
      }
    }
  }

  return violations;
}

async function checkQuoteClassScoping() {
  const files = await globby([
    'src/**/*.{astro,html,js,ts,tsx,jsx}',
    '!src/styles/**',
    '!src/**/*.d.ts',
    '!node_modules/**',
    '!**/*.bak'
  ]);

  const violations = [];

  for (const file of files) {
    const content = readFileSync(file, 'utf8');
    
    for (const qClass of QUOTE_CLASSES) {
      // Look for quote classes used without [data-quote] context
      const unscopedRegex = new RegExp(`class="[^"]*\\b${qClass}\\b[^"]*"`, 'g');
      const scopedRegex = /\[data-quote\]|\sdata-quote\s*=/;
      
      const matches = [...content.matchAll(unscopedRegex)];
      const hasScope = scopedRegex.test(content);
      
      if (matches.length > 0 && !hasScope) {
        violations.push({ file, class: qClass });
      }
    }
  }

  return violations;
}

async function checkSkyUtilityUsage() {
  const files = await globby([
    'src/**/*.{astro,html,js,ts,tsx,jsx}',
    '!src/**/*.d.ts',
    '!node_modules/**',
    '!**/*.bak'
  ]);

  const violations = [];

  for (const file of files) {
    // Skip whitelisted files
    const isWhitelisted = SKY_WHITELIST.some(pattern => 
      file.includes(pattern) || file.startsWith(pattern)
    );
    
    if (isWhitelisted) continue;
    
    const content = readFileSync(file, 'utf8');
    
    // Look for sky-* utilities
    const skyRegex = /class="[^"]*\b((?:text-|bg-|border-|ring-|from-|to-|hover:|focus:)*sky-\d+(?:\/\d+)?)\b[^"]*"/g;
    const matches = [...content.matchAll(skyRegex)];
    
    if (matches.length > 0) {
      const classes = matches.map(m => m[1]);
      violations.push({ file, classes });
    }
  }

  return violations;
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  await runGuardChecks();
}

export { runGuardChecks };
