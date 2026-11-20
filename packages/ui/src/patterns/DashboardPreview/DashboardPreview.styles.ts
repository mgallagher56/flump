import { cva } from "../../../styled-system/css";

export const dashboardPreviewRoot = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "5",
    width: "100%",
    minWidth: "0",
  },
});

export const dashboardSectionGrid = cva({
  base: {
    display: "grid",
    // Two or three cards depending on the household: on large screens they share one row equally
    // rather than leave an empty column.
    gridTemplateColumns: { base: "1fr", sm: "repeat(2, minmax(0, 1fr))", lg: "none" },
    gridAutoFlow: { lg: "column" },
    gridAutoColumns: { lg: "minmax(0, 1fr)" },
    gap: "4",
    alignItems: "stretch",
  },
});

export const sectionCard = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "2",
    backgroundColor: "surface.card",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.subtle",
    borderRadius: "xl",
    p: "4",
    transitionProperty: "box-shadow",
    transitionDuration: "fast",
    transitionTimingFunction: "standard",
    _hover: {
      boxShadow: "sm",
    },
  },
});

export const sectionCardHeader = cva({
  base: {
    display: "flex",
    alignItems: "center",
    gap: "2.5",
  },
});

export const sectionCardTitle = cva({
  base: {
    textStyle: "heading.xs",
    color: "text.primary",
    margin: 0,
    fontWeight: "medium",
  },
});

export const sectionCardLabel = cva({
  base: {
    textStyle: "body.xs",
    color: "text.secondary",
    margin: 0,
  },
});

export const sectionCardFigure = cva({
  base: {
    textStyle: "heading.sm",
    color: "text.primary",
    margin: 0,
    fontWeight: "semibold",
    fontVariantNumeric: "tabular-nums",
  },
});

export const sectionCardLine = cva({
  base: {
    textStyle: "body.xs",
    color: "text.muted",
    margin: 0,
    fontVariantNumeric: "tabular-nums",
  },
});
