import { cva } from "@repo/ui/styled-system/css";

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
