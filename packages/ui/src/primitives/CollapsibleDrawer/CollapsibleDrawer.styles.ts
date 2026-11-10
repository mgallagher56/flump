import { cva } from "../../../styled-system/css";

export const drawerContainer = cva({
  base: {
    borderRadius: "xl",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.subtle",
    backgroundColor: "surface.card",
    overflow: "hidden",
    transition: "border-color 0.2s ease",
  },
});

export const drawerHeaderButton = cva({
  base: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    p: { base: "14px 16px", md: "16px 20px" },
    backgroundColor: "transparent",
    border: "none",
    cursor: "pointer",
    textAlign: "left",
    transition: "background-color 0.15s ease",
    _hover: {
      backgroundColor: "surface.subtle",
    },
    _focusVisible: {
      outline: "2px solid",
      outlineColor: "border.focusRing",
      outlineOffset: "-2px",
    },
  },
});

export const drawerBody = cva({
  base: {
    p: { base: "16px", md: "20px" },
    borderTopWidth: "1px",
    borderTopStyle: "solid",
    borderTopColor: "border.subtle",
    backgroundColor: "surface.card",
  },
});
