#!/usr/bin/env node

/**
 * CSS Usage Deep Analysis
 * 
 * Scans all HTML files to identify actually used CSS classes
 * and reports unused styles for optimization opportunities
 */

import { readFileSync } from 'node:fs';
import { globby } from 'globby';

async function analyzeUnusedCSS() {
  console.log('🔍 Deep CSS Usage Analysis\n');
  
  // Get all CSS and HTML files
  const [cssFiles, htmlFiles] = await Promise.all([
    globby(['dist/**/*.css']),
    globby(['dist/**/*.html'])
  ]);
  
  console.log(`📊 Found ${cssFiles.length} CSS files and ${htmlFiles.length} HTML files\n`);
  
  // Extract all CSS classes from CSS files
  const cssClasses = extractCSSClasses(cssFiles);
  console.log(`🎨 Found ${cssClasses.size} unique CSS classes defined\n`);
  
  // Extract all used classes from HTML files  
  const usedClasses = extractUsedClasses(htmlFiles);
  console.log(`📄 Found ${usedClasses.size} unique classes used in HTML\n`);
  
  // Find unused classes
  const unusedClasses = findUnusedClasses(cssClasses, usedClasses);
  const usageStats = calculateUsageStats(cssClasses, usedClasses, unusedClasses);
  
  generateUsageReport(usageStats, cssFiles);
  
  return usageStats;
}

function extractCSSClasses(cssFiles) {
  const classes = new Set();
  
  for (const file of cssFiles) {
    const content = readFileSync(file, 'utf8');
    
    // Match CSS class selectors (simplified - doesn't handle all edge cases)
    const classMatches = content.match(/\.-?[_a-zA-Z]+[_a-zA-Z0-9-]*(?=[\s,{.:#\[])/g);
    
    if (classMatches) {
      classMatches.forEach(cls => {
        // Remove the leading dot and clean up
        const cleanClass = cls.replace(/^\./, '').replace(/[^a-zA-Z0-9-_]/g, '');
        if (cleanClass && cleanClass.length > 1) {
          classes.add(cleanClass);
        }
      });
    }
  }
  
  return classes;
}

function extractUsedClasses(htmlFiles) {
  const classes = new Set();
  
  for (const file of htmlFiles) {
    const content = readFileSync(file, 'utf8');
    
    // Extract class attributes
    const classAttrs = content.match(/class="([^"]*)"/g);
    
    if (classAttrs) {
      classAttrs.forEach(attr => {
        const classValue = attr.match(/class="([^"]*)"/)[1];
        const classList = classValue.split(/\s+/).filter(cls => cls.length > 0);
        
        classList.forEach(cls => {
          // Clean up class names (remove Tailwind modifiers for matching)
          const baseClass = cls.replace(/^(hover|focus|active|group-hover|sm|md|lg|xl|2xl|dark):/, '');
          if (baseClass) {
            classes.add(baseClass);
          }
        });
      });
    }
  }
  
  return classes;
}

function findUnusedClasses(cssClasses, usedClasses) {
  const unused = new Set();
  
  for (const cssClass of cssClasses) {
    if (!usedClasses.has(cssClass)) {
      // Check for partial matches (for responsive/state variants)
      const hasVariant = Array.from(usedClasses).some(usedClass => 
        usedClass.includes(cssClass) || cssClass.includes(usedClass)
      );
      
      if (!hasVariant) {
        unused.add(cssClass);
      }
    }
  }
  
  return unused;
}

function calculateUsageStats(cssClasses, usedClasses, unusedClasses) {
  const totalDefined = cssClasses.size;
  const totalUsed = usedClasses.size;
  const totalUnused = unusedClasses.size;
  
  const usageRate = Math.round((totalUsed / totalDefined) * 100);
  const wasteRate = Math.round((totalUnused / totalDefined) * 100);
  
  return {
    totalDefined,
    totalUsed,
    totalUnused,
    usageRate,
    wasteRate,
    cssClasses: Array.from(cssClasses),
    usedClasses: Array.from(usedClasses),
    unusedClasses: Array.from(unusedClasses)
  };
}

function generateUsageReport(stats, cssFiles) {
  console.log('📈 CSS USAGE STATISTICS:\n');
  console.log(`Total CSS Classes Defined: ${stats.totalDefined}`);
  console.log(`Total Classes Used: ${stats.totalUsed}`);
  console.log(`Total Classes Unused: ${stats.totalUnused}`);
  console.log(`Usage Rate: ${stats.usageRate}%`);
  console.log(`Waste Rate: ${stats.wasteRate}%\n`);
  
  if (stats.wasteRate > 20) {
    console.log('⚠️  HIGH CSS WASTE DETECTED!\n');
  } else if (stats.wasteRate > 10) {
    console.log('⚠️  Moderate CSS waste detected\n');
  } else {
    console.log('✅ CSS usage is efficient\n');
  }
  
  // Show sample unused classes
  if (stats.unusedClasses.length > 0) {
    console.log('🗑️  SAMPLE UNUSED CLASSES:');
    stats.unusedClasses.slice(0, 20).forEach(cls => {
      console.log(`   .${cls}`);
    });
    
    if (stats.unusedClasses.length > 20) {
      console.log(`   ... and ${stats.unusedClasses.length - 20} more\n`);
    } else {
      console.log('');
    }
  }
  
  // CSS file breakdown
  console.log('📁 CSS FILE BREAKDOWN:');
  cssFiles.forEach(file => {
    const content = readFileSync(file, 'utf8');
    const size = Buffer.byteLength(content, 'utf8');
    const lines = content.split('\n').length;
    
    console.log(`  📄 ${file.replace('/workspaces/Augest25/', '')}`);
    console.log(`     Size: ${Math.round(size / 1024 * 100) / 100} KB | Lines: ${lines}`);
  });
  
  console.log('\n💡 OPTIMIZATION OPPORTUNITIES:');
  
  if (stats.wasteRate > 15) {
    console.log('  🎯 CSS Purging: Remove unused classes to reduce bundle size');
    console.log('  🔧 Consider implementing PurgeCSS or similar tool');
  }
  
  if (stats.totalDefined > 2000) {
    console.log('  📦 Large CSS: Consider splitting into critical/non-critical CSS');
  }
  
  console.log('  🚀 Critical CSS: Inline above-the-fold styles');
  console.log('  ⚡ Preload CSS: Use <link rel="preload"> for critical stylesheets');
  console.log('  🗜️  Compression: Enable Brotli/Gzip compression');
  
  console.log('\n✅ CSS analysis complete!\n');
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  await analyzeUnusedCSS();
}

export { analyzeUnusedCSS };
