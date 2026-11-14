import { cva } from "@repo/ui/styled-system/css";

export const bar = cva({
  base: { display: "flex", alignItems: "center", gap: "2", minWidth: 0 },
});

/**
 * Under `md` the select sits on the h1's row, so its "Tax year" label is for screen readers only
 * there (the select shows the year, such as 2026/27); from `md` it is shown.
 */
export const label = cva({
  base: {
    textStyle: "label.md",
    color: "text.secondary",
    whiteSpace: "nowrap",
    flexShrink: 0,
    // Visually hidden under `md`, written out (the srOnly utility's reset sets white-space back
    // to normal, which wrapped "Tax year" onto two lines).
    position: { base: "absolute", md: "static" },
    width: { base: "1px", md: "auto" },
    height: { base: "1px", md: "auto" },
    overflow: { base: "hidden", md: "visible" },
    clip: { base: "rect(0, 0, 0, 0)", md: "auto" },
    margin: { base: "-1px", md: "0" },
  },
});

export const select = cva({
  base: { fontVariantNumeric: "tabular-nums", minWidth: { base: "0", md: "8rem" } },
});
