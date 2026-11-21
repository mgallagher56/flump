import { cva } from "@repo/ui/styled-system/css";

export const goalSectionRoot = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "2",
    padding: "4",
    borderRadius: "lg",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.subtle",
    backgroundColor: "surface.card",
  },
});

export const goalHeaderRow = cva({
  base: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: "2",
  },
});

export const goalLabelText = cva({
  base: {
    margin: 0,
    textStyle: "label.md",
    color: "text.secondary",
  },
});

export const goalPrimaryLine = cva({
  base: {
    margin: 0,
    textStyle: "body.md",
    color: "text.primary",
    fontVariantNumeric: "tabular-nums",
  },
});

export const goalSecondaryLine = cva({
  base: {
    margin: 0,
    textStyle: "body.sm",
    color: "text.secondary",
    fontVariantNumeric: "tabular-nums",
  },
});

export const goalActionsRow = cva({
  base: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: "2",
  },
});

export const goalForm = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "3",
  },
});

export const goalFieldsGrid = cva({
  base: {
    display: "grid",
    gridTemplateColumns: { base: "1fr", sm: "repeat(3, minmax(0, 1fr))" },
    gap: "3",
  },
});
