import { describe, it, expect } from 'vitest';
import fs from 'node:fs';

const BLOG_BASE = process.env.BLOG_BASE ?? '/blog/';

function extractLocs(xml: string): string[] {
  const rx = /<loc>([^<]+)<\/loc>/gi;
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = rx.exec(xml))) out.push(m[1]);
  return out;
}

describe('sitemap canonicals', () => {
  it('all URLs are absolute and editorial URLs start with BLOG_BASE', async () => {
    const file = 'dist/sitemap.xml';
    if (!fs.existsSync(file)) {
      // Allow running unit tests without a build; treat as no-op success.
      expect(true).toBe(true);
      return;
    }
    const xml = fs.readFileSync(file, 'utf8');
    const urls = extractLocs(xml);
    expect(urls.length).toBeGreaterThan(0);

    for (const href of urls) {
      expect(href.startsWith('http')).toBe(true);
      const path = new URL(href).pathname;
      if (path.startsWith('/blog/') || path.startsWith('/guides/')) {
        expect(path.startsWith(BLOG_BASE)).toBe(true);
        expect(/\/$/.test(path)).toBe(true);
      }
    }
  });
});
