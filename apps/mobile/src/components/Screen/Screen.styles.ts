import { zIndex } from "@flump/tokens/native";
import { StyleSheet } from "react-native";
import type { Theme } from "../../theme/ThemeProvider";

export const createStyles = (theme: Theme) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.colors["surface.canvas"],
    },
    content: {
      flexGrow: 1,
      paddingHorizontal: theme.spacing["page.gutter.sm"],
      paddingVertical: theme.spacing["page.top.sm"],
      gap: theme.spacing["density.gap"],
    },
    centred: { justifyContent: "center" },
    overlay: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      paddingHorizontal: theme.spacing["page.gutter.sm"],
      paddingBottom: theme.spacing["4"],
      zIndex: zIndex.toast,
    },
  });
