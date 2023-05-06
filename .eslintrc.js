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
    '@remix-run/eslint-config/jest-testing-library',
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
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-duplicate-imports': 'error',
    '@typescript-eslint/no-empty-function': 'error',
    '@typescript-eslint/no-empty-interface': 'error',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unnecessary-type-assertion': 'error',
    '@typescript-eslint/no-unused-expressions': 'off',
    '@typescript-eslint/no-unused-vars': ['error', { ignoreRestSiblings: true }],
    '@typescript-eslint/no-use-before-define': 'off',
    '@typescript-eslint/no-useless-escape': 'off',
    'array-callback-return': 'warn',
    complexity: ['warn', 15],
    eqeqeq: ['warn', 'smart'],
    'no-console': 'off',
    'no-debugger': 'error',
    'no-duplicate-imports': 0,
    'no-nested-ternary': 'warn',
    'no-relative-import-paths/no-relative-import-paths': ['error', { allowSameFolder: true, rootDir: 'src' }],
    'no-restricted-imports': [
      'error',
      {
        paths: [
          {
            name: '@mui/icons-material',
            message: 'Please use Foo from @mui/icons-material/Foo instead.'
          }
        ]
      }
    ],
    'no-unneeded-ternary': 'warn',
    'no-unused-vars': 'off',
    'sonarjs/cognitive-complexity': ['warn', 15],
    'sonarjs/no-collapsible-if': 'warn',
    'sonarjs/no-duplicated-branches': 'warn',
    'sonarjs/no-duplicate-string': 'warn',
    'sonarjs/no-ignored-return': 'off',
    'sonarjs/no-nested-template-literals': 'warn',
    'sonarjs/no-redundant-boolean': 'warn',
    'sonarjs/no-redundant-jump': 'warn',
    'sonarjs/no-small-switch': 'warn',
    'sonarjs/no-unused-collection': 'warn',
    'sonarjs/prefer-single-boolean-return': 'warn',
    'react-hooks/exhaustive-deps': 'error',
    'react/display-name': 0,
    'react/jsx-no-useless-fragment': ['error', { allowExpressions: true }],
    'react/prop-types': 0,
    'require-await': 'warn'
  }
};
