import { cva } from "@repo/ui/styled-system/css";

export const movesGrid = cva({
  base: {
    display: "grid",
    gridTemplateColumns: { base: "1fr", lg: "repeat(3, minmax(0, 1fr))" },
    gap: "6",
    listStyle: "none",
    padding: "0",
    margin: "0",
  },
});

export const moveCard = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "4",
    height: "100%",
  },
});

export const moveIcon = cva({
  base: {
    width: "10",
    height: "10",
    borderRadius: "lg",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "primary.subtle",
    color: "primary",
  },
});

export const moveTitle = cva({
  base: {
    fontFamily: "display",
    fontSize: "xl",
    fontWeight: "bold",
    color: "text.primary",
    margin: "0",
  },
});

export const moveSituations = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "3",
    listStyle: "none",
    padding: "0",
    margin: "0",
  },
});

export const moveSituation = cva({
  base: {
    paddingTop: "3",
    borderTopWidth: "1px",
    borderTopStyle: "solid",
    borderTopColor: "border.subtle",
  },
});

export const moveSituationLabel = cva({
  base: {
    display: "block",
    fontSize: "sm",
    fontWeight: "semibold",
    color: "text.primary",
    marginBottom: "1",
  },
});

export const moveSituationBody = cva({
  base: {
    fontSize: "sm",
    lineHeight: "1.6",
    color: "text.secondary",
    margin: "0",
  },
});

export const movesFooter = cva({
  base: {
    marginTop: "8",
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "center",
    gap: "3",
    fontSize: "sm",
    color: "text.muted",
    textAlign: "center",
  },
});

export const movesLink = cva({
  base: {
    color: "primary",
    fontWeight: "semibold",
    textDecoration: "underline",
    textUnderlineOffset: "3px",
    _focusVisible: {
      outlineWidth: "2px",
      outlineStyle: "solid",
      outlineColor: "border.focusRing",
      outlineOffset: "2px",
      borderRadius: "sm",
    },
  },
});
