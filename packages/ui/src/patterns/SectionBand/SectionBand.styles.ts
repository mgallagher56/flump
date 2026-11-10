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
        backgroundColor: "rgba(255, 255, 255, 0.12)",
        color: "chart.accentCyan",
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
        color: "rgba(255, 255, 255, 0.75)",
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
