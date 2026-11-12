import { css, cva } from "@repo/ui/styled-system/css";
import { token } from "@repo/ui/styled-system/tokens";

const numeric = { fontVariantNumeric: "tabular-nums" } as const;

export const controlPanel = cva({
  base: {
    p: { base: "16px", md: "20px" },
    backgroundColor: "surface.card",
    borderRadius: "xl",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.subtle",
    display: "flex",
    flexDirection: "column",
    gap: "20px",
    minWidth: 0,
  },
});

export const panelTitle = css({
  fontSize: "md",
  fontWeight: "semibold",
  color: "text.primary",
  m: 0,
});

export const panelHint = css({
  fontSize: "xs",
  color: "text.muted",
  m: 0,
  ...numeric,
});

export const fieldGroup = css({
  display: "flex",
  flexDirection: "column",
  gap: "8px",
  minWidth: 0,
});

export const fieldLabel = css({
  fontSize: "xs",
  fontWeight: "semibold",
  color: "text.secondary",
});

export const selectStyle = css({
  width: "100%",
  minWidth: 0,
  p: "10px 12px",
  borderRadius: "md",
  borderWidth: "1px",
  borderStyle: "solid",
  borderColor: "border.input",
  fontSize: "sm",
  backgroundColor: "surface.card",
  color: "text.primary",
  _focusVisible: {
    outlineWidth: "2px",
    outlineStyle: "solid",
    outlineColor: "border.focusRing",
    outlineOffset: "2px",
  },
});

export const resultsCard = cva({
  base: {
    p: { base: "16px", md: "20px" },
    backgroundColor: "surface.card",
    borderRadius: "xl",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.subtle",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    minWidth: 0,
  },
});

export const resultsHeader = css({
  display: "flex",
  flexDirection: "column",
  gap: "4px",
});

export const rateList = css({
  display: "flex",
  flexDirection: "column",
  m: 0,
  p: 0,
});

export const rateRow = css({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  flexWrap: "wrap",
  gap: "8px",
  py: "12px",
  borderBottomWidth: "1px",
  borderBottomStyle: "solid",
  borderBottomColor: "border.subtle",
});

export const rateLabel = css({
  fontSize: "sm",
  color: "text.secondary",
  m: 0,
});

export const rateValue = cva({
  base: {
    fontSize: "sm",
    fontWeight: "bold",
    m: 0,
    ...numeric,
  },
  variants: {
    tone: {
      danger: { color: "status.danger.text" },
      positive: { color: "status.positive.text" },
    },
  },
  defaultVariants: { tone: "positive" },
});

export const verdictPanel = cva({
  base: {
    p: "16px",
    borderRadius: "lg",
    borderWidth: "1px",
    borderStyle: "solid",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    minWidth: 0,
  },
  variants: {
    outcome: {
      overpay: {
        borderColor: "status.positive.border",
        backgroundColor: "status.positive.bg",
      },
      save: {
        borderColor: "status.info.border",
        backgroundColor: "status.info.bg",
      },
    },
  },
  defaultVariants: { outcome: "overpay" },
});

export const verdictTitle = cva({
  base: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "md",
    fontWeight: "bold",
    m: 0,
  },
  variants: {
    outcome: {
      overpay: { color: "status.positive.text" },
      save: { color: "status.info.text" },
    },
  },
  defaultVariants: { outcome: "overpay" },
});

export const verdictText = css({
  fontSize: "xs",
  color: "text.secondary",
  lineHeight: "1.5",
  m: 0,
  ...numeric,
});

export const noteRow = css({
  display: "flex",
  alignItems: "flex-start",
  gap: "8px",
  color: "text.muted",
  minWidth: 0,
});

export const noteIcon = css({
  flexShrink: 0,
  mt: "2px",
});

export const noteText = css({
  fontSize: "xs",
  color: "text.muted",
  lineHeight: "1.5",
  m: 0,
  minWidth: 0,
  ...numeric,
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

export const dataCell = css({
  ...numeric,
});

export const kpiNote = css({
  ...numeric,
});

/** Recharts takes style objects rather than classes, so tooltip tokens resolve here. */
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
