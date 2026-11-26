import { useMemo } from "react";
import { useTheme } from "../theme/ThemeProvider";

/** The stack header and page colours from the theme, for the root stack and the signed-in one. */
export function useStackScreenOptions() {
  const theme = useTheme();
  return useMemo(
    () => ({
      contentStyle: { backgroundColor: theme.colors["surface.canvas"] },
      headerStyle: { backgroundColor: theme.colors["surface.canvas"] },
      headerTintColor: theme.colors["text.primary"],
      headerShadowVisible: false,
    }),
    [theme],
  );
}
