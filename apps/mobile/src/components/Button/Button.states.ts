import type { ButtonProps } from "./Button";

/** Named prop sets for the dev gallery and the tests (in place of Storybook stories). */
export const buttonStates = {
  primary: { children: "Save", variant: "primary" },
  secondary: { children: "Cancel", variant: "secondary" },
  outline: { children: "Add an account", variant: "outline" },
  ghost: { children: "Not now", variant: "ghost" },
  link: { children: "Read the privacy notice", variant: "link", accessibilityRole: "link" },
  danger: { children: "Delete account", variant: "danger" },
  dangerSubtle: { children: "Remove", variant: "dangerSubtle" },
  small: { children: "Edit", size: "sm" },
  large: { children: "Start your check-in", size: "lg" },
  pending: { children: "Saving", pending: true },
  disabled: { children: "Save", disabled: true },
} satisfies Record<string, ButtonProps>;
