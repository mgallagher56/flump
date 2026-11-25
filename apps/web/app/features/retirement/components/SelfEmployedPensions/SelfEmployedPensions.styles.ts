import { cva } from "@repo/ui/styled-system/css";

/** Facts only, for self-employed users: plain text, no figures of the user's, no status colours. */
export const stack = cva({
  base: { display: "flex", flexDirection: "column", gap: "4" },
});

export const group = cva({
  base: { display: "flex", flexDirection: "column", gap: "2" },
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

export const link = cva({
  base: {
    textStyle: "body.sm",
    color: "primary",
    textDecoration: "underline",
    _focusVisible: { outline: "2px solid", outlineColor: "border.focusRing", outlineOffset: "2px" },
  },
});
