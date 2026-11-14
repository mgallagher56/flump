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

export const rowList = cva({
  base: { listStyle: "none", margin: 0, padding: 0 },
});

/** Name and type on the left; balance and actions on the right, on one line from 375. */
export const row = cva({
  base: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "2",
    paddingX: "4",
    paddingY: "3",
    minWidth: 0,
    "&:not(:last-child)": {
      borderBottomWidth: "1px",
      borderBottomStyle: "solid",
      borderColor: "border.subtle",
    },
  },
});

export const rowEnd = cva({
  base: { display: "flex", alignItems: "center", gap: "2", marginLeft: "auto", flexShrink: 0 },
});

export const balance = cva({
  base: { fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" },
});

export const isaFooter = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "2",
    paddingX: "4",
    paddingY: "4",
    borderTopWidth: "1px",
    borderTopStyle: "solid",
    borderColor: "border.subtle",
  },
});

export const isaNote = cva({
  base: {
    margin: 0,
    textStyle: "body.sm",
    color: "text.secondary",
    fontVariantNumeric: "tabular-nums",
  },
});

export const accountMeta = cva({
  base: { display: "flex", flexDirection: "column", gap: "2px", minWidth: "5rem", flex: "1 1 0" },
});

export const accountLink = cva({
  base: {
    color: "text.primary",
    textDecoration: "none",
    textUnderlineOffset: "3px",
    _hover: { textDecoration: "underline" },
    _focusVisible: {
      textDecoration: "underline",
      outline: "2px solid",
      outlineColor: "border.focusRing",
      outlineOffset: "2px",
      borderRadius: "sm",
    },
  },
});

export const accountName = cva({
  base: { textStyle: "body.md", fontWeight: "semibold", overflowWrap: "anywhere" },
});

export const accountType = cva({
  base: { textStyle: "label.sm", color: "text.muted" },
});

export const actionsCell = cva({
  base: { display: "flex", justifyContent: "flex-end", gap: "4px" },
});

export const drawerWrap = cva({
  base: { marginTop: "4px" },
});
