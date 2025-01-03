import eslintConfigPrettier from "eslint-config-prettier";
import eslintJs from '@eslint/js';
import globals from 'globals';
import importPlugin from 'eslint-plugin-import';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import noRelativeImportPaths from 'eslint-plugin-no-relative-import-paths';
import reactHooks from 'eslint-plugin-react-hooks';
import reactPlugin from "eslint-plugin-react";
import reactRefresh from 'eslint-plugin-react-refresh';
import sonarjs from 'eslint-plugin-sonarjs';
import testingLibrary from 'eslint-plugin-testing-library';
import tsEslint from 'typescript-eslint';
import tsEslintParser from '@typescript-eslint/parser';
import turbo from "eslint-plugin-turbo";
import unusedImports from 'eslint-plugin-unused-imports';
import vitest from '@vitest/eslint-plugin';



export default [
  reactPlugin.configs.flat.recommended,
  eslintJs.configs.recommended,
  eslintConfigPrettier,
  importPlugin.flatConfigs.recommended,
  turbo.configs["flat/recommended"],
  ...tsEslint.configs.recommended,
  {
    plugins: {
      'jsx-a11y': jsxA11y,
      'no-relative-import-paths': noRelativeImportPaths,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      'unused-imports': unusedImports,
      sonarjs,
    },
    settings: {
      react: {
        version: 'detect'
      },
      'import/resolver': {
        node: {
          paths: ['app'],
          extensions: ['.js', '.jsx', '.ts', '.tsx'],
        },
      },
    },
    languageOptions: {
      parser: tsEslintParser,
      globals: { ...globals.browser, ...globals.node, ...globals.es2025, React: true, JSX: true },
      parserOptions: {
        project: ['tsconfig.json'],
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true
        },
      },
    },
    rules: {
      "@typescript-eslint/consistent-type-imports": [
        "error",
        {
          prefer: "type-imports",
          fixStyle: "inline-type-imports"
        },
      ],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-empty-interface': 'error',
      '@typescript-eslint/no-unnecessary-type-assertion': 'error',
      '@typescript-eslint/no-unused-vars': 'off',
      'no-relative-import-paths/no-relative-import-paths': ['error', { allowSameFolder: true, rootDir: 'app' }],
      'no-unused-vars': 'off',
      'react-hooks/exhaustive-deps': 'error',
      'react/display-name': 0,
      'react/jsx-no-useless-fragment': ['error', { allowExpressions: true }],
      'require-await': 'warn',
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/no-empty-interface": "error",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-expressions": "off",
      "@typescript-eslint/no-use-before-define": "off",
      "@typescript-eslint/no-useless-escape": "off",
      "array-callback-return": "warn",
      "complexity": ['warn', 15],
      "eqeqeq": ["warn", "smart"],
      "import/named": "off",
      "import/no-duplicates": "error",
      "import/no-named-as-default-member": "off",
      "import/no-unresolved": "off",
      "jsx-a11y/alt-text": "warn",
      "jsx-a11y/anchor-is-valid": "warn",
      "jsx-a11y/click-events-have-key-events": "warn",
      "jsx-a11y/no-autofocus": "warn",
      "jsx-a11y/no-static-element-interactions": "warn",
      "no-console": "error",
      "no-debugger": "error",
      "no-duplicate-imports": 0,
      "no-nested-ternary": "warn",
      "no-unneeded-ternary": "warn",
      "react-hooks/rules-of-hooks": "error",
      "react-refresh/only-export-components": "off",
      "react/jsx-uses-react": "error",
      "react/jsx-sort-props": [
        "error",
        {
          callbacksLast: true,
          shorthandFirst: true,
          shorthandLast: true,
          ignoreCase: true,
          noSortAlphabetically: false,
          reservedFirst: true,
        },
      ],
      "react/prop-types": 0,
      "react/react-in-jsx-scope": "off",
      "react/require-default-props": "off",
      "sonarjs/cognitive-complexity": ["warn", 15],
      "sonarjs/no-collapsible-if": "warn",
      "sonarjs/no-duplicate-string": "warn",
      "sonarjs/no-duplicated-branches": "warn",
      "sonarjs/no-ignored-return": "off",
      "sonarjs/no-nested-template-literals": "warn",
      "sonarjs/no-redundant-boolean": "warn",
      "sonarjs/no-redundant-jump": "warn",
      "sonarjs/no-small-switch": "warn",
      "sonarjs/no-unused-collection": "warn",
      "sonarjs/prefer-single-boolean-return": "warn",
      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": [
        "error",
        {
          vars: "all",
          varsIgnorePattern: "^_",
          args: "after-used",
          argsIgnorePattern: "^_",
        },
      ],
    },
  },
  {
    ignores: [
      '__mocks__/',
      ".prettierrc.js",
      "*.config.*",
      "*.d.ts",
      "app/context.tsx",
      "app/db.server.ts",
      "app/entry.server.tsx",
      "app/entry.client.tsx",
      "app/root.tsx",
      "app/routes/ping.tsx",
      "build/**",
      "coverage-ts/**",
      "coverage/**",
      "db_types.ts",
      "mocks/",
      "postcss.config.cjs",
      "remix.init",
      "root.tsx",
      "styled-system/**",
      "test",
      "theme.ts",

    ]
  },
  {
    files: ['**/*.test.{j,t}s?(x)'],
    ...testingLibrary.configs['flat/react'],
    plugins: {
      vitest,
    },
    languageOptions: {
      globals: {
        ...vitest.environments.env.globals,
      },
    },
    rules: {
      ...vitest.configs.recommended.rules,
      'vitest/consistent-test-it': ['error', { fn: 'test', withinDescribe: 'test' }],
      'vitest/prefer-called-with': ['off'],
    },
  }
];
