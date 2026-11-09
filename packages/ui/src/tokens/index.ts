export const colors = {
  // Core Brand
  indigo: {
    50: { value: "#eef2ff" },
    100: { value: "#e0e7ff" },
    200: { value: "#c7d2fe" },
    300: { value: "#a5b4fc" },
    400: { value: "#818cf8" },
    500: { value: "#6366f1" }, // Accessible in Dark Mode
    600: { value: "#4f46e5" }, // Primary WorkOS/Stripe Indigo
    700: { value: "#4338ca" }, // Hover state
    800: { value: "#3730a3" },
    900: { value: "#312e81" },
  },
  // Surfaces & Neutrals
  slate: {
    25: { value: "#fcfcfd" },
    50: { value: "#f8fafc" },
    100: { value: "#f1f5f9" },
    200: { value: "#e2e8f0" }, // Light border
    300: { value: "#cbd5e1" },
    400: { value: "#94a3b8" }, // Accessible Muted Text (Dark)
    500: { value: "#64748b" }, // Secondary / Muted text
    600: { value: "#475569" }, // High contrast secondary
    700: { value: "#334155" },
    800: { value: "#1e293b" },
    850: { value: "#151e2e" },
    900: { value: "#0f172a" },
    950: { value: "#020617" },
  },
  // Special "Pro" Dark Mode
  dark: {
    canvas: { value: "#0B0F17" },
    subtle: { value: "#111622" },
    bg: { value: "#111622" },
    surface: { value: "#141A26" },
    surfaceSunken: { value: "#0D121D" },
    surfaceOverlay: { value: "#182030" },
    border: { value: "rgba(255, 255, 255, 0.08)" },
    borderSubtle: { value: "rgba(255, 255, 255, 0.05)" },
    contrast: { value: "#1E293B" },
  },
  // Shared Semantic Colors (WCAG compliant)
  success: {
    50: { value: "#ecfdf5" },
    100: { value: "#d1fae5" },
    200: { value: "#a7f3d0" },
    300: { value: "#6ee7b7" },
    400: { value: "#34d399" },
    500: { value: "#10b981" },
    600: { value: "#059669" },
    700: { value: "#047857" },
    800: { value: "#065f46" },
  },
  warning: {
    50: { value: "#fffbeb" },
    100: { value: "#fef3c7" },
    200: { value: "#fde68a" },
    300: { value: "#fcd34d" },
    400: { value: "#fbbf24" },
    500: { value: "#f59e0b" },
    600: { value: "#d97706" },
    700: { value: "#b45309" },
    800: { value: "#92400e" },
  },
  info: {
    50: { value: "#f0f9ff" },
    100: { value: "#e0f2fe" },
    200: { value: "#bae6fd" },
    300: { value: "#7dd3fc" },
    400: { value: "#38bdf8" },
    500: { value: "#0ea5e9" },
    600: { value: "#0284c7" },
    700: { value: "#0369a1" },
    800: { value: "#075985" },
  },
  destructive: {
    50: { value: "#fef2f2" },
    100: { value: "#fee2e2" },
    200: { value: "#fecaca" },
    300: { value: "#fca5a5" },
    400: { value: "#f87171" },
    500: { value: "#ef4444" },
    600: { value: "#dc2626" },
    700: { value: "#b91c1c" },
    800: { value: "#991b1b" },
  },
  purple: {
    50: { value: "#faf5ff" },
    100: { value: "#f3e8ff" },
    200: { value: "#e9d5ff" },
    300: { value: "#d8b4fe" },
    400: { value: "#c084fc" },
    500: { value: "#8b5cf6" },
    600: { value: "#7c3aed" },
    700: { value: "#6d28d9" },
    800: { value: "#5b21b6" },
  },
  cyan: {
    50: { value: "#ecfeff" },
    100: { value: "#cffafe" },
    200: { value: "#a5f3fc" },
    300: { value: "#67e8f9" },
    400: { value: "#22d3ee" },
    500: { value: "#06b6d4" },
    600: { value: "#0891b2" },
    700: { value: "#0e7490" },
    800: { value: "#155e75" },
  },
} as const;

export const fonts = {
  display: {
    value: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },
  sans: {
    value: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },
  mono: {
    value: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  },
} as const;

export const fontSizes = {
  xs: { value: "0.75rem" }, // 12px minimum floor
  sm: { value: "0.875rem" }, // 14px
  md: { value: "1rem" }, // 16px
  lg: { value: "1.125rem" }, // 18px
  xl: { value: "1.25rem" }, // 20px
  "2xl": { value: "1.5rem" }, // 24px
  "3xl": { value: "1.875rem" }, // 30px
  "4xl": { value: "2.25rem" }, // 36px
  "5xl": { value: "3rem" }, // 48px
  "6xl": { value: "3.75rem" }, // 60px
} as const;

export const spacing = {
  // 4px scale
  0: { value: "0px" },
  1: { value: "4px" },
  2: { value: "8px" },
  3: { value: "12px" },
  4: { value: "16px" },
  5: { value: "20px" },
  6: { value: "24px" },
  8: { value: "32px" },
  10: { value: "40px" },
  12: { value: "48px" },
  16: { value: "64px" },
  20: { value: "80px" },
  24: { value: "96px" },
  32: { value: "128px" },
} as const;

export const radii = {
  none: { value: "0px" },
  xs: { value: "4px" },
  sm: { value: "6px" }, // Inputs
  md: { value: "8px" }, // Standard buttons & cards
  lg: { value: "12px" }, // Containers
  xl: { value: "16px" }, // Bento cards
  "2xl": { value: "24px" }, // Section trays
  full: { value: "9999px" }, // Pill badges
} as const;

export const shadows = {
  xs: {
    value: "0 1px 2px rgba(15, 23, 42, 0.04)",
  },
  cardLight: {
    value: "0 1px 2px rgba(15, 23, 42, 0.04)",
  },
  cardHoverLight: {
    value: "0 2px 8px -2px rgba(15, 23, 42, 0.06)",
  },
  floatingLight: {
    value: "0 10px 25px -4px rgba(15, 23, 42, 0.08), 0 4px 10px -2px rgba(15, 23, 42, 0.04)",
  },
} as const;

// Universal Mapping (Consumed by Panda CSS)
export const semanticTokens = {
  colors: {
    primary: {
      DEFAULT: { value: { base: "{colors.indigo.600}", _dark: "{colors.indigo.400}" } },
      hover: { value: { base: "{colors.indigo.700}", _dark: "{colors.indigo.300}" } },
      foreground: { value: "#ffffff" },
    },
    canvas: {
      DEFAULT: { value: { base: "{colors.slate.50}", _dark: "{colors.dark.canvas}" } },
    },
    background: {
      DEFAULT: { value: { base: "{colors.slate.50}", _dark: "{colors.dark.canvas}" } },
    },
    surface: {
      DEFAULT: { value: { base: "#ffffff", _dark: "{colors.dark.surface}" } },
      sunken: { value: { base: "{colors.slate.100}", _dark: "{colors.dark.surfaceSunken}" } },
      subtle: { value: { base: "{colors.slate.100}", _dark: "{colors.dark.subtle}" } },
      overlay: { value: { base: "#ffffff", _dark: "{colors.dark.surfaceOverlay}" } },
      tinted: { value: { base: "{colors.indigo.50}", _dark: "rgba(99, 102, 241, 0.07)" } },
      contrast: { value: { base: "{colors.slate.900}", _dark: "{colors.dark.contrast}" } },
      contrastForeground: { value: { base: "#ffffff", _dark: "#f8fafc" } },
    },
    text: {
      primary: { value: { base: "{colors.slate.900}", _dark: "#f8fafc" } },
      secondary: { value: { base: "{colors.slate.700}", _dark: "{colors.slate.300}" } },
      muted: { value: { base: "{colors.slate.600}", _dark: "{colors.slate.400}" } },
    },
    border: {
      DEFAULT: { value: { base: "{colors.slate.200}", _dark: "{colors.dark.border}" } },
      subtle: { value: { base: "rgba(15, 23, 42, 0.06)", _dark: "{colors.dark.borderSubtle}" } },
      strong: { value: { base: "{colors.slate.300}", _dark: "rgba(255, 255, 255, 0.16)" } },
      input: { value: { base: "{colors.slate.300}", _dark: "{colors.dark.border}" } },
    },
    financial: {
      positive: { value: { base: "{colors.success.600}", _dark: "{colors.success.400}" } },
      positiveBg: { value: { base: "{colors.success.50}", _dark: "rgba(16, 185, 129, 0.12)" } },
      positiveBorder: {
        value: { base: "{colors.success.200}", _dark: "rgba(16, 185, 129, 0.25)" },
      },
      warning: { value: { base: "{colors.warning.600}", _dark: "{colors.warning.400}" } },
      warningBg: { value: { base: "{colors.warning.50}", _dark: "rgba(245, 158, 11, 0.12)" } },
      warningBorder: { value: { base: "{colors.warning.200}", _dark: "rgba(245, 158, 11, 0.25)" } },
      negative: { value: { base: "{colors.destructive.600}", _dark: "{colors.destructive.400}" } },
      negativeBg: { value: { base: "{colors.destructive.50}", _dark: "rgba(239, 68, 68, 0.12)" } },
      negativeBorder: {
        value: { base: "{colors.destructive.200}", _dark: "rgba(239, 68, 68, 0.25)" },
      },
      neutral: { value: { base: "{colors.slate.600}", _dark: "{colors.slate.400}" } },
      neutralBg: { value: { base: "{colors.slate.100}", _dark: "rgba(148, 163, 184, 0.12)" } },
      neutralBorder: { value: { base: "{colors.slate.200}", _dark: "rgba(148, 163, 184, 0.25)" } },
    },
    secondary: {
      DEFAULT: { value: { base: "{colors.slate.100}", _dark: "{colors.slate.800}" } },
      foreground: { value: { base: "{colors.slate.900}", _dark: "#ffffff" } },
      hover: { value: { base: "{colors.slate.200}", _dark: "{colors.slate.700}" } },
    },
    destructive: {
      DEFAULT: { value: { base: "{colors.destructive.600}", _dark: "{colors.destructive.400}" } },
      bg: { value: { base: "{colors.destructive.50}", _dark: "rgba(239, 68, 68, 0.12)" } },
      border: { value: { base: "{colors.destructive.200}", _dark: "rgba(239, 68, 68, 0.35)" } },
      foreground: { value: "#ffffff" },
      hover: { value: { base: "{colors.destructive.700}", _dark: "{colors.destructive.500}" } },
    },
    success: {
      DEFAULT: { value: { base: "{colors.success.600}", _dark: "{colors.success.400}" } },
      bg: { value: { base: "{colors.success.50}", _dark: "rgba(16, 185, 129, 0.12)" } },
      border: { value: { base: "{colors.success.200}", _dark: "rgba(16, 185, 129, 0.3)" } },
      foreground: { value: "#ffffff" },
      hover: { value: { base: "{colors.success.700}", _dark: "{colors.success.500}" } },
    },
    warning: {
      DEFAULT: { value: { base: "{colors.warning.600}", _dark: "{colors.warning.400}" } },
      bg: { value: { base: "{colors.warning.50}", _dark: "rgba(245, 158, 11, 0.12)" } },
      border: { value: { base: "{colors.warning.200}", _dark: "rgba(245, 158, 11, 0.3)" } },
      foreground: { value: "#ffffff" },
      hover: { value: { base: "{colors.warning.700}", _dark: "{colors.warning.500}" } },
    },
    info: {
      DEFAULT: { value: { base: "{colors.info.600}", _dark: "{colors.info.400}" } },
      bg: { value: { base: "{colors.info.50}", _dark: "rgba(14, 165, 233, 0.12)" } },
      border: { value: { base: "{colors.info.200}", _dark: "rgba(14, 165, 233, 0.3)" } },
      foreground: { value: "#ffffff" },
      hover: { value: { base: "{colors.info.700}", _dark: "{colors.info.500}" } },
    },
    muted: {
      DEFAULT: { value: { base: "{colors.slate.100}", _dark: "{colors.slate.800}" } },
      foreground: { value: { base: "{colors.slate.600}", _dark: "{colors.slate.400}" } },
    },
    accent: {
      DEFAULT: { value: { base: "{colors.slate.100}", _dark: "{colors.slate.800}" } },
      foreground: { value: { base: "{colors.slate.900}", _dark: "#ffffff" } },
    },
    card: {
      DEFAULT: { value: { base: "#ffffff", _dark: "{colors.dark.surface}" } },
      foreground: { value: { base: "{colors.slate.900}", _dark: "#ffffff" } },
      border: { value: { base: "rgba(15, 23, 42, 0.08)", _dark: "{colors.dark.border}" } },
    },
    popover: {
      DEFAULT: { value: { base: "#ffffff", _dark: "{colors.dark.surface}" } },
      foreground: { value: { base: "{colors.slate.900}", _dark: "#ffffff" } },
    },
    ring: { value: { base: "{colors.indigo.600}", _dark: "{colors.indigo.400}" } },
  },
  shadows: {
    card: {
      value: {
        base: "{shadows.cardLight}",
        _dark: "inset 0 1px 0 rgba(255, 255, 255, 0.08), 0 8px 24px rgba(0,0,0,0.4)",
      },
    },
    cardHover: {
      value: {
        base: "{shadows.cardHoverLight}",
        _dark: "inset 0 1px 0 rgba(255, 255, 255, 0.12), 0 16px 32px rgba(0,0,0,0.5)",
      },
    },
    floating: {
      value: {
        base: "{shadows.floatingLight}",
        _dark: "inset 0 1px 0 rgba(255, 255, 255, 0.1), 0 20px 40px rgba(0,0,0,0.5)",
      },
    },
  },
};
