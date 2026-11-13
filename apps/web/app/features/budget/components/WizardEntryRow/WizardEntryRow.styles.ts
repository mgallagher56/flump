import { cva } from "@repo/ui/styled-system/css";

export const entryRow = cva({
  base: {
    display: "grid",
    gridTemplateColumns: { base: "1fr auto", sm: "minmax(0, 1fr) auto auto" },
    gap: "12px",
    alignItems: "center",
    paddingY: "12px",
    borderBottomWidth: "1px",
    borderBottomStyle: "solid",
    borderBottomColor: "border.subtle",
    "&:last-child": { borderBottom: "none" },
  },
});

export const entryName = cva({
  base: {
    textStyle: "label.md",
    color: "text.primary",
    margin: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
});

export const essentialToggle = cva({
  base: {
    background: "none",
    border: "none",
    padding: 0,
    cursor: "pointer",
    textStyle: "label.sm",
    color: "text.muted",
    textDecoration: "underline",
    textUnderlineOffset: "3px",
    _focusVisible: {
      outline: "2px solid",
      outlineColor: "border.focusRing",
      outlineOffset: "2px",
    },
  },
});

export const entryControls = cva({
  base: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    gridColumn: { base: "1 / -1", sm: "auto" },
    gridRow: { base: 2, sm: "auto" },
  },
});

export const amountField = cva({
  base: { width: "130px" },
});

export const frequencySelect = cva({
  base: { width: "auto", minWidth: "84px" },
});
