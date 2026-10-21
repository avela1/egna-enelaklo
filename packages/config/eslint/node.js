import globals from 'globals';
import base from './base.js';

/** Flat ESLint config for Node-side code (NestJS API, build scripts, config files). */
export default [
  ...base,
  {
    languageOptions: {
      globals: { ...globals.node },
    },
    rules: {
      'no-console': 'off',
    },
  },
];
