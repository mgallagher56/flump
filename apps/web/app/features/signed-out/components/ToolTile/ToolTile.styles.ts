import { cva } from "@repo/ui/styled-system/css";

export const tileLink = cva({
  base: {
    display: "flex",
    height: "100%",
    textDecoration: "none",
    color: "inherit",
    borderRadius: "card",
    _focusVisible: { outline: "2px solid", outlineColor: "border.focusRing", outlineOffset: "2px" },
  },
});

export const tileCard = cva({
  base: { display: "flex", flexDirection: "column", gap: "12px", width: "100%" },
});

export const tileCta = cva({
  base: {
    marginTop: "auto",
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    color: "primary",
    textStyle: "label.md",
  },
});

/** One wrap rule for card titles in both apps: natural breaks, no orphaned last word. */
export const tileTitle = cva({ base: { textWrap: "pretty" } });
