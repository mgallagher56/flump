import { cva } from "@repo/ui/styled-system/css";

export const timelineControls = cva({
  base: { display: "flex", flexDirection: "column", gap: "16px", minWidth: 0 },
});

export const timelineOutcome = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    p: { base: "16px", md: "20px" },
    borderRadius: "lg",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.subtle",
    backgroundColor: "surface.sunken",
    minWidth: 0,
  },
});

export const timelineResult = cva({
  base: {
    textStyle: "body.lg",
    color: "text.primary",
    fontVariantNumeric: "tabular-nums",
    margin: 0,
  },
});

export const timelineNote = cva({
  base: { textStyle: "body.sm", color: "text.muted", margin: 0 },
});
