import { cva } from "@repo/ui/styled-system/css";

export const body = cva({
  base: { display: "flex", flexDirection: "column", gap: "4", minWidth: 0 },
});

export const title = cva({
  base: { textStyle: "heading.sm", color: "text.primary", margin: 0 },
});

export const intro = cva({
  base: { textStyle: "body.sm", color: "text.secondary", margin: 0 },
});

export const caption = cva({
  base: { textStyle: "body.sm", color: "text.secondary", fontVariantNumeric: "tabular-nums" },
});

export const deadlines = cva({
  base: {
    display: "grid",
    gridTemplateColumns: { base: "minmax(0, 1fr)", sm: "repeat(2, minmax(0, 1fr))" },
    gap: "3",
  },
});

export const deadline = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "1",
    padding: "4",
    borderRadius: "lg",
    border: "1px solid",
    borderColor: "border.subtle",
    backgroundColor: "surface.canvas",
    fontVariantNumeric: "tabular-nums",
  },
});

export const deadlineName = cva({
  base: {
    textStyle: "heading.xs",
    color: "text.primary",
    margin: 0,
    fontVariantNumeric: "tabular-nums",
  },
});
