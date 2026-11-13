import { cva } from "@repo/ui/styled-system/css";

export const pictureGrid = cva({
  base: {
    display: "grid",
    gridTemplateColumns: { base: "1fr", md: "repeat(3, minmax(0, 1fr))" },
    gap: "6",
  },
});

export const pictureCard = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "3",
    height: "100%",
  },
});

export const pictureEyebrow = cva({
  base: {
    fontSize: "xs",
    fontWeight: "semibold",
    letterSpacing: "0.01em",
    color: "primary",
  },
});

export const pictureTitle = cva({
  base: {
    fontFamily: "display",
    fontSize: "xl",
    fontWeight: "bold",
    color: "text.primary",
    margin: "0",
  },
});

export const pictureBody = cva({
  base: {
    fontSize: "sm",
    lineHeight: "1.6",
    color: "text.secondary",
    margin: "0",
  },
});

export const pictureExample = cva({
  base: {
    marginTop: "auto",
    paddingTop: "3",
    borderTopWidth: "1px",
    borderTopStyle: "dashed",
    borderTopColor: "border.subtle",
    display: "flex",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: "3",
    fontSize: "sm",
    color: "text.muted",
  },
});

export const pictureFigure = cva({
  base: {
    fontFamily: "display",
    fontSize: "lg",
    fontWeight: "bold",
    color: "text.primary",
    fontVariantNumeric: "tabular-nums",
  },
});
