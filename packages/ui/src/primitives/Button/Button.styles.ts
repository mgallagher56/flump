import { cva } from "../../../styled-system/css";

/** Real disabled only: a pending button (aria-disabled) keeps its own colours. */
const DISABLED = "&:is(:disabled, [disabled])";

const dangerStyles = {
  bg: "status.danger.solid",
  color: "primary.foreground",
  _hover: { opacity: 0.9 },
} as const;

export const buttonRecipe = cva({
  base: {
    position: "relative",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "2",
    rounded: "xl",
    borderWidth: "1.5px",
    borderStyle: "solid",
    borderColor: "transparent",
    fontWeight: "bold",
    cursor: "pointer",
    lineHeight: "1.25",
    textAlign: "center",
    textDecoration: "none",
    py: "2",
    "@media (pointer: coarse)": { minH: "touch" },
    _motionSafe: {
      transitionProperty: "background-color, border-color, box-shadow, transform, opacity",
      transitionDuration: "fast",
      transitionTimingFunction: "standard",
      _hover: { transform: "translateY(-2px)" },
      _active: { transform: "scale(0.97)" },
    },
    [DISABLED]: {
      // In dark, sunken is the darkest step, so a disabled primary read as a near-black button of
      // its own; the subtle step reads as a muted, inactive fill (phone audit P29).
      bg: { base: "surface.sunken", _dark: "surface.subtle", _systemDark: "surface.subtle" },
      color: "text.muted",
      borderColor: "border.subtle",
      cursor: "not-allowed",
      boxShadow: "none",
    },
    "&[aria-busy=true]": { cursor: "progress" },
    _focusVisible: {
      outline: "2px solid",
      outlineColor: "border.focusRing",
      outlineOffset: "2px",
    },
  },
  variants: {
    variant: {
      primary: {
        bg: "primary.solid",
        color: "primary.foreground",
        boxShadow: "raised",
        _hover: { bg: "primary.hover" },
      },
      secondary: {
        bg: "surface.card",
        color: "text.primary",
        borderColor: "border.strong",
        _hover: { bg: "surface.subtle" },
      },
      outline: {
        bg: "transparent",
        color: "text.primary",
        borderColor: "border.strong",
        _hover: { bg: "surface.subtle" },
      },
      ghost: {
        bg: "transparent",
        color: "text.primary",
        _hover: { bg: "surface.subtle" },
        [DISABLED]: { bg: "transparent", borderColor: "transparent" },
      },
      link: {
        bg: "transparent",
        color: "primary",
        textUnderlineOffset: "4px",
        _hover: { textDecoration: "underline" },
        height: "auto",
        minH: "0",
        px: "1",
        py: "0",
        [DISABLED]: { bg: "transparent", borderColor: "transparent" },
        // Keeps its inline text size, but a touch screen gets a 44px target through an invisible
        // hit area, as CollapsibleDrawer's quiet button does (phone audit P16).
        "@media (pointer: coarse)": {
          minH: "0",
          _before: {
            content: '""',
            position: "absolute",
            insetInline: "0",
            top: "50%",
            transform: "translateY(-50%)",
            height: "touch",
            minWidth: "touch",
          },
          // The 44px area reaches past the line box, so where another target sits on the next or
          // previous line it would cover that target's visible text, and the later one in the
          // page would steal its taps. CSS cannot measure the gap to a neighbour, so the area is
          // dropped wherever neighbours are likely to be that close: inside running text (WCAG
          // 2.5.8 exempts inline links, and their line height sets their size), beside another
          // link button, and in a list of two or more items. A lone link button keeps the area.
          "p &, label &, span > &, figcaption &, blockquote &": { _before: { content: "none" } },
          '[data-variant="link"] + &': { _before: { content: "none" } },
          '&:has(+ [data-variant="link"])': { _before: { content: "none" } },
          "li:has(+ li) > &, li + li > &": { _before: { content: "none" } },
        },
      },
      danger: dangerStyles,
      /**
       * A delete or other destructive control outside the confirmation (owner ruling, item 25,
       * UX D3): danger text and border on no fill, so it reads as destructive without shouting.
       */
      dangerSubtle: {
        bg: "transparent",
        color: "status.danger.text",
        borderColor: "status.danger.border",
        _hover: { bg: "status.danger.bg" },
      },
      /** @deprecated Use `danger`. Kept so existing screens keep working until they migrate. */
      destructive: dangerStyles,
    },
    size: {
      sm: { px: "4", fontSize: "sm", minH: "density.control.md" },
      md: { px: "6", fontSize: "md", minH: "density.control.lg" },
      lg: { px: "8", fontSize: "lg", minH: "14" },
      /** @deprecated Use `IconButton`. Square 40px button for icon-only content. */
      icon: { h: "10", w: "10", px: "0", "@media (pointer: coarse)": { minW: "touch" } },
    },
  },
  compoundVariants: [
    // The inline link never takes a control height or padding, whatever the size.
    ...(["sm", "md", "lg", "icon"] as const).map((size) => ({
      variant: "link" as const,
      size,
      css: { minH: "0", px: "1", h: "auto", w: "auto" },
    })),
  ],
  defaultVariants: {
    variant: "primary",
    size: "md",
  },
});

/** Square icon-only sizing, layered on top of `buttonRecipe`. */
export const iconButtonRecipe = cva({
  base: { px: "0", flexShrink: 0, "@media (pointer: coarse)": { minW: "touch" } },
  variants: {
    size: {
      sm: { w: "density.control.md", h: "density.control.md" },
      md: { w: "density.control.lg", h: "density.control.lg" },
      lg: { w: "14", h: "14" },
    },
  },
  defaultVariants: { size: "md" },
});

/** Label wrapper. While pending it is transparent (not hidden) so the width and name stay put. */
export const buttonContentRecipe = cva({
  base: { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "2" },
  variants: { pending: { true: { opacity: 0 } } },
});

export const buttonSpinnerRecipe = cva({
  base: {
    position: "absolute",
    insetBlock: "0",
    insetInline: "0",
    margin: "auto",
    width: "1.25em",
    height: "1.25em",
    rounded: "full",
    borderWidth: "2px",
    borderStyle: "solid",
    borderColor: "currentColor",
    borderTopColor: "transparent",
    pointerEvents: "none",
    _motionSafe: {
      animationName: "spin",
      animationDuration: "loop",
      animationTimingFunction: "linear",
      animationIterationCount: "infinite",
    },
  },
});

/**
 * E17 Demo 5: The tick and "Saved", laid over the transparent label (as the pending spinner is) so
 * the button keeps its width. Fades in over `fast`.
 */
export const buttonSavedContentRecipe = cva({
  base: {
    position: "absolute",
    insetBlock: "0",
    insetInline: "0",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "2",
    whiteSpace: "nowrap",
    pointerEvents: "none",
    _motionSafe: {
      animationName: "fadeIn",
      animationDuration: "fast",
      animationTimingFunction: "standard",
      animationFillMode: "both",
    },
    _motionReduce: {
      animation: "none",
    },
  },
});

/** E17 Demo 5: Tick icon that draws over base standard after fast delay */
export const buttonTickIconRecipe = cva({
  base: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    width: "1.1em",
    height: "1.1em",
    "& svg": {
      width: "100%",
      height: "100%",
    },
    "& path, & polyline": {
      strokeDasharray: "24",
      strokeDashoffset: "24",
      _motionSafe: {
        animationName: "tick",
        animationDuration: "base",
        animationTimingFunction: "standard",
        animationDelay: "fast",
        animationFillMode: "forwards",
      },
      _motionReduce: {
        animation: "none",
        strokeDashoffset: "0",
      },
    },
  },
});
