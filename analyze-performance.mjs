#!/usr/bin/env node

/**
 * Performance & Bundle Analysis Tool
 * 
 * Analyzes:
 * - CSS bundle sizes and unused styles
 * - Image optimization opportunities
 * - Core Web Vitals performance indicators
 * - Build output efficiency
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { globby } from 'globby';

const DIST_DIR = '/workspaces/Augest25/dist';
const SRC_DIR = '/workspaces/Augest25/src';

async function analyzePerformance() {
  console.log('🚀 Performance & Bundle Analysis\n');
  
  const analysis = {
    css: await analyzeCSSBundles(),
    images: await analyzeImages(),
    html: await analyzeHTMLPages(),
    structure: await analyzeBuildStructure()
  };
  
  generateReport(analysis);
  
  return analysis;
}

async function analyzeCSSBundles() {
  console.log('📦 Analyzing CSS Bundles...');
  
  const cssFiles = await globby(['dist/**/*.css']);
  const cssAnalysis = [];
  
  for (const file of cssFiles) {
    const content = readFileSync(file, 'utf8');
    const stats = statSync(file);
    
    const analysis = {
      file: file.replace('/workspaces/Augest25/', ''),
      size: stats.size,
      sizeKB: Math.round(stats.size / 1024 * 100) / 100,
      lines: content.split('\n').length,
      selectors: countCSSSelectors(content),
      mediaQueries: countMediaQueries(content),
      customProperties: countCustomProperties(content),
      tailwindUtilities: countTailwindUtilities(content),
      unusedEstimate: estimateUnusedCSS(content)
    };
    
    cssAnalysis.push(analysis);
  }
  
  return cssAnalysis;
}

async function analyzeImages() {
  console.log('🖼️  Analyzing Images...');
  
  const imageFiles = await globby(['dist/**/*.{jpg,jpeg,png,gif,webp,svg,avif}']);
  const imageAnalysis = [];
  
  for (const file of imageFiles) {
    const stats = statSync(file);
    const ext = extname(file).toLowerCase();
    
    const analysis = {
      file: file.replace('/workspaces/Augest25/', ''),
      size: stats.size,
      sizeKB: Math.round(stats.size / 1024 * 100) / 100,
      format: ext.replace('.', ''),
      optimizationPotential: assessImageOptimization(stats.size, ext)
    };
    
    imageAnalysis.push(analysis);
  }
  
  return imageAnalysis.sort((a, b) => b.size - a.size);
}

async function analyzeHTMLPages() {
  console.log('📄 Analyzing HTML Pages...');
  
  const htmlFiles = await globby(['dist/**/*.html']);
  const htmlAnalysis = [];
  
  for (const file of htmlFiles) {
    const content = readFileSync(file, 'utf8');
    const stats = statSync(file);
    
    const analysis = {
      file: file.replace('/workspaces/Augest25/', ''),
      size: stats.size,
      sizeKB: Math.round(stats.size / 1024 * 100) / 100,
      coreWebVitals: analyzeCoreWebVitals(content),
      accessibility: analyzeAccessibility(content),
      seo: analyzeSEO(content)
    };
    
    htmlAnalysis.push(analysis);
  }
  
  return htmlAnalysis;
}

async function analyzeBuildStructure() {
  console.log('🏗️  Analyzing Build Structure...');
  
  const distStats = getDirStats(DIST_DIR);
  const srcStats = getDirStats(SRC_DIR);
  
  return {
    dist: distStats,
    src: srcStats,
    compressionRatio: Math.round((distStats.totalSize / srcStats.totalSize) * 100) / 100
  };
}

// Helper functions
function countCSSSelectors(css) {
  return (css.match(/[^{}]+\{/g) || []).length;
}

function countMediaQueries(css) {
  return (css.match(/@media[^{]+\{/g) || []).length;
}

function countCustomProperties(css) {
  return (css.match(/--[\w-]+:/g) || []).length;
}

function countTailwindUtilities(css) {
  // Rough estimate - look for utility-style class patterns
  const utilityPattern = /\.[a-z][\w-]*-[\w-]+[,\s{]/g;
  return (css.match(utilityPattern) || []).length;
}

function estimateUnusedCSS(css) {
  // Simple heuristic - this would need more sophisticated analysis in practice
  const totalSelectors = countCSSSelectors(css);
  const complexSelectors = (css.match(/[^{}]+[>+~][^{}]*\{/g) || []).length;
  
  // Estimate: complex selectors are more likely to be unused
  const unusedEstimate = Math.min(complexSelectors / totalSelectors * 100, 30);
  return Math.round(unusedEstimate * 100) / 100;
}

function assessImageOptimization(size, ext) {
  const sizeKB = size / 1024;
  
  if (ext === '.png' && sizeKB > 100) return 'Convert to WebP/AVIF';
  if (ext === '.jpg' && sizeKB > 200) return 'Optimize compression';
  if (ext === '.gif' && sizeKB > 50) return 'Convert to MP4/WebM';
  if (ext === '.svg' && sizeKB > 10) return 'Minify SVG';
  
  return 'Optimized';
}

function analyzeCoreWebVitals(html) {
  const analysis = {
    lazyLoading: html.includes('loading="lazy"'),
    preload: html.includes('<link rel="preload"'),
    prefetch: html.includes('<link rel="prefetch"'),
    criticalCSS: html.includes('<style>'),
    imageOptimization: html.includes('srcset=') || html.includes('<picture>'),
    fontOptimization: html.includes('font-display:') || html.includes('preload.*font')
  };
  
  const score = Object.values(analysis).filter(Boolean).length;
  return { ...analysis, score: `${score}/6` };
}

function analyzeAccessibility(html) {
  const analysis = {
    altTags: (html.match(/<img[^>]+alt=/g) || []).length > 0,
    headingStructure: html.includes('<h1>') && html.includes('<h2>'),
    skipLinks: html.includes('skip'),
    ariaLabels: html.includes('aria-label'),
    focusManagement: html.includes('tabindex') || html.includes('focus'),
    semanticHTML: html.includes('<main>') && html.includes('<nav>')
  };
  
  const score = Object.values(analysis).filter(Boolean).length;
  return { ...analysis, score: `${score}/6` };
}

function analyzeSEO(html) {
  const analysis = {
    title: html.includes('<title>'),
    metaDescription: html.includes('name="description"'),
    ogTags: html.includes('property="og:'),
    canonicalURL: html.includes('rel="canonical"'),
    structuredData: html.includes('application/ld+json'),
    robotsMeta: html.includes('name="robots"')
  };
  
  const score = Object.values(analysis).filter(Boolean).length;
  return { ...analysis, score: `${score}/6` };
}

function getDirStats(dirPath) {
  let totalSize = 0;
  let fileCount = 0;
  
  function traverse(currentPath) {
    const items = readdirSync(currentPath);
    
    for (const item of items) {
      const fullPath = join(currentPath, item);
      const stats = statSync(fullPath);
      
      if (stats.isDirectory()) {
        traverse(fullPath);
      } else {
        totalSize += stats.size;
        fileCount++;
      }
    }
  }
  
  try {
    traverse(dirPath);
  } catch (error) {
    console.warn(`Could not analyze ${dirPath}:`, error.message);
  }
  
  return {
    totalSize,
    totalSizeKB: Math.round(totalSize / 1024 * 100) / 100,
    totalSizeMB: Math.round(totalSize / 1024 / 1024 * 100) / 100,
    fileCount
  };
}

function generateReport(analysis) {
  console.log('\n📊 PERFORMANCE ANALYSIS REPORT\n');
  
  // CSS Bundle Analysis
  console.log('🎨 CSS BUNDLE ANALYSIS:');
  const totalCSSSize = analysis.css.reduce((sum, file) => sum + file.size, 0);
  console.log(`Total CSS Size: ${Math.round(totalCSSSize / 1024 * 100) / 100} KB`);
  
  analysis.css.forEach(file => {
    console.log(`  📄 ${file.file}`);
    console.log(`     Size: ${file.sizeKB} KB | Selectors: ${file.selectors} | Est. Unused: ${file.unusedEstimate}%`);
  });
  
  // Image Analysis
  console.log('\n🖼️  IMAGE ANALYSIS:');
  const totalImageSize = analysis.images.reduce((sum, img) => sum + img.size, 0);
  console.log(`Total Image Size: ${Math.round(totalImageSize / 1024 * 100) / 100} KB`);
  console.log(`Largest images:`);
  
  analysis.images.slice(0, 5).forEach(img => {
    console.log(`  🖼️  ${img.file} - ${img.sizeKB} KB (${img.format}) - ${img.optimizationPotential}`);
  });
  
  // Build Structure
  console.log('\n🏗️  BUILD ANALYSIS:');
  console.log(`Source: ${analysis.structure.src.totalSizeMB} MB (${analysis.structure.src.fileCount} files)`);
  console.log(`Dist: ${analysis.structure.dist.totalSizeMB} MB (${analysis.structure.dist.fileCount} files)`);
  console.log(`Compression Ratio: ${analysis.structure.compressionRatio}x`);
  
  // Performance Opportunities
  console.log('\n🚀 OPTIMIZATION OPPORTUNITIES:');
  
  // CSS Optimization
  const largestCSS = analysis.css.reduce((max, file) => file.size > max.size ? file : max, analysis.css[0]);
  if (largestCSS && largestCSS.sizeKB > 50) {
    console.log(`  ⚠️  Large CSS bundle: ${largestCSS.file} (${largestCSS.sizeKB} KB)`);
  }
  
  // Image Optimization
  const unoptimizedImages = analysis.images.filter(img => img.optimizationPotential !== 'Optimized');
  if (unoptimizedImages.length > 0) {
    console.log(`  ⚠️  ${unoptimizedImages.length} images could be optimized`);
  }
  
  // Core Web Vitals Sample
  if (analysis.html.length > 0) {
    const samplePage = analysis.html[0];
    console.log(`  📊 Sample page CWV score: ${samplePage.coreWebVitals.score}`);
    console.log(`  ♿ Sample page A11y score: ${samplePage.accessibility.score}`);
    console.log(`  🔍 Sample page SEO score: ${samplePage.seo.score}`);
  }
  
  // Recommendations
  console.log('\n💡 RECOMMENDATIONS:');
  if (totalCSSSize > 100 * 1024) {
    console.log('  🎨 Consider CSS purging to remove unused styles');
  }
  if (totalImageSize > 500 * 1024) {
    console.log('  🖼️  Implement image optimization (WebP/AVIF conversion)');
  }
  if (analysis.structure.dist.fileCount > 50) {
    console.log('  📦 Consider implementing build-time optimizations');
  }
  
  console.log('\n✅ Analysis complete! Check the detailed breakdown above.\n');
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  await analyzePerformance();
}

export { analyzePerformance };
