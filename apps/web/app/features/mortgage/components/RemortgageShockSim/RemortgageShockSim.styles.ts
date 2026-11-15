import { css, cva } from "@repo/ui/styled-system/css";

const numeric = { fontVariantNumeric: "tabular-nums" } as const;

/** The tool sits on the scenario zone surface: no card, heading or badge of its own (E16 PR 6). */
export const simRoot = cva({
  base: { display: "flex", flexDirection: "column", gap: "16px", minWidth: 0, ...numeric },
});

export const simDescription = css({
  textStyle: "body.sm",
  color: "text.secondary",
  margin: 0,
  maxWidth: "70ch",
});

export const panel = cva({
  base: { display: "flex", flexDirection: "column", gap: "18px", minWidth: 0 },
});

export const fieldGroup = css({
  display: "flex",
  flexDirection: "column",
  gap: "6px",
  minWidth: 0,
});

export const fieldLabel = css({
  textStyle: "label.md",
  color: "text.primary",
});

export const selectRow = css({
  display: "flex",
  flexWrap: "wrap",
  gap: "8px",
  "& > *": { flex: "1 1 96px", minWidth: 0 },
});

export const remainingText = css({
  textStyle: "body.sm",
  color: "text.secondary",
  m: 0,
  ...numeric,
});
