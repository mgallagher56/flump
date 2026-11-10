import { cva } from "@repo/ui/styled-system/css";

export const pageShell = cva({
  base: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    backgroundColor: "surface.canvas",
    color: "text.primary",
  },
});

export const mainContent = cva({
  base: {
    flex: 1,
  },
});

export const heroSection = cva({
  base: {
    position: "relative",
    py: "20",
    px: "4",
    textAlign: "center",
    overflow: "hidden",
    backgroundColor: "surface.canvas",
    borderBottomWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.DEFAULT",
  },
});

export const heroInner = cva({
  base: {
    maxWidth: "5xl",
    mx: "auto",
    position: "relative",
    zIndex: 1,
  },
});

export const heroBadge = cva({
  base: {
    display: "inline-flex",
    alignItems: "center",
    gap: "2",
    px: "3.5",
    py: "1.5",
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

export const heroHeading = cva({
  base: {
    fontSize: { base: "4xl", md: "6xl" },
    fontWeight: "extrabold",
    lineHeight: "1.1",
    letterSpacing: "-0.04em",
    color: "text.primary",
    fontFamily: "display",
    m: "0",
  },
});

export const heroLead = cva({
  base: {
    fontSize: { base: "lg", md: "xl" },
    color: "text.secondary",
    maxWidth: "3xl",
    lineHeight: "1.65",
    m: "0",
  },
});

export const sectionContainer = cva({
  base: {
    maxWidth: "6xl",
    mx: "auto",
    py: "16",
    px: "4",
  },
});

export const sectionHeader = cva({
  base: {
    textAlign: "center",
    mb: "12",
  },
});

export const sectionKicker = cva({
  base: {
    fontSize: "xs",
    fontWeight: "bold",
    letterSpacing: "0.04em",
    color: "primary",
    textTransform: "uppercase",
    fontFamily: "mono",
  },
});

export const sectionHeading = cva({
  base: {
    fontSize: { base: "2xl", md: "4xl" },
    fontWeight: "extrabold",
    color: "text.primary",
    fontFamily: "display",
    mt: "2",
    mb: "4",
  },
});

export const sectionSubheading = cva({
  base: {
    fontSize: "md",
    color: "text.secondary",
    maxWidth: "2xl",
    mx: "auto",
    lineHeight: "1.6",
    m: "0",
  },
});

export const featureCard = cva({
  base: {
    backgroundColor: "surface.card",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.DEFAULT",
    borderRadius: "xl",
    p: "6",
    display: "flex",
    flexDirection: "column",
    gap: "3",
    boxShadow: "card",
    transition: "transform 0.15s ease, border-color 0.15s ease",
    _hover: {
      borderColor: "primary.border",
      transform: "translateY(-2px)",
    },
  },
});

export const iconBadge = cva({
  base: {
    width: "10",
    height: "10",
    borderRadius: "lg",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "lg",
    borderWidth: "1px",
    borderStyle: "solid",
  },
  variants: {
    tone: {
      primary: {
        backgroundColor: "primary.subtle",
        color: "primary",
        borderColor: "primary.border",
      },
      positive: {
        backgroundColor: "status.positive.bg",
        color: "status.positive.text",
        borderColor: "status.positive.border",
      },
      warning: {
        backgroundColor: "status.warning.bg",
        color: "status.warning.text",
        borderColor: "status.warning.border",
      },
      info: {
        backgroundColor: "status.info.bg",
        color: "status.info.text",
        borderColor: "status.info.border",
      },
      danger: {
        backgroundColor: "status.danger.bg",
        color: "status.danger.text",
        borderColor: "status.danger.border",
      },
      neutral: {
        backgroundColor: "status.neutral.bg",
        color: "status.neutral.text",
        borderColor: "status.neutral.border",
      },
    },
  },
  defaultVariants: {
    tone: "primary",
  },
});

export const cardTitle = cva({
  base: {
    fontSize: "lg",
    fontWeight: "bold",
    color: "text.primary",
    m: "0",
  },
});

export const cardBody = cva({
  base: {
    fontSize: "sm",
    color: "text.secondary",
    lineHeight: "1.6",
    m: "0",
    fontVariantNumeric: "tabular-nums",
  },
});

export const cardSamplePrompt = cva({
  base: {
    fontSize: "xs",
    color: "text.muted",
    mt: "auto",
    pt: "2",
    fontVariantNumeric: "tabular-nums",
  },
});

export const toolCodePill = cva({
  base: {
    fontWeight: "bold",
    fontSize: "xs",
    fontFamily: "mono",
    color: "primary",
    backgroundColor: "primary.subtle",
    px: "2.5",
    py: "1",
    borderRadius: "md",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "primary.border",
  },
});

export const setupSection = cva({
  base: {
    py: "20",
    px: "4",
    backgroundColor: "surface.sunken",
    borderTopWidth: "1px",
    borderBottomWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.DEFAULT",
  },
});

export const setupContainer = cva({
  base: {
    maxWidth: "4xl",
    mx: "auto",
  },
});

export const tabButton = cva({
  base: {
    px: "4",
    py: "2",
    fontSize: "sm",
    fontWeight: "semibold",
    borderRadius: "lg",
    borderWidth: "1px",
    borderStyle: "solid",
    cursor: "pointer",
    transition: "all 0.15s ease",
    _hover: {
      color: "primary",
    },
  },
  variants: {
    active: {
      true: {
        borderColor: "primary.border",
        backgroundColor: "primary.subtle",
        color: "primary",
      },
      false: {
        borderColor: "transparent",
        backgroundColor: "transparent",
        color: "text.secondary",
      },
    },
  },
  defaultVariants: {
    active: false,
  },
});

export const setupPanel = cva({
  base: {
    backgroundColor: "surface.card",
    borderRadius: "2xl",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.DEFAULT",
    p: "7",
    display: "flex",
    flexDirection: "column",
    gap: "5",
    boxShadow: "card",
  },
});

export const stepBlock = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "2.5",
  },
});

export const stepTitle = cva({
  base: {
    fontSize: "lg",
    fontWeight: "bold",
    color: "text.primary",
    m: "0",
  },
});

export const stepText = cva({
  base: {
    fontSize: "sm",
    color: "text.secondary",
    lineHeight: "1.6",
    m: "0",
    fontVariantNumeric: "tabular-nums",
  },
});

export const inlinePrimaryLink = cva({
  base: {
    color: "primary",
    fontWeight: "semibold",
    textDecoration: "underline",
  },
});

export const pathList = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "2",
    fontSize: "xs",
    fontFamily: "mono",
  },
});

export const pathItem = cva({
  base: {
    py: "2",
    px: "3",
    backgroundColor: "surface.sunken",
    borderRadius: "md",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.subtle",
    color: "text.primary",
  },
});

export const snippetBox = cva({
  base: {
    backgroundColor: "surface.contrast",
    color: "text.onContrast",
    fontFamily: "mono",
    fontSize: "xs",
    py: "4",
    px: "5",
    borderRadius: "xl",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.strong",
    overflowX: "auto",
    lineHeight: "1.6",
    m: "0",
  },
});

export const copyButton = cva({
  base: {
    py: "1.5",
    px: "3",
    fontSize: "xs",
    fontWeight: "semibold",
    borderRadius: "md",
    backgroundColor: "primary",
    color: "primary.foreground",
    borderWidth: "0",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: "1.5",
    _hover: {
      backgroundColor: "primary.hover",
    },
  },
});

export const linkReset = cva({
  base: {
    textDecoration: "none",
  },
});

export const ctaSection = cva({
  base: {
    py: "20",
    px: "4",
    textAlign: "center",
    backgroundColor: "surface.canvas",
    borderTopWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.DEFAULT",
  },
});

export const ctaInner = cva({
  base: {
    maxWidth: "2xl",
    mx: "auto",
    display: "flex",
    flexDirection: "column",
    gap: "4",
    alignItems: "center",
  },
});
