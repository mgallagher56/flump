import { cva } from "../../../styled-system/css";

/** A quiet note: no border, no fill, no card, so it never reads as a banner or a call to action. */
export const moneyHelperGuidanceText = cva({
  base: { textStyle: "body.sm", color: "text.muted", margin: 0 },
});

export const moneyHelperGuidanceLink = cva({
  base: {
    color: "primary",
    textDecoration: "underline",
    _focusVisible: { outline: "2px solid", outlineColor: "border.focusRing", outlineOffset: "2px" },
  },
});

export const moneyHelperGuidanceSrOnly = cva({ base: { srOnly: true } });
