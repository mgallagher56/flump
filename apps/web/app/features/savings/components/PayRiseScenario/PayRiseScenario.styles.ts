import { cva } from "@repo/ui/styled-system/css";

export const rowRoot = cva({
  base: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: "12px",
    // Flat on the zone: the result block is the only card inside a modelling zone (E17 5A).
    paddingTop: "12px",
    borderTopWidth: "1px",
    borderTopStyle: "solid",
    borderTopColor: "border.subtle",
  },
});

export const rowText = cva({
  base: {
    display: "inline-flex",
    alignItems: "baseline",
    gap: "6px",
    flexWrap: "wrap",
    textStyle: "body.md",
    color: "text.primary",
    margin: 0,
    fontVariantNumeric: "tabular-nums",
  },
});

/** Visually hidden, so the button reads "Remove pay rise from take-home" to assistive tech. */
export const removeLabel = cva({
  base: {
    position: "absolute",
    width: "1px",
    height: "1px",
    overflow: "hidden",
    clipPath: "inset(50%)",
    whiteSpace: "nowrap",
  },
});
