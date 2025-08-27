// Lighthouse CI configuration with stable, multi-run collection
const BLOG_BASE = (process.env.BLOG_BASE || '/blog/').replace(/\/+$/, '') + '/';

module.exports = {
  ci: {
    collect: {
      staticDistDir: 'dist',
      url: ['/', '/areas/', `${BLOG_BASE}`],
      numberOfRuns: 3,
      settings: {
        throttlingMethod: 'simulate',
        formFactor: 'desktop',
        screenEmulation: { disabled: false },
        chromeFlags: ['--headless=new', '--no-sandbox']
      }
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.90 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'total-blocking-time': ['error', { maxNumericValue: 200 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.10 }]
      }
    }
  }
};
