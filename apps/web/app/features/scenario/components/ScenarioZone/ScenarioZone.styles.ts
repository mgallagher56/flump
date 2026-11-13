import { cva } from "@repo/ui/styled-system/css";

export const zoneRoot = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    minWidth: 0,
    padding: { base: "16px", md: "24px" },
    borderRadius: "xl",
    backgroundColor: "surface.sunken",
    borderWidth: "1.5px",
    borderStyle: "dashed",
    borderColor: "border.strong",
  },
});

export const zoneHeader = cva({
  base: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: "8px 12px",
  },
});

export const zoneTitleRow = cva({
  base: { display: "flex", alignItems: "center", flexWrap: "wrap", gap: "8px 12px" },
});

export const zoneTitle = cva({
  base: { textStyle: "heading.lg", color: "text.primary", margin: 0 },
});

export const zoneBasis = cva({
  base: {
    textStyle: "body.sm",
    color: "text.secondary",
    margin: 0,
    fontVariantNumeric: "tabular-nums",
  },
});

export const zoneBody = cva({
  base: { display: "flex", flexDirection: "column", gap: "16px", minWidth: 0 },
});

export const zoneFooter = cva({
  base: { display: "flex", flexWrap: "wrap", gap: "8px 16px", alignItems: "center" },
});
