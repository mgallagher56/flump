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
import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { Appearance, AppState, type ColorSchemeName, useColorScheme } from "react-native";

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
  /** Forces a scheme. Leave unset to follow the system setting, the only mode until the stored theme choice lands. */
  scheme?: ColorScheme;
  /** Dev gallery and tests only: draws text at this multiple of its token size (2 is 200%). */
  textScale?: number;
}

/**
 * The system light or dark setting, live. React Native's own hook hears a change made while the app
 * is open; a change made in the phone's settings while the app was in the background was not heard
 * until a restart on an Android 17 emulator (device check, 26 November 2026), so the setting is
 * read again each time the app comes back to the front.
 */
function useSystemScheme(): ColorSchemeName | null {
  const heard = useColorScheme();
  const [scheme, setScheme] = useState<ColorSchemeName | null>(heard);
  useEffect(() => setScheme(heard), [heard]);
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") setScheme(Appearance.getColorScheme());
    });
    return () => subscription.remove();
  }, []);
  return scheme;
}

/**
 * Follows the system light or dark setting. React Native reads the setting before the first render,
 * so the first frame already has the right colours.
 */
export function ThemeProvider({ children, scheme, textScale = 1 }: ThemeProviderProps) {
  const system = useSystemScheme();
  const resolved: ColorScheme = scheme ?? (system === "dark" ? "dark" : "light");
  // A release build ignores the preview scale, so no screen can stop following the phone's text size.
  const scale = __DEV__ ? textScale : 1;
  const theme = useMemo(() => buildTheme(resolved, scale), [resolved, scale]);
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const theme = useContext(ThemeContext);
  if (!theme) throw new Error("useTheme must be used inside ThemeProvider");
  return theme;
}
