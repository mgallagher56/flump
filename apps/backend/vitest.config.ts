import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    root: "./",
    environment: "node",
    include: ["src/**/*.spec.ts", "test/**/*.spec.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: [
        "src/**/*.{test,spec}.ts",
        "src/**/*.d.ts",
        "src/**/__fixtures__/**",
        "src/main.ts",
        "src/migrations/**",
      ],
      reporter: ["text", "json-summary", "lcov"],
      // Floors = floor(measured) - 1 (owner decision D6-a). Raise when a PR gains 2+ points.
      thresholds: { statements: 90, branches: 74, functions: 84, lines: 91 },
    },
  },
});
