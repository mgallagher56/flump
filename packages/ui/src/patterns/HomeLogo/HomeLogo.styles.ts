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
    // Current page mark (a short bar under the logo), only where no inline "Home" link shows it.
    position: "relative",
    '&[aria-current="page"]::after': {
      content: '""',
      position: "absolute",
      insetInline: "25%",
      bottom: "-6px",
      height: "3px",
      borderRadius: "full",
      // A graphic-only fill (no text on it).
      backgroundColor: "chart.primary",
    },
    _navWide: { '&[aria-current="page"]::after': { display: "none" } },
  },
});
