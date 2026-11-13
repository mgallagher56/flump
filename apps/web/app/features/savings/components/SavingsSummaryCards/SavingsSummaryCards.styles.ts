import { cva } from "@repo/ui/styled-system/css";

export const summaryRoot = cva({
  base: { display: "flex", flexDirection: "column", gap: { base: "24px", md: "32px" } },
});

export const section = cva({
  base: { display: "flex", flexDirection: "column", gap: "16px" },
});

export const sectionTitle = cva({
  base: { textStyle: "heading.lg", color: "text.primary", margin: 0 },
});
