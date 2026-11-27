import { definePreset } from "@pandacss/dev";
import {
  colorSchemeConditions,
  colors,
  durations,
  easings,
  fontSizes,
  fonts,
  fontWeights,
  letterSpacings,
  lineHeights,
  marketingDurations,
  marketingEasings,
  motionKeyframes,
  navConditions,
  radii,
  semanticTokens,
  shadows,
  sizes,
  spacing,
  textStyles,
  withSystemDark,
  zIndex,
} from "./src/tokens";

// Re-exported so each app's panda.config.ts declares the same dark conditions (D30).
export { colorSchemeConditions };

export const flumpPreset = definePreset({
  // `compact` density: set data-density="compact" on any ancestor (see layout.ts in @flump/tokens).
  conditions: {
    extend: {
      compact: "[data-density=compact] &",
      // Dark mode: the theme script's class or data-theme, and the system setting when JavaScript is
      // off (D30). Semantic tokens carry both through withSystemDark.
      ...colorSchemeConditions,
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
      semanticTokens: withSystemDark(semanticTokens),
      textStyles,
      keyframes: motionKeyframes,
    },
  },
});
/**
 * The marketing site's calm motion scale (STYLE-GUIDE 11), as `durations.marketing.*` and
 * `easings.marketing.*`. Only `apps/marketing` adds this preset: the web app never gets the calm
 * scale (UX-GUIDELINES M2), so its generated token types and CSS variables never include it.
 */
export const flumpMarketingPreset = definePreset({
  theme: {
    extend: {
      tokens: {
        durations: { marketing: marketingDurations },
        easings: { marketing: marketingEasings },
      },
    },
  },
});

export default flumpPreset;
