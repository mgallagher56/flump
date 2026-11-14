import { cva } from "../../../styled-system/css";

export const homeLogoRoot = cva({
  base: { display: "inline-flex", alignItems: "center", flexShrink: 0 },
});

export const homeLogoLink = cva({
  base: {
    display: "inline-flex",
    alignItems: "center",
    borderRadius: "control",
    textDecoration: "none",
    _focusVisible: {
      outline: "2px solid",
      outlineColor: "border.focusRing",
      outlineOffset: "2px",
    },
  },
});
