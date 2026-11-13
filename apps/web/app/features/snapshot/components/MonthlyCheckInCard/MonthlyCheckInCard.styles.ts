import { cva } from "@repo/ui/styled-system/css";

export const cardBody = cva({
  base: { display: "flex", flexDirection: "column", gap: "8px", minWidth: 0 },
});

export const cardHeader = cva({
  base: { display: "flex", alignItems: "center", gap: "8px", color: "primary" },
});

export const cardTitle = cva({
  base: { margin: 0, textStyle: "heading.sm", color: "text.primary" },
});

export const cardText = cva({
  base: {
    margin: 0,
    textStyle: "body.sm",
    color: "text.secondary",
    fontVariantNumeric: "tabular-nums",
  },
});

export const cardLinks = cva({
  base: { display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "4px" },
});
