import { cva } from "@repo/ui/styled-system/css";

/** The pots in one card, the same as the savings accounts list. */
export const listRoot = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    minWidth: 0,
    borderRadius: "xl",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border",
    backgroundColor: "surface.card",
    overflow: "hidden",
  },
});

export const potList = cva({
  base: { listStyle: "none", margin: 0, p: 0, display: "flex", flexDirection: "column" },
});

export const potRow = cva({
  base: {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    columnGap: "2",
    rowGap: "0",
    px: "4",
    py: "3",
    "&:not(:last-child)": {
      borderBottomWidth: "1px",
      borderBottomStyle: "solid",
      borderBottomColor: "border.subtle",
    },
  },
});

export const potIdentity = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "0.5",
    flex: "1 1 9rem",
    minWidth: "9rem",
  },
});

export const potLink = cva({
  base: {
    display: "block",
    maxWidth: "100%",
    alignSelf: "flex-start",
    textAlign: "left",
    whiteSpace: "normal",
    overflowWrap: "break-word",
    p: 0,
    background: "none",
    border: "none",
    cursor: "pointer",
    textStyle: "body.md",
    color: "text.primary",
    fontWeight: "medium",
    _hover: { textDecoration: "underline" },
    _focusVisible: { outline: "2px solid", outlineColor: "border.focusRing", outlineOffset: "2px" },
  },
});

export const potMeta = cva({
  base: { textStyle: "body.sm", color: "text.secondary", whiteSpace: "nowrap" },
});

export const potBalance = cva({
  base: { fontVariantNumeric: "tabular-nums", color: "text.primary", whiteSpace: "nowrap" },
});

/** Icon buttons keep their touch target but sit flush, so the row fits on one line at 375. */
export const potActions = cva({
  base: { display: "flex", gap: "0", flexShrink: 0, mr: "-2" },
});

/** "Show all pots" inside the card, inset like the rows. */
export const drawerWrap = cva({
  base: { px: "4", pb: "2" },
});
