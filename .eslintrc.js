/** @type {import('@types/eslint').Linter.BaseConfig} */
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: ['tsconfig.json']
  },
  extends: [
    '@remix-run/eslint-config',
    '@remix-run/eslint-config/node',
    'prettier',
    'plugin:@typescript-eslint/recommended',
    'eslint:recommended',
    'plugin:sonarjs/recommended'
  ],
  env: {
    'cypress/globals': true,
    node: true,
    browser: true,
    amd: true
  },
  plugins: ['cypress', 'react-hooks', 'sonarjs', 'no-relative-import-paths'],
  // We're using vitest which has a very similar API to jest
  // (so the linting plugins work nicely), but we have to
  // set the jest version explicitly.
  settings: {
    jest: {
      version: 28
    },
    react: {
      version: 'detect'
    }
  },
  rules: {
    '@typescript-eslint/explicit-function-return-type': 'warn',
    '@typescript-eslint/no-duplicate-imports': 'error',
    '@typescript-eslint/no-empty-function': 'error',
    '@typescript-eslint/no-empty-interface': 'error',
    '@typescript-eslint/no-unnecessary-type-assertion': 'error',
    'no-console': 'off',
    'no-debugger': 'error',
    'no-duplicate-imports': 0,
    'no-relative-import-paths/no-relative-import-paths': ['error', { allowSameFolder: true, rootDir: 'src' }],
    'react-hooks/exhaustive-deps': 'error',
    'react/display-name': 0,
    'react/jsx-no-useless-fragment': ['error', { allowExpressions: true }],
    'require-await': 'warn',
    complexity: ['warn', 15],
    eqeqeq: ['warn', 'smart']
  }
};
