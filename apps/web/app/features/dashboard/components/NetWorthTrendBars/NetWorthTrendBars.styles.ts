import { sva } from "@repo/ui/styled-system/css";

/**
 * The Home hero's trend bars, drawn on `surface.hero` only. Colour comes from the hero's own ink
 * through `currentColor`, so each pair reaches 3:1 (non-text marks, WCAG 1.4.11):
 * - earlier months: an outline in `text.onHero` (light 8.2:1 on the mint, dark 14:1 on the card);
 * - the latest month: a solid bar in `text.heroFigure` (light 8.2:1, dark 8.8:1).
 * The latest month differs by shape too (solid against outlined), so nothing rests on colour, and
 * forced colours keep that difference with the system ink.
 */
export const trendBars = sva({
  slots: ["root", "plot", "earlier", "latest", "zero"],
  base: {
    root: { display: "block", minWidth: "0" },
    plot: {
      display: "block",
      // The width follows the viewBox: seven bars are about 8rem wide at this height.
      height: "12",
      width: "auto",
      maxWidth: "100%",
      overflow: "visible",
      // The bars keep their fill and outline under forced colours, in the system ink below.
      forcedColorAdjust: "none",
    },
    earlier: {
      color: "text.onHero",
      _highContrast: { color: "CanvasText" },
    },
    latest: {
      color: "text.heroFigure",
      _highContrast: { color: "CanvasText" },
    },
    zero: {
      color: "text.onHero",
      _highContrast: { color: "CanvasText" },
    },
  },
});
