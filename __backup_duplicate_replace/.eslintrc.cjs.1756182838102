/* Root ESLint config: JS + TS + Astro, safe defaults, no duplicated plugin blocks */
module.exports = {
  root: true,
  ignorePatterns: [
    'dist/**',
    'playwright-report/**',
    'test-results/**',
    '.netlify/**',
    '__ai/**',
    '__schema/**',
    'sarif/**',
    '*.snap',
  ],
  env: { es2022: true, node: true, browser: true },
  parser: '@typescript-eslint/parser',
  parserOptions: { project: ['./tsconfig.json'], tsconfigRootDir: __dirname, sourceType: 'module' },
  plugins: ['@typescript-eslint', 'import', 'unused-imports'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-type-checked',
    'plugin:import/recommended',
    'plugin:import/typescript',
    'plugin:astro/recommended',
    'plugin:astro/jsx-a11y-recommended',
    'prettier',
  ],
  settings: {
    'import/resolver': { typescript: { project: './tsconfig.json' } },
  },
  rules: {
    'no-undef': 'error',
    'unused-imports/no-unused-imports': 'warn',
    'unused-imports/no-unused-vars': [
      'warn',
      { args: 'after-used', argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true },
    ],
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/consistent-type-imports': ['warn', { fixStyle: 'inline-type-imports' }],
    'import/no-duplicates': 'warn',
    'import/order': ['warn', {
      'newlines-between': 'always',
      alphabetize: { order: 'asc', caseInsensitive: true },
      groups: ['builtin', 'external', 'internal', ['parent', 'sibling', 'index']],
    }],
  },
  overrides: [
    {
      files: ['**/*.astro'],
      parser: 'astro-eslint-parser',
      parserOptions: { parser: '@typescript-eslint/parser', extraFileExtensions: ['.astro'] },
      globals: { Astro: 'readonly' },
      rules: { 'astro/jsx-a11y/anchor-is-valid': 'warn' },
    },
    {
      files: ['scripts/**/*.{js,mjs,cjs,ts}', 'tests/**/*.{js,ts}'],
      rules: { '@typescript-eslint/no-var-requires': 'off' },
    },
  ],
};
