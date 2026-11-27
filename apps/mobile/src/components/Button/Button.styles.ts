import type { ColorKey } from "@flump/tokens/native";
import { StyleSheet } from "react-native";
import type { Theme } from "../../theme/ThemeProvider";
import type { FixedTextStyleKey } from "../../theme/textStyle";

/** The web Button's variants (packages/ui Button.styles.ts), less the deprecated `destructive`. */
export type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "link"
  | "danger"
  | "dangerSubtle";
/** The web sizes, less the deprecated `icon`. Every size is at least 48 high on a phone. */
export type ButtonSize = "sm" | "md" | "lg";

interface VariantColours {
  /** `null` is no fill. */
  readonly fill: ColorKey | null;
  readonly label: ColorKey;
  /** `null` is no visible edge. */
  readonly edge: ColorKey | null;
  /** Android's press ripple. iOS dims the button instead (CROSS-PLATFORM section 3). */
  readonly ripple: ColorKey;
}

/** The same token pairs as the web recipe, so both platforms draw each variant alike. */
export const VARIANT_COLOURS: Record<ButtonVariant, VariantColours> = {
  primary: {
    fill: "primary.solid",
    label: "primary.foreground",
    edge: null,
    ripple: "primary.hover",
  },
  secondary: {
    fill: "surface.card",
    label: "text.primary",
    edge: "border.strong",
    ripple: "surface.subtle",
  },
  outline: { fill: null, label: "primary", edge: "primary", ripple: "surface.subtle" },
  ghost: { fill: null, label: "text.primary", edge: null, ripple: "surface.subtle" },
  link: { fill: null, label: "primary", edge: null, ripple: "surface.subtle" },
  // text.onContrast clears 4.5:1 on the danger fill in both themes (packages/tokens contrast pairs).
  danger: {
    fill: "status.danger.solid",
    label: "text.onContrast",
    edge: null,
    ripple: "status.danger.border",
  },
  dangerSubtle: {
    fill: null,
    label: "status.danger.text",
    edge: "status.danger.border",
    ripple: "status.danger.bg",
  },
};

export const SIZE_TEXT: Record<ButtonSize, FixedTextStyleKey> = {
  sm: "label.md",
  md: "body.md",
  lg: "body.lg",
};

/** How far a pressed button dims on iOS. */
export const IOS_PRESSED_OPACITY = 0.7;

/** Press feedback (CROSS-PLATFORM section 3): iOS dims the button; Android draws a ripple instead. */
export function pressedStyle(pressed: boolean, os: string): { opacity: number } | null {
  return pressed && os === "ios" ? { opacity: IOS_PRESSED_OPACITY } : null;
}

/** Android's ripple for a variant, or none on a disabled button. */
export function rippleFor(
  variant: ButtonVariant,
  disabled: boolean,
  theme: Theme,
): { color: string } | undefined {
  return disabled ? undefined : { color: theme.colors[VARIANT_COLOURS[variant].ripple] };
}

export const createStyles = (theme: Theme) => {
  // The web disabled fill: sunken in light, subtle in dark (phone audit P29).
  const disabledFill: ColorKey = theme.scheme === "dark" ? "surface.subtle" : "surface.sunken";
  return StyleSheet.create({
    base: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: theme.spacing["2"],
      borderRadius: theme.radii.xl,
      borderWidth: 1.5,
      borderColor: "transparent",
      paddingVertical: theme.spacing["2"],
    },
    sm: { paddingHorizontal: theme.spacing["4"] },
    md: { paddingHorizontal: theme.spacing["6"] },
    // The web lg is 56 high: one control height and one spacing step.
    lg: {
      paddingHorizontal: theme.spacing["8"],
      minHeight: theme.sizes["control.lg"] + theme.spacing["2"],
    },
    link: { paddingHorizontal: theme.spacing["1"], alignSelf: "flex-start" },
    raised: { boxShadow: theme.shadows.raised },
    disabled: {
      backgroundColor: theme.colors[disabledFill],
      borderColor: theme.colors["border.subtle"],
      boxShadow: undefined,
    },
    disabledQuiet: { backgroundColor: "transparent", borderColor: "transparent" },
    label: { fontWeight: "700", textAlign: "center" },
    // A link's words line up on the left when they wrap, as the links listed beside it (200% text).
    linkLabel: { textDecorationLine: "underline", textAlign: "left" },
  });
};
