#!/usr/bin/env node

/**
 * Performance Guardian - Team Awareness & Image Optimization
 * 
 * Alerts team members about performance issues and provides
 * actionable guidance for Astro image optimization.
 * 
 * Run this during build or development to catch issues early.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname, basename } from 'node:path';
import { globby } from 'globby';
import { fileURLToPath } from 'node:url';

const PROJECT_ROOT = '/workspaces/Augest25';
const PERFORMANCE_BUDGETS = {
  totalImageSize: 1024 * 1024, // 1MB total images
  singleImageSize: 200 * 1024,  // 200KB per image
  cssSize: 150 * 1024,          // 150KB total CSS
  htmlSize: 50 * 1024,          // 50KB per HTML page
  lcpTarget: 2.5,               // LCP under 2.5s
  clsTarget: 0.1                // CLS under 0.1
};

async function runPerformanceGuardian() {
  console.log('🛡️  Performance Guardian - Protecting Your Core Web Vitals\n');
  
  const checks = {
    images: await checkImagePerformance(),
    astroUsage: await checkAstroImageUsage(),
    budgets: await checkPerformanceBudgets(),
    assets: await checkAssetOptimization(),
    development: await checkDevelopmentArtifacts()
  };
  
  const violations = generateReport(checks);
  
  if (violations.length > 0) {
    console.log('🚨 PERFORMANCE VIOLATIONS DETECTED!');
    console.log('📧 Please review and fix before merging.\n');
    
    if (process.env.CI === 'true') {
      process.exit(1); // Fail CI builds
    }
  } else {
    console.log('✅ All performance checks passed! Great work! 🎉\n');
  }
  
  return checks;
}

async function checkImagePerformance() {
  console.log('🖼️  Checking image performance...');
  
  const sourceImages = await globby(['src/assets/images/**/*.{jpg,jpeg,png,gif,webp,avif}']);
  const distImages = await globby(['dist/**/*.{jpg,jpeg,png,gif,webp,avif,svg}']);
  
  const issues = [];
  let totalSourceSize = 0;
  let totalDistSize = 0;
  
  // Check source images
  for (const imagePath of sourceImages) {
    const stats = statSync(imagePath);
    const sizeKB = Math.round(stats.size / 1024);
    totalSourceSize += stats.size;
    
    const fileName = basename(imagePath);
    const ext = extname(imagePath).toLowerCase();
    
    // Flag large images
    if (stats.size > PERFORMANCE_BUDGETS.singleImageSize) {
      issues.push({
        type: 'large-image',
        severity: stats.size > 1024 * 1024 ? 'critical' : 'warning',
        file: imagePath.replace(PROJECT_ROOT, ''),
        size: `${sizeKB}KB`,
        message: `Large image detected (${sizeKB}KB). Consider optimization.`,
        fix: getImageOptimizationFix(ext, stats.size)
      });
    }
    
    // Flag non-optimal formats
    if (ext === '.png' && stats.size > 100 * 1024) {
      issues.push({
        type: 'format-optimization',
        severity: 'warning',
        file: imagePath.replace(PROJECT_ROOT, ''),
        message: `PNG image could be converted to WebP/AVIF for better compression`,
        fix: `Convert to WebP/AVIF format using Astro's Image component`
      });
    }
    
    // Flag potential placeholder content
    if (fileName.includes('test') || fileName.includes('placeholder') || fileName.includes('nans')) {
      issues.push({
        type: 'placeholder-content',
        severity: 'critical',
        file: imagePath.replace(PROJECT_ROOT, ''),
        message: `Potential placeholder/test content in production`,
        fix: `Replace with actual production images`
      });
    }
  }
  
  // Check dist images  
  for (const imagePath of distImages) {
    const stats = statSync(imagePath);
    totalDistSize += stats.size;
  }
  
  // Check total image budget
  if (totalDistSize > PERFORMANCE_BUDGETS.totalImageSize) {
    issues.push({
      type: 'image-budget-exceeded',
      severity: 'warning',
      message: `Total image size (${Math.round(totalDistSize/1024)}KB) exceeds budget (${Math.round(PERFORMANCE_BUDGETS.totalImageSize/1024)}KB)`,
      fix: `Optimize images using Astro's built-in optimization`
    });
  }
  
  return {
    totalSourceSize,
    totalDistSize,
    compressionRatio: totalSourceSize > 0 ? totalDistSize / totalSourceSize : 1,
    issues,
    imageCount: sourceImages.length
  };
}

async function checkAstroImageUsage() {
  console.log('🚀 Checking Astro Image component usage...');
  
  const astroFiles = await globby(['src/**/*.astro']);
  const issues = [];
  let imageComponentUsage = 0;
  let plainImgUsage = 0;
  
  for (const file of astroFiles) {
    const content = readFileSync(file, 'utf8');
    
    // Check for Astro Image imports
    const hasImageImport = content.includes("import { Image }") || content.includes("import { Picture }");
    const hasImageComponent = content.includes('<Image ') || content.includes('<Picture ');
    const hasPlainImg = content.includes('<img ');
    
    if (hasImageComponent) imageComponentUsage++;
    if (hasPlainImg) plainImgUsage++;
    
    // Flag files using plain <img> instead of Astro Image
    if (hasPlainImg && !hasImageComponent) {
      const imgMatches = content.match(/<img[^>]*src="[^"]*\.(jpg|jpeg|png|webp|avif)[^"]*"/g);
      if (imgMatches) {
        issues.push({
          type: 'missing-astro-image',
          severity: 'warning',
          file: file.replace(PROJECT_ROOT, ''),
          message: `Using plain <img> instead of Astro Image component`,
          fix: `Replace <img> with <Image> from 'astro:assets' for automatic optimization`,
          examples: generateAstroImageExamples(imgMatches)
        });
      }
    }
    
    // Check for missing alt text
    const imgTags = content.match(/<img[^>]*>/g) || [];
    const imageComponents = content.match(/<Image[^>]*>/g) || [];
    
    [...imgTags, ...imageComponents].forEach(tag => {
      if (!tag.includes('alt=')) {
        issues.push({
          type: 'missing-alt-text',
          severity: 'warning',
          file: file.replace(PROJECT_ROOT, ''),
          message: `Image missing alt text (accessibility issue)`,
          fix: `Add alt="description" to all images`
        });
      }
    });
    
    // Check for missing dimensions (CLS prevention)
    [...imgTags, ...imageComponents].forEach(tag => {
      if (!tag.includes('width=') || !tag.includes('height=')) {
        issues.push({
          type: 'missing-dimensions',
          severity: 'warning',
          file: file.replace(PROJECT_ROOT, ''),
          message: `Image missing explicit dimensions (can cause layout shift)`,
          fix: `Add width and height attributes to prevent CLS`
        });
      }
    });
  }
  
  return {
    astroImageUsage: imageComponentUsage,
    plainImgUsage,
    optimizationRate: imageComponentUsage / (imageComponentUsage + plainImgUsage) * 100,
    issues
  };
}

async function checkPerformanceBudgets() {
  console.log('📊 Checking performance budgets...');
  
  const issues = [];
  
  // Check CSS budget
  const cssFiles = await globby(['dist/**/*.css']);
  let totalCSSSize = 0;
  
  for (const file of cssFiles) {
    const stats = statSync(file);
    totalCSSSize += stats.size;
  }
  
  if (totalCSSSize > PERFORMANCE_BUDGETS.cssSize) {
    issues.push({
      type: 'css-budget-exceeded',
      severity: 'warning',
      message: `CSS size (${Math.round(totalCSSSize/1024)}KB) exceeds budget (${Math.round(PERFORMANCE_BUDGETS.cssSize/1024)}KB)`,
      fix: `Consider CSS purging or splitting critical/non-critical CSS`
    });
  }
  
  // Check HTML budget
  const htmlFiles = await globby(['dist/**/*.html']);
  for (const file of htmlFiles) {
    const stats = statSync(file);
    if (stats.size > PERFORMANCE_BUDGETS.htmlSize) {
      issues.push({
        type: 'html-budget-exceeded',
        severity: 'info',
        file: file.replace(PROJECT_ROOT, ''),
        message: `HTML file (${Math.round(stats.size/1024)}KB) is quite large`,
        fix: `Consider content optimization or code splitting`
      });
    }
  }
  
  return {
    cssSize: totalCSSSize,
    htmlFiles: htmlFiles.length,
    issues
  };
}

async function checkAssetOptimization() {
  console.log('⚡ Checking asset optimization...');
  
  const issues = [];
  
  // Check for missing preload hints
  const htmlFiles = await globby(['dist/**/*.html']);
  for (const file of htmlFiles) {
    const content = readFileSync(file, 'utf8');
    
    if (!content.includes('<link rel="preload"')) {
      issues.push({
        type: 'missing-preload',
        severity: 'info',
        file: file.replace(PROJECT_ROOT, ''),
        message: `No preload hints found - consider preloading critical resources`,
        fix: `Add <link rel="preload"> for critical images, fonts, or CSS`
      });
    }
    
    if (!content.includes('loading="lazy"')) {
      issues.push({
        type: 'missing-lazy-loading',
        severity: 'info',
        file: file.replace(PROJECT_ROOT, ''),
        message: `No lazy loading detected - consider lazy loading images`,
        fix: `Add loading="lazy" to below-the-fold images`
      });
    }
  }
  
  return { issues };
}

async function checkDevelopmentArtifacts() {
  console.log('🔍 Checking for development artifacts...');
  
  const issues = [];
  const suspiciousPatterns = [
    { pattern: /test|placeholder|temp|nans|demo/i, type: 'suspicious-naming' },
    { pattern: /console\.log|debugger/i, type: 'debug-code' },
    { pattern: /TODO|FIXME|HACK/i, type: 'development-comments' }
  ];
  
  const sourceFiles = await globby(['src/**/*.{astro,js,ts,jsx,tsx}']);
  
  for (const file of sourceFiles) {
    const content = readFileSync(file, 'utf8');
    
    for (const { pattern, type } of suspiciousPatterns) {
      if (pattern.test(content)) {
        issues.push({
          type,
          severity: type === 'debug-code' ? 'warning' : 'info',
          file: file.replace(PROJECT_ROOT, ''),
          message: `Potential development artifact detected`,
          fix: `Review and clean up before production`
        });
      }
    }
  }
  
  return { issues };
}

function getImageOptimizationFix(ext, size) {
  const sizeKB = Math.round(size / 1024);
  
  if (ext === '.png' && size > 500 * 1024) {
    return `Convert to WebP/AVIF format. Expected savings: ${Math.round(sizeKB * 0.7)}KB`;
  }
  
  if (ext === '.jpg' && size > 200 * 1024) {
    return `Optimize JPEG compression or convert to WebP. Expected savings: ${Math.round(sizeKB * 0.3)}KB`;
  }
  
  return `Use Astro's Image component for automatic optimization`;
}

function generateAstroImageExamples(imgMatches) {
  const examples = imgMatches.slice(0, 2).map(img => {
    const src = img.match(/src="([^"]*)"/) || ['', ''];
    return {
      before: img,
      after: `<Image src={import('${src[1]}')} alt="Description" width={640} height={480} />`
    };
  });
  
  return examples;
}

function generateReport(checks) {
  const allIssues = [
    ...checks.images.issues,
    ...checks.astroUsage.issues,
    ...checks.budgets.issues,
    ...checks.assets.issues,
    ...checks.development.issues
  ];
  
  console.log('📋 PERFORMANCE REPORT\n');
  
  // Summary stats
  console.log('📊 SUMMARY:');
  console.log(`🖼️  Images: ${checks.images.imageCount} files, ${Math.round(checks.images.totalDistSize/1024)}KB total`);
  console.log(`🚀 Astro Image Usage: ${Math.round(checks.astroUsage.optimizationRate)}% optimized`);
  console.log(`🎨 CSS Size: ${Math.round(checks.budgets.cssSize/1024)}KB`);
  console.log(`⚠️  Issues Found: ${allIssues.length}\n`);
  
  // Group issues by severity
  const critical = allIssues.filter(i => i.severity === 'critical');
  const warnings = allIssues.filter(i => i.severity === 'warning');
  const info = allIssues.filter(i => i.severity === 'info');
  
  if (critical.length > 0) {
    console.log('🚨 CRITICAL ISSUES:');
    critical.forEach(issue => {
      console.log(`   ❌ ${issue.message}`);
      if (issue.file) console.log(`      File: ${issue.file}`);
      console.log(`      Fix: ${issue.fix}\n`);
    });
  }
  
  if (warnings.length > 0) {
    console.log('⚠️  WARNINGS:');
    warnings.forEach(issue => {
      console.log(`   ⚠️  ${issue.message}`);
      if (issue.file) console.log(`      File: ${issue.file}`);
      console.log(`      Fix: ${issue.fix}\n`);
    });
  }
  
  if (info.length > 0) {
    console.log('💡 SUGGESTIONS:');
    info.slice(0, 5).forEach(issue => {
      console.log(`   💡 ${issue.message}`);
      if (issue.file) console.log(`      File: ${issue.file}`);
      console.log(`      Fix: ${issue.fix}\n`);
    });
    
    if (info.length > 5) {
      console.log(`   ... and ${info.length - 5} more suggestions\n`);
    }
  }
  
  // Astro Image optimization guide
  if (checks.astroUsage.optimizationRate < 80) {
    console.log('🚀 ASTRO IMAGE OPTIMIZATION GUIDE:');
    console.log('   1. Import: import { Image } from "astro:assets";');
    console.log('   2. Import image: import myImage from "~/assets/images/photo.jpg";');
    console.log('   3. Use component: <Image src={myImage} alt="Description" width={640} height={480} />');
    console.log('   4. Astro will automatically:');
    console.log('      • Generate WebP/AVIF formats');
    console.log('      • Create responsive srcset');
    console.log('      • Optimize file sizes');
    console.log('      • Add proper caching headers\n');
  }
  
  // Performance budget status
  console.log('📈 PERFORMANCE BUDGET STATUS:');
  console.log(`   Images: ${Math.round(checks.images.totalDistSize/1024)}KB / ${Math.round(PERFORMANCE_BUDGETS.totalImageSize/1024)}KB ${checks.images.totalDistSize > PERFORMANCE_BUDGETS.totalImageSize ? '❌' : '✅'}`);
  console.log(`   CSS: ${Math.round(checks.budgets.cssSize/1024)}KB / ${Math.round(PERFORMANCE_BUDGETS.cssSize/1024)}KB ${checks.budgets.cssSize > PERFORMANCE_BUDGETS.cssSize ? '❌' : '✅'}`);
  console.log(`   Astro Optimization: ${Math.round(checks.astroUsage.optimizationRate)}% ${checks.astroUsage.optimizationRate > 80 ? '✅' : '❌'}\n`);
  
  return critical.concat(warnings);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  await runPerformanceGuardian();
}

export { runPerformanceGuardian };
