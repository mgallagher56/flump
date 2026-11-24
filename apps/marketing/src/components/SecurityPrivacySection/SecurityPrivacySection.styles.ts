import { cva } from "@repo/ui/styled-system/css";

export const stripRow = cva({
  base: {
    display: "flex",
    flexDirection: { base: "column", md: "row" },
    alignItems: { base: "flex-start", md: "center" },
    gap: { base: "4", md: "6" },
  },
});

export const stripText = cva({
  base: { display: "flex", flexDirection: "column", gap: "2", flex: "1" },
});

/** The strip sits on the page's one solid mint band (surface.hero), so its text is text.onHero. */
export const stripTitle = cva({
  base: { textStyle: "heading.xl", color: "text.onHero", margin: 0 },
});

export const stripBody = cva({
  base: { textStyle: "body.md", color: "text.onHero", margin: 0 },
});

export const stripLink = cva({
  base: {
    color: "text.onHero",
    fontWeight: "semibold",
    textDecoration: "underline",
    textUnderlineOffset: "3px",
    whiteSpace: "nowrap",
    borderRadius: "sm",
    // A teal hover would fall below 4.5:1 on the mint band, so the underline goes instead.
    _hover: { textDecoration: "none" },
    _focusVisible: { outline: "2px solid", outlineColor: "text.onHero", outlineOffset: "2px" },
  },
});
