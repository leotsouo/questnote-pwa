import globals from 'globals';

/**
 * Minimal lint: catch references to names that are not declared, imported or injected.
 * This is the class of bug behind "Can't find variable: getMailboxCatalogs" (V3.10.1–V3.12.0).
 * Run with `npm run lint`.
 */
export default [
  {
    files: ['src/**/*.js'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.serviceworker },
    },
    rules: {
      'no-undef': 'error',
      'no-unused-vars': ['warn', { args: 'none', caughtErrors: 'none' }],
      'no-dupe-keys': 'error',
      'no-duplicate-case': 'error',
      'no-unreachable': 'error',
      'no-self-assign': 'error',
      'no-const-assign': 'error',
      'no-redeclare': 'error',
      'no-import-assign': 'error',
      'no-use-before-define': ['error', { functions: false, classes: false, variables: false }],
    },
  },
  {
    files: ['service-worker.js'],
    languageOptions: { ecmaVersion: 2024, sourceType: 'script', globals: { ...globals.serviceworker } },
    rules: { 'no-undef': 'error', 'no-unreachable': 'error', 'no-const-assign': 'error' },
  },
  {
    files: ['devtools/**/*.mjs', 'scripts/**/*.mjs', 'backend/**/*.js', 'backend/**/*.mjs'],
    ignores: ['**/node_modules/**'],
    languageOptions: { ecmaVersion: 2024, sourceType: 'module', globals: { ...globals.node, ...globals.browser } },
    rules: { 'no-undef': 'error', 'no-unreachable': 'error', 'no-const-assign': 'error', 'no-dupe-keys': 'error' },
  },
];
