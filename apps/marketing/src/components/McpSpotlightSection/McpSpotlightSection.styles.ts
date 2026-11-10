import { cva } from "@repo/ui/styled-system/css";

export const spotlightSection = cva({
  base: {
    py: "20",
    px: "4",
    backgroundColor: "surface.contrast",
    color: "text.onContrast",
    position: "relative",
    overflow: "hidden",
    borderTopWidth: "1px",
    borderBottomWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.strong",
  },
});

export const spotlightContainer = cva({
  base: {
    maxWidth: "7xl",
    mx: "auto",
  },
});

export const spotlightColumn = cva({
  base: {
    gridColumn: { base: "span 1", lg: "span 6" },
  },
});

export const spotlightBadge = cva({
  base: {
    display: "inline-flex",
    alignItems: "center",
    gap: "2",
    px: "3",
    py: "1",
    borderRadius: "full",
    backgroundColor: "primary.subtle",
    color: "primary",
    fontSize: "xs",
    fontWeight: "bold",
    letterSpacing: "0.02em",
    fontFamily: "mono",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "primary.border",
  },
});

export const spotlightHeading = cva({
  base: {
    fontSize: { base: "3xl", md: "4xl" },
    fontWeight: "extrabold",
    lineHeight: "1.15",
    letterSpacing: "-0.03em",
    color: "text.onContrast",
    fontFamily: "display",
    m: "0",
  },
});

export const spotlightLead = cva({
  base: {
    fontSize: "md",
    color: "text.onContrast",
    opacity: 0.85,
    lineHeight: "1.65",
    m: "0",
  },
});

export const bulletRow = cva({
  base: {
    display: "flex",
    alignItems: "center",
    gap: "3",
    fontSize: "sm",
    color: "text.onContrast",
  },
});

export const bulletIcon = cva({
  base: {
    flexShrink: 0,
  },
  variants: {
    tone: {
      positive: { color: "status.positive.solid" },
      primary: { color: "primary" },
      info: { color: "status.info.solid" },
    },
  },
  defaultVariants: {
    tone: "primary",
  },
});

export const linkReset = cva({
  base: {
    textDecoration: "none",
  },
});

export const terminalCard = cva({
  base: {
    backgroundColor: "surface.sunken",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.DEFAULT",
    borderRadius: "xl",
    p: "5",
    fontFamily: "mono",
    fontSize: "xs",
    lineHeight: "1.6",
    color: "text.secondary",
    boxShadow: "floating",
    overflowX: "auto",
  },
});

export const terminalHeader = cva({
  base: {
    display: "flex",
    alignItems: "center",
    gap: "2",
    mb: "3",
    pb: "3",
    borderBottomWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.subtle",
  },
});

export const terminalDot = cva({
  base: {
    width: "2.5",
    height: "2.5",
    borderRadius: "full",
  },
  variants: {
    tone: {
      danger: { backgroundColor: "status.danger.solid" },
      warning: { backgroundColor: "status.warning.solid" },
      positive: { backgroundColor: "status.positive.solid" },
    },
  },
});

export const terminalTitle = cva({
  base: {
    ml: "2",
    fontSize: "xs",
    color: "text.muted",
  },
});

export const terminalPromptLine = cva({
  base: {
    color: "status.info.text",
    mb: "2",
  },
});

export const terminalToolLine = cva({
  base: {
    color: "primary",
    mb: "2",
  },
});

export const terminalPayloadBox = cva({
  base: {
    backgroundColor: "surface.card",
    p: "3",
    borderRadius: "md",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.subtle",
    mb: "3",
    fontVariantNumeric: "tabular-nums",
  },
});

export const payloadComment = cva({
  base: {
    color: "text.muted",
  },
});

export const payloadBracket = cva({
  base: {
    color: "text.primary",
  },
});

export const payloadKey = cva({
  base: {
    color: "status.info.text",
  },
});

export const payloadBool = cva({
  base: {
    color: "status.positive.text",
  },
});

export const payloadNum = cva({
  base: {
    color: "status.warning.text",
    fontVariantNumeric: "tabular-nums",
  },
});

export const terminalSummary = cva({
  base: {
    color: "text.secondary",
    fontSize: "xs",
    lineHeight: "1.5",
    fontVariantNumeric: "tabular-nums",
  },
});

export const terminalSummaryStrong = cva({
  base: {
    color: "text.primary",
    fontWeight: "bold",
  },
});
