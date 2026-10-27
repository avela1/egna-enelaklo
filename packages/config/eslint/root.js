import globals from 'globals';
import base from './base.js';
import { browserGlobals, reactPlugins, reactRules } from './react-rules.js';

/**
 * Repo wide flat ESLint config.
 *
 * It exists so that `lint-staged` can lint any staged file from the repo
 * root. Each workspace keeps its own, stricter config that wins when ESLint
 * is run from inside that workspace.
 */
export default [
  ...base,
  {
    // NestJS resolves constructor dependencies from the emitted decorator
    // metadata. `import type` erases that metadata, so this rule — whose
    // autofix converts imports to type-only — must stay off for the whole API
    // no matter which config file the ESLint invocation uses. Without this,
    // every commit rewrote the API's value imports and the API failed to
    // boot. See apps/api/eslint.config.mjs and CLAUDE.md section 7.
    files: ['apps/api/**/*.ts'],
    rules: {
      '@typescript-eslint/consistent-type-imports': 'off',
    },
  },
  {
    files: ['**/*.js', '**/*.cjs'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: { ...globals.node },
    },
  },
  {
    files: ['**/*.mjs'],
    languageOptions: {
      sourceType: 'module',
      globals: { ...globals.node },
    },
  },
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    languageOptions: {
      globals: browserGlobals,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: reactPlugins,
    rules: reactRules,
  },
];
