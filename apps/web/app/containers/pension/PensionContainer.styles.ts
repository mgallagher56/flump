import { css, cva } from "@repo/ui/styled-system/css";

export const pageRoot = css({
  display: "flex",
  flexDirection: "column",
  gap: "20px",
  paddingBottom: "64px",
});

export const tabList = cva({
  base: {
    margin: 0,
    padding: 0,
    display: "flex",
    gap: "4px",
    borderBottomWidth: "1px",
    borderBottomStyle: "solid",
    borderBottomColor: "border.subtle",
    overflowX: "auto",
    minWidth: 0,
  },
});

export const tabButton = cva({
  base: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    px: "14px",
    py: "10px",
    minH: "touch",
    textStyle: "label.md",
    whiteSpace: "nowrap",
    cursor: "pointer",
    backgroundColor: "transparent",
    borderWidth: 0,
    borderBottomWidth: "2px",
    borderBottomStyle: "solid",
    marginBottom: "-1px",
    _focusVisible: {
      outline: "2px solid",
      outlineColor: "border.focusRing",
      outlineOffset: "-2px",
    },
  },
  variants: {
    active: {
      true: { color: "primary", borderBottomColor: "primary" },
      false: {
        color: "text.muted",
        borderBottomColor: "transparent",
        _hover: { color: "text.primary" },
      },
    },
  },
});

export const panelStack = css({
  display: "flex",
  flexDirection: "column",
  gap: "20px",
  "&[hidden]": { display: "none" },
});

export const mutedNote = css({
  margin: 0,
  fontSize: "xs",
  color: "text.muted",
});

export const strong = css({
  fontWeight: "semibold",
  fontVariantNumeric: "tabular-nums",
});

export const trapAlert = css({
  display: "flex",
  flexDirection: "column",
  gap: "10px",
  padding: "16px 20px",
  borderRadius: "xl",
  borderWidth: "1px",
  borderStyle: "solid",
  borderColor: "status.warning.border",
  backgroundColor: "status.warning.bg",
  color: "text.primary",
  fontSize: "sm",
  "& p": { margin: 0 },
});

export const trapHeadingRow = css({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: "8px",
});

export const trapHeading = css({
  margin: 0,
  display: "inline-flex",
  alignItems: "center",
  gap: "8px",
  fontSize: "sm",
  fontWeight: "bold",
  color: "status.warning.text",
});

export const trapAction = css({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "10px",
  padding: "10px 14px",
  borderRadius: "md",
  borderWidth: "1px",
  borderStyle: "solid",
  borderColor: "status.warning.border",
  backgroundColor: "surface.card",
  fontSize: "xs",
  "& p": { margin: 0, maxWidth: "600px" },
});
