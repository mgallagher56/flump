import { cva } from "@repo/ui/styled-system/css";

export const rowRoot = cva({
  base: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: "12px",
    padding: "12px 16px",
    borderRadius: "lg",
    backgroundColor: "surface.card",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.subtle",
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
