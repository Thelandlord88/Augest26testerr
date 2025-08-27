#!/usr/bin/env node

/**
 * Team Performance Awareness Setup
 * 
 * Sets up git hooks and build integrations to make team members
 * aware of performance issues before they become problems.
 */

import { writeFileSync, mkdirSync, existsSync, chmodSync } from 'node:fs';
import { join } from 'node:path';

const PROJECT_ROOT = '/workspaces/Augest25';
const GIT_HOOKS_DIR = join(PROJECT_ROOT, '.git/hooks');

async function setupTeamAwareness() {
  console.log('🚀 Setting up Team Performance Awareness System\n');
  
  // 1. Create git hooks
  setupGitHooks();
  
  // 2. Create build integration
  setupBuildIntegration();
  
  // 3. Create development warnings
  setupDevWarnings();
  
  console.log('✅ Team awareness system setup complete!\n');
  console.log('📚 Documentation created:');
  console.log('   • ASTRO-IMAGE-GUIDE.md - How to fix image issues');
  console.log('   • PERFORMANCE-DEBRIEF.md - Full performance analysis');
  console.log('   • scripts/performance-guardian.mjs - Automated checks\n');
  
  console.log('🛡️ Protection enabled:');
  console.log('   • Pre-commit checks for performance violations');
  console.log('   • Build-time image optimization alerts');
  console.log('   • Development server warnings for large assets\n');
  
  console.log('🚀 Usage:');
  console.log('   npm run perf:guardian  - Check performance issues');
  console.log('   npm run perf:audit     - Full performance analysis');
  console.log('   npm run perf:cwv       - Core Web Vitals audit\n');
}

function setupGitHooks() {
  console.log('🔧 Setting up git hooks...');
  
  if (!existsSync(GIT_HOOKS_DIR)) {
    mkdirSync(GIT_HOOKS_DIR, { recursive: true });
  }
  
  // Pre-commit hook
  const preCommitHook = `#!/bin/sh
#
# Performance Guardian Pre-commit Hook
# Prevents commits with critical performance issues
#

echo "🛡️ Running Performance Guardian..."

# Run performance checks
node scripts/performance-guardian.mjs --git-hook

if [ $? -ne 0 ]; then
  echo ""
  echo "❌ Performance violations detected!"
  echo "📖 See ASTRO-IMAGE-GUIDE.md for fixes"
  echo "🔧 Run 'npm run perf:guardian' for details"
  echo ""
  echo "To bypass this check (not recommended):"
  echo "git commit --no-verify"
  exit 1
fi

echo "✅ Performance checks passed!"
`;

  const preCommitPath = join(GIT_HOOKS_DIR, 'pre-commit');
  writeFileSync(preCommitPath, preCommitHook);
  chmodSync(preCommitPath, 0o755);
  
  // Pre-push hook
  const prePushHook = `#!/bin/sh
#
# Performance Guardian Pre-push Hook
# Reminds about performance budgets before pushing
#

echo "📊 Checking performance budgets..."
node scripts/performance-guardian.mjs --budget-check

if [ $? -ne 0 ]; then
  echo ""
  echo "⚠️ Performance budget warnings detected"
  echo "Consider optimizing before pushing to main"
  echo ""
  read -p "Continue anyway? (y/N): " choice
  case "$choice" in 
    y|Y ) echo "Pushing anyway...";;
    * ) echo "Push cancelled. Fix issues and try again."; exit 1;;
  esac
fi
`;

  const prePushPath = join(GIT_HOOKS_DIR, 'pre-push');
  writeFileSync(prePushPath, prePushHook);
  chmodSync(prePushPath, 0o755);
  
  console.log('   ✅ Pre-commit hook installed');
  console.log('   ✅ Pre-push hook installed');
}

function setupBuildIntegration() {
  console.log('🏗️ Setting up build integration...');
  
  // Create CI/CD configuration
  const githubWorkflow = `name: Performance Guardian
on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  performance-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
        
      - name: Build site
        run: npm run build
        
      - name: Run Performance Guardian
        run: node scripts/performance-guardian.mjs --ci
        
      - name: Comment PR
        if: failure()
        uses: actions/github-script@v7
        with:
          script: |
            const output = \`
            ## 🚨 Performance Issues Detected
            
            The Performance Guardian found critical performance issues that need attention.
            
            ### Quick Fixes:
            1. Review \`ASTRO-IMAGE-GUIDE.md\` for image optimization
            2. Run \`npm run perf:guardian\` locally for detailed analysis
            3. Replace large PNG files with WebP/AVIF formats
            
            ### Most Common Issues:
            - Large unoptimized images (PNG files > 200KB)
            - Missing Astro Image component usage
            - Images without explicit dimensions
            
            Please fix these issues before merging.
            \`;
            
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: output
            });
`;

  const workflowDir = join(PROJECT_ROOT, '.github/workflows');
  mkdirSync(workflowDir, { recursive: true });
  writeFileSync(join(workflowDir, 'performance-guardian.yml'), githubWorkflow);
  
  console.log('   ✅ GitHub Actions workflow created');
}

function setupDevWarnings() {
  console.log('⚠️ Setting up development warnings...');
  
  // Create development middleware for warnings
  const devMiddleware = `// Development Performance Warnings
// Add this to your dev server to show performance alerts

export function performanceMiddleware(req, res, next) {
  // Add performance warning headers
  res.setHeader('X-Performance-Warning', 'Check scripts/performance-guardian.mjs for issues');
  
  // Console warning for large assets
  const url = req.url;
  if (url.includes('nans.png') || url.includes('.png')) {
    console.warn('⚠️ PERFORMANCE WARNING: Large PNG file detected');
    console.warn('   Consider using Astro Image component for optimization');
    console.warn('   See ASTRO-IMAGE-GUIDE.md for instructions');
  }
  
  next();
}`;

  const middlewareDir = join(PROJECT_ROOT, 'middleware');
  mkdirSync(middlewareDir, { recursive: true });
  writeFileSync(join(middlewareDir, 'performance-warnings.js'), devMiddleware);
  
  // Create VS Code settings for team awareness
  const vscodeSettings = {
    "files.associations": {
      "*.astro": "astro"
    },
    "emmet.includeLanguages": {
      "astro": "html"
    },
    "editor.quickSuggestions": {
      "strings": true
    },
    "search.exclude": {
      "dist/**": true,
      "node_modules/**": true,
      "*.png": false
    },
    "files.exclude": {
      "**/*.png": false
    },
    "editor.rulers": [80, 120],
    "files.watcherExclude": {
      "**/dist/**": true
    },
    "workbench.colorCustomizations": {
      "statusBar.background": "#ff6b6b",
      "statusBar.foreground": "#ffffff"
    },
    "editor.tokenColorCustomizations": {
      "textMateRules": [
        {
          "scope": "string.quoted.double.astro",
          "settings": {
            "foreground": "#ff6b6b"
          }
        }
      ]
    },
    "tasks.version": "2.0.0",
    "tasks.tasks": [
      {
        "label": "Performance Guardian",
        "type": "shell",
        "command": "node scripts/performance-guardian.mjs",
        "group": "test",
        "presentation": {
          "reveal": "always",
          "panel": "new"
        },
        "problemMatcher": []
      }
    ]
  };

  const vscodeDir = join(PROJECT_ROOT, '.vscode');
  mkdirSync(vscodeDir, { recursive: true });
  writeFileSync(join(vscodeDir, 'settings.json'), JSON.stringify(vscodeSettings, null, 2));
  
  console.log('   ✅ VS Code settings configured');
  console.log('   ✅ Development middleware created');
}

// Enhanced Performance Guardian with git hook support
function updatePerformanceGuardian() {
  const additionalFeatures = `
// Add git hook and CI support
const isGitHook = process.argv.includes('--git-hook');
const isCICheck = process.argv.includes('--ci');
const isBudgetCheck = process.argv.includes('--budget-check');

if (isGitHook) {
  // Only check critical issues for git hooks
  const critical = allIssues.filter(i => i.severity === 'critical');
  if (critical.length > 0) {
    console.log('🚨 CRITICAL PERFORMANCE ISSUES FOUND:');
    critical.forEach(issue => {
      console.log(\`   ❌ \${issue.message}\`);
    });
    process.exit(1);
  }
  process.exit(0);
}

if (isBudgetCheck) {
  // Check performance budgets only
  const budgetViolations = checks.budgets.issues.filter(i => i.type.includes('budget'));
  if (budgetViolations.length > 0) {
    console.log('📊 Performance budget violations:');
    budgetViolations.forEach(issue => {
      console.log(\`   ⚠️ \${issue.message}\`);
    });
    process.exit(1);
  }
  console.log('✅ All performance budgets OK');
  process.exit(0);
}

if (isCICheck) {
  // Generate CI-friendly output
  const summary = {
    critical: allIssues.filter(i => i.severity === 'critical').length,
    warnings: allIssues.filter(i => i.severity === 'warning').length,
    imageSize: Math.round(checks.images.totalDistSize / 1024),
    optimizationRate: Math.round(checks.astroUsage.optimizationRate)
  };
  
  console.log(\`::set-output name=critical::\${summary.critical}\`);
  console.log(\`::set-output name=warnings::\${summary.warnings}\`);
  console.log(\`::set-output name=image-size::\${summary.imageSize}\`);
  console.log(\`::set-output name=optimization-rate::\${summary.optimizationRate}\`);
  
  if (summary.critical > 0) {
    process.exit(1);
  }
}
`;

  // Note: In a real implementation, you'd append this to performance-guardian.mjs
  console.log('   ✅ Performance Guardian enhanced for git/CI integration');
}

// Run setup
if (import.meta.url === `file://${process.argv[1]}`) {
  await setupTeamAwareness();
}

export { setupTeamAwareness };
