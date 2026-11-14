import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";
import { BUSINESS_DETAILS } from "../../packages/business-details/src/index";
import { THEME_INIT_SCRIPT } from "../../packages/ui/src/hooks/themeScript";

// A public launch is ALLOW_INDEXING or FLUMP_LAUNCH exactly "true" (packages/business-details).
// Build-time constants so a launch build drops the placeholder price code (E24-T4).
const isLaunch = process.env.ALLOW_INDEXING === "true" || process.env.FLUMP_LAUNCH === "true";

// The paid plan card and billing toggle ship only outside a launch build, or once the price is set.
const showPaidPlan = !isLaunch || !BUSINESS_DETAILS.price.isPlaceholder;

// The pre-paint theme script is the same string the web app inlines (@repo/ui themeScript).
const themeInitScript = (): Plugin => ({
  name: "flump-theme-init-script",
  transformIndexHtml: (html) => html.replace("/* theme-init */", THEME_INIT_SCRIPT),
});

export default defineConfig({
  plugins: [react(), themeInitScript()],
  define: {
    "import.meta.env.VITE_SHOW_PAID_PLAN": JSON.stringify(showPaidPlan ? "true" : "false"),
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@repo/ui/styled-system": path.resolve(__dirname, "./styled-system"),
      "@repo/ui/calculators": path.resolve(__dirname, "../../packages/ui/src/calculators/index.ts"),
      // Subpaths before "@repo/ui/tools", which would otherwise swallow them as a prefix.
      "@repo/ui/tools/icons": path.resolve(__dirname, "../../packages/ui/src/tools/toolIcons.ts"),
      "@repo/ui/tools/guide": path.resolve(
        __dirname,
        "../../packages/ui/src/tools/ToolGuide/index.ts",
      ),
      "@repo/ui/tools/breadcrumbs": path.resolve(
        __dirname,
        "../../packages/ui/src/tools/ToolBreadcrumbs/index.ts",
      ),
      "@repo/ui/tools": path.resolve(__dirname, "../../packages/ui/src/tools/index.ts"),
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
