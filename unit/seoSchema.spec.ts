import { describe, it, expect } from 'vitest';
import { suburbServiceGraph } from '~/lib/seoSchema.js';

describe('seoSchema suburbServiceGraph', () => {
  it('produces unique @id values', () => {
  // Cast to any to satisfy loose invocation (function is JS without TS types)
  const nodes: any[] = (suburbServiceGraph as any)({ service: 'bond-cleaning', suburb: 'ipswich' });
    expect(Array.isArray(nodes)).toBe(true);
    const ids = nodes.map(n => n?.['@id']).filter(Boolean);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
