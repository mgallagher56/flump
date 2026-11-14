import { type ThemePreferenceState, useThemePreference } from "@repo/ui";
import { createContext, type FC, type ReactNode, useContext } from "react";

export type { Theme, ThemePreference } from "@repo/ui";

export type ThemeContextValue = ThemePreferenceState;

export const ThemeContext = createContext<ThemeContextValue>({
  theme: "light",
  preference: "system",
  setPreference: () => {},
  setTheme: () => {},
  toggleTheme: () => {},
});

export function useThemeContext(): ThemeContextValue {
  return useContext(ThemeContext);
}

/**
 * Theme state from the shared `useThemePreference` hook (same storage key, options and pre-paint
 * script as the web app). The marketing server renders the light theme, so "system" assumes light
 * until the real operating-system theme is read after mount.
 */
export const ThemeProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const value = useThemePreference({ serverTheme: "light" });
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};
