import { describe, it, expect } from 'vitest';
import { aliasToCanonical, canonicalClusters } from '~/config/aliases';

describe('aliasToCanonical map', () => {
  const canonSet = new Set<string>(canonicalClusters as readonly string[]);

  it('has only lowercase, hyphen/underscore-safe alias keys', () => {
    for (const k of Object.keys(aliasToCanonical)) {
      expect(k).toMatch(/^[a-z0-9_-]+$/);
    }
  });

  it('never reuses a canonical name as an alias key', () => {
    for (const k of Object.keys(aliasToCanonical)) {
      expect(canonSet.has(k)).toBe(false);
    }
  });

  it('maps every alias to a valid canonical cluster', () => {
    for (const [alias, canonical] of Object.entries(aliasToCanonical)) {
      expect(canonSet.has(canonical)).toBe(true);
    }
  });

  it('has no duplicate alias keys and no alias maps to itself', () => {
    const seen = new Set<string>();
    for (const [alias, canonical] of Object.entries(aliasToCanonical)) {
      expect(seen.has(alias)).toBe(false);
      seen.add(alias);
      expect(alias).not.toEqual(canonical);
    }
  });

  it('does not create conflicting inbound mappings (two different canonicals for same alias)', () => {
    const toPairs = Object.entries(aliasToCanonical).map(([a, c]) => `${a}→${c}`);
    expect(new Set(toPairs).size).toBe(toPairs.length);
  });
});
