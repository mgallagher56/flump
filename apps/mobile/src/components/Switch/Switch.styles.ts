import { StyleSheet } from "react-native";
import type { Theme } from "../../theme/ThemeProvider";

/** How far the drawn switch fades while the row is disabled or saving, as the platform's own does. */
export const DISABLED_OPACITY = 0.5;

/**
 * The platform switch's size, so the drawn one looks as React Native's did: iOS's 51 by 31 track
 * with a 27 thumb inset by 2, and Android's Material track (36 by 14) with a 20 thumb that stands
 * out above and below it.
 */
const SWITCH_SHAPE = {
  ios: { width: 51, height: 31, inset: 2, thumb: 27 },
  android: { width: 36, height: 14, inset: 0, thumb: 20 },
} as const;

export const createStyles = (theme: Theme, os: string) => {
  const shape = os === "android" ? SWITCH_SHAPE.android : SWITCH_SHAPE.ios;
  // On Android the thumb is taller than the track; the margin keeps it inside the row's layout.
  const overhang = Math.max(0, (shape.thumb - shape.height) / 2);
  const colours = switchColours(theme);
  return StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing["3"],
      paddingVertical: theme.spacing["2"],
    },
    // The words take the room left by the switch and wrap at large text rather than clip.
    words: { flex: 1, gap: theme.spacing["1"] },
    track: {
      width: shape.width,
      height: shape.height,
      borderRadius: shape.height / 2,
      padding: shape.inset,
      marginVertical: overhang,
      flexDirection: "row",
      alignItems: "center",
    },
    // On: the primary fill, the thumb at the end. Off: the strong border's colour, at the start.
    trackOn: { backgroundColor: colours.track.true, justifyContent: "flex-end" },
    trackOff: { backgroundColor: colours.track.false, justifyContent: "flex-start" },
    faded: { opacity: DISABLED_OPACITY },
    thumb: {
      width: shape.thumb,
      height: shape.thumb,
      borderRadius: shape.thumb / 2,
      borderWidth: StyleSheet.hairlineWidth,
      backgroundColor: colours.thumb,
      borderColor: colours.thumbEdge,
    },
  });
};

/** The switch's colours: the primary fill when on, the strong border when off, a card thumb. */
const switchColours = (theme: Theme) => ({
  track: { false: theme.colors["border.strong"], true: theme.colors["primary.solid"] },
  thumb: theme.colors["surface.card"],
  // The thumb's edge, so it stays visible where it stands over the page (Android) or the track.
  thumbEdge: theme.colors["border.strong"],
});
