import { type DimensionValue, StyleSheet } from "react-native";
import type { Theme } from "../../theme/ThemeProvider";

/** The plot's height in points: about web's drawn size on a phone. The hero's loading state keeps this much room. */
export const TREND_PLOT_HEIGHT = 56;
/** The widest a bar gets; slots share the width, so thirteen slots (seven bars, six breaks) fit. */
const BAR_MAX_WIDTH = 24;
/** About web's 1.5 point outline at the drawn size, so a very small month still shows. */
const BAR_STROKE = 1.5;
const ZERO_STROKE = 1;

/** The engine's percentage of the plot as a style value. */
export const percent = (value: number): DimensionValue => `${value}%`;

/** Every mark in the hero's ink (web's `currentColor`), so a fall has no colour of its own. */
export const createStyles = (theme: Theme) =>
  StyleSheet.create({
    root: { alignSelf: "stretch" },
    plot: {
      height: TREND_PLOT_HEIGHT,
      flexDirection: "row",
      gap: theme.spacing["2"],
      maxWidth: BAR_MAX_WIDTH * 13 + theme.spacing["2"] * 12,
    },
    slot: { flex: 1, maxWidth: BAR_MAX_WIDTH, height: "100%" },
    bar: {
      position: "absolute",
      left: 0,
      right: 0,
      borderWidth: BAR_STROKE,
      borderColor: theme.colors["text.primary"],
    },
    latest: { backgroundColor: theme.colors["text.primary"] },
    earlier: { backgroundColor: "transparent" },
    zero: {
      position: "absolute",
      left: 0,
      right: 0,
      height: ZERO_STROKE,
      backgroundColor: theme.colors["text.primary"],
    },
  });
