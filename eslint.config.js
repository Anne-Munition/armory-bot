import js from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import importPlugin from 'eslint-plugin-import';
import onlyWarn from 'eslint-plugin-only-warn';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/**
 * A shared ESLint configuration for the repository.
 *
 * @type {import("eslint").Linter.Config}
 * */
export default [
  js.configs.recommended,
  eslintConfigPrettier,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
    },
  },
  {
    plugins: {
      import: importPlugin,
    },
    rules: {
      'no-console': process.env.NODE_ENV !== 'development' ? 'error' : 'warn',
      'import/order': ['error', { alphabetize: { order: 'asc' } }],
      'import/first': 'error',
      'import/newline-after-import': 'error',
    },
  },
  {
    plugins: {
      onlyWarn,
    },
  },
  {
    ignores: ['dist/**'],
  },
  {
    settings: {
      'import/extensions': ['.js', '.ts'],
    },
  },
];
