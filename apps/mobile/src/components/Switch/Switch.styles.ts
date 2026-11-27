import { StyleSheet } from "react-native";
import type { Theme } from "../../theme/ThemeProvider";

/** Outlined border width for an inactive off track so it keeps a clear edge without fading. */
const DISABLED_TRACK_BORDER = 1.5;

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
  // Keep the inset thumb centred inside the 31pt iOS track when the disabled off border is drawn.
  const outlinedInset = Math.max(0, shape.inset - DISABLED_TRACK_BORDER);
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
    // Inactive on: muted solid track with a sunken thumb and 1pt border for the Android overhang.
    trackDisabledOn: { backgroundColor: colours.disabledTrackOn, justifyContent: "flex-end" },
    // Inactive off: sunken hollow track with an outlined border so on and off stay distinct.
    trackDisabledOff: {
      backgroundColor: colours.disabledTrackOffFill,
      borderWidth: DISABLED_TRACK_BORDER,
      borderColor: colours.disabledTrackOffEdge,
      padding: outlinedInset,
      justifyContent: "flex-start",
    },
    thumb: {
      width: shape.thumb,
      height: shape.thumb,
      borderRadius: shape.thumb / 2,
      borderWidth: StyleSheet.hairlineWidth,
      backgroundColor: colours.thumb,
      borderColor: colours.thumbEdge,
    },
    thumbDisabledOn: {
      backgroundColor: colours.disabledThumbOn,
      borderWidth: 1,
      borderColor: colours.disabledTrackOn,
    },
    thumbDisabledOff: {
      backgroundColor: colours.disabledThumbOff,
      borderColor: colours.disabledThumbOff,
    },
  });
};

/**
 * The switch's colours: primary fill when on, strong border when off, card thumb. Inactive states
 * use muted and sunken semantic tokens at full opacity so both states stay clear.
 */
const switchColours = (theme: Theme) => ({
  track: { false: theme.colors["border.strong"], true: theme.colors["primary.solid"] },
  thumb: theme.colors["surface.card"],
  // The thumb's edge, so it stays visible where it stands over the page (Android) or the track.
  thumbEdge: theme.colors["border.strong"],
  disabledTrackOn: theme.colors["text.muted"],
  disabledTrackOffFill: theme.colors["surface.sunken"],
  disabledTrackOffEdge: theme.colors["border.strong"],
  disabledThumbOn: theme.colors["surface.sunken"],
  disabledThumbOff: theme.colors["border.strong"],
});
