/* eslint-env node */
/** Minimal ESLint config for crawler (Story 1.6). npm run lint runs without missing-config errors. */
module.exports = {
  env: {
    node: true,
    es2021: true,
    jest: true
  },
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'script'
  },
  rules: {
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    'no-console': 'off'
  },
  overrides: [
    {
      files: ['src/tests/**/*.js'],
      env: { jest: true }
    }
  ]
};
