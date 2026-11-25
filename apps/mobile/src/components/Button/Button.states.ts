import type { ButtonProps } from "./Button";

/** Named prop sets for the dev gallery and the tests (in place of Storybook stories). */
export const buttonStates = {
  primary: { label: "Save", variant: "primary" },
  secondary: { label: "Cancel", variant: "secondary" },
  outline: { label: "Add an account", variant: "outline" },
  ghost: { label: "Not now", variant: "ghost" },
  link: { label: "Read the privacy notice", variant: "link", accessibilityRole: "link" },
  danger: { label: "Delete account", variant: "danger" },
  dangerSubtle: { label: "Remove", variant: "dangerSubtle" },
  small: { label: "Edit", size: "sm" },
  large: { label: "Start your check-in", size: "lg" },
  pending: { label: "Saving", pending: true },
  disabled: { label: "Save", disabled: true },
} satisfies Record<string, ButtonProps>;
