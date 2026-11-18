import { cva } from "@repo/ui/styled-system/css";

export const root = cva({
  base: { display: "flex", flexDirection: "column", gap: "4", minWidth: 0 },
});

/** The two deductions side by side, stacked under `sm`. */
export const figures = cva({
  base: {
    display: "grid",
    gridTemplateColumns: { base: "1fr", sm: "1fr 1fr" },
    gap: "3",
    margin: 0,
  },
});

/** One deduction: its name, then its figure. Neither is styled as better than the other. */
export const figure = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "1",
    padding: "4",
    borderRadius: "lg",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.subtle",
    backgroundColor: "surface.card",
    minWidth: 0,
  },
});

export const figureLabel = cva({
  base: { textStyle: "label.md", color: "text.secondary" },
});

export const figureValue = cva({
  base: { margin: 0, color: "text.primary", fontVariantNumeric: "tabular-nums" },
});

export const figureNote = cva({
  base: { textStyle: "body.sm", color: "text.secondary", fontVariantNumeric: "tabular-nums" },
});

export const lines = cva({
  base: { display: "flex", flexDirection: "column", gap: "2", margin: 0, padding: 0 },
});

export const line = cva({
  base: {
    margin: 0,
    textStyle: "body.md",
    color: "text.primary",
    fontVariantNumeric: "tabular-nums",
  },
});

export const exclusions = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "2",
    margin: 0,
    paddingInlineStart: "5",
    listStyleType: "disc",
    textStyle: "body.sm",
    color: "text.primary",
  },
});

export const sourceLink = cva({
  base: {
    textStyle: "body.sm",
    color: "primary",
    textDecoration: "underline",
    textUnderlineOffset: "3px",
    width: "fit-content",
    borderRadius: "sm",
    _focusVisible: { outline: "2px solid", outlineColor: "border.focusRing", outlineOffset: "2px" },
  },
});
