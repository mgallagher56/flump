import { cva } from "@repo/ui/styled-system/css";

export const listRoot = cva({
  base: { display: "flex", flexDirection: "column", gap: "16px", minWidth: 0 },
});

export const listHeader = cva({
  base: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: "12px",
  },
});

export const listTitle = cva({
  base: { textStyle: "heading.lg", color: "text.primary", margin: 0 },
});

export const listMeta = cva({
  base: {
    display: "flex",
    alignItems: "baseline",
    flexWrap: "wrap",
    gap: "6px",
    textStyle: "body.sm",
    color: "text.muted",
    margin: 0,
    fontVariantNumeric: "tabular-nums",
  },
});

export const accountCell = cva({
  base: { display: "flex", alignItems: "center", gap: "12px", minWidth: "200px" },
});

export const accountIcon = cva({
  base: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "36px",
    height: "36px",
    borderRadius: "lg",
    backgroundColor: "primary.subtle",
    color: "primary",
    flexShrink: 0,
  },
});

export const accountLink = cva({
  base: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: 0,
    border: "none",
    background: "none",
    cursor: "pointer",
    textStyle: "label.md",
    color: "text.primary",
    textAlign: "left",
    _hover: { color: "primary" },
    _focusVisible: {
      outline: "2px solid",
      outlineColor: "border.focusRing",
      outlineOffset: "2px",
      borderRadius: "sm",
    },
  },
});

export const editableCell = cva({
  base: {
    background: "none",
    border: "none",
    font: "inherit",
    color: "inherit",
    textAlign: "inherit",
    fontVariantNumeric: "tabular-nums",
    cursor: "pointer",
    borderRadius: "sm",
    padding: "4px 8px",
    margin: "-4px -8px",
    _hover: { backgroundColor: "surface.subtle" },
    _focusVisible: {
      outline: "2px solid",
      outlineColor: "border.focusRing",
      outlineOffset: "2px",
    },
  },
});

export const inlineInput = cva({
  base: {
    width: "104px",
    minHeight: "36px",
    paddingX: "8px",
    textAlign: "right",
    fontVariantNumeric: "tabular-nums",
    textStyle: "body.sm",
    borderRadius: "md",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.input",
    backgroundColor: "surface.card",
    color: "text.primary",
    _focusVisible: {
      outline: "2px solid",
      outlineColor: "border.focusRing",
      outlineOffset: "2px",
    },
  },
});

export const mutedFigure = cva({
  base: { color: "text.muted", fontVariantNumeric: "tabular-nums" },
});

export const actionsCell = cva({
  base: { display: "flex", justifyContent: "flex-end", gap: "4px" },
});

export const drawerWrap = cva({
  base: { marginTop: "4px" },
});

export const mobileList = cva({
  base: { display: "flex", flexDirection: "column", gap: "12px" },
});

export const mobileCard = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    padding: "16px",
    borderRadius: "lg",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.subtle",
    backgroundColor: "surface.subtle",
  },
});

export const mobileTop = cva({
  base: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: "12px",
  },
});

export const mobileIdentity = cva({
  base: { display: "flex", flexDirection: "column", gap: "6px", alignItems: "flex-start" },
});

export const mobileFigures = cva({
  base: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: "8px",
  },
});

export const mobileFigure = cva({
  base: { display: "flex", flexDirection: "column", gap: "2px", minWidth: 0 },
});

export const mobileFigureLabel = cva({
  base: { textStyle: "label.sm", color: "text.muted" },
});

export const mobileActions = cva({
  base: { display: "flex", justifyContent: "flex-end", gap: "4px" },
});

export const layoutMobile = cva({
  base: { display: { base: "block", md: "none" } },
});

export const layoutDesktop = cva({
  base: { display: { base: "none", md: "block" }, minWidth: 0 },
});
