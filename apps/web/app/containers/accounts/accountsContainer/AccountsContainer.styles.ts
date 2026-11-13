import { cva } from "@repo/ui/styled-system/css";

export const pageRoot = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: { base: "24px", md: "32px" },
    paddingBottom: "48px",
    minWidth: 0,
  },
});

export const headerActions = cva({
  base: { display: "flex", alignItems: "center", flexWrap: "wrap", gap: "12px" },
});

export const section = cva({
  base: { display: "flex", flexDirection: "column", gap: "16px", minWidth: 0 },
});

export const sectionTitle = cva({
  base: { textStyle: "heading.lg", color: "text.primary", margin: 0 },
});
