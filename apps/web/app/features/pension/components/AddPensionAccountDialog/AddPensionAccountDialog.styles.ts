import { cva } from "@repo/ui/styled-system/css";

export const accountForm = cva({
  base: { display: "flex", flexDirection: "column", gap: "16px" },
});

export const fieldRow = cva({
  base: {
    display: "grid",
    gridTemplateColumns: { base: "1fr", sm: "repeat(2, minmax(0, 1fr))" },
    gap: "12px",
  },
});

export const statusGroup = cva({
  base: { display: "flex", flexDirection: "column", gap: "8px", margin: 0, padding: 0, border: 0 },
});

export const statusLegend = cva({
  base: { padding: 0, marginBottom: "8px", textStyle: "label.md", color: "text.primary" },
});

export const statusOptions = cva({
  base: {
    display: "grid",
    gridTemplateColumns: { base: "1fr", sm: "repeat(2, minmax(0, 1fr))" },
    gap: "10px",
  },
});

export const statusOption = cva({
  base: {
    display: "flex",
    alignItems: "flex-start",
    gap: "10px",
    padding: "12px 14px",
    minHeight: "44px",
    borderRadius: "lg",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.input",
    backgroundColor: "surface.card",
    cursor: "pointer",
    "& input": { marginTop: "4px", width: "18px", height: "18px", accentColor: "primary.solid" },
    _hover: { borderColor: "primary.border" },
    "&:has(input:focus-visible)": {
      outline: "2px solid",
      outlineColor: "border.focusRing",
      outlineOffset: "2px",
    },
  },
  variants: {
    selected: { true: { borderColor: "primary", backgroundColor: "primary.subtle" } },
  },
});

export const statusName = cva({
  base: { display: "block", textStyle: "label.md", color: "text.primary" },
});

export const statusHint = cva({
  base: { display: "block", textStyle: "body.sm", color: "text.muted" },
});

export const formActions = cva({
  base: { display: "flex", justifyContent: "flex-end", gap: "8px", flexWrap: "wrap" },
});

/** "Delete pot" sits at the start of the action row, apart from Cancel and Save. */
export const deleteAction = cva({
  base: { marginInlineEnd: "auto", display: "flex" },
});
