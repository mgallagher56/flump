import { cva } from "../../../styled-system/css";

export const taxRatesBanner = cva({
  base: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: "12px",
    borderRadius: "xl",
    borderWidth: "1px",
    borderStyle: "solid",
    p: "12px 16px",
    fontSize: "sm",
    fontVariantNumeric: "tabular-nums",
  },
  variants: {
    kind: {
      fallback: {
        borderColor: "status.warning.border",
        backgroundColor: "status.warning.bg",
        color: "status.warning.text",
      },
      provisional: {
        borderColor: "status.info.border",
        backgroundColor: "status.info.bg",
        color: "status.info.text",
      },
    },
  },
  defaultVariants: { kind: "fallback" },
});

export const taxRatesBannerDismiss = cva({
  base: {
    flexShrink: 0,
    cursor: "pointer",
    background: "transparent",
    border: "none",
    color: "inherit",
    textDecoration: "underline",
    fontSize: "sm",
    p: "0",
  },
});
