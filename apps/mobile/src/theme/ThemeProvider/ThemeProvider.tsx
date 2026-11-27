import {
  dark,
  durations,
  fontSizes,
  light,
  type NativeTheme,
  radii,
  sizes,
  spacing,
  textStyles,
} from "@flump/tokens/native";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Appearance, AppState, type ColorSchemeName } from "react-native";
import {
  memoryThemePreferenceStore,
  type ThemePreference,
  type ThemePreferenceStore,
} from "../../device/themePreference";

type ColorScheme = "light" | "dark";

/** Everything a screen styles itself with. All of it comes from the generated native tokens. */
export interface Theme {
  readonly scheme: ColorScheme;
  readonly colors: NativeTheme["colors"];
  readonly shadows: NativeTheme["shadows"];
  readonly spacing: typeof spacing;
  readonly radii: typeof radii;
  readonly sizes: typeof sizes;
  readonly fontSizes: typeof fontSizes;
  readonly textStyles: typeof textStyles;
  readonly durations: typeof durations;
  /**
   * 1 everywhere in the app, where the system text size applies. Only the dev gallery and tests set
   * it, to preview a component at 200% text whatever the phone is set to.
   */
  readonly textScale: number;
}

const SETS: Record<ColorScheme, NativeTheme> = { light, dark };

function buildTheme(scheme: ColorScheme, textScale: number): Theme {
  return {
    scheme,
    colors: SETS[scheme].colors,
    shadows: SETS[scheme].shadows,
    spacing,
    radii,
    sizes,
    fontSizes,
    textStyles,
    durations,
    textScale,
  };
}

const ThemeContext = createContext<Theme | null>(null);

export interface ThemeProviderProps {
  children: ReactNode;
  /**
   * Forces a scheme (the gallery's panels and tests). Leave unset to follow the stored choice: Light,
   * Dark, or System, which follows the phone's setting.
   */
  scheme?: ColorScheme;
  /** Dev gallery and tests only: draws text at this multiple of its token size (2 is 200%). */
  textScale?: number;
  /**
   * Where the choice is kept: the secure store in the app (`app/_layout.tsx`). Left out, the choice
   * lives in memory and starts at System.
   */
  store?: ThemePreferenceStore;
}

/** The person's choice and the one way to change it, for the header button and Settings. */
export interface ThemeChoice {
  readonly preference: ThemePreference;
  setPreference(preference: ThemePreference): void;
}

const ThemeChoiceContext = createContext<ThemeChoice | null>(null);

/**
 * The system light or dark setting, live. One value that two sources write: React Native's change
 * listener, for a change made while the app is open, and a fresh read each time the app comes back
 * to the front, because a change made in the phone's settings while the app was in the background
 * was not heard until a restart on an Android 17 emulator (device check, 26 November 2026).
 */
function useSystemScheme(): [ColorSchemeName | null, () => void] {
  const [scheme, setScheme] = useState<ColorSchemeName | null>(() => Appearance.getColorScheme());
  const reread = useCallback(() => setScheme(Appearance.getColorScheme()), []);
  useEffect(() => {
    const appearance = Appearance.addChangeListener(({ colorScheme }) => setScheme(colorScheme));
    const appState = AppState.addEventListener("change", (state) => {
      if (state === "active") setScheme(Appearance.getColorScheme());
    });
    return () => {
      appearance.remove();
      appState.remove();
    };
  }, []);
  return [scheme, reread];
}

/**
 * Tells React Native the app's choice, so the platform's alerts and the keyboard match it: "auto"
 * for System removes the override and follows the phone again.
 */
function applyToPlatform(preference: ThemePreference) {
  if (typeof Appearance.setColorScheme !== "function") return;
  Appearance.setColorScheme(preference === "system" ? "auto" : preference);
}

/**
 * Follows the person's colour theme choice (E12 S9): Light, Dark, or System, which follows the
 * phone's setting live. The stored choice is read synchronously and React Native reads the phone's
 * setting before the first render, so the first frame already has the right colours.
 */
export function ThemeProvider({ children, scheme, textScale = 1, store }: ThemeProviderProps) {
  const [choices] = useState(() => store ?? memoryThemePreferenceStore());
  const [preference, setStored] = useState<ThemePreference>(() => choices.read());
  const [system, rereadSystem] = useSystemScheme();
  const followed: ColorScheme =
    preference === "system" ? (system === "dark" ? "dark" : "light") : preference;
  const resolved: ColorScheme = scheme ?? followed;
  // Only the provider that follows the choice tells the platform; a forced preview does not.
  useEffect(() => {
    if (scheme) return;
    applyToPlatform(preference);
    // Back to System: React Native now reports the phone's own setting again.
    if (preference === "system") rereadSystem();
  }, [preference, scheme, rereadSystem]);
  const setPreference = useCallback(
    (next: ThemePreference) => {
      setStored(next);
      void choices.write(next);
    },
    [choices],
  );
  const choice = useMemo(() => ({ preference, setPreference }), [preference, setPreference]);
  // A release build ignores the preview scale, so no screen can stop following the phone's text size.
  const scale = __DEV__ ? textScale : 1;
  const theme = useMemo(() => buildTheme(resolved, scale), [resolved, scale]);
  return (
    <ThemeChoiceContext.Provider value={choice}>
      <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
    </ThemeChoiceContext.Provider>
  );
}

/** The colour theme choice: System, Light or Dark, and the way to change it. */
export function useThemeChoice(): ThemeChoice {
  const choice = useContext(ThemeChoiceContext);
  if (!choice) throw new Error("useThemeChoice must be used inside ThemeProvider");
  return choice;
}

export function useTheme(): Theme {
  const theme = useContext(ThemeContext);
  if (!theme) throw new Error("useTheme must be used inside ThemeProvider");
  return theme;
}
