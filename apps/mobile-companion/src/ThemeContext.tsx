import * as SecureStore from "expo-secure-store";
import type React from "react";
import { createContext, useContext, useEffect, useState } from "react";
import { useColorScheme } from "react-native";
import { getThemeColors } from "./theme";

type ThemeMode = "light" | "dark";

interface ThemeContextType {
  theme: ThemeMode;
  isDark: boolean;
  colors: any;
  toggleTheme: () => void;
  setTheme: (theme: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = "user-theme-preference";

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemScheme = useColorScheme();
  const [theme, setThemeState] = useState<ThemeMode>("dark"); // Default to dark as per current app design

  useEffect(() => {
    async function loadTheme() {
      try {
        const storedTheme = await SecureStore.getItemAsync(THEME_STORAGE_KEY);
        if (storedTheme === "light" || storedTheme === "dark") {
          setThemeState(storedTheme);
        } else if (systemScheme === "light" || systemScheme === "dark") {
          setThemeState(systemScheme);
        }
      } catch (err) {
        console.warn("Failed to load theme preference", err);
      }
    }
    loadTheme();
  }, [systemScheme]);

  const setTheme = async (newTheme: ThemeMode) => {
    setThemeState(newTheme);
    try {
      await SecureStore.setItemAsync(THEME_STORAGE_KEY, newTheme);
    } catch (err) {
      console.warn("Failed to save theme preference", err);
    }
  };

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };

  const currentColors = getThemeColors(theme);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        isDark: theme === "dark",
        colors: currentColors,
        toggleTheme,
        setTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
