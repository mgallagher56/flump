import { StyleSheet } from "react-native";
import type { IconName } from "../../navigation/navItems";
import type { Theme } from "../../theme/ThemeProvider";
import type { HeroChange } from "./HeroFigure";

/** Web's delta icons: an arrow up or down, a dash for no change. Never a colour for a fall. */
export const CHANGE_ICON: Record<HeroChange["direction"], IconName> = {
  up: "arrow-up",
  down: "arrow-down",
  flat: "minus",
};

/** How wide the label and change blocks are while loading, so they read as text, not a table. */
const LABEL_BLOCK_WIDTH = "40%";
const FIGURE_BLOCK_WIDTH = "60%";
const LINE_BLOCK_WIDTH = "50%";

/**
 * The loading blocks' heights: one line each of the label, the figure and the change line at the
 * current text size, so the hero that replaces them takes the same frame. A gallery preview draws
 * its own scale in place of the phone's, as `Text` does.
 */
export function skeletonHeights(theme: Theme, fontScale: number) {
  const scale = theme.textScale === 1 ? fontScale : theme.textScale;
  return {
    label: theme.textStyles["label.md"].lineHeight * scale,
    figure: theme.textStyles["heading.lg"].lineHeight * scale,
    line: theme.textStyles["body.sm"].lineHeight * scale,
  };
}

export const createStyles = (theme: Theme) =>
  StyleSheet.create({
    base: { alignSelf: "stretch", gap: theme.spacing["3"] },
    group: { alignSelf: "stretch", gap: theme.spacing["1"] },
    change: { flexDirection: "row", alignItems: "center", gap: theme.spacing["1"] },
    // Wraps beside the arrow at 200% text instead of running off a 320 point screen.
    changeText: { flexShrink: 1 },
    // Still blocks on the sunken surface: no shimmer, so Reduce Motion is met by construction.
    block: { borderRadius: theme.radii.sm, backgroundColor: theme.colors["surface.sunken"] },
    labelBlock: { width: LABEL_BLOCK_WIDTH },
    figureBlock: { width: FIGURE_BLOCK_WIDTH },
    lineBlock: { width: LINE_BLOCK_WIDTH },
    slotBlock: { alignSelf: "stretch" },
  });
