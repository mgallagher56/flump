import { cva } from "@repo/ui/styled-system/css";

export const disclosureCard = cva({
  base: {
    backgroundColor: "surface.card",
    border: "1px solid",
    borderColor: "border",
    borderRadius: "2xl",
    p: { base: "6", md: "8" },
    mb: "8",
  },
});

export const disclosureTitle = cva({
  base: { fontSize: "1.25rem", fontWeight: "700", color: "text.primary", marginBottom: "8px" },
});

export const disclosureBody = cva({
  base: { fontSize: "14px", color: "text.secondary", lineHeight: "1.7", marginBottom: "12px" },
});

export const disclosureList = cva({
  base: {
    fontSize: "14px",
    color: "text.secondary",
    lineHeight: "1.7",
    paddingLeft: "5",
    listStyleType: "disc",
    marginBottom: "12px",
  },
});

export const disclosureLink = cva({
  base: { color: "primary", textDecoration: "underline", fontWeight: "600" },
});
