import { cva } from "@repo/ui/styled-system/css";

export const root = cva({
  base: { display: "flex", flexDirection: "column", gap: "4", minWidth: 0 },
});

export const heroSubtext = cva({
  base: { display: "flex", flexDirection: "column", gap: "1", fontVariantNumeric: "tabular-nums" },
});

export const sectionHeading = cva({
  base: { textStyle: "heading.md", color: "text.primary", margin: 0, marginTop: "4" },
});

export const kpiSubtext = cva({
  base: { fontVariantNumeric: "tabular-nums" },
});
