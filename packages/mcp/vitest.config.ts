import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.{test,spec}.ts"],
    exclude: ["node_modules", "dist"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.{test,spec}.ts", "src/**/*.d.ts", "src/**/index.ts"],
      reporter: ["text", "json-summary", "lcov"],
      // Floors = floor(measured) - 1 (owner decision D6-a). Raise when a PR gains 2+ points.
      thresholds: { statements: 29, branches: 18, functions: 34, lines: 30 },
    },
  },
});
