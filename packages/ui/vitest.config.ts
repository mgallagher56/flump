import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "happy-dom",
    globals: true,
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["node_modules", "dist"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/index.tsx",
        "src/**/index.ts",
        "src/**/*.stories.{ts,tsx}",
        "src/**/*.{test,spec}.{ts,tsx}",
        "**/styled-system/**",
      ],
      reporter: ["text", "json-summary", "lcov"],
      // Floors = floor(measured) - 1 (owner decision D6-a). Raise when a PR gains 2+ points.
      thresholds: { statements: 85, branches: 64, functions: 75, lines: 86 },
    },
  },
});
