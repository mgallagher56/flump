import { cva } from "@repo/ui/styled-system/css";

export const disclosureSection = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "3",
    pt: "8",
    borderTopWidth: "1px",
    borderTopStyle: "solid",
    borderTopColor: "border.subtle",
  },
});

export const disclosureTitle = cva({
  base: { textStyle: "heading.lg", color: "text.primary", margin: 0 },
});

export const disclosureBody = cva({
  base: { textStyle: "body.md", color: "text.secondary", margin: 0 },
});

export const disclosureLink = cva({
  base: {
    color: "text.primary",
    textDecoration: "underline",
    textUnderlineOffset: "3px",
    overflowWrap: "anywhere",
    _hover: { color: "primary.hover" },
  },
});

export const disclosurePlaceholder = cva({
  base: { color: "text.muted" },
});

export const disclosureList = cva({
  base: {
    textStyle: "body.md",
    color: "text.secondary",
    margin: 0,
    paddingLeft: "5",
    listStyleType: "disc",
    display: "flex",
    flexDirection: "column",
    gap: "1",
  },
});
