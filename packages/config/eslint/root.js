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
