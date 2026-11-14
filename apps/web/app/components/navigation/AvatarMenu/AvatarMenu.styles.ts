import { cva } from "@repo/ui/styled-system/css";

export const container = cva({
  base: { position: "relative", display: "inline-flex", alignItems: "center" },
});

export const trigger = cva({
  base: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "1",
    minWidth: "44px",
    minHeight: "44px",
    padding: "1",
    borderRadius: "full",
    borderWidth: "0",
    backgroundColor: "transparent",
    cursor: "pointer",
    color: "text.secondary",
    _hover: { boxShadow: "xs" },
    _focusVisible: {
      outline: "2px solid",
      outlineColor: "border.focusRing",
      outlineOffset: "2px",
    },
    // Before hydration: cannot open yet, so no hover lift and a progress cursor.
    '&[aria-disabled="true"]': { cursor: "progress", _hover: { boxShadow: "none" } },
  },
});

export const panel = cva({
  base: {
    position: "absolute",
    top: "calc(100% + 10px)",
    right: "0",
    minWidth: "220px",
    padding: "2",
    borderRadius: "xl",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.subtle",
    backgroundColor: "surface.overlay",
    boxShadow: "overlay",
    zIndex: 100,
    display: "flex",
    flexDirection: "column",
    gap: "1",
  },
});

export const item = cva({
  base: {
    display: "flex",
    alignItems: "center",
    gap: "3",
    width: "100%",
    padding: "10px 12px",
    borderRadius: "lg",
    borderWidth: "0",
    textAlign: "left",
    textDecoration: "none",
    textStyle: "label.md",
    color: "text.primary",
    backgroundColor: "transparent",
    cursor: "pointer",
    _hover: { backgroundColor: "surface.subtle" },
    _focusVisible: {
      outline: "2px solid",
      outlineColor: "border.focusRing",
      outlineOffset: "-2px",
    },
  },
});

export const divider = cva({
  base: { height: "1px", margin: "1 0", backgroundColor: "border.subtle" },
});

export const srOnly = cva({ base: { srOnly: true } });
