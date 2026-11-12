import { definePreset } from "@pandacss/dev";
import {
  colors,
  durations,
  easings,
  fontSizes,
  fonts,
  fontWeights,
  letterSpacings,
  lineHeights,
  motionKeyframes,
  radii,
  semanticTokens,
  shadows,
  sizes,
  spacing,
  textStyles,
  zIndex,
} from "./src/tokens";

export const flumpPreset = definePreset({
  // `compact` density: set data-density="compact" on any ancestor (see tokens/layout.ts).
  conditions: {
    extend: {
      compact: "[data-density=compact] &",
    },
  },
  theme: {
    extend: {
      tokens: {
        colors,
        fonts,
        fontSizes,
        fontWeights,
        lineHeights,
        letterSpacings,
        spacing,
        sizes,
        radii,
        shadows,
        durations,
        easings,
        zIndex,
      },
      semanticTokens,
      textStyles,
      keyframes: motionKeyframes,
    },
  },
});
export default flumpPreset;
