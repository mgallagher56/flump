import { cva } from "@repo/ui/styled-system/css";

export const actionsRow = cva({
  base: { display: "flex", flexWrap: "wrap", gap: "8px" },
});

export const statusLine = cva({
  base: {
    margin: 0,
    textStyle: "body.md",
    color: "text.secondary",
    fontVariantNumeric: "tabular-nums",
  },
});

export const commitBar = cva({
  base: {
    display: "flex",
    flexDirection: { base: "column", md: "row" },
    alignItems: { base: "stretch", md: "center" },
    justifyContent: "space-between",
    gap: "12px",
    padding: "16px",
    borderRadius: "lg",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.DEFAULT",
    backgroundColor: "surface.card",
    position: { md: "sticky" },
    bottom: { md: "16px" },
  },
});

export const commitSummary = cva({
  base: {
    margin: 0,
    textStyle: "body.md",
    color: "text.primary",
    fontVariantNumeric: "tabular-nums",
  },
});
