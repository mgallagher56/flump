import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.{test,spec}.ts"],
    exclude: ["node_modules", "dist"],
    // Files share one module graph per worker (E41 P4, owner decision 10; proved by five clean
    // shuffled runs). Every global a test changes is put back in afterEach or afterAll: fake
    // timers, the stubbed Buffer, window and document, the storage driver and fast-check's seed.
    isolate: false,
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: [
        "src/**/*.{test,spec}.ts",
        "src/**/*.d.ts",
        "src/**/__fixtures__/**",
        "src/**/index.ts",
      ],
      reporter: ["text", "json-summary", "lcov"],
      // Floors = floor(measured) - 1 (owner decision D6-a). Raise when a PR gains 2+ points.
      thresholds: { statements: 89, branches: 76, functions: 93, lines: 91 },
    },
  },
});
