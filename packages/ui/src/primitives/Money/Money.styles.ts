import { cva } from "../../../styled-system/css";

export const moneyRecipe = cva({
  base: {
    display: "inline-flex",
    alignItems: "baseline",
    flexWrap: "wrap",
    gap: "2",
    fontVariantNumeric: "tabular-nums",
    whiteSpace: "nowrap",
    margin: 0,
  },
  variants: {
    size: {
      kpi: { textStyle: "numeric.kpi" },
      lg: { textStyle: "numeric.lg" },
      md: { textStyle: "numeric.md" },
      sm: { textStyle: "numeric.sm" },
    },
    tone: {
      default: { color: "text.primary" },
      positive: { color: "status.positive.text" },
      danger: { color: "status.danger.text" },
      muted: { color: "text.muted" },
      /** For figures on `surface.hero` or `surface.contrast`. */
      onContrast: { color: "text.onContrast" },
    },
  },
  defaultVariants: { size: "md", tone: "default" },
});

/** The single "Not set" rendering (D16): always muted, regardless of tone. */
export const notSetRecipe = cva({
  base: {
    color: "text.muted",
    fontVariantNumeric: "tabular-nums",
  },
});

export const notSetActionRecipe = cva({
  base: {
    display: "inline-flex",
    alignItems: "center",
    fontSize: "sm",
    lineHeight: "1.4",
    fontWeight: "500",
    color: "text.secondary",
  },
});
