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

export const resultList = cva({
  base: {
    display: "grid",
    gridTemplateColumns: { base: "minmax(0, 1fr)", sm: "repeat(3, minmax(0, 1fr))" },
    gap: "12px 24px",
    margin: 0,
  },
});

export const resultItem = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
    minWidth: 0,
    "& dt": { textStyle: "label.sm", color: "text.muted" },
    "& dd": { margin: 0, textStyle: "numeric.md", color: "text.primary", ...numeric },
  },
});

export const resultUnit = css({
  textStyle: "body.sm",
  color: "text.secondary",
});

export const ltvBox = cva({
  base: {
    paddingTop: "16px",
    borderTopWidth: "1px",
    borderTopStyle: "solid",
    borderTopColor: "border.subtle",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    flexWrap: "wrap",
    gap: "12px",
    minWidth: 0,
  },
});

export const ltvHeading = css({
  display: "flex",
  alignItems: "baseline",
  flexWrap: "wrap",
  gap: "8px",
  textStyle: "label.md",
  color: "text.primary",
  m: 0,
  ...numeric,
});

export const ltvMuted = css({
  textStyle: "body.sm",
  color: "text.muted",
});

export const ltvBody = css({
  textStyle: "body.sm",
  color: "text.secondary",
  mt: "4px",
  mb: 0,
  maxWidth: "60ch",
  ...numeric,
});

export const ltvTotal = css({
  display: "flex",
  flexDirection: "column",
  gap: "2px",
  textAlign: { base: "left", sm: "right" },
  textStyle: "label.sm",
  color: "text.muted",
  ...numeric,
});
