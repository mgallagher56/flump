import { cva } from "../../../styled-system/css";

export const statusBadgeRecipe = cva({
  base: {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    borderRadius: "full",
    fontWeight: "bold",
    borderWidth: "1px",
    borderStyle: "solid",
    fontVariantNumeric: "tabular-nums",
    whiteSpace: "nowrap",
    lineHeight: "1.2",
  },
  variants: {
    variant: {
      positive: {
        backgroundColor: "status.positive.bg",
        color: "status.positive.text",
        borderColor: "status.positive.border",
      },
      warning: {
        backgroundColor: "status.warning.bg",
        color: "status.warning.text",
        borderColor: "status.warning.border",
      },
      danger: {
        backgroundColor: "status.danger.bg",
        color: "status.danger.text",
        borderColor: "status.danger.border",
      },
      info: {
        backgroundColor: "status.info.bg",
        color: "status.info.text",
        borderColor: "status.info.border",
      },
      neutral: {
        backgroundColor: "status.neutral.bg",
        color: "status.neutral.text",
        borderColor: "status.neutral.border",
      },
      brand: {
        backgroundColor: "primary.subtle",
        color: "primary",
        borderColor: "primary.border",
      },
    },
    size: {
      sm: {
        px: "10px",
        py: "2px",
        fontSize: "xs",
      },
      md: {
        px: "12px",
        py: "4px",
        fontSize: "sm",
      },
    },
  },
  defaultVariants: {
    variant: "neutral",
    size: "sm",
  },
});

/** Wraps the icon so a Lucide `<Icon size="sm">` sits at badge scale. Decorative only. */
export const statusBadgeIcon = cva({
  base: {
    display: "inline-flex",
    alignItems: "center",
    flex: "none",
    "& svg": { width: "14px", height: "14px", strokeWidth: "2.2" },
  },
});
