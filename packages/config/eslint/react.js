import base from './base.js';
import { browserGlobals, reactPlugins, reactRules } from './react-rules.js';

/** Flat ESLint config for the React (Vite) web application. */
export default [
  ...base,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      globals: browserGlobals,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: reactPlugins,
    rules: reactRules,
  },
];
