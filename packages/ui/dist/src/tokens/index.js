export const colors = {
    // Core Brand
    indigo: {
        500: { value: "#818cf8" }, // Accessible in Dark Mode
        600: { value: "#6363F1" }, // Primary WorkOS Indigo
        700: { value: "#5656D6" }, // Hover state
    },
    // Surfaces
    slate: {
        50: { value: "#f8fafc" },
        100: { value: "#f1f5f9" },
        200: { value: "#e2e8f0" }, // Light border
        400: { value: "#94a3b8" }, // Accessible Muted Text (Dark)
        500: { value: "#64748b" }, // Muted text
        800: { value: "#1e293b" },
        900: { value: "#0f172a" },
        950: { value: "#020617" },
    },
    // Special "Pro" Dark Mode
    dark: {
        bg: { value: "#16181D" },
        surface: { value: "#20222D" },
        border: { value: "#2B333B" },
    },
};
export const spacing = {
    // 4px scale
    1: { value: "4px" },
    2: { value: "8px" },
    3: { value: "12px" },
    4: { value: "16px" },
    5: { value: "20px" },
    6: { value: "24px" },
    8: { value: "32px" },
    10: { value: "40px" },
    12: { value: "48px" },
};
export const radii = {
    sm: { value: "6px" }, // Inputs
    md: { value: "8px" }, // Standard
    lg: { value: "16px" }, // Cards (WorkOS style)
    full: { value: "9999px" }, // Pill buttons
};
// Universal Mapping (Consumed by both Panda and NativeWind)
export const semanticTokens = {
    colors: {
        primary: {
            DEFAULT: { value: { base: "{colors.indigo.600}", _dark: "{colors.indigo.500}" } },
            hover: { value: { base: "{colors.indigo.700}", _dark: "{colors.indigo.400}" } },
            foreground: { value: "#ffffff" },
        },
        background: {
            DEFAULT: { value: { base: "#ffffff", _dark: "{colors.dark.bg}" } },
        },
        surface: {
            DEFAULT: { value: { base: "{colors.slate.50}", _dark: "{colors.dark.surface}" } },
        },
        text: {
            primary: { value: { base: "{colors.slate.900}", _dark: "#ffffff" } },
            muted: { value: { base: "{colors.slate.500}", _dark: "{colors.slate.400}" } },
        },
        border: {
            DEFAULT: { value: { base: "{colors.slate.200}", _dark: "{colors.dark.border}" } },
            input: { value: { base: "{colors.slate.200}", _dark: "{colors.dark.border}" } },
        },
        secondary: {
            DEFAULT: { value: { base: "{colors.slate.100}", _dark: "{colors.slate.800}" } },
            foreground: { value: { base: "{colors.slate.900}", _dark: "#ffffff" } },
            hover: { value: { base: "{colors.slate.200}", _dark: "{colors.slate.700}" } },
        },
        destructive: {
            DEFAULT: { value: { base: "#ef4444", _dark: "#f87171" } },
            foreground: { value: "#ffffff" },
            hover: { value: { base: "#dc2626", _dark: "#ef4444" } },
        },
        muted: {
            DEFAULT: { value: { base: "{colors.slate.100}", _dark: "{colors.slate.800}" } },
            foreground: { value: { base: "{colors.slate.500}", _dark: "{colors.slate.400}" } },
        },
        accent: {
            DEFAULT: { value: { base: "{colors.slate.100}", _dark: "{colors.slate.800}" } },
            foreground: { value: { base: "{colors.slate.900}", _dark: "#ffffff" } },
        },
        card: {
            DEFAULT: { value: { base: "#ffffff", _dark: "{colors.dark.surface}" } },
            foreground: { value: { base: "{colors.slate.900}", _dark: "#ffffff" } },
        },
        popover: {
            DEFAULT: { value: { base: "#ffffff", _dark: "{colors.dark.surface}" } },
            foreground: { value: { base: "{colors.slate.900}", _dark: "#ffffff" } },
        },
        ring: { value: { base: "{colors.indigo.600}", _dark: "{colors.indigo.500}" } },
    },
};
