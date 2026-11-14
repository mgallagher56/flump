import type { Theme, ThemePreference } from "@repo/ui";
import { createContext, useContext } from "react";

interface ThemeContextValue {
  /** The theme in effect (system preference resolved). */
  theme: Theme;
  /** The person's choice: "system" follows the operating system. */
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
  toggleTheme: () => void;
}

export const ThemeContext = createContext<ThemeContextValue>({
  theme: "dark",
  preference: "system",
  setPreference: () => {},
  toggleTheme: () => {},
});

export function useThemeContext() {
  return useContext(ThemeContext);
}
