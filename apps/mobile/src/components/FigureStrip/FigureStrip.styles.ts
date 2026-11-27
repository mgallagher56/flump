import { StyleSheet } from "react-native";
import type { Theme } from "../../theme/ThemeProvider";

/**
 * Narrower than this (a 320 point phone, or a split screen) the two cells stack, so neither figure
 * is squeezed onto two lines.
 */
export const STACK_BELOW_WIDTH = 360;
/** From this text size up (150%) the cells stack too, so 200% text is never clipped. */
export const STACK_FROM_FONT_SCALE = 1.5;

/** Whether the cells sit one above the other. A gallery preview passes its own text scale. */
export function stacks(theme: Theme, fontScale: number, width: number): boolean {
  const scale = theme.textScale === 1 ? fontScale : theme.textScale;
  return scale >= STACK_FROM_FONT_SCALE || width < STACK_BELOW_WIDTH;
}

/**
 * The loading blocks' heights: one line each of the label, the figure and the caption at the
 * current text size, so the cells that replace them take the same frame (as `HeroFigure`).
 */
export function skeletonHeights(theme: Theme, fontScale: number) {
  const scale = theme.textScale === 1 ? fontScale : theme.textScale;
  return {
    label: theme.textStyles["label.md"].lineHeight * scale,
    figure: theme.textStyles["heading.md"].lineHeight * scale,
    caption: theme.textStyles["body.sm"].lineHeight * scale,
  };
}

const LABEL_BLOCK_WIDTH = "70%";
const FIGURE_BLOCK_WIDTH = "50%";
const CAPTION_BLOCK_WIDTH = "60%";

export const createStyles = (theme: Theme) =>
  StyleSheet.create({
    row: { alignSelf: "stretch", flexDirection: "row", gap: theme.spacing["3"] },
    column: { alignSelf: "stretch", flexDirection: "column", gap: theme.spacing["3"] },
    // Side by side the cells share the width evenly; stacked each takes the full width.
    cellInRow: { flex: 1, flexBasis: 0 },
    cellStacked: { alignSelf: "stretch" },
    group: { gap: theme.spacing["1"] },
    prompt: { alignSelf: "stretch", alignItems: "flex-start" },
    // Still blocks on the sunken surface: no shimmer, so Reduce Motion is met by construction.
    block: { borderRadius: theme.radii.sm, backgroundColor: theme.colors["surface.sunken"] },
    labelBlock: { width: LABEL_BLOCK_WIDTH },
    figureBlock: { width: FIGURE_BLOCK_WIDTH },
    captionBlock: { width: CAPTION_BLOCK_WIDTH },
  });
