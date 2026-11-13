import { cva } from "@repo/ui/styled-system/css";

export const inputsRoot = cva({
  base: { display: "flex", flexDirection: "column", gap: "16px" },
});

export const cardTitle = cva({
  base: { textStyle: "heading.md", color: "text.primary", margin: 0, marginBottom: "16px" },
});

export const fieldStack = cva({
  base: { display: "flex", flexDirection: "column", gap: "20px" },
});

export const salaryNote = cva({
  base: { textStyle: "body.sm", color: "text.muted", margin: 0 },
});

export const switchList = cva({
  base: { display: "flex", flexDirection: "column", gap: "8px" },
});

export const switchRow = cva({
  base: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    padding: "12px 14px",
    borderRadius: "lg",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.subtle",
    backgroundColor: "surface.card",
    cursor: "pointer",
    "&[data-disabled=true]": { cursor: "not-allowed", backgroundColor: "surface.sunken" },
    "&[data-on=true]": { backgroundColor: "primary.subtle", borderColor: "primary.border" },
  },
});

export const switchText = cva({
  base: { display: "flex", flexDirection: "column", gap: "2px", minWidth: 0 },
});

export const switchName = cva({
  base: { textStyle: "label.md", color: "text.primary" },
});

export const switchDescription = cva({
  base: { textStyle: "body.sm", color: "text.muted" },
});

export const switchControl = cva({
  base: {
    position: "relative",
    appearance: "none",
    width: "44px",
    height: "26px",
    flexShrink: 0,
    margin: 0,
    borderRadius: "full",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.strong",
    backgroundColor: "surface.sunken",
    cursor: "inherit",
    transition: "background-color 0.15s ease",
    "&:checked": { backgroundColor: "primary.solid", borderColor: "primary.solid" },
    "&::after": {
      content: '""',
      position: "absolute",
      top: "2px",
      left: "2px",
      width: "20px",
      height: "20px",
      borderRadius: "full",
      backgroundColor: "surface.card",
      boxShadow: "xs",
      transition: "transform 0.15s ease",
    },
    "&:checked::after": { transform: "translateX(18px)" },
    _disabled: { opacity: 0.5 },
    _focusVisible: {
      outline: "2px solid",
      outlineColor: "border.focusRing",
      outlineOffset: "2px",
    },
  },
});

/**
 * Native `<select>` styled to match `@repo/ui` TextInput.
 * TODO(E15 T2.2b): swap for the @repo/ui Select primitive when it lands.
 */
export const nativeSelect = cva({
  base: {
    width: "100%",
    minWidth: 0,
    minHeight: "density.control.md",
    px: "density.controlPadX",
    py: "density.controlPadY",
    backgroundColor: "surface.card",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.input",
    borderRadius: "md",
    color: "text.primary",
    textStyle: "body.md",
    fontVariantNumeric: "tabular-nums",
    cursor: "pointer",
    "@media (pointer: coarse)": { minHeight: "touch" },
    _focusVisible: {
      outlineWidth: "2px",
      outlineStyle: "solid",
      outlineColor: "border.focusRing",
      outlineOffset: "1px",
    },
  },
});
