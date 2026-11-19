import { cva } from "@repo/ui/styled-system/css";

/** A quiet note under the projection: muted text, no card, no fill, never a warning colour. */
export const text = cva({
  base: { textStyle: "body.sm", color: "text.muted", margin: 0 },
});

export const link = cva({
  base: {
    color: "primary",
    textDecoration: "underline",
    _focusVisible: { outline: "2px solid", outlineColor: "border.focusRing", outlineOffset: "2px" },
  },
});
