import { cva } from "@repo/ui/styled-system/css";

export const body = cva({
  base: { display: "flex", flexDirection: "column", gap: "4", minWidth: 0 },
});

export const header = cva({
  base: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "4",
    flexWrap: "wrap",
  },
});

export const titleRow = cva({
  base: { display: "flex", alignItems: "center", gap: "2" },
});

export const iconTile = cva({
  base: {
    width: "8",
    height: "8",
    borderRadius: "lg",
    backgroundColor: "status.info.bg",
    color: "status.info.text",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
});

export const title = cva({
  base: { textStyle: "heading.sm", color: "text.primary", margin: 0 },
});

export const intro = cva({
  base: { textStyle: "body.sm", color: "text.secondary", margin: 0, marginTop: "1" },
});

export const reserveTile = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "1",
    alignItems: "flex-end",
    paddingY: "2",
    paddingX: "4",
    borderRadius: "lg",
    backgroundColor: "status.positive.bg",
    border: "1px solid",
    borderColor: "status.positive.border",
    fontVariantNumeric: "tabular-nums",
  },
});

export const caption = cva({
  base: { textStyle: "body.sm", color: "text.secondary", fontVariantNumeric: "tabular-nums" },
});

export const perMonth = cva({
  base: { textStyle: "body.sm", color: "text.secondary", marginLeft: "1" },
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

export const deadlineHead = cva({
  base: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: "2" },
});

export const deadlineName = cva({
  base: { textStyle: "heading.xs", color: "text.primary", margin: 0 },
});

export const note = cva({
  base: {
    display: "flex",
    alignItems: "center",
    gap: "2",
    textStyle: "body.sm",
    color: "text.secondary",
    backgroundColor: "surface.subtle",
    padding: "3",
    margin: 0,
    borderRadius: "lg",
    fontVariantNumeric: "tabular-nums",
  },
});
