import type { IconProps } from "./Icon";

/** Named prop sets for the dev gallery and the tests (in place of Storybook stories). */
export const iconStates = {
  home: { name: "house" },
  more: { name: "ellipsis" },
  selected: { name: "scale", color: "accent" },
  small: { name: "settings", size: "sm" },
  strong: { name: "menu", color: "primary" },
} satisfies Record<string, IconProps>;
