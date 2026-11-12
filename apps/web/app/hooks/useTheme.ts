import { useCallback, useEffect, useState } from "react";

export type Theme = "light" | "dark";
/** What the person chose: follow the operating system, or force a theme. */
export type ThemePreference = "system" | Theme;

const STORAGE_KEY = "flump-theme";
const DARK_QUERY = "(prefers-color-scheme: dark)";

function readPreference(): ThemePreference {
  if (typeof window === "undefined") return "system";
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    // Storage can throw in private windows; fall back to the system theme.
  }
  return "system";
}

function systemTheme(): Theme {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return "dark";
  return window.matchMedia(DARK_QUERY).matches ? "dark" : "light";
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.setAttribute("data-theme", theme);
}

export function useTheme() {
  // Initial state must equal what the server renders (system preference, dark) so hydration
  // matches; the stored preference and live system theme are read in an effect after mount. The
  // inline THEME_INIT_SCRIPT already painted the right theme on <html> in the meantime.
  const [preference, setPreferenceState] = useState<ThemePreference>("system");
  const [system, setSystem] = useState<Theme>("dark");
  const [synced, setSynced] = useState(false);
  const theme: Theme = preference === "system" ? system : preference;

  useEffect(() => {
    setPreferenceState(readPreference());
    setSystem(systemTheme());
    setSynced(true);
  }, []);

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
      if (next === "system") localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, next);
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
