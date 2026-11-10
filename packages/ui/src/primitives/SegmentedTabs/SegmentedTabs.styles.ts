import { cva } from "../../../styled-system/css";

export const segmentedTabsList = cva({
  base: {
    display: "inline-flex",
    alignItems: "center",
    backgroundColor: "surface.sunken",
    padding: "4px",
    borderRadius: "xl",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.subtle",
    gap: "4px",
    maxWidth: "100%",
    overflowX: "auto",
  },
});

export const segmentedTabTrigger = cva({
  base: {
    padding: "8px 16px",
    minHeight: "36px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    whiteSpace: "nowrap",
    fontSize: "xs",
    fontWeight: "semibold",
    color: "text.muted",
    backgroundColor: "transparent",
    borderRadius: "lg",
    border: "none",
    cursor: "pointer",
    transition: "all 0.15s ease",
    "&[data-state='active']": {
      backgroundColor: "surface.card",
      color: "text.primary",
      boxShadow: "xs",
    },
    _hover: {
      color: "text.primary",
    },
    _focusVisible: {
      outline: "2px solid",
      outlineColor: "border.focusRing",
      outlineOffset: "2px",
    },
  },
});
