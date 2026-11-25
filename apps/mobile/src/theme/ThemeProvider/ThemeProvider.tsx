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
import { createContext, type ReactNode, useContext, useMemo } from "react";
import { useColorScheme } from "react-native";

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
 * Follows the system light or dark setting. React Native reads the setting before the first render,
 * so the first frame already has the right colours.
 */
export function ThemeProvider({ children, scheme, textScale = 1 }: ThemeProviderProps) {
  const system = useColorScheme();
  const resolved: ColorScheme = scheme ?? (system === "dark" ? "dark" : "light");
  const theme = useMemo(() => buildTheme(resolved, textScale), [resolved, textScale]);
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const theme = useContext(ThemeContext);
  if (!theme) throw new Error("useTheme must be used inside ThemeProvider");
  return theme;
}
