import { css, cva } from "@repo/ui/styled-system/css";
import { token } from "@repo/ui/styled-system/tokens";

const numeric = { fontVariantNumeric: "tabular-nums" } as const;

/** Controls and results sit on the scenario zone surface: no cards (E16 PR 6). */
export const controlPanel = cva({
  base: { display: "flex", flexDirection: "column", gap: "16px", minWidth: 0 },
});

export const panelHint = css({
  textStyle: "body.sm",
  color: "text.secondary",
  m: 0,
  ...numeric,
});

export const resultsBody = cva({
  base: { display: "flex", flexDirection: "column", gap: "16px", minWidth: 0, ...numeric },
});

export const rateList = css({
  display: "grid",
  gridTemplateColumns: { base: "minmax(0, 1fr)", sm: "repeat(2, minmax(0, 1fr))" },
  gap: "12px 24px",
  m: 0,
});

export const rateRow = css({
  display: "flex",
  flexDirection: "column",
  gap: "2px",
  minWidth: 0,
  "& dt": { textStyle: "label.sm", color: "text.muted" },
  "& dd": { m: 0, color: "text.primary", ...numeric },
});

export const outcomeLabel = css({ textStyle: "label.md", color: "text.secondary", m: 0 });

/** Never `surface.hero`: this is a scenario outcome. */
export const outcomeValue = css({
  textStyle: "numeric.lg",
  color: "text.primary",
  m: 0,
  ...numeric,
});

export const outcomeNote = css({ textStyle: "body.sm", color: "text.secondary", m: 0, ...numeric });

export const noteText = css({
  textStyle: "body.sm",
  color: "text.muted",
  m: 0,
  maxWidth: "70ch",
});

export const chartWrapper = css({
  height: "260px",
  width: "100%",
  minWidth: 0,
  mt: "8px",
  "& .recharts-cartesian-axis-tick-value": {
    fill: "text.muted",
  },
});

export const dataTable = css({
  width: "100%",
  borderCollapse: "collapse",
  fontSize: "xs",
  color: "text.primary",
  "& caption": { textAlign: "left", color: "text.muted", pb: "8px" },
  "& th, & td": { textAlign: "left", p: "6px 8px" },
});

export const dataCell = css({ ...numeric });

export const tooltipContentStyle = {
  backgroundColor: token.var("colors.surface.overlay"),
  borderColor: token.var("colors.border"),
  borderWidth: "1px",
  borderStyle: "solid",
  borderRadius: "10px",
  padding: "10px 14px",
  color: token.var("colors.text.primary"),
  fontSize: "12px",
  fontVariantNumeric: "tabular-nums",
} as const;

export const tooltipItemStyle = {
  color: token.var("colors.text.primary"),
  padding: "2px 0",
  fontSize: "12px",
} as const;

export const tooltipLabelStyle = {
  color: token.var("colors.text.muted"),
  fontWeight: 600,
  marginBottom: "4px",
  fontSize: "11px",
} as const;
