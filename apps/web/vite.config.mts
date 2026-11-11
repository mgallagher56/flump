/// <reference types="vitest" />
/// <reference types="vite/client" />
import pandacss from "@pandacss/dev/postcss";
import { reactRouter } from "@react-router/dev/vite";
import react from "@vitejs/plugin-react";
import autoprefixer from "autoprefixer";
import { visualizer } from "rollup-plugin-visualizer";
import { defineConfig, loadEnv } from "vite";
import checker from "vite-plugin-checker";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig(({ mode }) => ({
  server: {
    port: 5173,
    watch: {
      ignored: [
        "**/coverage/**",
        "**/.turbo/**",
        "**/build/**",
        "**/storybook-static/**",
        "**/.react-router/**",
      ],
    },
  },
  css: {
    postcss: {
      plugins: [pandacss, autoprefixer],
    },
  },
  plugins: [
    !process.env.VITEST && !process.env.STORYBOOK ? reactRouter() : react(),
    visualizer({ emitFile: true }),
    ...(mode === "development"
      ? [
          checker({
            biome: {
              command: "check",
              watchPath: "./app",
              dev: {
                logLevel: ["error"],
                debounceMs: 500,
              },
            },
            enableBuild: false,
          }),
        ]
      : []),
    tsconfigPaths(),
  ],
  build: { target: "esnext" },
  optimizeDeps: {
    esbuildOptions: {
      target: "esnext",
    },
  },
  ssr: {
    external: ["path-browserify"],
  },
  test: {
    onConsoleLog: (message: string): false | undefined => {
      if (
        message.includes(
          "Warning: Function components cannot be given refs. Attempts to access this ref will fail. Did you mean to use React.forwardRef()?",
        )
      ) {
        return false;
      }
    },
    coverage: {
      all: true,
      branches: 80,
      enabled: true,
      exclude: [
        "app/**/*.test.{js,ts,jsx,tsx}",
        "app/**/*.stories.{js,ts,jsx,tsx}",
        "app/*.*",
        "app/**/*.config.{js,ts,jsx,tsx}",
        "app/routes/*.*",
        "app/**/types.ts",
        "app/**/*.d.ts",
        "app/components/ui/**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
      ],
      functions: 80,
      include: ["app/**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
      lines: 80,
      provider: "v8",
      reporter: ["text", "html", "lcov", "clover", "json", "json-summary"],
      reportOnFailure: true,
      statements: 80,
      thresholdAutoUpdate: false,
    },
    env: loadEnv("test", process.cwd(), ""),
    environment: "happy-dom",
    globals: true,
    include: ["./app/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    logHeapUsage: true,
    outputFile: "sonar-report.xml",
    reporters: [
      "vitest-sonar-reporter",
      ...(process.env.GITHUB_ACTIONS ? ["default", "github-actions"] : ["default"]),
    ],
    setupFiles: ["./test/setup-test-env.ts", "./test/vitest.setup.ts"],
    useAtomics: true,
    watchExclude: [".*\\/node_modules\\/.*", ".*\\/build\\/.*", ".*\\/postgres-data\\/.*"],
  },
}));
