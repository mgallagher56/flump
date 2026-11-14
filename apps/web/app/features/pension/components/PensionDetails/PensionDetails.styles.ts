import { cva } from "@repo/ui/styled-system/css";

/** Saved facts: card surface and default border, never the dashed scenario treatment. */
export const detailsRoot = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    minWidth: 0,
    padding: { base: "16px", md: "24px" },
    borderRadius: "xl",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border",
    backgroundColor: "surface.card",
  },
});

export const detailsHeader = cva({
  base: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
  },
});

export const detailsTitle = cva({
  base: { margin: 0, textStyle: "heading.md", color: "text.primary" },
});

export const buttonRow = cva({
  base: { display: "flex", gap: "8px" },
});

export const mutedNote = cva({
  base: {
    margin: 0,
    textStyle: "body.sm",
    color: "text.muted",
    fontVariantNumeric: "tabular-nums",
  },
});

export const editGrid = cva({
  base: {
    display: "grid",
    gridTemplateColumns: { base: "1fr", sm: "repeat(3, minmax(0, 1fr))" },
    gap: "12px",
    padding: "16px",
    borderRadius: "lg",
    backgroundColor: "surface.subtle",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.subtle",
  },
});

export const checkStack = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    gridColumn: { base: "auto", sm: "1 / -1" },
  },
});

export const checkRow = cva({
  base: {
    display: "flex",
    alignItems: "flex-start",
    gap: "10px",
    textStyle: "body.md",
    color: "text.primary",
    minHeight: "44px",
    cursor: "pointer",
    "& input": { marginTop: "4px", width: "18px", height: "18px", accentColor: "primary.solid" },
    "&[data-disabled='true']": { color: "text.muted", cursor: "not-allowed" },
  },
});

export const checkHint = cva({
  base: { display: "block", textStyle: "body.sm", color: "text.muted" },
});

export const factList = cva({
  base: { margin: 0, display: "flex", flexDirection: "column" },
});

export const factRow = cva({
  base: {
    display: "flex",
    flexWrap: "wrap",
    rowGap: "0",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: "3",
    py: "1",
    textStyle: "body.md",
    color: "text.secondary",
    "&:not(:last-child)": {
      borderBottomWidth: "1px",
      borderBottomStyle: "solid",
      borderBottomColor: "border.subtle",
    },
    "& dt": { whiteSpace: "nowrap" },
    "& dd": { margin: 0, textAlign: "right" },
  },
});

export const factValue = cva({
  base: {
    color: "text.primary",
    fontVariantNumeric: "tabular-nums",
    fontWeight: "medium",
    whiteSpace: "nowrap",
  },
  variants: {
    unset: { true: { color: "text.muted", fontWeight: "normal" } },
    /** The method can be a long phrase, so it alone may wrap. */
    wrap: { true: { whiteSpace: "normal" } },
  },
});

/** The one "Edit" for salary and contributions, at the foot of their drawer. */
export const editRow = cva({
  base: { display: "flex", justifyContent: "flex-start", mt: "2", ml: "-2" },
});
