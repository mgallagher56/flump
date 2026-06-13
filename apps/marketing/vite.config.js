import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@repo/ui/styles.css": path.resolve(__dirname, "../../packages/ui/dist/styles.css"),
      "@repo/ui/styled-system": path.resolve(__dirname, "../../packages/ui/styled-system"),
      "@repo/ui": path.resolve(__dirname, "../../packages/ui/src/index.tsx"),
      "@repo/app-shell/server": path.resolve(
        __dirname,
        "../../packages/app-shell/src/entry-server.tsx",
      ),
      "@repo/app-shell/client": path.resolve(
        __dirname,
        "../../packages/app-shell/src/entry-client.tsx",
      ),
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
