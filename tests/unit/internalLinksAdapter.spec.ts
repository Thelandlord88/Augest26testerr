// Deprecated test file (adapter replaced by static cross-service map).
// Retains a trivial suite so Vitest does not report failure for empty file.
import { describe, it, expect } from 'vitest';

describe('internalLinksAdapter (deprecated)', () => {
	it('placeholder passes', () => {
		expect(true).toBe(true);
	});
});
