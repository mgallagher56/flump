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

export const studentLoanLine = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    color: "text.muted",
    textStyle: "body.sm",
    fontVariantNumeric: "tabular-nums",
    margin: 0,
  },
});

export const studentLoanNote = cva({
  base: { margin: 0, textStyle: "body.sm", color: "text.muted" },
});

export const homeEstimateLine = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    color: "text.muted",
    textStyle: "body.sm",
    fontVariantNumeric: "tabular-nums",
    margin: 0,
  },
});

export const homeEstimateNote = cva({
  base: { margin: 0, textStyle: "body.sm", color: "text.muted" },
});

export const allocationList = cva({
  base: { display: "flex", flexDirection: "column", gap: "12px", margin: 0, padding: 0 },
});

export const allocationItem = cva({
  base: { listStyle: "none" },
});
