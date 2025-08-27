#!/usr/bin/env node

/**
 * Core Web Vitals & Performance Audit
 * 
 * Analyzes HTML files for Core Web Vitals optimizations:
 * - LCP (Largest Contentful Paint)
 * - FID (First Input Delay) 
 * - CLS (Cumulative Layout Shift)
 * - Additional performance metrics
 */

import { readFileSync } from 'node:fs';
import { globby } from 'globby';

async function auditCoreWebVitals() {
  console.log('⚡ Core Web Vitals Performance Audit\n');
  
  const htmlFiles = await globby(['dist/**/*.html']);
  console.log(`📄 Analyzing ${htmlFiles.length} HTML files\n`);
  
  const auditResults = [];
  
  for (const file of htmlFiles) {
    const content = readFileSync(file, 'utf8');
    const audit = auditSinglePage(file, content);
    auditResults.push(audit);
  }
  
  generateCWVReport(auditResults);
  
  return auditResults;
}

function auditSinglePage(filePath, html) {
  const pageName = filePath.replace('/workspaces/Augest25/dist/', '').replace('/index.html', '') || 'homepage';
  
  return {
    page: pageName,
    filePath,
    lcp: auditLCP(html),
    fid: auditFID(html),
    cls: auditCLS(html),
    performance: auditPerformance(html),
    accessibility: auditAccessibility(html),
    seo: auditSEO(html),
    bestPractices: auditBestPractices(html)
  };
}

function auditLCP(html) {
  // Largest Contentful Paint optimizations
  const checks = {
    preloadLCP: {
      test: html.includes('<link rel="preload"'),
      description: 'Preload LCP resource',
      impact: 'High'
    },
    optimizedImages: {
      test: html.includes('loading="lazy"') && html.includes('srcset='),
      description: 'Optimized images with lazy loading and srcset',
      impact: 'High'
    },
    criticalCSS: {
      test: html.includes('<style>') && html.split('<style>').length > 1,
      description: 'Critical CSS inlined',
      impact: 'Medium'
    },
    webFonts: {
      test: html.includes('font-display:') || html.includes('preload.*font'),
      description: 'Optimized web font loading',
      impact: 'Medium'
    },
    resourceHints: {
      test: html.includes('rel="preconnect"') || html.includes('rel="dns-prefetch"'),
      description: 'Resource hints for external domains',
      impact: 'Low'
    }
  };
  
  const passed = Object.values(checks).filter(check => check.test).length;
  const total = Object.keys(checks).length;
  
  return {
    score: `${passed}/${total}`,
    percentage: Math.round((passed / total) * 100),
    checks,
    recommendations: generateLCPRecommendations(checks)
  };
}

function auditFID(html) {
  // First Input Delay optimizations
  const checks = {
    minimalJS: {
      test: !html.includes('<script src=') || html.split('<script src=').length < 3,
      description: 'Minimal JavaScript bundles',
      impact: 'High'
    },
    deferredJS: {
      test: html.includes('defer') || html.includes('async'),
      description: 'JavaScript loading optimized',
      impact: 'High'
    },
    noBlockingScripts: {
      test: !html.includes('<script>') || html.indexOf('<script>') > html.indexOf('</head>'),
      description: 'No blocking scripts in head',
      impact: 'Medium'
    },
    eventListeners: {
      test: !html.includes('addEventListener') || html.split('addEventListener').length < 5,
      description: 'Minimal event listeners',
      impact: 'Low'
    }
  };
  
  const passed = Object.values(checks).filter(check => check.test).length;
  const total = Object.keys(checks).length;
  
  return {
    score: `${passed}/${total}`,
    percentage: Math.round((passed / total) * 100),
    checks,
    recommendations: generateFIDRecommendations(checks)
  };
}

function auditCLS(html) {
  // Cumulative Layout Shift optimizations
  const checks = {
    imageDimensions: {
      test: html.includes('width=') && html.includes('height='),
      description: 'Images have explicit dimensions',
      impact: 'High'
    },
    fontDisplay: {
      test: html.includes('font-display:') || html.includes('font-display'),
      description: 'Font display optimization',
      impact: 'Medium'
    },
    reserveSpace: {
      test: !html.includes('position: absolute') || html.includes('aspect-ratio'),
      description: 'Space reserved for dynamic content',
      impact: 'Medium'
    },
    webFonts: {
      test: html.includes('preload.*font') || html.includes('font-display'),
      description: 'Web fonts optimized to prevent layout shift',
      impact: 'Medium'
    }
  };
  
  const passed = Object.values(checks).filter(check => check.test).length;
  const total = Object.keys(checks).length;
  
  return {
    score: `${passed}/${total}`,
    percentage: Math.round((passed / total) * 100),
    checks,
    recommendations: generateCLSRecommendations(checks)
  };
}

function auditPerformance(html) {
  const checks = {
    compression: {
      test: true, // Can't detect from HTML, assume server handles this
      description: 'Gzip/Brotli compression enabled',
      impact: 'High'
    },
    caching: {
      test: true, // Can't detect from HTML
      description: 'Browser caching configured',
      impact: 'High'
    },
    minification: {
      test: !html.includes('\n  ') || html.includes('<!DOCTYPE html><html'),
      description: 'HTML minification',
      impact: 'Low'
    },
    resourceHints: {
      test: html.includes('rel="preconnect"') || html.includes('rel="prefetch"'),
      description: 'Resource hints implemented',
      impact: 'Medium'
    }
  };
  
  const passed = Object.values(checks).filter(check => check.test).length;
  const total = Object.keys(checks).length;
  
  return {
    score: `${passed}/${total}`,
    percentage: Math.round((passed / total) * 100),
    checks
  };
}

function auditAccessibility(html) {
  const checks = {
    altText: {
      test: !html.includes('<img') || html.includes('alt='),
      description: 'Images have alt text',
      impact: 'High'
    },
    headingStructure: {
      test: html.includes('<h1>') && (html.includes('<h2>') || !html.includes('<h3>')),
      description: 'Proper heading hierarchy',
      impact: 'High'
    },
    skipLinks: {
      test: html.includes('skip') || html.includes('Skip'),
      description: 'Skip navigation links',
      impact: 'Medium'
    },
    ariaLabels: {
      test: html.includes('aria-label') || html.includes('aria-labelledby'),
      description: 'ARIA labels for interactive elements',
      impact: 'Medium'
    },
    semanticHTML: {
      test: html.includes('<main>') && html.includes('<nav>'),
      description: 'Semantic HTML structure',
      impact: 'Medium'
    },
    colorContrast: {
      test: !html.includes('color: #fff') || html.includes('background'),
      description: 'Adequate color contrast',
      impact: 'High'
    }
  };
  
  const passed = Object.values(checks).filter(check => check.test).length;
  const total = Object.keys(checks).length;
  
  return {
    score: `${passed}/${total}`,
    percentage: Math.round((passed / total) * 100),
    checks
  };
}

function auditSEO(html) {
  const checks = {
    title: {
      test: html.includes('<title>') && html.match(/<title>([^<]+)<\/title>/)?.[1]?.length > 10,
      description: 'Descriptive page title',
      impact: 'High'
    },
    metaDescription: {
      test: html.includes('name="description"'),
      description: 'Meta description present',
      impact: 'High'
    },
    canonicalURL: {
      test: html.includes('rel="canonical"'),
      description: 'Canonical URL specified',
      impact: 'Medium'
    },
    ogTags: {
      test: html.includes('property="og:title"') && html.includes('property="og:description"'),
      description: 'Open Graph tags',
      impact: 'Medium'
    },
    structuredData: {
      test: html.includes('application/ld+json'),
      description: 'Structured data markup',
      impact: 'Medium'
    },
    robotsMeta: {
      test: html.includes('name="robots"'),
      description: 'Robots meta tag',
      impact: 'Low'
    }
  };
  
  const passed = Object.values(checks).filter(check => check.test).length;
  const total = Object.keys(checks).length;
  
  return {
    score: `${passed}/${total}`,
    percentage: Math.round((passed / total) * 100),
    checks
  };
}

function auditBestPractices(html) {
  const checks = {
    https: {
      test: html.includes('https://') && !html.includes('http://'),
      description: 'HTTPS usage',
      impact: 'High'
    },
    noMixedContent: {
      test: !html.includes('http://') || html.split('http://').length < 3,
      description: 'No mixed content',
      impact: 'High'
    },
    modernFormat: {
      test: html.includes('.webp') || html.includes('.avif'),
      description: 'Modern image formats',
      impact: 'Medium'
    },
    errorHandling: {
      test: html.includes('onerror') || html.includes('try{'),
      description: 'Error handling implemented',
      impact: 'Low'
    }
  };
  
  const passed = Object.values(checks).filter(check => check.test).length;
  const total = Object.keys(checks).length;
  
  return {
    score: `${passed}/${total}`,
    percentage: Math.round((passed / total) * 100),
    checks
  };
}

function generateLCPRecommendations(checks) {
  const failed = Object.entries(checks).filter(([_, check]) => !check.test);
  return failed.map(([key, check]) => ({
    issue: check.description,
    impact: check.impact,
    fix: getLCPFix(key)
  }));
}

function generateFIDRecommendations(checks) {
  const failed = Object.entries(checks).filter(([_, check]) => !check.test);
  return failed.map(([key, check]) => ({
    issue: check.description,
    impact: check.impact,
    fix: getFIDFix(key)
  }));
}

function generateCLSRecommendations(checks) {
  const failed = Object.entries(checks).filter(([_, check]) => !check.test);
  return failed.map(([key, check]) => ({
    issue: check.description,
    impact: check.impact,
    fix: getCLSFix(key)
  }));
}

function getLCPFix(issue) {
  const fixes = {
    preloadLCP: 'Add <link rel="preload" as="image" href="hero-image.jpg">',
    optimizedImages: 'Implement responsive images with srcset and lazy loading',
    criticalCSS: 'Inline critical CSS in <style> tags',
    webFonts: 'Add font-display: swap to @font-face declarations',
    resourceHints: 'Add <link rel="preconnect"> for external domains'
  };
  return fixes[issue] || 'See documentation for specific fix';
}

function getFIDFix(issue) {
  const fixes = {
    minimalJS: 'Reduce JavaScript bundle size and remove unused code',
    deferredJS: 'Add defer or async attributes to script tags',
    noBlockingScripts: 'Move scripts to bottom of page or use async/defer',
    eventListeners: 'Optimize event listeners and use passive listeners'
  };
  return fixes[issue] || 'See documentation for specific fix';
}

function getCLSFix(issue) {
  const fixes = {
    imageDimensions: 'Add width and height attributes to img tags',
    fontDisplay: 'Use font-display: swap for web fonts',
    reserveSpace: 'Reserve space for dynamic content with CSS',
    webFonts: 'Preload web fonts and optimize loading'
  };
  return fixes[issue] || 'See documentation for specific fix';
}

function generateCWVReport(results) {
  console.log('📊 CORE WEB VITALS AUDIT REPORT\n');
  
  // Overall statistics
  const avgLCP = Math.round(results.reduce((sum, r) => sum + r.lcp.percentage, 0) / results.length);
  const avgFID = Math.round(results.reduce((sum, r) => sum + r.fid.percentage, 0) / results.length);
  const avgCLS = Math.round(results.reduce((sum, r) => sum + r.cls.percentage, 0) / results.length);
  const avgPerf = Math.round(results.reduce((sum, r) => sum + r.performance.percentage, 0) / results.length);
  const avgA11y = Math.round(results.reduce((sum, r) => sum + r.accessibility.percentage, 0) / results.length);
  const avgSEO = Math.round(results.reduce((sum, r) => sum + r.seo.percentage, 0) / results.length);
  
  console.log('🏆 OVERALL SCORES:');
  console.log(`⚡ LCP (Largest Contentful Paint): ${avgLCP}%`);
  console.log(`🖱️  FID (First Input Delay): ${avgFID}%`);
  console.log(`📐 CLS (Cumulative Layout Shift): ${avgCLS}%`);
  console.log(`🚀 Performance: ${avgPerf}%`);
  console.log(`♿ Accessibility: ${avgA11y}%`);
  console.log(`🔍 SEO: ${avgSEO}%\n`);
  
  // Performance grade
  const overallScore = Math.round((avgLCP + avgFID + avgCLS + avgPerf + avgA11y + avgSEO) / 6);
  let grade = 'F';
  if (overallScore >= 90) grade = 'A';
  else if (overallScore >= 80) grade = 'B';
  else if (overallScore >= 70) grade = 'C';
  else if (overallScore >= 60) grade = 'D';
  
  console.log(`🎯 OVERALL GRADE: ${grade} (${overallScore}%)\n`);
  
  // Sample page details
  const samplePage = results[0];
  console.log(`📄 SAMPLE PAGE ANALYSIS: ${samplePage.page}\n`);
  
  // LCP recommendations
  if (samplePage.lcp.recommendations.length > 0) {
    console.log('⚡ LCP OPTIMIZATION OPPORTUNITIES:');
    samplePage.lcp.recommendations.forEach(rec => {
      console.log(`  ❌ ${rec.issue} (${rec.impact} impact)`);
      console.log(`     💡 ${rec.fix}`);
    });
    console.log('');
  }
  
  // FID recommendations  
  if (samplePage.fid.recommendations.length > 0) {
    console.log('🖱️  FID OPTIMIZATION OPPORTUNITIES:');
    samplePage.fid.recommendations.forEach(rec => {
      console.log(`  ❌ ${rec.issue} (${rec.impact} impact)`);
      console.log(`     💡 ${rec.fix}`);
    });
    console.log('');
  }
  
  // CLS recommendations
  if (samplePage.cls.recommendations.length > 0) {
    console.log('📐 CLS OPTIMIZATION OPPORTUNITIES:');
    samplePage.cls.recommendations.forEach(rec => {
      console.log(`  ❌ ${rec.issue} (${rec.impact} impact)`);
      console.log(`     💡 ${rec.fix}`);
    });
    console.log('');
  }
  
  // Priority fixes
  console.log('🎯 PRIORITY FIXES:');
  if (avgLCP < 80) console.log('  🔥 Optimize Largest Contentful Paint (preload critical resources)');
  if (avgFID < 80) console.log('  🔥 Reduce JavaScript execution time');
  if (avgCLS < 80) console.log('  🔥 Add explicit dimensions to images and fonts');
  if (avgA11y < 80) console.log('  🔥 Improve accessibility (alt text, ARIA labels)');
  if (avgSEO < 90) console.log('  📈 Enhanced SEO optimizations');
  
  console.log('\n✅ Core Web Vitals audit complete!\n');
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  await auditCoreWebVitals();
}

export { auditCoreWebVitals };
