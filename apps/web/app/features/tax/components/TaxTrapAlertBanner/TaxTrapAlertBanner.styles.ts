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

export const titleBlock = cva({
  base: { display: "flex", gap: "3", alignItems: "flex-start", minWidth: 0 },
});

export const iconTile = cva({
  base: {
    width: "9",
    height: "9",
    borderRadius: "lg",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  variants: {
    tone: {
      danger: { backgroundColor: "status.danger.bg", color: "status.danger.text" },
      warning: { backgroundColor: "status.warning.bg", color: "status.warning.text" },
    },
  },
  defaultVariants: { tone: "warning" },
});

export const titleRow = cva({
  base: { display: "flex", alignItems: "center", gap: "2", flexWrap: "wrap" },
});

export const title = cva({
  base: { textStyle: "heading.sm", color: "text.primary", margin: 0 },
});

export const explainer = cva({
  base: {
    textStyle: "body.sm",
    color: "text.secondary",
    margin: 0,
    marginTop: "1",
    maxWidth: "680px",
    fontVariantNumeric: "tabular-nums",
  },
});

export const assumption = cva({
  base: { textStyle: "body.sm", color: "text.muted", margin: 0, marginTop: "1" },
});

export const lostTile = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: "1",
    paddingY: "2",
    paddingX: "4",
    borderRadius: "lg",
    backgroundColor: "status.danger.bg",
    border: "1px solid",
    borderColor: "status.danger.border",
    fontVariantNumeric: "tabular-nums",
  },
});

export const caption = cva({
  base: { textStyle: "body.sm", color: "text.secondary", fontVariantNumeric: "tabular-nums" },
});

export const sacrificeBox = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "4",
    padding: "4",
    borderRadius: "lg",
    border: "1px solid",
    borderColor: "border.subtle",
    backgroundColor: "surface.canvas",
  },
});

export const metrics = cva({
  base: {
    display: "grid",
    gridTemplateColumns: { base: "minmax(0, 1fr)", sm: "repeat(3, minmax(0, 1fr))" },
    gap: "3",
    paddingTop: "3",
    borderTop: "1px solid",
    borderColor: "border.subtle",
    fontVariantNumeric: "tabular-nums",
  },
});

export const metric = cva({
  base: { display: "flex", flexDirection: "column", gap: "1" },
});

export const unit = cva({
  base: { textStyle: "body.sm", color: "text.secondary", marginLeft: "1" },
});

export const actionRow = cva({
  base: { display: "flex", justifyContent: "flex-end" },
});
