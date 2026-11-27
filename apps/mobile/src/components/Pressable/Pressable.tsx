import { Children, isValidElement, type ReactNode, useMemo } from "react";
// The one place raw React Native pressables are allowed (biome.json, apps/mobile override).
import {
  Pressable as NativePressable,
  type PressableProps as NativePressableProps,
  type PressableStateCallbackType,
  type StyleProp,
  StyleSheet,
  type ViewStyle,
} from "react-native";
import { useTheme } from "../../theme/ThemeProvider";
import { Text } from "../Text";
import { createStyles } from "./Pressable.styles";

/** The roles a pressable may take. Every pressable has one; `button` is the default. */
type PressableRole =
  | "button"
  | "link"
  | "checkbox"
  | "radio"
  | "switch"
  | "tab"
  | "menuitem"
  | "togglebutton";

type StyleInput =
  | StyleProp<ViewStyle>
  | ((state: PressableStateCallbackType) => StyleProp<ViewStyle>);

export interface PressableProps
  extends Omit<NativePressableProps, "accessibilityRole" | "role" | "style" | "children"> {
  /** Defaults to `button`. */
  accessibilityRole?: PressableRole;
  /** Required when the pressable has no text of its own (an icon, a logo). */
  accessibilityLabel?: string;
  /** Busy: announced, and presses are ignored until it clears. */
  busy?: boolean;
  style?: StyleInput;
  children: ReactNode | ((state: PressableStateCallbackType) => ReactNode);
}

/** True when the children put readable text on screen, so a screen reader has a name to read. */
export function hasTextChild(children: ReactNode): boolean {
  return Children.toArray(children).some((child) => {
    if (typeof child === "string") return child.trim().length > 0;
    if (typeof child === "number") return true;
    if (!isValidElement(child)) return false;
    const props = child.props as { children?: ReactNode };
    return child.type === Text
      ? hasTextChild(props.children)
      : props.children !== undefined && hasTextChild(props.children);
  });
}

const RESTING: PressableStateCallbackType = { pressed: false, hovered: false };

/**
 * Every tappable thing in the app. It is at least 48 by 48 points (`sizes["control.lg"]`) whatever
 * style it is given, always has a role, and in a development build throws when it has neither a
 * label nor text of its own, so an unnamed control cannot reach a screen reader unnoticed.
 */
export function Pressable({
  accessibilityRole = "button",
  accessibilityLabel,
  accessibilityState,
  busy = false,
  disabled,
  style,
  children,
  onPress,
  onLongPress,
  ...props
}: PressableProps) {
  const theme = useTheme();
  const { target: box } = useMemo(() => createStyles(theme), [theme]);
  const target = box.minHeight;
  const label = accessibilityLabel ?? props["aria-label"];
  const visible = typeof children === "function" ? children(RESTING) : children;

  if (__DEV__) {
    if (!label?.trim() && !hasTextChild(visible)) {
      throw new Error(
        "Pressable needs an accessibilityLabel when it has no text of its own (plan section 2, platform rules).",
      );
    }
  }

  const resolveStyle = useMemo(
    () => (state: PressableStateCallbackType) => {
      const given = StyleSheet.flatten(typeof style === "function" ? style(state) : style) ?? {};
      if (__DEV__) {
        for (const side of ["height", "width"] as const) {
          const value = given[side];
          if (typeof value === "number" && value < target) {
            throw new Error(`Pressable ${side} ${value} is under the ${target} point target.`);
          }
        }
      }
      const minHeight = Math.max(
        typeof given.minHeight === "number" ? given.minHeight : 0,
        box.minHeight,
      );
      const minWidth = Math.max(
        typeof given.minWidth === "number" ? given.minWidth : 0,
        box.minWidth,
      );
      return [given, { minHeight, minWidth }];
    },
    [style, target, box],
  );

  return (
    <NativePressable
      {...props}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      // Busy is also disabled, as the web Button's pending state sets aria-disabled: no press
      // feedback, no press events, and it is announced.
      accessibilityState={{ ...accessibilityState, disabled: Boolean(disabled || busy), busy }}
      disabled={Boolean(disabled || busy)}
      onPress={busy || disabled ? undefined : onPress}
      onLongPress={busy || disabled ? undefined : onLongPress}
      style={resolveStyle}
    >
      {children}
    </NativePressable>
  );
}
