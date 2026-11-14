import { cva } from "@repo/ui/styled-system/css";

/** The tax figure with its "Unverified estimate" badge beside it; the badge wraps under at 320px. */
export const taxFigure = cva({
  base: { display: "inline-flex", alignItems: "center", flexWrap: "wrap", gap: "8px" },
});
