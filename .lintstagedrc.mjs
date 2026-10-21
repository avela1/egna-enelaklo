/**
 * lint-staged configuration.
 *
 * lint-staged v15 takes the timeout from the command line, see
 * `.husky/pre-commit` (`--timeout 300`): a first commit touches every file
 * in the repository and ESLint needs longer than the default.
 */
export default {
  '*.{ts,tsx,mts,cts,js,jsx,mjs,cjs}': ['eslint --fix', 'prettier --write'],
  '*.{json,jsonc,md,yml,yaml,css,html}': ['prettier --write'],
};
