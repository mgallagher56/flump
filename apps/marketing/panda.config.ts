import { defineConfig } from "@pandacss/dev";
import { colorSchemeConditions, flumpPreset } from "@repo/ui/preset";

export default defineConfig({
  // File extension for generated javascript files
  outExtension: "js",

  // Whether to use css reset
  preflight: true,

  // Where to look for your css declarations
  include: ["./src/**/*.{js,jsx,ts,tsx}", "../../packages/ui/src/**/*.{js,jsx,ts,tsx}"],

  // Files to exclude
  exclude: [],

  // Utilize the shared preset
  presets: ["@pandacss/preset-base", "@pandacss/preset-panda", flumpPreset],

  // Useful for theme customization
  conditions: {
    extend: {
      // Dark from the theme script, or from the system setting with JavaScript off (D30).
      ...colorSchemeConditions,
    },
  },
  theme: {
    extend: {},
  },

  // Use a JSX framework
  jsxFramework: "react",

  // The output directory for your css system
  outdir: "styled-system",
});
