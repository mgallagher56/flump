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
    'eslint:recommended',
    'plugin:sonarjs/recommended',
    'plugin:vitest-globals/recommended',
    'turbo'
  ],
  env: {
    node: true,
    browser: true,
    amd: true
  },
  plugins: ['react-hooks', 'sonarjs', 'no-relative-import-paths', 'turbo'],
  settings: {
    react: {
      version: 'detect'
    }
  },
  rules: {
    '@typescript-eslint/no-unused-vars': 'error',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/no-duplicate-imports': 'error',
    '@typescript-eslint/no-empty-function': 'error',
    '@typescript-eslint/no-empty-interface': 'error',
    '@typescript-eslint/no-unnecessary-type-assertion': 'error',
    'no-console': 'off',
    'no-debugger': 'error',
    'no-duplicate-imports': 0,
    'no-relative-import-paths/no-relative-import-paths': ['error', { allowSameFolder: true, rootDir: 'app' }],
    'no-unused-vars': 'off',
    'react-hooks/exhaustive-deps': 'error',
    'react/display-name': 0,
    'react/jsx-no-useless-fragment': ['error', { allowExpressions: true }],
    'require-await': 'warn',
    complexity: ['warn', 15],
    eqeqeq: ['warn', 'smart'],
    'turbo/no-undeclared-env-vars': 'error'
  },
  overrides: [
    {
      files: ['**/*.test.{j,t}s?(x)'],
      env: {
        'vitest-globals/env': true
      }
    }
  ]
};
