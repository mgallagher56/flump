import { cva } from "@repo/ui/styled-system/css";

/** A quiet note: no border, no fill, no card, so it never reads as a banner or a call to action. */
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

export const srOnly = cva({ base: { srOnly: true } });
