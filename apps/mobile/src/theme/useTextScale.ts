import { useWindowDimensions } from "react-native";
import { useTheme } from "./ThemeProvider";

/**
 * The text size multiple in force: the phone's own setting, or the dev gallery's or a test's
 * preview scale, which turns the phone's setting off (as `Text` does).
 */
export function useTextScale(): number {
  const theme = useTheme();
  const { fontScale } = useWindowDimensions();
  return theme.textScale !== 1 ? theme.textScale : fontScale;
}
