import { cva } from "@repo/ui/styled-system/css";

export const screenWrap = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "6",
    paddingY: { base: "10", md: "16" },
  },
});

export const screenCard = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "4",
    width: "100%",
    maxWidth: "36rem",
  },
});

export const heading = cva({
  base: { textStyle: "heading.lg", color: "text.primary", margin: 0 },
});

export const copy = cva({
  base: { textStyle: "body.md", color: "text.secondary", margin: 0 },
});

export const error = cva({
  base: { textStyle: "body.md", color: "status.danger.text", margin: 0 },
});

export const actions = cva({
  base: { display: "flex", flexDirection: "column", gap: "4" },
});

export const legalLink = cva({
  base: {
    color: "primary",
    textDecoration: "underline",
    textUnderlineOffset: "2px",
    _focusVisible: { outline: "2px solid", outlineColor: "border.focusRing", outlineOffset: "2px" },
  },
});

/** Says a link opens in a new tab, for screen readers only. */
export const srOnly = cva({ base: { srOnly: true } });

export const dataStack = cva({
  base: { display: "flex", flexDirection: "column", gap: "6", width: "100%", maxWidth: "36rem" },
});
