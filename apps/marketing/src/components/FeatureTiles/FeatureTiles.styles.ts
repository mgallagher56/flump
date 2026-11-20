import { cva } from "@repo/ui/styled-system/css";

export const tileGrid = cva({
  base: {
    listStyle: "none",
    margin: 0,
    padding: 0,
    display: "grid",
    gridTemplateColumns: { base: "1fr", md: "repeat(2, 1fr)", lg: "repeat(3, 1fr)" },
    gap: { base: "4", md: "6" },
  },
});

export const tileBody = cva({
  base: { display: "flex", flexDirection: "column", gap: "2", height: "100%" },
});

export const tileName = cva({
  base: { textStyle: "heading.md", color: "text.primary", margin: 0 },
});

/** The tile's one link, on its name. Underlined so it reads as a link without colour alone. */
export const tileLink = cva({
  base: {
    color: "primary",
    textDecoration: "underline",
    textUnderlineOffset: "3px",
    _hover: { color: "primary.hover" },
    _focusVisible: { outline: "2px solid", outlineColor: "border.focusRing", outlineOffset: "2px" },
  },
});

export const tileText = cva({
  base: { textStyle: "body.md", color: "text.secondary", margin: 0 },
});

export const tileNote = cva({
  base: { textStyle: "body.sm", color: "text.secondary", margin: 0 },
});
