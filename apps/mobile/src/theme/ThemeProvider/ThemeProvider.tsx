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
  readonly spacing: typeof spacing;
  readonly radii: typeof radii;
  readonly sizes: typeof sizes;
  readonly fontSizes: typeof fontSizes;
  readonly textStyles: typeof textStyles;
  readonly durations: typeof durations;
}

const SETS: Record<ColorScheme, NativeTheme> = { light, dark };

function buildTheme(scheme: ColorScheme): Theme {
  return {
    scheme,
    colors: SETS[scheme].colors,
    spacing,
    radii,
    sizes,
    fontSizes,
    textStyles,
    durations,
  };
}

const ThemeContext = createContext<Theme | null>(null);

export interface ThemeProviderProps {
  children: ReactNode;
  /** Forces a scheme. Leave unset to follow the system setting, which is the only mode in S1a. */
  scheme?: ColorScheme;
}

/**
 * Follows the system light or dark setting. React Native reads the setting before the first render,
 * so the first frame already has the right colours.
 */
export function ThemeProvider({ children, scheme }: ThemeProviderProps) {
  const system = useColorScheme();
  const resolved: ColorScheme = scheme ?? (system === "dark" ? "dark" : "light");
  const theme = useMemo(() => buildTheme(resolved), [resolved]);
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const theme = useContext(ThemeContext);
  if (!theme) throw new Error("useTheme must be used inside ThemeProvider");
  return theme;
}
