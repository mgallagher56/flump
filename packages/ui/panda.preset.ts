import { definePreset } from "@pandacss/dev";
import { colors, fontSizes, fonts, radii, semanticTokens, shadows, spacing } from "./src/tokens";

export const flumpPreset = definePreset({
  theme: {
    extend: {
      tokens: {
        colors,
        fonts,
        fontSizes,
        spacing,
        radii,
        shadows,
      },
      semanticTokens,
    },
  },
});
export default flumpPreset;
