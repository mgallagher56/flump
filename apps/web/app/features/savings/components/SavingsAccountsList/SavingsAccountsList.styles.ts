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

/** The name column wraps at 375 so the table never scrolls sideways. */
export const nameCell = cva({
  base: { whiteSpace: "normal", minWidth: 0, width: "100%" },
});

/** Balance and actions take only the room they need, so the figure sits beside the icons. */
export const tightCell = cva({
  base: { whiteSpace: "nowrap", width: "1%" },
});

export const accountMeta = cva({
  base: { display: "flex", flexDirection: "column", gap: "2px", minWidth: 0 },
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
