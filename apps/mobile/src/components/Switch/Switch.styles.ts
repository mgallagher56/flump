import { StyleSheet } from "react-native";
import type { Theme } from "../../theme/ThemeProvider";

/** Outlined border width for a disabled off track and the Android disabled on thumb ring. */
const DISABLED_TRACK_BORDER = 1.5;

/** Small ActivityIndicator box (20x20 on iOS and Android), always reserved so saving never shifts the label. */
const BUSY_SLOT_SIZE = 20;

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
  // Keep the thumb aligned when the disabled-off border is drawn: iOS absorbs it from its 2pt
  // padding; Android has 0 padding, so the thumb pulls back by -1.5pt.
  const outlinedInset = Math.max(0, shape.inset - DISABLED_TRACK_BORDER);
  const outlinedThumbOffset = Math.max(0, DISABLED_TRACK_BORDER - shape.inset);
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
    control: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing["2"],
    },
    busySlot: {
      width: BUSY_SLOT_SIZE,
      height: BUSY_SLOT_SIZE,
      alignItems: "center",
      justifyContent: "center",
    },
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
    // Disabled on: neutral border track with a card thumb.
    trackDisabledOn: { backgroundColor: colours.disabledTrackOn, justifyContent: "flex-end" },
    // Disabled off: sunken hollow track with an outlined border so on and off stay distinct.
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
    // On Android the thumb overhangs the track, so draw a 1.5pt ring in the disabled track colour
    // so the card-coloured thumb reads clearly against the page.
    thumbDisabledOn: {
      backgroundColor: colours.disabledThumbOn,
      ...(overhang > 0
        ? { borderWidth: DISABLED_TRACK_BORDER, borderColor: colours.disabledTrackOn }
        : { borderColor: colours.disabledThumbOn }),
    },
    // Pull the thumb horizontally by outlinedThumbOffset on Android so the 1.5pt track border does
    // not shift it inward.
    thumbDisabledOff: {
      backgroundColor: colours.disabledThumbOff,
      borderColor: colours.disabledThumbOff,
      ...(outlinedThumbOffset > 0 ? { marginHorizontal: -outlinedThumbOffset } : {}),
    },
  });
};

/**
 * The switch's colours: primary fill when on, strong border when off, card thumb. Disabled-on uses
 * `status.neutral.border` with a `surface.card` thumb: it stays quieter than `border.strong`
 * (enabled-off) in both light and dark themes. Disabled controls are exempt from WCAG 1.4.11
 * non-text contrast, so the 3:1 UI contrast target does not apply to disabled states.
 */
const switchColours = (theme: Theme) => ({
  track: { false: theme.colors["border.strong"], true: theme.colors["primary.solid"] },
  thumb: theme.colors["surface.card"],
  // The thumb's edge, so it stays visible where it stands over the page (Android) or the track.
  thumbEdge: theme.colors["border.strong"],
  disabledTrackOn: theme.colors["status.neutral.border"],
  disabledTrackOffFill: theme.colors["surface.sunken"],
  disabledTrackOffEdge: theme.colors["border.strong"],
  disabledThumbOn: theme.colors["surface.card"],
  disabledThumbOff: theme.colors["border.strong"],
});
