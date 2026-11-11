import { cva } from "@repo/ui/styled-system/css";

export const confirmOverlay = cva({
  base: {
    position: "fixed",
    inset: 0,
    backgroundColor: "surface.contrast/60",
    zIndex: 50,
  },
});

export const confirmContent = cva({
  base: {
    position: "fixed",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    width: "calc(100vw - 32px)",
    maxWidth: "440px",
    p: { base: "20px", md: "24px" },
    backgroundColor: "surface.card",
    borderRadius: "xl",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border",
    boxShadow: "card",
    color: "text.primary",
    zIndex: 60,
    outline: "none",
  },
});

export const confirmTitle = cva({
  base: {
    margin: 0,
    fontFamily: "display",
    fontSize: "lg",
    fontWeight: "bold",
    color: "text.primary",
  },
});

export const confirmDescription = cva({
  base: {
    margin: 0,
    fontSize: "sm",
    lineHeight: "1.5",
    color: "text.secondary",
  },
});

export const confirmField = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    fontSize: "sm",
    color: "text.secondary",
  },
});

export const confirmInput = cva({
  base: {
    height: "40px",
    px: "12px",
    fontSize: "sm",
    fontVariantNumeric: "tabular-nums",
    color: "text.primary",
    backgroundColor: "surface.sunken",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.input",
    borderRadius: "md",
    _focusVisible: { outline: "2px solid", outlineColor: "border.focusRing", outlineOffset: "2px" },
  },
});

export const confirmActions = cva({
  base: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "flex-end",
    gap: "12px",
    marginTop: "8px",
  },
});

export const confirmError = cva({
  base: {
    margin: 0,
    px: "12px",
    py: "8px",
    fontSize: "sm",
    lineHeight: "1.5",
    color: "status.danger.text",
    backgroundColor: "status.danger.bg",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "status.danger.border",
    borderRadius: "md",
  },
});
