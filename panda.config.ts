import { defineConfig } from '@pandacss/dev';

export default defineConfig({
  // File extension for generated javascript files
  outExtension: 'js',

  // Whether to use css reset
  preflight: true,

  // Where to look for your css declarations
  include: ['./app/**/*.{js,jsx,ts,tsx}'],

  // Files to exclude
  exclude: [],

  // Useful for theme customization
  theme: {
    extend: {}
  },

  // The output directory for your css system
  outdir: 'styled-system'
});
