import { cva } from "../../../styled-system/css";

export const chartTooltip = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "2",
    minWidth: "180px",
    maxWidth: "280px",
    p: "3",
    borderRadius: "lg",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.subtle",
    backgroundColor: "surface.overlay",
    boxShadow: "floating",
    color: "text.primary",
    textStyle: "body.sm",
  },
});

export const chartTooltipTitle = cva({
  base: {
    margin: "0",
    color: "text.muted",
    fontSize: "xs",
    fontWeight: "semibold",
    fontVariantNumeric: "tabular-nums",
  },
});

export const chartTooltipRows = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "1",
    listStyle: "none",
    margin: "0",
    p: "0",
  },
});

export const chartTooltipRow = cva({
  base: {
    display: "grid",
    gridTemplateColumns: "auto 1fr auto",
    alignItems: "center",
    columnGap: "2",
  },
});

export const chartTooltipLabel = cva({
  base: { color: "text.secondary", minWidth: "0" },
});

export const chartTooltipValue = cva({
  base: { fontWeight: "semibold", fontVariantNumeric: "tabular-nums", textAlign: "right" },
});
