import { cva } from "../../../styled-system/css";

export const progressHeaderRecipe = cva({
  base: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    gap: "12px",
    marginBlockEnd: "8px",
    fontSize: "sm",
  },
});

export const progressLabelRecipe = cva({
  base: { color: "text.secondary", fontWeight: "medium", minWidth: 0 },
});

export const progressValueRecipe = cva({
  base: {
    color: "text.primary",
    fontWeight: "bold",
    fontVariantNumeric: "tabular-nums",
    whiteSpace: "nowrap",
    textAlign: "end",
  },
});

export const progressTrackRecipe = cva({
  base: {
    width: "100%",
    backgroundColor: "surface.sunken",
    borderRadius: "full",
    overflow: "hidden",
  },
  variants: {
    size: {
      sm: { height: "6px" },
      md: { height: "10px" },
      lg: { height: "14px" },
    },
  },
  defaultVariants: { size: "md" },
});

/**
 * The fill width comes from the `--progress-value` custom property, set once on the fill element
 * (the only inline style in the component, a dynamic length cannot be a static class).
 */
export const progressFillRecipe = cva({
  base: {
    height: "100%",
    width: "var(--progress-value, 0%)",
    borderRadius: "full",
    transition: "width 0.3s ease-out",
    _motionReduce: { transition: "none" },
  },
  variants: {
    variant: {
      primary: { backgroundColor: "primary" },
      positive: { backgroundColor: "status.positive.solid" },
      warning: { backgroundColor: "status.warning.solid" },
      danger: { backgroundColor: "status.danger.solid" },
      neutral: { backgroundColor: "status.neutral.solid" },
    },
  },
  defaultVariants: {
    variant: "primary",
  },
});
