import { cva } from "@repo/ui/styled-system/css";

/** The one place on the page for what-ifs: sunken, dashed outline, never a saved figure. */
export const zoneRoot = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    minWidth: 0,
    padding: { base: "16px", md: "24px" },
    borderRadius: "xl",
    backgroundColor: "surface.sunken",
    borderWidth: "2px",
    borderStyle: "dashed",
    borderColor: "border.strong",
  },
});

export const zoneHeader = cva({
  base: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: "12px",
  },
});

export const zoneHeadingRow = cva({
  base: { display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px 12px" },
});

export const zoneTitle = cva({
  base: { margin: 0, textStyle: "heading.lg", color: "text.primary" },
});

export const zoneBasis = cva({
  base: {
    margin: 0,
    textStyle: "body.sm",
    color: "text.secondary",
    fontVariantNumeric: "tabular-nums",
  },
});

export const zoneFooter = cva({
  base: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "8px",
    textStyle: "body.sm",
    color: "text.muted",
  },
});
