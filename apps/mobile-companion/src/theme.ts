import { colors as rawColors } from "../../../packages/ui/src/tokens";

// Helper to extract the value from token objects
function extractValue(obj: any): any {
  if (obj && typeof obj === "object") {
    if ("value" in obj) {
      const val = obj.value;
      if (typeof val === "object" && val !== null) {
        // Resolve light/dark modes (default to dark slate values or base color)
        return val.base || val.DEFAULT || val;
      }
      return val;
    }
    const result: any = {};
    for (const key of Object.keys(obj)) {
      result[key] = extractValue(obj[key]);
    }
    return result;
  }
  return obj;
}

export const colors = extractValue(rawColors);

// Define numeric values for React Native layout positioning
export const spacing = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
};

export const radii = {
  sm: 6,
  md: 8,
  lg: 16,
  full: 9999,
};

export function getThemeColors(theme: "light" | "dark") {
  const baseColors = extractValue(rawColors);

  if (theme === "dark") {
    return {
      ...baseColors,
      theme,
      background: "#020617", // slate 950
      surface: "#0f172a", // slate 900
      card: "#0f172a", // slate 900
      border: "rgba(30, 41, 59, 0.5)",
      borderLight: "rgba(30, 41, 59, 0.3)",
      text: "#ffffff",
      textMuted: baseColors.slate[400],
      textMutedLight: baseColors.slate[500],
      slate: {
        ...baseColors.slate,
        50: "#f8fafc",
        100: "#f1f5f9",
        200: "#e2e8f0",
        300: "#cbd5e1",
        400: "#94a3b8",
        500: "#64748b",
        700: "#334155",
        800: "#1e293b",
        850: "#151e2e",
        900: "#0f172a",
        950: "#020617",
      },
      indigo: {
        ...baseColors.indigo,
        300: "#c7d2fe",
        400: "#a5b4fc",
        500: "#818cf8",
        600: "#6363F1",
        700: "#5656D6",
      },
    };
  } else {
    return {
      ...baseColors,
      theme,
      background: "#f8fafc", // slate 50
      surface: "#ffffff",
      card: "#ffffff",
      border: "#cbd5e1", // slate 300
      borderLight: "#cbd5e1", // slate 300
      text: "#0f172a", // slate 900
      textMuted: baseColors.slate[500], // slate 500
      textMutedLight: baseColors.slate[400], // slate 400
      slate: {
        ...baseColors.slate,
        50: "#ffffff",
        100: "#f8fafc",
        200: "#e2e8f0",
        300: "#64748b",
        400: "#475569",
        500: "#334155",
        700: "#cbd5e1", // chart standard bar
        800: "#f1f5f9", // button background
        850: "#e2e8f0", // inactive badge background
        900: "#ffffff", // card background
        950: "#f8fafc", // container background
      },
      indigo: {
        ...baseColors.indigo,
        300: "#818cf8",
        400: "#6363F1",
        500: "#5656D6",
        600: "#6363F1",
        700: "#4f46e5",
      },
    };
  }
}
