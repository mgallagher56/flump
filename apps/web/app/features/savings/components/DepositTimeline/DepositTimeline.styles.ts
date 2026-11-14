import { cva } from "@repo/ui/styled-system/css";

/** Same rhythm as "How it could grow", so the two tabs read as one tool. */
export const timelineControls = cva({
  base: { display: "flex", flexDirection: "column", gap: "4", minWidth: 0 },
});

export const timelineOutcome = cva({
  base: { display: "flex", flexDirection: "column", gap: "1", minWidth: 0 },
});

export const timelineLabel = cva({
  base: {
    margin: "0",
    textStyle: "body.sm",
    color: "text.secondary",
    fontVariantNumeric: "tabular-nums",
  },
});

export const timelineValue = cva({
  base: {
    margin: "0",
    textStyle: "numeric.kpi",
    fontVariantNumeric: "tabular-nums",
    color: "text.primary",
  },
});

export const timelineSupport = cva({
  base: { display: "flex", flexWrap: "wrap", gap: "6", margin: "0", mt: "2" },
});

export const timelineSupportItem = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "0.5",
    textStyle: "body.sm",
    color: "text.secondary",
    "& dd": {
      margin: "0",
      textStyle: "body.md",
      color: "text.primary",
      fontVariantNumeric: "tabular-nums",
    },
  },
});

export const timelineNote = cva({
  base: { textStyle: "body.sm", color: "text.muted", margin: "0", mt: "4" },
});
