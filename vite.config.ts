/// <reference types="vitest" />
/// <reference types="vite/client" />
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import checker from 'vite-plugin-checker';
import tsconfigPaths from 'vite-tsconfig-paths';

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
    coverage: {
      all: true,
      branches: 16.66,
      enabled: true,
      exclude: ['app/**/*.test.{js,ts,jsx,tsx}', 'app/*.*', 'app/**/*.config.{js,ts,jsx,tsx}', 'app/routes/*.*', 'starlight/**/*.*'],
      functions: 5.55,
      include: ['app/**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
      lines: 8.17,
      provider: 'v8',
      reporter: ['text', 'html', 'lcov', 'clover', 'json', 'json-summary'],
      statements: 8.17,
      thresholdAutoUpdate: true,
    },
    environment: 'happy-dom',
    globals: true,
    include: ['./app/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    logHeapUsage: true,
    setupFiles: ['./test/setup-test-env.ts', './test/vitest.setup.ts'],
    useAtomics: true,
    watchExclude: ['.*\\/node_modules\\/.*', '.*\\/build\\/.*', '.*\\/postgres-data\\/.*','.*\\/starlight\\/.*'],
  }
}));
