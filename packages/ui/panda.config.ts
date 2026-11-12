import { defineConfig } from "@pandacss/dev";
import { flumpPreset } from "./panda.preset";

export default defineConfig({
  // File extension for generated javascript files
  outExtension: "js",

  // Whether to use css reset
  preflight: true,

  // Where to look for your css declarations
  include: ["./src/**/*.{js,jsx,ts,tsx}"],

  // Files to exclude
  exclude: [],

  // Utilize the shared preset
  presets: ["@pandacss/preset-base", "@pandacss/preset-panda", flumpPreset],

  // Useful for theme customization
  conditions: {
    extend: {
      dark: ".dark &, [data-theme='dark'] &",
      // Also declared in panda.preset.ts so consumers of the preset get it; kept here for clarity.
      compact: "[data-density=compact] &",
    },
  },
  theme: {
    extend: {},
  },

  // The output directory for your css system
  outdir: "styled-system",

  // Clean output directory on build
  clean: true,

  // Use a JSX framework
  jsxFramework: "react",

  // Global styles
  globalCss: {
    body: {
      bg: "surface.canvas",
      color: "text.primary",
    },
  },
});
