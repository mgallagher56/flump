import { cva } from "@repo/ui/styled-system/css";

export const forecastStack = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    minWidth: 0,
    fontVariantNumeric: "tabular-nums",
  },
});

export const noSalaryNote = cva({
  base: { margin: 0, textStyle: "body.md", color: "text.muted" },
});

export const noSalaryLink = cva({
  base: { color: "primary", fontWeight: "semibold", textDecoration: "underline" },
});

export const growthNote = cva({
  base: { margin: 0, textStyle: "body.sm", color: "text.muted" },
});

/** "Changes here are not saved." on the left, "Update your details" on the right. */
export const zoneFooter = cva({
  base: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    flex: "1",
    gap: "8px",
    textStyle: "body.sm",
    minHeight: "touch",
  },
});

export const zoneFooterNote = cva({
  base: {
    margin: "0",
    color: "text.secondary",
  },
});
