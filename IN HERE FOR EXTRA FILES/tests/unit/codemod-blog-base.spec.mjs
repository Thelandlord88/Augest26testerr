import { describe, it, expect } from 'vitest';

const trim = (s) => s.replace(/(^\/+|\/+$)/g, '');

describe('trim slashes', () => {
  it('trims both sides', () => {
    expect(trim('/ipswich/category/checklist/')).toBe('ipswich/category/checklist');
    expect(trim('ipswich')).toBe('ipswich');
    expect(trim('//a/b//')).toBe('a/b');
  });
});

describe('href & canonical transforms (probe)', () => {
  const run = (src) =>
    src
      // href="/blog/..."
      .replace(/href\s*=\s*(["'])\/blog\/([^"']+)\1/g, (_m, q, rest) => {
  const bits = rest.replace(/(^\/+|\/+$)/g, '').split('/');
        if (!bits[0]) return _m;
        if (bits[1] === 'category' && bits[2]) return `href={rel.blogCategory("${bits[0]}", "${bits[2]}")}`;
        if (bits[1]) return `href={rel.blogPost("${bits[0]}", "${bits[1]}")}`;
        return `href={rel.blogCluster("${bits[0]}")}`;
      })
      // href={"/blog/..."}
      .replace(/href\s*=\s*\{(["'])\/blog\/([^"']+)\1\}/g, (_m, q, rest) => {
  const bits = rest.replace(/(^\/+|\/+$)/g, '').split('/');
        if (!bits[0]) return _m;
        if (bits[1] === 'category' && bits[2]) return `href={rel.blogCategory("${bits[0]}", "${bits[2]}")}`;
        if (bits[1]) return `href={rel.blogPost("${bits[0]}", "${bits[1]}")}`;
        return `href={rel.blogCluster("${bits[0]}")}`;
      })
      // canonical="/blog/..."
      .replace(/canonical\s*=\s*(["'])\/blog\/([^"']+)\1/g, (_m, q, rest) => {
  const bits = rest.replace(/(^\/+|\/+$)/g, '').split('/');
        if (!bits[0]) return _m;
        if (bits[1] === 'category' && bits[2]) return `canonical={paths.blogCategory("${bits[0]}", "${bits[2]}")}`;
        if (bits[1]) return `canonical={paths.blogPost("${bits[0]}", "${bits[1]}")}`;
        return `canonical={paths.blogCluster("${bits[0]}")}`;
      })
      // canonical={"/blog/..."}
      .replace(/canonical\s*=\s*\{(["'])\/blog\/([^"']+)\1\}/g, (_m, q, rest) => {
  const bits = rest.replace(/(^\/+|\/+$)/g, '').split('/');
        if (!bits[0]) return _m;
        if (bits[1] === 'category' && bits[2]) return `canonical={paths.blogCategory("${bits[0]}", "${bits[2]}")}`;
        if (bits[1]) return `canonical={paths.blogPost("${bits[0]}", "${bits[1]}")}`;
        return `canonical={paths.blogCluster("${bits[0]}")}`;
      });

  it('rewrites literal href', () => {
    expect(run('<a href="/blog/ipswich/bond-cleaning-checklist/">x</a>'))
      .toContain('href={rel.blogPost("ipswich", "bond-cleaning-checklist")}');
  });

  it('rewrites brace-wrapped href', () => {
    expect(run('<a href={"/blog/ipswich/category/checklist/"}>x</a>'))
      .toContain('href={rel.blogCategory("ipswich", "checklist")}');
  });

  it('rewrites canonical literal', () => {
    expect(run('<x canonical="/blog/ipswich/" />'))
      .toContain('canonical={paths.blogCluster("ipswich")}');
  });

  it('rewrites canonical brace-wrapped', () => {
    expect(run('<x canonical={"/blog/ipswich/category/checklist/"} />'))
      .toContain('canonical={paths.blogCategory("ipswich", "checklist")}');
  });
});
