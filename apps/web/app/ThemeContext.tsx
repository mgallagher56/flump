import { createContext, useContext } from "react";
import type { Theme } from "./hooks/useTheme";

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
}

export const ThemeContext = createContext<ThemeContextValue>({
  theme: "dark",
  toggleTheme: () => {},
});

export function useThemeContext() {
  return useContext(ThemeContext);
}
