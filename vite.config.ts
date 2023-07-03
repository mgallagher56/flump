/// <reference types="vitest" />
/// <reference types="vite/client" />
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import checker from 'vite-plugin-checker';
import tsconfigPaths from 'vite-tsconfig-paths';
import GithubActionsReporter from 'vitest-github-actions-reporter';

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    ...(mode === 'development'
      ? [
          checker({
            typescript: true,
            eslint: {
              lintCommand: 'eslint src --cache',
              dev: {
                logLevel: ['error']
              }
            },
            enableBuild: false
          })
        ]
      : []),
    tsconfigPaths()
  ],
  test: {
    onConsoleLog: (message: string): false | void => {
      if (
        message.includes(
          'Warning: Function components cannot be given refs. Attempts to access this ref will fail. Did you mean to use React.forwardRef()?'
        )
      ) {
        return false;
      }
    },
    coverage: {
      all: true,
      branches: 100,
      enabled: true,
      exclude: [
        'app/**/*.test.{js,ts,jsx,tsx}',
        'app/*.*',
        'app/**/*.config.{js,ts,jsx,tsx}',
        'app/routes/*.*',
        'starlight/**/*.*',
        'app/**/types.ts'
      ],
      functions: 100,
      include: ['app/**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
      lines: 100,
      provider: 'v8',
      reporter: ['text', 'html', 'lcov', 'clover', 'json', 'json-summary'],
      statements: 100,
      thresholdAutoUpdate: true
    },
    environment: 'happy-dom',
    globals: true,
    include: ['./app/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    logHeapUsage: true,
    outputFile: 'sonar-report.xml',
    reporters: [
      'vitest-sonar-reporter',
      ...(process.env.GITHUB_ACTIONS ? ['default', new GithubActionsReporter()] : ['default'])
    ],
    setupFiles: ['./test/setup-test-env.ts', './test/vitest.setup.ts'],
    useAtomics: true,
    watchExclude: ['.*\\/node_modules\\/.*', '.*\\/build\\/.*', '.*\\/postgres-data\\/.*', '.*\\/starlight\\/.*']
  }
}));
