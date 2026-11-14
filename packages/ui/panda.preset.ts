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
  navConditions,
  radii,
  semanticTokens,
  shadows,
  sizes,
  spacing,
  textStyles,
  zIndex,
} from "./src/tokens";

export const flumpPreset = definePreset({
  // `compact` density: set data-density="compact" on any ancestor (see layout.ts in @flump/tokens).
  conditions: {
    extend: {
      compact: "[data-density=compact] &",
      // Top nav switch (inline links vs menu button + drawer), shared by web and marketing.
      ...navConditions,
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
