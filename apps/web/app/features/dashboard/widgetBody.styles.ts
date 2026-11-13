import { cva } from "@repo/ui/styled-system/css";

/** Layout recipes shared by the dashboard widget bodies that sit inside `WidgetCard`. */

export const content = cva({
  base: { display: "flex", flexDirection: "column", gap: "16px" },
});

export const headline = cva({
  base: { display: "flex", flexDirection: "column", gap: "4px", margin: 0 },
});

export const label = cva({
  base: { textStyle: "label.sm", color: "text.muted", margin: 0 },
});

export const meta = cva({
  base: {
    textStyle: "body.sm",
    color: "text.muted",
    fontVariantNumeric: "tabular-nums",
    margin: 0,
  },
});

/** Wraps a `NotSet` that stands in for a headline figure. */
export const notSetWrap = cva({
  base: {
    textStyle: "numeric.md",
    color: "text.muted",
    fontVariantNumeric: "tabular-nums",
    margin: 0,
  },
});

export const statRow = cva({
  base: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "12px",
    margin: 0,
  },
});

export const statTile = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
    padding: "12px",
    borderRadius: "lg",
    backgroundColor: "surface.subtle",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.subtle",
    minWidth: 0,
  },
});

export const statLabel = cva({
  base: { textStyle: "label.sm", color: "text.muted", margin: 0 },
});

export const statValue = cva({
  base: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "baseline",
    columnGap: "6px",
    fontVariantNumeric: "tabular-nums",
    margin: 0,
  },
});

/** The small "a month" or "a year" text after a figure. */
export const unit = cva({
  base: {
    textStyle: "body.sm",
    color: "text.muted",
    fontVariantNumeric: "tabular-nums",
  },
});

export const note = cva({
  base: { textStyle: "body.sm", color: "text.muted", margin: 0 },
});
