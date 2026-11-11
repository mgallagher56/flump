import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    root: "./",
    environment: "node",
    include: ["src/**/*.spec.ts"],
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
    },
  },
});
