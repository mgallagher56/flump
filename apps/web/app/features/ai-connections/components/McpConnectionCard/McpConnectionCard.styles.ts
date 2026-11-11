import { cva } from "@repo/ui/styled-system/css";

export const connectionContainer = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "24px",
    width: "100%",
  },
});

export const connectionCard = cva({
  base: {
    backgroundColor: "surface.card",
    borderRadius: "xl",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.subtle",
    p: { base: "18px", md: "24px" },
    boxShadow: "card",
    display: "flex",
    flexDirection: "column",
    gap: "18px",
  },
});

export const headerRow = cva({
  base: {
    display: "flex",
    flexDirection: { base: "column", sm: "row" },
    justifyContent: "space-between",
    alignItems: { base: "flex-start", sm: "center" },
    gap: "12px",
  },
});

export const toggleSwitch = cva({
  base: {
    width: "44px",
    height: "24px",
    borderRadius: "full",
    borderWidth: "1px",
    borderStyle: "solid",
    cursor: "pointer",
    position: "relative",
    transition: "all 0.2s ease",
    flexShrink: 0,
    outline: "none",
    _focusVisible: {
      outline: "2px solid",
      outlineColor: "border.focusRing",
      outlineOffset: "2px",
    },
  },
  variants: {
    checked: {
      true: {
        backgroundColor: "primary",
        borderColor: "primary.border",
      },
      false: {
        backgroundColor: "surface.sunken",
        borderColor: "border.input",
      },
    },
  },
});

export const toggleKnob = cva({
  base: {
    position: "absolute",
    top: "2px",
    width: "18px",
    height: "18px",
    borderRadius: "full",
    backgroundColor: "surface.contrast",
    transition: "left 0.2s ease",
    boxShadow: "sm",
  },
  variants: {
    checked: {
      true: {
        left: "22px",
      },
      false: {
        left: "2px",
      },
    },
  },
});

export const codeSnippetBox = cva({
  base: {
    backgroundColor: "surface.sunken",
    borderRadius: "lg",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.subtle",
    p: "14px",
    fontFamily: "mono",
    fontSize: "xs",
    color: "text.primary",
    position: "relative",
    overflowX: "auto",
    fontVariantNumeric: "tabular-nums",
  },
});

export const copyButton = cva({
  base: {
    position: "absolute",
    top: "10px",
    right: "10px",
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "4px 8px",
    fontSize: "xs",
    fontWeight: "medium",
    borderRadius: "md",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.subtle",
    backgroundColor: "surface.card",
    color: "text.primary",
    cursor: "pointer",
    transition: "all 0.15s ease",
    _hover: {
      backgroundColor: "surface.subtle",
      borderColor: "border.strong",
    },
  },
});

export const tokenTable = cva({
  base: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "xs",
    fontVariantNumeric: "tabular-nums",
  },
});

export const tokenTableHeader = cva({
  base: {
    textAlign: "left",
    padding: "8px 12px",
    borderBottomWidth: "1px",
    borderBottomStyle: "solid",
    borderBottomColor: "border.subtle",
    color: "text.muted",
    fontWeight: "semibold",
  },
});

export const tokenTableCell = cva({
  base: {
    padding: "10px 12px",
    borderBottomWidth: "1px",
    borderBottomStyle: "solid",
    borderBottomColor: "border.subtle",
    color: "text.primary",
    verticalAlign: "middle",
  },
});
