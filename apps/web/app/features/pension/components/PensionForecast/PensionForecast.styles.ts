import { cva } from "@repo/ui/styled-system/css";

/**
 * No tabular-nums here: in Inter it also widens hyphens, so "Tax-free" read "Tax - free". Each
 * figure inside (outcome, supporting values, chart) sets tabular-nums itself.
 */
export const forecastStack = cva({
  base: { display: "flex", flexDirection: "column", gap: "4", minWidth: 0 },
});

export const noSalaryNote = cva({
  base: { margin: 0, textStyle: "body.md", color: "text.secondary" },
});

export const noSalaryLink = cva({
  base: { color: "primary", fontWeight: "semibold", textDecoration: "underline" },
});
