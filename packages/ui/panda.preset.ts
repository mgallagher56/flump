import { definePreset } from "@pandacss/dev";
import { colors, radii, semanticTokens, spacing } from "./src/tokens";

export const flumpPreset = definePreset({
  theme: {
    extend: {
      tokens: {
        colors,
        spacing,
        radii,
      },
      semanticTokens,
    },
  },
});
export default flumpPreset;
