import { StyleSheet } from "react-native";
import type { Theme } from "../../theme/ThemeProvider";

/** Web's bottom bar label: `label.sm`, semibold. */
export const LABEL_STYLE = "label.sm" as const;

/**
 * From this text scale the icons go and only the label names the tab, as web's bar at large text
 * (phone audit P19), so the bar does not take a quarter of the screen.
 */
const LABEL_ONLY_FROM = 1.5;

/**
 * Average width of a label character as a share of the font size at the selected semibold weight
 * (`fontWeight: "600"`), so every tab is estimated as if selected (any tab can be selected).
 */
const CHARACTER_WIDTH = 0.58;
/** The pill's padding on each side of a label (`spacing["1"]`); cells have 0 horizontal padding. */
const LABEL_PADDING = 4;
/** Minimum tab target width (`sizes["control.lg"]`). */
const MIN_TAB_WIDTH = 48;
/** Safety margin (10%) so wide glyphs like "Home" do not wrap mid-word at large text. */
const SAFETY_MARGIN = 1.1;

export interface TabLayoutInput {
  readonly labels: readonly string[];
  /** The bar's width in points. */
  readonly width: number;
  /** The label's font size at the current text scale. */
  readonly fontSize: number;
  readonly textScale: number;
}

const FLOAT_EPSILON = 1e-6;

export interface TabLayout {
  readonly mode: "equal" | "proportional" | "scroll";
  readonly showIcons: boolean;
  readonly labelWidths: readonly number[];
}

/**
 * Picks between three single-row layouts: equal cells when the longest label fits every tab,
 * proportional cells when the summed label widths fit without wrapping or clipping, and a
 * scrolling row otherwise.
 */
export function tabLayout({ labels, width, fontSize, textScale }: TabLayoutInput): TabLayout {
  const labelWidths = labels.map((label) =>
    Math.max(
      MIN_TAB_WIDTH,
      (label.length * fontSize * CHARACTER_WIDTH + LABEL_PADDING * 2) * SAFETY_MARGIN,
    ),
  );
  const longest = labelWidths.reduce((max, w) => Math.max(max, w), 0);
  const totalWidth = labelWidths.reduce((sum, w) => sum + w, 0);
  const mode =
    longest * labels.length - width <= FLOAT_EPSILON
      ? "equal"
      : totalWidth - width <= FLOAT_EPSILON
        ? "proportional"
        : "scroll";
  return { mode, showIcons: textScale < LABEL_ONLY_FROM, labelWidths };
}

export interface OverflowCueInput {
  readonly scroll: boolean;
  readonly scrollX: number;
  readonly viewportWidth: number;
  readonly contentWidth: number;
}

/** Which edges of a scrolling tab row have hidden tabs past them. */
export function overflowCues({ scroll, scrollX, viewportWidth, contentWidth }: OverflowCueInput): {
  readonly left: boolean;
  readonly right: boolean;
} {
  if (!scroll) return { left: false, right: false };
  return {
    left: scrollX > 1,
    right: contentWidth > 0 ? scrollX + viewportWidth < contentWidth - 1 : true,
  };
}

export interface ScrollTargetInput {
  readonly cellX: number;
  readonly cellWidth: number;
  readonly scrollX: number;
  readonly viewportWidth: number;
  readonly contentWidth: number;
  readonly edgePadding: number;
}

/**
 * Scroll offset that brings the active tab clear of the bar's edges and edge fades, or `null`
 * when it is already fully visible.
 */
export function scrollTargetForTab({
  cellX,
  cellWidth,
  scrollX,
  viewportWidth,
  contentWidth,
  edgePadding,
}: ScrollTargetInput): number | null {
  if (viewportWidth <= 0) return null;
  const leftInset = scrollX > 1 ? edgePadding : 0;
  const hasRightOverflow = contentWidth > 0 ? scrollX + viewportWidth < contentWidth - 1 : true;
  const rightInset = hasRightOverflow ? edgePadding : 0;
  const cellEnd = cellX + cellWidth;
  if (cellX >= scrollX + leftInset && cellEnd <= scrollX + viewportWidth - rightInset) return null;
  const effectiveContent = contentWidth > 0 ? contentWidth : cellEnd;
  const maxScroll = Math.max(0, effectiveContent - viewportWidth);
  const centred = cellX + cellWidth / 2 - viewportWidth / 2;
  return Math.max(0, Math.min(centred, maxScroll));
}

export const createStyles = (theme: Theme) =>
  StyleSheet.create({
    bar: {
      backgroundColor: theme.colors["surface.card"],
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      paddingTop: theme.spacing["1"],
      paddingBottom: theme.spacing["1"],
      paddingHorizontal: theme.spacing["1"],
    },
    tablist: { position: "relative" },
    // One View per row and equal flex cells, never a wrapping row of percentage widths: Android
    // rounds each 20% cell to whole pixels, and five rounded up overran the bar and pushed the fifth
    // tab onto a second row at the normal size (device check, 26 November 2026).
    row: { flexDirection: "row" },
    scrollRow: { flexDirection: "row" },
    cell: { flex: 1, flexBasis: 0, alignItems: "stretch" },
    proportionalCell: { flexBasis: 0, alignItems: "stretch" },
    scrollCell: { flexShrink: 0, alignItems: "stretch" },
    fade: { position: "absolute", top: 0, bottom: 0, width: theme.spacing["6"] },
    fadeLeft: { left: 0 },
    fadeRight: { right: 0 },
    tab: {
      alignItems: "center",
      justifyContent: "center",
      gap: theme.spacing["1"],
      paddingHorizontal: theme.spacing["1"],
      borderRadius: theme.radii.full,
    },
    // The current tab: web's `primary.subtle` pill with `primary` text, a shape as well as a colour.
    selected: { backgroundColor: theme.colors["primary.subtle"] },
    label: { color: theme.colors["text.secondary"], fontWeight: "600", textAlign: "center" },
    labelSelected: { color: theme.colors.primary },
  });
