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

export const tileIcon = cva({
  base: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "44px",
    height: "44px",
    borderRadius: "lg",
    backgroundColor: "primary.subtle",
    color: "primary",
  },
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
