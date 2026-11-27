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
    drawing: { flex: 1 },
    /**
     * The end figure sits in the right-hand corner away from the end point (top when the line
     * ends low, bottom when it ends high), so it never covers the line's end at any text size.
     */
    endLabelTop: { position: "absolute", top: 0, right: CHART_INSET },
    endLabelBottom: { position: "absolute", bottom: 0, right: CHART_INSET },
  });
