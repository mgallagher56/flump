import { cva } from "@repo/ui/styled-system/css";

/** A muted note with an ordinary text link: not a button, card or banner. */
export const helpRoot = cva({
  base: { display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "2" },
});

export const helpLine = cva({
  base: { textStyle: "body.sm", color: "text.secondary", margin: 0 },
});

export const helpLink = cva({
  base: {
    color: "primary",
    textDecoration: "underline",
    _focusVisible: { outline: "2px solid", outlineColor: "border.focusRing", outlineOffset: "2px" },
  },
});

/** Says the link opens in a new tab, for screen readers only. */
export const srOnly = cva({ base: { srOnly: true } });
