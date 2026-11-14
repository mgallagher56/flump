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

export const stripTitle = cva({
  base: { textStyle: "heading.xl", color: "text.primary", margin: 0 },
});

export const stripBody = cva({
  base: { textStyle: "body.md", color: "text.secondary", margin: 0 },
});

export const stripLink = cva({
  base: {
    color: "text.primary",
    fontWeight: "semibold",
    textDecoration: "underline",
    textUnderlineOffset: "3px",
    whiteSpace: "nowrap",
    _hover: { color: "primary.hover" },
  },
});
