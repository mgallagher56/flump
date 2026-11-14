import { cva } from "@repo/ui/styled-system/css";

/** Sits inside the "Your details" card, below the saved facts, separated by a hairline. */
export const listRoot = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "1",
    pt: "2",
    borderTopWidth: "1px",
    borderTopStyle: "solid",
    borderTopColor: "border.subtle",
  },
});

export const potList = cva({
  base: { listStyle: "none", margin: 0, p: 0, display: "flex", flexDirection: "column" },
});

export const potRow = cva({
  base: {
    display: "flex",
    alignItems: "center",
    gap: "2",
    py: "1.5",
    "&:not(:last-child)": {
      borderBottomWidth: "1px",
      borderBottomStyle: "solid",
      borderBottomColor: "border.subtle",
    },
  },
});

export const potIdentity = cva({
  base: { display: "flex", flexDirection: "column", gap: "0.5", flex: "1", minWidth: 0 },
});

export const potLink = cva({
  base: {
    display: "block",
    maxWidth: "100%",
    alignSelf: "flex-start",
    textAlign: "left",
    whiteSpace: "normal",
    overflowWrap: "anywhere",
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
