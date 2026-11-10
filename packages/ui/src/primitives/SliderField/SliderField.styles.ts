import { cva } from "../../../styled-system/css";

export const sliderFieldContainer = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    width: "100%",
  },
});

export const sliderFieldHeader = cva({
  base: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "8px",
  },
});

export const sliderFieldLabel = cva({
  base: {
    fontSize: "xs",
    fontWeight: "semibold",
    color: "text.primary",
  },
});

export const sliderFieldValuePill = cva({
  base: {
    display: "inline-flex",
    alignItems: "center",
    gap: "2px",
    px: "8px",
    py: "2px",
    borderRadius: "md",
    backgroundColor: "surface.sunken",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.subtle",
    fontSize: "xs",
    fontWeight: "bold",
    color: "primary",
    fontVariantNumeric: "tabular-nums",
  },
});

export const sliderInputTrack = cva({
  base: {
    width: "100%",
    accentColor: "token(colors.primary)",
    cursor: "pointer",
    minHeight: "36px",
    _focusVisible: {
      outline: "2px solid",
      outlineColor: "border.focusRing",
      outlineOffset: "2px",
    },
  },
});
