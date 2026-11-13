import { cva } from "@repo/ui/styled-system/css";

export const fieldStack = cva({
  base: { display: "flex", flexDirection: "column", gap: "16px", minWidth: 0 },
});

export const nativeSelect = cva({
  base: {
    width: "100%",
    minHeight: "44px",
    paddingX: "12px",
    borderRadius: "md",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.input",
    backgroundColor: "surface.card",
    color: "text.primary",
    textStyle: "body.md",
    cursor: "pointer",
    _focusVisible: {
      outline: "2px solid",
      outlineColor: "border.focusRing",
      outlineOffset: "2px",
    },
  },
});

export const saveError = cva({
  base: {
    display: "flex",
    alignItems: "flex-start",
    gap: "8px",
    margin: 0,
    paddingX: "12px",
    paddingY: "8px",
    textStyle: "body.sm",
    color: "status.danger.text",
    backgroundColor: "status.danger.bg",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "status.danger.border",
    borderRadius: "md",
  },
});

export const tabsWrap = cva({
  base: { marginBottom: "16px" },
});

export const tabLabel = cva({
  base: { display: "inline-flex", alignItems: "center", gap: "6px" },
});

export const dialogFooterGroup = cva({
  base: { display: "flex", gap: "8px", flexWrap: "wrap", marginLeft: "auto" },
});

export const bankStack = cva({
  base: { display: "flex", flexDirection: "column", gap: "12px", width: "100%", minWidth: 0 },
});

export const noticeRow = cva({
  base: {
    display: "flex",
    alignItems: "flex-start",
    gap: "8px",
    color: "text.secondary",
    minWidth: 0,
  },
});

export const noticeBox = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    padding: "12px 14px",
    borderRadius: "lg",
    backgroundColor: "surface.sunken",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.subtle",
    minWidth: 0,
  },
});

export const helperText = cva({
  base: { margin: 0, textStyle: "body.sm", color: "text.muted", overflowWrap: "anywhere" },
});

export const bankGrid = cva({
  base: {
    display: "grid",
    gridTemplateColumns: { base: "1fr", sm: "repeat(2, minmax(0, 1fr))" },
    gap: "8px",
    maxHeight: "260px",
    overflowY: "auto",
    overflowX: "hidden",
    paddingRight: "2px",
    minWidth: 0,
  },
});

export const bankOption = cva({
  base: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    width: "100%",
    minWidth: 0,
    padding: "8px 10px",
    borderRadius: "lg",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.subtle",
    backgroundColor: "surface.card",
    color: "text.primary",
    textAlign: "left",
    cursor: "pointer",
    _hover: { borderColor: "border.strong" },
    _focusVisible: {
      outline: "2px solid",
      outlineColor: "border.focusRing",
      outlineOffset: "2px",
    },
  },
  variants: {
    selected: {
      true: { borderColor: "primary", backgroundColor: "primary.subtle", color: "text.primary" },
      false: {},
    },
  },
  defaultVariants: { selected: false },
});

export const bankAvatar = cva({
  base: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "28px",
    height: "28px",
    borderRadius: "full",
    backgroundColor: "surface.sunken",
    color: "text.secondary",
    textStyle: "label.md",
    flexShrink: 0,
  },
});

export const bankText = cva({
  base: { display: "flex", flexDirection: "column", flex: 1, minWidth: 0, gap: "2px" },
});

export const bankNameRow = cva({
  base: { display: "flex", alignItems: "center", gap: "6px", minWidth: 0 },
});

export const bankName = cva({
  base: {
    margin: 0,
    textStyle: "label.md",
    color: "text.primary",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
});

export const liveBadge = cva({
  base: {
    textStyle: "label.sm",
    paddingX: "6px",
    borderRadius: "full",
    backgroundColor: "status.positive.bg",
    color: "status.positive.text",
    flexShrink: 0,
  },
});
