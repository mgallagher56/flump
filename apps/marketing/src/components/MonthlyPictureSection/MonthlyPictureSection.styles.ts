import { cva } from "@repo/ui/styled-system/css";

export const pictureGrid = cva({
  base: {
    listStyle: "none",
    margin: 0,
    padding: 0,
    display: "grid",
    gridTemplateColumns: { base: "1fr", md: "repeat(3, 1fr)" },
    gap: { base: "4", md: "6" },
  },
});

export const pictureCard = cva({
  base: { display: "flex", flexDirection: "column", gap: "3" },
});

export const pictureTitle = cva({
  base: { textStyle: "heading.md", color: "text.primary", margin: 0 },
});

export const pictureBody = cva({
  base: { textStyle: "body.md", color: "text.secondary", margin: 0 },
});

export const pictureFooter = cva({
  base: { textStyle: "body.md", color: "text.secondary", margin: 0 },
});

export const pictureLink = cva({
  base: {
    color: "primary",
    fontWeight: "semibold",
    textDecoration: "underline",
    textUnderlineOffset: "3px",
    _hover: { color: "primary.hover" },
  },
});

export const pictureFooterRow = cva({
  base: {
    display: "flex",
    flexDirection: { base: "column", md: "row" },
    alignItems: "center",
    justifyContent: "center",
    gap: { base: "3", md: "6" },
    textAlign: { base: "center", md: "left" },
  },
});

export const pictureIllustration = cva({
  base: { width: { base: "28", md: "36" }, flexShrink: 0 },
});
