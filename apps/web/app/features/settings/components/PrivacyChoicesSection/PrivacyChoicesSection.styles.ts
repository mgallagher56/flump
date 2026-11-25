import { cva } from "@repo/ui/styled-system/css";

export const choicesCard = cva({
  base: { display: "flex", flexDirection: "column", gap: "5" },
});

export const legalList = cva({
  base: {
    display: "flex",
    flexWrap: "wrap",
    columnGap: "6",
    rowGap: "2",
    margin: 0,
    padding: 0,
    listStyleType: "none",
    textStyle: "body.md",
  },
});

export const legalLink = cva({
  base: {
    color: "primary",
    fontWeight: "semibold",
    textDecoration: "underline",
    textUnderlineOffset: "3px",
    _hover: { color: "primary.emphasis" },
  },
});
