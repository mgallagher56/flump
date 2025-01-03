/// <reference types="vitest" />
/// <reference types="vite/client" />
import pandacss from '@pandacss/dev/postcss';
import react from '@vitejs/plugin-react';
import autoprefixer from 'autoprefixer';
import { visualizer } from 'rollup-plugin-visualizer';
import { defineConfig, loadEnv } from 'vite';
import checker from 'vite-plugin-checker';
import tsconfigPaths from 'vite-tsconfig-paths';
import GithubActionsReporter from 'vitest-github-actions-reporter';

import { reactRouter } from '@react-router/dev/vite';

export default defineConfig(({ mode }) => ({
  server: {
    port: 3000
  },
  css: {
    postcss: {
      plugins: [pandacss, autoprefixer]
    }
  },
  plugins: [
    !process.env.VITEST ? reactRouter() : react(),
    visualizer({ emitFile: true }),
    ...(mode === 'development'
      ? [
          checker({
            typescript: true,
            eslint: {
              lintCommand: 'eslint --cache .',
              useFlatConfig: true,
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
  build: { target: 'esnext' },
  optimizeDeps: {
    esbuildOptions: {
      target: 'esnext'
    }
  },
  ssr: {
    external: ['path-browserify']
  },
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
        'app/**/types.ts',
        'app/utils/supabase.ts',
        'app/**/*.d.ts',
        'app/components/ui/**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'
      ],
      functions: 100,
      include: ['app/**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
      lines: 100,
      provider: 'v8',
      reporter: ['text', 'html', 'lcov', 'clover', 'json', 'json-summary'],
      reportOnFailure: true,
      statements: 100,
      thresholdAutoUpdate: true
    },
    env: loadEnv('test', process.cwd(), ''),
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
    watchExclude: ['.*\\/node_modules\\/.*', '.*\\/build\\/.*', '.*\\/postgres-data\\/.*']
  }
}));
