import { cva } from "@repo/ui/styled-system/css";

export const list = cva({
  base: {
    listStyle: "none",
    margin: 0,
    padding: 0,
    display: "grid",
    gridTemplateColumns: { base: "minmax(0, 1fr)", md: "repeat(2, minmax(0, 1fr))" },
    gap: "3",
  },
});

export const body = cva({
  base: { display: "flex", flexDirection: "column", gap: "3", minWidth: 0 },
});

export const accountName = cva({
  base: { textStyle: "body.sm", color: "text.secondary", margin: 0 },
});

export const title = cva({
  base: {
    textStyle: "heading.sm",
    color: "text.primary",
    margin: 0,
    fontVariantNumeric: "tabular-nums",
  },
});

export const figure = cva({
  base: { fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" },
});

export const line = cva({
  base: {
    textStyle: "body.sm",
    color: "text.secondary",
    margin: 0,
    fontVariantNumeric: "tabular-nums",
  },
});

export const actions = cva({
  base: { display: "flex", justifyContent: "flex-start" },
});
