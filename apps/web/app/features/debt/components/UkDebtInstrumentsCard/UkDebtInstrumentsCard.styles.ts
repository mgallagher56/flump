import { css, cva } from "@repo/ui/styled-system/css";

export const instrumentsCard = cva({
  base: {
    minWidth: 0,
    padding: { base: "16px", md: "24px" },
    backgroundColor: "surface.card",
    borderRadius: "xl",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.subtle",
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
});

export const cardHeading = css({
  margin: 0,
  textStyle: "heading.md",
  color: "text.primary",
});

export const cardSubtitle = css({
  margin: 0,
  marginTop: "2px",
  fontSize: "xs",
  color: "text.muted",
});

export const toolTabList = cva({
  base: {
    display: "flex",
    gap: "4px",
    borderBottomWidth: "1px",
    borderBottomStyle: "solid",
    borderBottomColor: "border.subtle",
    overflowX: "auto",
    minWidth: 0,
  },
});

export const toolTab = cva({
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

export const toolGrid = cva({
  base: {
    display: "grid",
    gridTemplateColumns: { base: "1fr", md: "repeat(2, minmax(0, 1fr))" },
    gap: "20px",
    "&[hidden]": { display: "none" },
  },
});

export const inputStack = cva({
  base: { display: "flex", flexDirection: "column", gap: "16px", minWidth: 0 },
});

export const nativeSelect = cva({
  base: {
    width: "100%",
    minHeight: "44px",
    paddingX: "12px",
    borderRadius: "md",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.input",
    backgroundColor: "surface.card",
    color: "text.primary",
    textStyle: "body.md",
    cursor: "pointer",
    _focusVisible: {
      outline: "2px solid",
      outlineColor: "border.focusRing",
      outlineOffset: "2px",
    },
  },
});

export const resultBox = cva({
  base: {
    minWidth: 0,
    backgroundColor: "surface.sunken",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.subtle",
    padding: "16px",
    borderRadius: "lg",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
});

export const resultHeading = css({
  margin: 0,
  textStyle: "heading.sm",
  color: "text.primary",
});

export const banner = cva({
  base: {
    display: "flex",
    alignItems: "flex-start",
    gap: "10px",
    padding: "12px 16px",
    borderRadius: "md",
    borderWidth: "1px",
    borderStyle: "solid",
    fontSize: "sm",
    fontVariantNumeric: "tabular-nums",
    "& p": { margin: 0 },
    "& svg": { flexShrink: 0, marginTop: "2px" },
  },
  variants: {
    tone: {
      danger: {
        backgroundColor: "status.danger.bg",
        borderColor: "status.danger.border",
        color: "status.danger.text",
      },
      positive: {
        backgroundColor: "status.positive.bg",
        borderColor: "status.positive.border",
        color: "status.positive.text",
      },
      info: {
        backgroundColor: "status.info.bg",
        borderColor: "status.info.border",
        color: "status.info.text",
      },
    },
  },
  defaultVariants: { tone: "info" },
});

export const keyFigure = cva({
  base: {
    padding: "14px",
    borderRadius: "md",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.subtle",
    backgroundColor: "surface.card",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    fontVariantNumeric: "tabular-nums",
  },
});

export const keyFigureLabel = css({ fontSize: "xs", color: "text.muted" });

export const keyFigureValue = css({
  margin: 0,
  fontSize: "xl",
  fontWeight: "bold",
  color: "text.primary",
  fontVariantNumeric: "tabular-nums",
});

export const factRows = cva({
  base: { margin: 0, display: "flex", flexDirection: "column", gap: "8px" },
});

export const factRow = cva({
  base: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: "4px 12px",
    paddingBottom: "8px",
    borderBottomWidth: "1px",
    borderBottomStyle: "solid",
    borderBottomColor: "border.subtle",
    fontSize: "sm",
    fontVariantNumeric: "tabular-nums",
    "& dt": { color: "text.secondary" },
    "& dd": { margin: 0, fontWeight: "semibold", color: "text.primary" },
  },
});

export const footnote = css({
  margin: 0,
  fontSize: "xs",
  color: "text.muted",
  fontVariantNumeric: "tabular-nums",
});
