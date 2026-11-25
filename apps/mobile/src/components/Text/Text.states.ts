import type { TextProps } from "./Text";

/** Named prop sets for the dev gallery and the tests (in place of Storybook stories). */
export const textStates = {
  body: { children: "Plain words in the body style." },
  secondary: { children: "Supporting words.", color: "secondary", textStyle: "body.sm" },
  label: { children: "Label", textStyle: "label.md" },
  heading: { children: "A heading", textStyle: "heading.lg", accessibilityRole: "header" },
  figure: { children: "£12,345.67", textStyle: "numeric.lg", tabular: true },
  truncated: {
    children: "A long line that stops with an ellipsis when it runs out of room.",
    truncate: true,
  },
} satisfies Record<string, TextProps>;
