import { useMemo } from "react";
import { AppHeader } from "../components/AppHeader";
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

/** What the stack hands its `header`, as far as the header reads it. */
interface StackHeaderProps {
  options: { title?: string };
  navigation: { goBack(): void };
  back?: unknown;
}

/**
 * The signed-in pages stacked over the tabs draw the tabs' own header, with Back, not the
 * platform's (device check, 26 November 2026). A page opened cold by a link still has the tabs
 * beneath (`anchor`), so Back is always there.
 */
export function useSignedInStackOptions() {
  const base = useStackScreenOptions();
  return useMemo(
    () => ({
      ...base,
      header: ({ options, navigation, back }: StackHeaderProps) => (
        <AppHeader
          title={typeof options.title === "string" ? options.title : ""}
          onBack={back ? () => navigation.goBack() : undefined}
        />
      ),
    }),
    [base],
  );
}
