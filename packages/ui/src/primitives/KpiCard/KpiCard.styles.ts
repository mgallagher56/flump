import { cva } from "../../../styled-system/css";

export const kpiCardContainer = cva({
  base: {
    backgroundColor: "surface.card",
    borderRadius: "xl",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.subtle",
    p: { base: "16px", md: "20px" },
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    gap: "8px",
    height: "100%",
    boxShadow: "card",
  },
});

export const kpiEyebrow = cva({
  base: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "8px",
  },
});

export const kpiLabel = cva({
  base: {
    fontSize: "xs",
    fontWeight: "semibold",
    color: "text.muted",
    letterSpacing: "0.01em",
  },
});

export const kpiHeroValue = cva({
  base: {
    fontFamily: "display",
    fontSize: { base: "22px", md: "26px" },
    fontWeight: "bold",
    letterSpacing: "-0.02em",
    fontVariantNumeric: "tabular-nums",
    color: "text.primary",
    margin: "0",
    lineHeight: "1.2",
  },
});

export const kpiSubtext = cva({
  base: {
    fontSize: "xs",
    color: "text.muted",
    lineHeight: "1.4",
    margin: "0",
    pt: "4px",
  },
});
