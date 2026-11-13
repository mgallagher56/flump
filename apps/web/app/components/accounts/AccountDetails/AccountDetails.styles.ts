import { cva } from "@repo/ui/styled-system/css";

export const detailsRoot = cva({
  base: { display: "flex", flexDirection: "column", gap: "24px", minWidth: 0 },
});

export const panel = cva({
  base: { display: "flex", flexDirection: "column", gap: "24px", minWidth: 0 },
});

export const sectionTitle = cva({
  base: { textStyle: "heading.md", color: "text.primary", margin: 0 },
});

export const chartBox = cva({
  base: { height: { base: "240px", md: "340px" }, width: "100%", minWidth: 0 },
});

export const chartEmpty = cva({
  base: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    color: "text.muted",
    textStyle: "body.md",
  },
});

export const section = cva({
  base: { display: "flex", flexDirection: "column", gap: "12px", minWidth: 0 },
});

export const monthCell = cva({
  base: { color: "text.primary", textStyle: "label.md" },
});

export const mutedFigure = cva({
  base: { color: "text.muted", fontVariantNumeric: "tabular-nums" },
});

export const drawerWrap = cva({
  base: { marginTop: "4px" },
});
