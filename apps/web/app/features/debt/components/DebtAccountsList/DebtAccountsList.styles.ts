import { css, cva } from "@repo/ui/styled-system/css";

export const listCard = cva({
  base: {
    minWidth: 0,
    padding: { base: "16px", md: "24px" },
    backgroundColor: "surface.card",
    borderRadius: "xl",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.subtle",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
});

export const listHeading = css({
  margin: 0,
  textStyle: "heading.md",
  color: "text.primary",
});

export const listSubtitle = css({
  margin: 0,
  marginTop: "2px",
  fontSize: "xs",
  color: "text.muted",
});

export const listReset = css({
  listStyle: "none",
  margin: 0,
  padding: 0,
  display: "flex",
  flexDirection: "column",
});

export const rowItem = css({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "8px 16px",
  paddingBlock: "12px",
  borderBottomWidth: "1px",
  borderBottomStyle: "solid",
  borderBottomColor: "border.subtle",
  _last: { borderBottomWidth: 0 },
});

export const rowMain = css({ display: "flex", flexDirection: "column", gap: "2px", minWidth: 0 });

export const rowName = css({ fontWeight: "semibold", color: "text.primary" });

export const rowDetail = css({
  display: "inline-flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: "0 4px",
  fontSize: "sm",
  color: "text.secondary",
  fontVariantNumeric: "tabular-nums",
});

export const rowFigures = css({
  display: "flex",
  alignItems: "center",
  gap: "8px",
  marginInlineStart: "auto",
});

export const balanceFigure = css({
  fontVariantNumeric: "tabular-nums",
  fontWeight: "semibold",
  color: "text.primary",
});

export const actionsCell = cva({
  base: { display: "inline-flex", alignItems: "center", gap: "4px" },
});

export const drawerWrap = css({ marginTop: "8px" });
