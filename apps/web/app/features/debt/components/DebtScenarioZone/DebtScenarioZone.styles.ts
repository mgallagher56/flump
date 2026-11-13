import { css, cva } from "@repo/ui/styled-system/css";

export const zoneRoot = cva({
  base: {
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    padding: { base: "16px", md: "24px" },
    backgroundColor: "surface.sunken",
    borderRadius: "2xl",
    borderWidth: "2px",
    borderStyle: "dashed",
    borderColor: "border.strong",
  },
});

export const zoneHeader = cva({
  base: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "8px 16px",
  },
});

export const zoneTitleRow = cva({
  base: { display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px 12px" },
});

export const zoneHeading = css({
  margin: 0,
  textStyle: "heading.lg",
  color: "text.primary",
});

export const basisLine = css({
  margin: 0,
  fontSize: "sm",
  color: "text.secondary",
  fontVariantNumeric: "tabular-nums",
});
