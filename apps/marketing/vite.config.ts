import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@repo/ui/styled-system": path.resolve(__dirname, "./styled-system"),
      "@repo/ui/calculators": path.resolve(__dirname, "../../packages/ui/src/calculators/index.ts"),
      "@repo/ui/fonts.css": path.resolve(__dirname, "../../packages/ui/src/fonts/fonts.css"),
      "@repo/ui": path.resolve(__dirname, "../../packages/ui/src/index.tsx"),
    },
    dedupe: ["react", "react-dom", "react-router-dom", "react-helmet-async"],
  },
  ssr: {
    external: ["react", "react-dom", "react-router-dom", "react-helmet-async"],
  },
  build: {
    commonjsOptions: {
      include: [/node_modules/],
    },
  },
});
