import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "happy-dom",
    globals: true,
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.{test,spec}.{ts,tsx}",
        "src/**/*.stories.{ts,tsx}",
        "src/**/*.d.ts",
        "src/entry-client.tsx",
        "src/entry-server.tsx",
        "src/**/index.ts",
      ],
      reporter: ["text", "json-summary", "lcov"],
    },
  },
});
