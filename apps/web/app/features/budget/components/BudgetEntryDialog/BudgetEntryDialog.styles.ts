import { cva } from "@repo/ui/styled-system/css";

export const entryForm = cva({
  base: { display: "flex", flexDirection: "column", gap: "16px" },
});

export const fieldRow = cva({
  base: {
    display: "grid",
    gridTemplateColumns: { base: "1fr", sm: "repeat(2, minmax(0, 1fr))" },
    gap: "12px",
  },
});

// TODO(E15 T2.2b): swap for @repo/ui Select
export const nativeSelect = cva({
  base: {
    width: "100%",
    minHeight: "44px",
    paddingX: "12px",
    borderRadius: "md",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.input",
    backgroundColor: "surface.card",
    color: "text.primary",
    textStyle: "body.md",
    cursor: "pointer",
    _focusVisible: {
      outline: "2px solid",
      outlineColor: "border.focusRing",
      outlineOffset: "2px",
    },
  },
});

export const checkboxLabel = cva({
  base: {
    display: "inline-flex",
    alignItems: "center",
    gap: "10px",
    textStyle: "body.md",
    color: "text.primary",
    cursor: "pointer",
  },
});

export const checkbox = cva({
  base: {
    width: "18px",
    height: "18px",
    accentColor: "primary.solid",
    cursor: "pointer",
  },
});

export const formActions = cva({
  base: { display: "flex", justifyContent: "flex-end", gap: "8px", flexWrap: "wrap" },
});
