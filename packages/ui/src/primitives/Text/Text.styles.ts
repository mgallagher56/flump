import { cva } from "../../../styled-system/css";

/** Colours a Text or Heading may use: `text.*` and `status.*.text` only. */
export const textColors = [
  "primary",
  "secondary",
  "muted",
  "onContrast",
  "positive",
  "warning",
  "danger",
  "info",
  "neutral",
] as const;

export type TextColor = (typeof textColors)[number];

/** Shared colour variants, so Text and Heading cannot drift apart. */
export const textColorVariants = {
  primary: { color: "text.primary" },
  secondary: { color: "text.secondary" },
  muted: { color: "text.muted" },
  /** For copy on `surface.hero` or `surface.contrast`. */
  onContrast: { color: "text.onContrast" },
  positive: { color: "status.positive.text" },
  warning: { color: "status.warning.text" },
  danger: { color: "status.danger.text" },
  info: { color: "status.info.text" },
  neutral: { color: "status.neutral.text" },
} as const;

export const textRecipe = cva({
  base: { margin: 0 },
  variants: {
    textStyle: {
      "body.lg": { textStyle: "body.lg" },
      "body.md": { textStyle: "body.md" },
      "body.sm": { textStyle: "body.sm" },
      "label.md": { textStyle: "label.md" },
      "label.sm": { textStyle: "label.sm" },
      "numeric.lg": { textStyle: "numeric.lg" },
      "numeric.md": { textStyle: "numeric.md" },
      "numeric.sm": { textStyle: "numeric.sm" },
    },
    color: textColorVariants,
    /** Figures: currency, percentages, dates. */
    tabular: { true: { fontVariantNumeric: "tabular-nums" } },
    truncate: {
      true: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 },
    },
    lineClamp: {
      1: { lineClamp: "1" },
      2: { lineClamp: "2" },
      3: { lineClamp: "3" },
      4: { lineClamp: "4" },
    },
  },
  defaultVariants: { textStyle: "body.md", color: "primary" },
});
