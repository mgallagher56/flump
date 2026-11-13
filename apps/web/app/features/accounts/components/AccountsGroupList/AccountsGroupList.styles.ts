import { cva } from "@repo/ui/styled-system/css";

export const listRoot = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: { base: "24px", md: "32px" },
    minWidth: 0,
  },
});

export const group = cva({
  base: { display: "flex", flexDirection: "column", gap: "12px", minWidth: 0 },
});

export const groupHeader = cva({
  base: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: "8px",
  },
});

export const groupTitle = cva({
  base: { textStyle: "heading.md", color: "text.primary", margin: 0 },
});

export const groupMeta = cva({
  base: {
    textStyle: "body.sm",
    color: "text.muted",
    fontVariantNumeric: "tabular-nums",
    margin: 0,
  },
});

export const accountCell = cva({
  base: { display: "flex", alignItems: "center", gap: "12px", minWidth: 0 },
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
    textStyle: "label.md",
    color: "text.primary",
    textDecoration: "none",
    borderRadius: "sm",
    _hover: { color: "primary", textDecoration: "underline" },
    _focusVisible: {
      outline: "2px solid",
      outlineColor: "border.focusRing",
      outlineOffset: "2px",
    },
  },
});

export const actionsCell = cva({
  base: { display: "flex", justifyContent: "flex-end" },
});

export const noChange = cva({
  base: { color: "text.muted", textStyle: "body.sm" },
});

export const drawerWrap = cva({
  base: { marginTop: "4px" },
});
