import globals from 'globals';
import base from '@egna-enelaklo/config/eslint/node';

export default [
  ...base,
  {
    // NestJS resolves dependencies from the emitted decorator metadata, so
    // injected classes must stay value imports even when they are only used
    // in a constructor parameter type.
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
];
