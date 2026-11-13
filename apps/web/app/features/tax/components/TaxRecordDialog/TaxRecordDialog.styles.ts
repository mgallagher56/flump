import { cva } from "@repo/ui/styled-system/css";

export const form = cva({
  base: { display: "flex", flexDirection: "column", gap: "4", marginTop: "4" },
});

export const fieldRow = cva({
  base: {
    display: "grid",
    gridTemplateColumns: { base: "1fr", sm: "1fr 1fr" },
    gap: "4",
  },
});

export const receiptBox = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "2",
  },
});

export const receiptLabel = cva({
  base: { textStyle: "label.md", color: "text.primary" },
});

export const receiptHint = cva({
  base: { textStyle: "body.sm", color: "text.muted", margin: 0 },
});

export const receiptChosen = cva({
  base: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "3",
    px: "3",
    py: "2",
    borderRadius: "md",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.subtle",
    backgroundColor: "surface.sunken",
    minWidth: 0,
  },
});

export const receiptName = cva({
  base: {
    display: "inline-flex",
    alignItems: "center",
    gap: "2",
    minWidth: 0,
    textStyle: "body.sm",
    color: "text.primary",
    "& > span": { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  },
});

export const uploadRow = cva({
  base: { display: "flex", flexWrap: "wrap", gap: "2" },
});

/** A label styled as a secondary button; the file input inside it is visually hidden. */
export const uploadLabel = cva({
  base: {
    display: "inline-flex",
    alignItems: "center",
    gap: "2",
    minHeight: "density.control.sm",
    px: "3",
    borderRadius: "md",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border",
    backgroundColor: "surface.subtle",
    color: "text.primary",
    textStyle: "label.md",
    cursor: "pointer",
    _hover: { backgroundColor: "surface.sunken", borderColor: "border.strong" },
    _focusWithin: {
      outlineWidth: "2px",
      outlineStyle: "solid",
      outlineColor: "border.focusRing",
      outlineOffset: "2px",
    },
    "@media (pointer: coarse)": { minHeight: "touch" },
    "& input": {
      position: "absolute",
      width: "1px",
      height: "1px",
      overflow: "hidden",
      clip: "rect(0 0 0 0)",
      whiteSpace: "nowrap",
    },
  },
});

export const footer = cva({
  base: {
    display: "flex",
    justifyContent: "flex-end",
    flexWrap: "wrap",
    gap: "2",
    marginTop: "2",
  },
});
