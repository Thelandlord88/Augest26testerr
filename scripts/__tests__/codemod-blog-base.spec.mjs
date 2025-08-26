import { describe, it, expect } from 'vitest';

const trim = (s) => s.replace(/(^\/+|\/+$)/g, '');

describe('trim slashes', () => {
  it('trims both sides', () => {
    expect(trim('/ipswich/category/checklist/')).toBe('ipswich/category/checklist');
    expect(trim('ipswich')).toBe('ipswich');
    expect(trim('//a/b//')).toBe('a/b');
  });
});

describe('href transforms', () => {
  const run = (src) =>
    src
      .replace(/href\s*=\s*(["'])\/blog\/([^"]+)\1/g, (_m, q, rest) => {
  const bits = rest.replace(/(^\/+|\/+$)/g, '').split('/');
        if (!bits[0]) return _m;
        if (bits[1] === 'category' && bits[2]) return `href={rel.blogCategory("${bits[0]}", "${bits[2]}")}`;
        if (bits[1]) return `href={rel.blogPost("${bits[0]}", "${bits[1]}")}`;
        return `href={rel.blogCluster("${bits[0]}")}`;
      })
      .replace(/href\s*=\s*\(([\s\S]*?)\)/g, (m) => m) // noop safety for other attrs
      .replace(/href\s*=\s*\{(["'])\/blog\/([^"']+)\1\}/g, (_m, q, rest) => {
  const bits = rest.replace(/(^\/+|\/+$)/g, '').split('/');
        if (!bits[0]) return _m;
        if (bits[1] === 'category' && bits[2]) return `href={rel.blogCategory("${bits[0]}", "${bits[2]}")}`;
        if (bits[1]) return `href={rel.blogPost("${bits[0]}", "${bits[1]}")}`;
        return `href={rel.blogCluster("${bits[0]}")}`;
      });

  it('rewrites literal href', () => {
    expect(run('<a href="/blog/ipswich/bond-cleaning-checklist/">x</a>'))
      .toContain('href={rel.blogPost("ipswich", "bond-cleaning-checklist")}');
  });

  it('rewrites brace-wrapped href', () => {
    expect(run('<a href={"/blog/ipswich/category/checklist/"}>x</a>'))
      .toContain('href={rel.blogCategory("ipswich", "checklist")}');
  });
});
