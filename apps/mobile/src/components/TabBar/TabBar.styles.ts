import { StyleSheet } from "react-native";
import type { Theme } from "../../theme/ThemeProvider";

/** Web's bottom bar label: `label.sm`, semibold. */
export const LABEL_STYLE = "label.sm" as const;

/**
 * From this text scale the icons go and only the label names the tab, as web's bar at large text
 * (phone audit P19), so the bar does not take a quarter of the screen.
 */
export const LABEL_ONLY_FROM = 1.5;

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
  readonly columns: number;
  readonly rows: number;
  /** Each cell's share of the bar. */
  readonly cellWidth: `${number}%`;
  readonly showIcons: boolean;
}

/**
 * How many tabs share a row: as many as the longest label fits whole, then spread evenly over the
 * fewest rows (five tabs at three a row are three and two, never four and one).
 */
export function tabLayout({
  count,
  width,
  longestLabel,
  fontSize,
  textScale,
}: TabLayoutInput): TabLayout {
  const labelWidth = longestLabel * fontSize * CHARACTER_WIDTH + LABEL_PADDING * 2;
  const fits = Math.max(1, Math.min(count, Math.floor(width / labelWidth)));
  const rows = Math.ceil(count / fits);
  const columns = Math.ceil(count / rows);
  return {
    columns,
    rows,
    cellWidth: `${100 / columns}%`,
    showIcons: textScale < LABEL_ONLY_FROM,
  };
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
    list: { flexDirection: "row", flexWrap: "wrap" },
    cell: { alignItems: "stretch" },
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
