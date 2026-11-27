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
 * Average width of a label character as a share of the font size: generous for the system sans
 * at semibold, so an estimate errs towards another row rather than a clipped word. At the normal
 * size the five labels fit one row at 320 points, as on web; the fit on a phone is a device check.
 */
const CHARACTER_WIDTH = 0.55;
/** The pill's padding on each side of a label (`spacing["1"]`). */
const LABEL_PADDING = 4;

export interface TabLayoutInput {
  readonly count: number;
  /** The bar's width in points. */
  readonly width: number;
  /** Characters in the longest label. */
  readonly longestLabel: number;
  /** The label's font size at the current text scale. */
  readonly fontSize: number;
  readonly textScale: number;
}

export interface TabLayout {
  readonly scroll: boolean;
  readonly showIcons: boolean;
}

/**
 * Whether all tabs fit on one fixed row, or need horizontal scrolling so they stay on one row
 * without shrinking or clipping labels.
 */
export function tabLayout({
  count,
  width,
  longestLabel,
  fontSize,
  textScale,
}: TabLayoutInput): TabLayout {
  const labelWidth = longestLabel * fontSize * CHARACTER_WIDTH + LABEL_PADDING * 2;
  const fits = Math.floor(width / labelWidth);
  return { scroll: fits < count, showIcons: textScale < LABEL_ONLY_FROM };
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
    // One View per row and equal flex cells, never a wrapping row of percentage widths: Android
    // rounds each 20% cell to whole pixels, and five rounded up overran the bar and pushed the fifth
    // tab onto a second row at the normal size (device check, 26 November 2026).
    row: { flexDirection: "row" },
    scrollRow: { flexDirection: "row", flexGrow: 1 },
    cell: { flex: 1, flexBasis: 0, alignItems: "stretch" },
    scrollCell: { flexGrow: 1, alignItems: "stretch" },
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
