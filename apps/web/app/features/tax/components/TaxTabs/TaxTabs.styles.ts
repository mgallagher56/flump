import { cva } from "@repo/ui/styled-system/css";

/** Matches `@repo/ui` SegmentedTabs, with real tab panels behind it. */
export const list = cva({
  base: {
    display: "inline-flex",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: "1",
    padding: "1",
    maxWidth: "100%",
    overflowX: "auto",
    backgroundColor: "surface.sunken",
    borderRadius: "xl",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.subtle",
  },
});

export const tab = cva({
  base: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "9",
    px: "4",
    py: "2",
    whiteSpace: "nowrap",
    textStyle: "label.md",
    color: "text.secondary",
    backgroundColor: "transparent",
    borderRadius: "lg",
    border: "none",
    cursor: "pointer",
    transition: "background-color 0.15s ease, color 0.15s ease",
    "@media (pointer: coarse)": { minHeight: "touch" },
    _hover: { color: "text.primary" },
    _focusVisible: {
      outlineWidth: "2px",
      outlineStyle: "solid",
      outlineColor: "border.focusRing",
      outlineOffset: "2px",
    },
    "&[aria-selected=true]": {
      backgroundColor: "surface.card",
      color: "text.primary",
      boxShadow: "xs",
    },
  },
});

export const panel = cva({
  base: { minWidth: 0, _focusVisible: { outline: "none" } },
});

export const root = cva({
  base: { display: "flex", flexDirection: "column", gap: "5", minWidth: 0 },
});
