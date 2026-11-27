import { type ReactNode, useMemo } from "react";
import { useWindowDimensions, View } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";
import { Button } from "../Button";
import { Icon } from "../Icon";
import { formatWholePounds, Money } from "../Money/Money";
import { Text } from "../Text";
import { CHANGE_ICON, createStyles, skeletonHeights } from "./HeroFigure.styles";

/** One change under the figure, already in words (web's `KpiDelta`). */
export interface HeroChange {
  direction: "up" | "down" | "flat";
  /** "£320 since October", with no sign: the arrow carries the direction. */
  text: string;
  /** What a screen reader hears in the summary: "up £320 since October". */
  spoken: string;
}

/** The one action shown with the empty prompt. */
interface HeroAction {
  label: string;
  onPress(): void;
  testID?: string;
}

export interface HeroFigureProps {
  /** What the figure is ("Net worth"). */
  label: string;
  /** Pounds. `null` shows "Not set", never £0. */
  value: number | null;
  /** One short line of context under the figure ("Recorded in October"). Not with `change`. */
  caption?: string | null;
  /** One change under the figure, an arrow and its words in the figure's own colour. */
  change?: HeroChange | null;
  /** With an unknown value: one sentence naming what to add ("Add an account to see..."). */
  emptyPrompt?: string;
  /** With an unknown value: the one way to add it. */
  emptyAction?: HeroAction;
  /** Waiting for the figure: blocks the size of the hero, so the figure replaces them in place. */
  loading?: boolean;
  /** Read out in place of the blocks while loading. Defaults to the label. */
  loadingLabel?: string;
  /** While loading: the height of what `children` will draw (the trend bars), kept as one block. */
  loadingSlotHeight?: number;
  /** Drawn under the figure and its change (the trend bars), with its own text alternative. */
  children?: ReactNode;
  testID?: string;
}

/** "minus £6,400" for a negative figure, as web speaks it. */
const spokenFigure = (value: number | null) => formatWholePounds(value).replace(/^-/, "minus ");

/**
 * The one headline figure on a screen, as web's `HeroFigure`: a label, the figure in whole pounds,
 * and one change or one caption, read out as one item ("Net worth, £52,100, up £320 since
 * October"). A negative figure and a fall keep the ordinary text colour. With no figure it shows
 * "Not set" with a prompt and one action; while loading, still blocks of the same height.
 */
export function HeroFigure({
  label,
  value,
  caption,
  change,
  emptyPrompt,
  emptyAction,
  loading = false,
  loadingLabel,
  loadingSlotHeight,
  children,
  testID,
}: HeroFigureProps) {
  const theme = useTheme();
  const { fontScale } = useWindowDimensions();
  const styles = useMemo(() => createStyles(theme), [theme]);

  if (loading) {
    const heights = skeletonHeights(theme, fontScale);
    // Keyed apart from the loaded hero, so the loaded one is a new view: Android kept the busy
    // state on the reused view and read the loaded figure out as "busy" (device check, S6).
    return (
      <View key="loading" style={styles.base} testID={testID}>
        <View
          accessible
          accessibilityLabel={loadingLabel ?? label}
          accessibilityState={{ busy: true }}
          style={styles.group}
        >
          {(["label", "figure", "line"] as const).map((part) => (
            <View
              key={part}
              testID={`${testID ?? "hero"}-skeleton-${part}`}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              style={[styles.block, styles[`${part}Block`], { height: heights[part] }]}
            />
          ))}
        </View>
        {loadingSlotHeight ? (
          <View
            testID={`${testID ?? "hero"}-skeleton-slot`}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={[styles.block, styles.slotBlock, { height: loadingSlotHeight }]}
          />
        ) : null}
      </View>
    );
  }

  // With no figure the action must stay its own control, so the block is not one item.
  if (value === null && (emptyPrompt || emptyAction)) {
    return (
      <View style={styles.base} testID={testID}>
        <Text textStyle="label.md" color="secondary">
          {label}
        </Text>
        <Money value={null} size="lg" color="secondary" />
        {emptyPrompt ? <Text color="secondary">{emptyPrompt}</Text> : null}
        {emptyAction ? (
          <Button
            label={emptyAction.label}
            variant="link"
            accessibilityRole="link"
            testID={emptyAction.testID}
            onPress={emptyAction.onPress}
          />
        ) : null}
      </View>
    );
  }

  const line = change ? change.spoken : caption;
  const spoken = [label, spokenFigure(value), line].filter(Boolean).join(", ");
  return (
    <View key="loaded" style={styles.base} testID={testID}>
      {/* Busy is cleared outright as well: a screen reader never hears a loaded figure as busy. */}
      <View
        accessible
        accessibilityLabel={spoken}
        accessibilityState={{ busy: false }}
        style={styles.group}
      >
        <Text textStyle="label.md" color="secondary">
          {label}
        </Text>
        <Money value={value} size="lg" />
        {change ? (
          <View style={styles.change} testID={testID ? `${testID}-change` : undefined}>
            <Icon name={CHANGE_ICON[change.direction]} size="sm" color="primary" />
            <Text textStyle="body.sm" tabular style={styles.changeText}>
              {change.text}
            </Text>
          </View>
        ) : caption ? (
          <Text textStyle="body.sm" color="secondary">
            {caption}
          </Text>
        ) : null}
      </View>
      {children}
    </View>
  );
}
