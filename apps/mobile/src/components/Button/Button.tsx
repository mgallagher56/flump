import { useMemo } from "react";
import { ActivityIndicator, Platform, type StyleProp, type ViewStyle } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";
import { Pressable } from "../Pressable";
import type { PressableProps } from "../Pressable/Pressable";
import { Text } from "../Text";
import {
  type ButtonSize,
  type ButtonVariant,
  createStyles,
  pressedStyle,
  rippleFor,
  SIZE_TEXT,
  VARIANT_COLOURS,
} from "./Button.styles";

export interface ButtonProps
  extends Omit<PressableProps, "children" | "style" | "accessibilityRole" | "android_ripple"> {
  /**
   * The words on the button, which are also its accessible name. A prop rather than children, so
   * Biome's raw-text rule needs no exemption for Button.
   */
  label: string;
  /** Defaults to `primary`. */
  variant?: ButtonVariant;
  /** Defaults to `md`. */
  size?: ButtonSize;
  /** Waiting on its action: announced as busy, keeps its colours, ignores presses. */
  pending?: boolean;
  /** `link` for a button that goes somewhere. Defaults to `button`. */
  accessibilityRole?: "button" | "link";
  /** Layout only (margins, alignment). Colours and sizes come from the variant. */
  style?: StyleProp<ViewStyle>;
}

/**
 * The web Button's variants and sizes on a phone (CROSS-PLATFORM section 3): at least 48 high, a
 * ripple when pressed on Android and a dim on iOS. The success haptic arrives with the first action
 * that can succeed.
 */
export function Button({
  label,
  variant = "primary",
  size = "md",
  pending = false,
  disabled = false,
  accessibilityRole = "button",
  style,
  ...props
}: ButtonProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const colours = VARIANT_COLOURS[variant];
  const quiet = variant === "ghost" || variant === "link";
  const labelColour = disabled ? theme.colors["text.muted"] : theme.colors[colours.label];

  return (
    <Pressable
      {...props}
      accessibilityRole={accessibilityRole}
      disabled={disabled}
      busy={pending}
      android_ripple={rippleFor(variant, disabled, theme)}
      style={({ pressed }) => [
        styles.base,
        styles[size],
        variant === "link" ? styles.link : null,
        {
          backgroundColor: colours.fill ? theme.colors[colours.fill] : "transparent",
          borderColor: colours.edge ? theme.colors[colours.edge] : "transparent",
        },
        variant === "primary" ? styles.raised : null,
        disabled ? styles.disabled : null,
        disabled && quiet ? styles.disabledQuiet : null,
        pressedStyle(pressed, Platform.OS),
        style,
      ]}
    >
      {pending ? (
        <ActivityIndicator
          color={labelColour}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        />
      ) : null}
      <Text
        textStyle={SIZE_TEXT[size]}
        style={[styles.label, { color: labelColour }, variant === "link" ? styles.underline : null]}
      >
        {label}
      </Text>
    </Pressable>
  );
}
