import { cva } from "@repo/ui/styled-system/css";

/**
 * The closing call to action on the dark `contrast` band (Midnight and Mint, 24 Nov 2026). The
 * primary button is charcoal in light, which would vanish on the charcoal band, so here it takes
 * the solid mint fill with dark ink (surface.hero and text.onHero) in light; in dark the ordinary
 * primary button is already mint with dark ink.
 */
export const closingCtaBody = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "4",
    textAlign: "center",
    scrollMarginTop: "24",
    "& a[data-variant=primary]": {
      bg: { base: "surface.hero", _dark: "primary.solid", _systemDark: "primary.solid" },
      color: {
        base: "text.onHero",
        _dark: "primary.foreground",
        _systemDark: "primary.foreground",
      },
      _hover: {
        bg: { base: "surface.hero", _dark: "primary.hover", _systemDark: "primary.hover" },
        textDecoration: "underline",
      },
      _focusVisible: { outlineColor: "text.onContrast" },
    },
  },
});

/**
 * Wraps the scene so it takes its dark colours (data-theme="dark"). `display: contents` keeps the
 * scene itself as the flex item, so its own width and centring are unchanged.
 */
export const closingCtaScene = cva({ base: { display: "contents" } });

export const closingCtaTitle = cva({
  base: { textStyle: "heading.lg", color: "text.onContrast", margin: 0 },
});

export const closingCtaText = cva({
  base: { textStyle: "body.md", color: "text.onContrast", margin: 0 },
});
