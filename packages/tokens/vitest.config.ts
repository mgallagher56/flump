import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.{test,spec}.ts", "scripts/**/*.{test,spec}.ts"],
    exclude: ["node_modules", "dist"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts", "scripts/**/*.ts"],
      exclude: [
        "src/**/*.{test,spec}.ts",
        "scripts/**/*.{test,spec}.ts",
        "scripts/build-native-tokens.ts",
        "src/**/index.ts",
      ],
      reporter: ["text", "json-summary", "lcov"],
      // Floors for a new package: raise, never lower.
      thresholds: { statements: 90, branches: 80, functions: 90, lines: 90 },
    },
  },
});
