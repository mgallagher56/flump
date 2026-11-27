import { StyleSheet } from "react-native";
import type { Theme } from "../../theme/ThemeProvider";

/** The drawing's height in points: about web's chart on a phone, without its axes. */
export const CHART_HEIGHT = 120;
/** Room round the line so the end marker is never cut off. */
export const CHART_INSET = 6;
export const STROKE = 2;
export const POINT_RADIUS = 4;
/** Web's dashed carried segments. */
export const DASH = "4 4";

export const createStyles = (_theme: Theme) =>
  StyleSheet.create({
    root: { alignSelf: "stretch", height: CHART_HEIGHT },
  });
