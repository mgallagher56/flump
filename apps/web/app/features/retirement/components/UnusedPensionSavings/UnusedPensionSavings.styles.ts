import { cva } from "@repo/ui/styled-system/css";

/** Facts only, the same for everyone: plain text, no figures of the user's, no status colours. */
export const stack = cva({
  base: { display: "flex", flexDirection: "column", gap: "4" },
});

export const group = cva({
  base: { display: "flex", flexDirection: "column", gap: "2" },
});

export const heading = cva({
  base: { textStyle: "heading.sm", color: "text.primary", margin: 0 },
});

export const text = cva({
  base: {
    textStyle: "body.sm",
    color: "text.secondary",
    margin: 0,
    fontVariantNumeric: "tabular-nums",
  },
});

export const note = cva({
  base: {
    textStyle: "body.sm",
    color: "text.muted",
    margin: 0,
    fontVariantNumeric: "tabular-nums",
  },
});

export const links = cva({
  base: { display: "flex", flexWrap: "wrap", columnGap: "4", rowGap: "2" },
});

export const link = cva({
  base: {
    textStyle: "body.sm",
    color: "primary",
    textDecoration: "underline",
    _focusVisible: { outline: "2px solid", outlineColor: "border.focusRing", outlineOffset: "2px" },
  },
});

/** Says a link opens in a new tab, for screen readers only. */
export const srOnly = cva({ base: { srOnly: true } });
