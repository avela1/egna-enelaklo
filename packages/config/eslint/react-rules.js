import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';

/** Files that follow the React rules. */
export const reactFiles = ['**/*.{ts,tsx}'];

/** Plugins used by the React rules. */
export const reactPlugins = {
  'react-hooks': reactHooks,
};

/** React specific rules shared by the web app and the repo wide config. */
export const reactRules = {
  ...reactHooks.configs.recommended.rules,
  // The design system intentionally co-locates variants, constants and hooks
  // with their components (buttonVariants, useToast, ...).
  'react-refresh/only-export-components': 'off',
};

/** Browser globals for the React application. */
export const browserGlobals = { ...globals.browser };
