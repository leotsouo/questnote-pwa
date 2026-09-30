import js from '@eslint/js';
import globals from 'globals';
export default [
  { ignores: ['dist/**', 'assets/**', 'node_modules/**', 'scripts/capture-product.cjs'] },
  js.configs.recommended,
  { files: ['*.js'], languageOptions: { globals: globals.browser }, rules: { 'no-unused-vars': ['error', { argsIgnorePattern: '^_' }] } },
  { files: ['scripts/**/*.mjs', 'tests/**/*.mjs', 'eslint.config.js'], languageOptions: { globals: { ...globals.node, ...globals.browser } }, rules: { 'no-irregular-whitespace': ['error', { skipStrings: true, skipTemplates: true }] } },
];
