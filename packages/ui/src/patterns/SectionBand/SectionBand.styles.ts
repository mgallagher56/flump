import { cva } from "../../../styled-system/css";

export const sectionBandRecipe = cva({
  base: {
    width: "100%",
  },
  variants: {
    tone: {
      canvas: {
        backgroundColor: "surface.canvas",
      },
      subtle: {
        backgroundColor: "surface.subtle",
        borderTopWidth: "1px",
        borderBottomWidth: "1px",
        borderStyle: "solid",
        borderColor: "border.subtle",
      },
      tinted: {
        backgroundColor: "primary.subtle",
        borderTopWidth: "1px",
        borderBottomWidth: "1px",
        borderStyle: "solid",
        borderColor: "primary.border",
      },
      contrast: {
        backgroundColor: "surface.contrast",
        color: "text.onContrast",
        borderTopWidth: "1px",
        borderBottomWidth: "1px",
        borderStyle: "solid",
        borderColor: "border.strong",
      },
    },
  },
  defaultVariants: {
    tone: "canvas",
  },
});

export const indexBadgeRecipe = cva({
  base: {
    display: "inline-block",
    fontFamily: "mono",
    fontSize: "xs",
    fontWeight: "600",
    px: "3",
    py: "1",
    borderRadius: "full",
    mb: "3",
  },
  variants: {
    contrast: {
      true: {
        backgroundColor: "transparent",
        borderWidth: "1px",
        borderStyle: "solid",
        borderColor: "currentColor",
        // Text on the contrast band; chart.accentCyan is a graphic colour and failed AA as text
        // (2.08:1 light, 3.67:1 dark).
        color: "text.onContrast",
      },
      false: {
        backgroundColor: "primary.subtle",
        color: "primary",
      },
    },
  },
  defaultVariants: {
    contrast: false,
  },
});

export const sectionTitleRecipe = cva({
  base: {
    fontFamily: "display",
    fontSize: { base: "2rem", sm: "2.5rem", md: "2.85rem" },
    fontWeight: "800",
    lineHeight: "1.15",
    letterSpacing: "-0.03em",
    margin: 0,
  },
  variants: {
    contrast: {
      true: {
        color: "text.onContrast",
      },
      false: {
        color: "text.primary",
      },
    },
  },
  defaultVariants: {
    contrast: false,
  },
});

export const sectionSubtitleRecipe = cva({
  base: {
    fontSize: { base: "md", md: "lg" },
    lineHeight: "1.6",
    mt: "3",
    mb: 0,
    mx: "auto",
    maxWidth: "640px",
  },
  variants: {
    contrast: {
      true: {
        color: "text.onContrast",
      },
      false: {
        color: "text.muted",
      },
    },
  },
  defaultVariants: {
    contrast: false,
  },
});

/** App variant: left-aligned section heading as on the Direction C frame ("Where you stand"). */
export const appBandRecipe = cva({
  base: { display: "flex", flexDirection: "column", gap: "4", width: "100%" },
});

export const appHeadingGroup = cva({
  base: { display: "flex", flexDirection: "column", gap: "1" },
});

export const appTitleRecipe = cva({
  base: { textStyle: "heading.md", color: "text.primary", margin: 0 },
});

export const appSubtitleRecipe = cva({
  base: { textStyle: "body.sm", color: "text.secondary", margin: 0, maxWidth: "720px" },
});

export const marketingInnerRecipe = cva({
  base: {
    maxWidth: "6xl",
    mx: "auto",
    py: { base: "14", md: "20" },
    px: { base: "4", sm: "6" },
  },
});

export const marketingHeaderRecipe = cva({
  base: {
    textAlign: "center",
    mb: { base: "10", md: "14" },
    maxWidth: "760px",
    mx: "auto",
  },
});
