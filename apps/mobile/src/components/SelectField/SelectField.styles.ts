import { StyleSheet } from "react-native";
import type { Theme } from "../../theme/ThemeProvider";

export const createStyles = (theme: Theme) =>
  StyleSheet.create({
    // The same box as the text inputs, so a form reads as one set of fields.
    row: {
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "stretch",
      gap: theme.spacing["2"],
      minHeight: theme.sizes["control.lg"],
      paddingHorizontal: theme.spacing["density.controlPadX"],
      paddingVertical: theme.spacing["density.controlPadY"],
      borderWidth: 1.5,
      borderRadius: theme.radii.control,
      borderColor: theme.colors["border.input"],
      backgroundColor: theme.colors["surface.card"],
    },
    disabled: { backgroundColor: theme.colors["surface.sunken"] },
    // The chosen words wrap at large text rather than clip.
    chosen: { flex: 1 },
    // Android: the sheet rises from the bottom over a scrim, leaving the top of the screen showing.
    backdrop: {
      flex: 1,
      justifyContent: "flex-end",
      paddingTop: theme.spacing["12"],
      backgroundColor: theme.colors["surface.scrim"],
    },
    sheetAndroid: {
      flexShrink: 1,
      borderTopLeftRadius: theme.radii.tray,
      borderTopRightRadius: theme.radii.tray,
      backgroundColor: theme.colors["surface.card"],
    },
    // iOS: the page sheet is the whole modal.
    sheetIos: { flex: 1, backgroundColor: theme.colors["surface.card"] },
    header: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      justifyContent: "space-between",
      gap: theme.spacing["2"],
      paddingHorizontal: theme.spacing["page.gutter.sm"],
      paddingTop: theme.spacing["3"],
      borderBottomWidth: 1,
      borderBottomColor: theme.colors["border.subtle"],
    },
    title: { flexShrink: 1 },
    list: {
      paddingHorizontal: theme.spacing["page.gutter.sm"],
      paddingVertical: theme.spacing["4"],
    },
  });
