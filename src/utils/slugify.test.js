// ESM-compatible test using dynamic import so Jest can run without Babel config
let slugify;

beforeAll(async () => {
  ({ default: slugify } = await import('./slugify.js'));
});

test('slugify converts spaces to hyphens and lowercases', () => {
  expect(slugify('Redbank Plains')).toBe('redbank-plains');
});

test('slugify removes special characters', () => {
  expect(slugify('Springfield Lakes!')).toBe('springfield-lakes');
});