/// <reference types="vitest" />
/// <reference types="vite/client" />

import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pandacss from "@pandacss/dev/postcss";
import { reactRouter } from "@react-router/dev/vite";
import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import react from "@vitejs/plugin-react";
import { playwright } from "@vitest/browser-playwright";
import autoprefixer from "autoprefixer";
import { visualizer } from "rollup-plugin-visualizer";
import { defineConfig, loadEnv } from "vite";
import checker from "vite-plugin-checker";
import tsconfigPaths from "vite-tsconfig-paths";
import { resolveAppVersion } from "../../scripts/lib/app-version";

const marketingRequire = createRequire(
  `${dirname(fileURLToPath(import.meta.url))}/../marketing/package.json`,
);
const configDir = dirname(fileURLToPath(import.meta.url));

// Release string for feedback mails, e.g. "1.29.1+a1b2c3d" (package version + Railway commit sha).
const appVersion = resolveAppVersion({
  packageVersion: (
    JSON.parse(readFileSync(`${configDir}/package.json`, "utf8")) as { version?: string }
  ).version,
  env: process.env,
});

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
  define: process.env.VITEST
    ? {}
    : { "import.meta.env.VITE_APP_VERSION": JSON.stringify(appVersion) },
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
    coverage: {
      exclude: [
        "app/**/*.test.{js,ts,jsx,tsx}",
        "app/**/*.stories.{js,ts,jsx,tsx}",
        "app/*.*",
        "app/**/*.config.{js,ts,jsx,tsx}",
        "app/**/types.ts",
        "app/**/*.d.ts",
        "app/components/ui/**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
      ],
      include: ["app/**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
      provider: "v8",
      reporter: ["text", "html", "lcov", "clover", "json", "json-summary"],
      reportOnFailure: true,
      // Floors = floor(measured) - 1 (owner decision D6-a), measured after E5 with routes included.
      thresholds: { statements: 82, branches: 69, functions: 70, lines: 84 },
    },
    outputFile: "sonar-report.xml",
    reporters: [
      "vitest-sonar-reporter",
      ...(process.env.GITHUB_ACTIONS ? ["default", "github-actions"] : ["default"]),
    ],
    watchExclude: [".*\\/node_modules\\/.*", ".*\\/build\\/.*", ".*\\/postgres-data\\/.*"],
    // Two projects. `unit` is the mandatory gate (no browser). `storybook` runs every story in
    // headless chromium with the a11y addon (E8 gate); it is opt-in via `--project storybook`.
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          onConsoleLog: (message: string): false | undefined => {
            if (
              message.includes(
                "Warning: Function components cannot be given refs. Attempts to access this ref will fail. Did you mean to use React.forwardRef()?",
              )
            ) {
              return false;
            }
          },
          env: loadEnv("test", process.cwd(), ""),
          environment: "happy-dom",
          globals: true,
          include: ["./app/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
          logHeapUsage: true,
          setupFiles: ["./test/setup-test-env.ts", "./test/vitest.setup.ts"],
          useAtomics: true,
        },
      },
      {
        extends: true,
        resolve: {
          alias: [
            // Only a dependency of apps/marketing, so it cannot be resolved by bare name from here.
            {
              find: "react-helmet-async",
              replacement: marketingRequire.resolve("react-helmet-async"),
            },
          ],
        },
        plugins: [storybookTest({ configDir: `${configDir}/.storybook` })],
        // Pre-bundle deps up front; otherwise Vite re-optimises mid-run and reloads the page,
        // failing suites on a cold cache. Add to this list if the "optimized dependencies
        // changed. reloading" warning reappears.
        optimizeDeps: {
          entries: [
            `${configDir}/app/**/*.stories.tsx`,
            `${configDir}/../../packages/ui/src/**/*.stories.tsx`,
            `${configDir}/../marketing/src/**/*.stories.tsx`,
          ],
          include: [
            "@storybook/test",
            "@repo/ui > @radix-ui/react-slot",
            "@radix-ui/react-dialog",
            "@radix-ui/react-tabs",
            "d3-shape",
            "i18next",
            "jotai",
            "react-i18next",
            "react-icons/fa",
            "react-icons/fi",
            "recharts",
            "react-helmet-async",
          ],
        },
        test: {
          name: "storybook",
          browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            instances: [{ browser: "chromium" }],
          },
        },
      },
    ],
  },
}));
