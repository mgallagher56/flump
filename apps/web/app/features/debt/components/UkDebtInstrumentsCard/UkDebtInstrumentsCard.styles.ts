import { css, cva } from "@repo/ui/styled-system/css";

export const instrumentsBody = cva({
  base: { minWidth: 0, display: "flex", flexDirection: "column", gap: "16px" },
});

export const cardSubtitle = css({
  margin: 0,
  marginTop: "2px",
  fontSize: "xs",
  color: "text.muted",
});

export const toolGrid = cva({
  base: {
    display: "grid",
    gridTemplateColumns: { base: "1fr", md: "repeat(2, minmax(0, 1fr))" },
    gap: "20px",
  },
});

export const inputStack = cva({
  base: { display: "flex", flexDirection: "column", gap: "16px", minWidth: 0 },
});

export const resultBox = cva({
  base: {
    minWidth: 0,
    backgroundColor: "surface.sunken",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.subtle",
    padding: "16px",
    borderRadius: "lg",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
});

export const resultHeading = css({
  margin: 0,
  textStyle: "heading.sm",
  color: "text.primary",
});

/** A plain result sentence: no alarm or reassurance colours (copy guide 2.3). */
export const resultNote = css({
  margin: 0,
  fontSize: "sm",
  color: "text.secondary",
  fontVariantNumeric: "tabular-nums",
});

export const keyFigure = cva({
  base: {
    padding: "14px",
    borderRadius: "md",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.subtle",
    backgroundColor: "surface.card",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    fontVariantNumeric: "tabular-nums",
  },
});

export const keyFigureLabel = css({ fontSize: "xs", color: "text.muted" });

export const keyFigureValue = css({
  margin: 0,
  fontSize: "xl",
  fontWeight: "bold",
  color: "text.primary",
  fontVariantNumeric: "tabular-nums",
});

export const factRows = cva({
  base: { margin: 0, display: "flex", flexDirection: "column", gap: "8px" },
});

export const factRow = cva({
  base: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: "4px 12px",
    paddingBottom: "8px",
    borderBottomWidth: "1px",
    borderBottomStyle: "solid",
    borderBottomColor: "border.subtle",
    fontSize: "sm",
    fontVariantNumeric: "tabular-nums",
    "& dt": { color: "text.secondary" },
    "& dd": { margin: 0, fontWeight: "semibold", color: "text.primary" },
  },
});

export const footnote = css({
  margin: 0,
  fontSize: "xs",
  color: "text.muted",
  fontVariantNumeric: "tabular-nums",
});
