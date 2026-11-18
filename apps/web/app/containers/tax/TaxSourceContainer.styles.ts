import { cva } from "@repo/ui/styled-system/css";

export const pageRoot = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "page.section",
    width: "100%",
    minWidth: 0,
    paddingBottom: { base: "6", md: "12" },
  },
});

/** "Back to Self Assessment", above the h1. */
export const backLink = cva({
  base: {
    display: "inline-flex",
    alignItems: "center",
    gap: "2",
    width: "fit-content",
    color: "text.secondary",
    textStyle: "label.md",
    textDecoration: "none",
    borderRadius: "sm",
    _hover: { color: "primary", textDecoration: "underline" },
    _focusVisible: { outline: "2px solid", outlineColor: "border.focusRing", outlineOffset: "2px" },
  },
});

/** "Add income" and "Add expense", side by side, wrapping on a narrow screen. */
export const addActions = cva({
  base: { display: "inline-flex", flexWrap: "wrap", gap: "2" },
});

export const errorText = cva({
  base: { textStyle: "body.sm", color: "text.primary", margin: 0 },
});
