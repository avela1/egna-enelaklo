/**
 * Shared Prettier configuration.
 *
 * The root `.prettierrc.json` holds the same values for the repository; this
 * module exists so other tools can import the configuration from the
 * `@egna-enelaklo/config` package.
 */
export default {
  semi: true,
  singleQuote: true,
  trailingComma: 'all',
  printWidth: 100,
  tabWidth: 2,
  useTabs: false,
  arrowParens: 'always',
  endOfLine: 'lf',
};
