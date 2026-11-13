import { cva } from "@repo/ui/styled-system/css";

export const cardBody = cva({
  base: { display: "flex", flexDirection: "column", gap: "20px" },
});

export const cardTitle = cva({
  base: { textStyle: "heading.md", color: "text.primary", margin: 0 },
});

export const cardSubtitle = cva({
  base: { textStyle: "body.sm", color: "text.muted", margin: 0, marginTop: "2px" },
});

export const fieldsRow = cva({
  base: {
    display: "grid",
    gridTemplateColumns: { base: "1fr", sm: "repeat(2, minmax(0, 1fr))" },
    gap: "16px",
    alignItems: "end",
  },
});

export const resultBlock = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    padding: "12px 16px",
    borderRadius: "lg",
    backgroundColor: "surface.subtle",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.subtle",
  },
});

export const resultLabel = cva({
  base: { textStyle: "label.sm", color: "text.muted" },
});

export const resultValue = cva({
  base: { display: "inline-flex", alignItems: "baseline", gap: "6px" },
});

export const resultUnit = cva({
  base: { textStyle: "label.sm", color: "text.muted", fontVariantNumeric: "tabular-nums" },
});

export const actionRow = cva({
  base: { display: "flex" },
});
