import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.{test,spec}.ts"],
    exclude: ["node_modules", "dist"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.{test,spec}.ts", "src/**/*.d.ts", "src/**/index.ts", "src/testing/**"],
      reporter: ["text", "json-summary", "lcov"],
      // Floors = floor(measured) - 1 (owner decision D6-a). Raise when a PR gains 2+ points.
      // auth and tools have their own floors (E1 F-03 asked for at least 80% there), measured on
      // 2026-11-20 at 100% lines for both, so floor(measured) - 1 like the global floor.
      thresholds: {
        statements: 74,
        branches: 70,
        functions: 70,
        lines: 75,
        "src/auth/**": { statements: 98, branches: 93, functions: 99, lines: 99 },
        "src/tools/**": { statements: 98, branches: 93, functions: 99, lines: 99 },
      },
    },
  },
});
