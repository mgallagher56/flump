import type { FlumpLogoProps } from "./FlumpLogo";

/** Named prop sets for the dev gallery and the tests (in place of Storybook stories). */
export const flumpLogoStates = {
  small: { size: "sm" },
  medium: { size: "md" },
  large: { size: "lg" },
  named: { size: "lg", label: "Flump" },
} satisfies Record<string, FlumpLogoProps>;
