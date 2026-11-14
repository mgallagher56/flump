import { useCallback, useEffect, useState } from "react";
import { DARK_QUERY, THEME_STORAGE_KEY } from "./themeScript";

export { THEME_INIT_SCRIPT, THEME_STORAGE_KEY } from "./themeScript";

export type Theme = "light" | "dark";
/** What the person chose: follow the operating system, or force a theme. */
export type ThemePreference = "system" | Theme;

function readPreference(): ThemePreference {
  if (typeof window === "undefined") return "system";
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    // Storage can throw in private windows; fall back to the system theme.
  }
  return "system";
}

function systemTheme(fallback: Theme): Theme {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return fallback;
  return window.matchMedia(DARK_QUERY).matches ? "dark" : "light";
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.setAttribute("data-theme", theme);
}

export interface UseThemePreferenceOptions {
  /**
   * Theme assumed for "system" on the server and on the hydration render, before the real
   * operating-system theme is read. It must match what the server renders.
   */
  serverTheme?: Theme;
}

export interface ThemePreferenceState {
  /** The theme in effect (system preference resolved). */
  theme: Theme;
  /** The person's choice: "system" follows the operating system. */
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

/**
 * Theme state shared by the web app and the marketing site: a System / Light / Dark preference,
 * stored under `THEME_STORAGE_KEY`, following live operating-system changes while set to System.
 */
export function useThemePreference({
  serverTheme = "dark",
}: UseThemePreferenceOptions = {}): ThemePreferenceState {
  // Initial state must equal what the server renders so hydration matches; the stored preference
  // and live system theme are read in an effect after mount. THEME_INIT_SCRIPT already painted the
  // right theme on <html> in the meantime.
  const [preference, setPreferenceState] = useState<ThemePreference>("system");
  const [system, setSystem] = useState<Theme>(serverTheme);
  const [synced, setSynced] = useState(false);
  const theme: Theme = preference === "system" ? system : preference;

  useEffect(() => {
    setPreferenceState(readPreference());
    setSystem(systemTheme(serverTheme));
    setSynced(true);
  }, [serverTheme]);

  // Follow live operating-system changes while no manual override is set.
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const query = window.matchMedia(DARK_QUERY);
    if (typeof query.addEventListener !== "function") return;
    const onChange = (event: MediaQueryListEvent) => setSystem(event.matches ? "dark" : "light");
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (synced) applyTheme(theme);
  }, [theme, synced]);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    try {
      if (next === "system") localStorage.removeItem(THEME_STORAGE_KEY);
      else localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Ignore storage failures; the preference still applies for this page view.
    }
  }, []);

  const setTheme = useCallback((next: Theme) => setPreference(next), [setPreference]);

  const toggleTheme = useCallback(() => {
    setPreference(theme === "dark" ? "light" : "dark");
  }, [setPreference, theme]);

  return { theme, preference, setPreference, setTheme, toggleTheme };
}
