import { type ReactNode, useEffect, useMemo, useState } from "react";
import { AccessibilityInfo, View } from "react-native";
import { SCENARIO } from "../../copy/budget";
import { useTheme } from "../../theme/ThemeProvider";
import { Button } from "../Button";
import { Icon } from "../Icon";
import { Pressable } from "../Pressable";
import { ProjectionNotice } from "../ProjectionNotice";
import { StatusBadge } from "../StatusBadge";
import { Text } from "../Text";
import { createStyles } from "./ScenarioZone.styles";

export interface ScenarioZoneProps {
  /** The zone's heading ("Model a change to your budget"). */
  title: string;
  /** While open: the saved figures it starts from, from saved values only. */
  basis: string;
  /** While closed: one line in place of the basis (the starting point, or the illustration). */
  summary?: string;
  /** The inputs. Mounted only while open; their values live with the caller, so none is lost. */
  children: ReactNode;
  /** The outcome, under the inputs (STYLE-GUIDE 12.5 on a phone). */
  result?: ReactNode;
  /** Below the outcome: more inputs one step away. */
  extra?: ReactNode;
  /** True when any input differs from where the zone starts: then "Reset to saved figures" shows. */
  isModified?: boolean;
  /** Puts every input back. Only offered while `isModified`. */
  onReset?: () => void;
  /**
   * The outcome in words once a person changes something, read out with "Illustration:" before
   * it. Empty while nothing has changed, so nothing is announced on arrival.
   */
  announcement?: string;
  /** Starts closed behind a show and hide control, with the summary in place of the basis. */
  collapsible?: boolean;
  /** The control's words while closed. */
  showLabel?: string;
  /** Its words while open. Defaults to "Hide what-if". */
  hideLabel?: string;
  /** Defaults to "scenario-zone". */
  testID?: string;
}

/**
 * The one home for a what-if on a screen, as web's `ScenarioZone`: a heading with the "Illustration,
 * not saved" badge, the saved figures it starts from, the inputs, the outcome and the projection
 * notice. Nothing in it saves or sends anything, and there is no "apply". It opens and closes with
 * no animation, so there is nothing for Reduce Motion to stop.
 */
export function ScenarioZone({
  title,
  basis,
  summary,
  children,
  result,
  extra,
  isModified = false,
  onReset,
  announcement = "",
  collapsible = false,
  showLabel = title,
  hideLabel = SCENARIO.hide,
  testID = "scenario-zone",
}: ScenarioZoneProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [opened, setOpened] = useState(false);
  const open = !collapsible || opened;

  useEffect(() => {
    if (announcement) {
      AccessibilityInfo.announceForAccessibility(`${SCENARIO.announcementPrefix} ${announcement}`);
    }
  }, [announcement]);

  return (
    <View style={styles.base} testID={testID}>
      <View style={styles.header}>
        <Text accessibilityRole="header" textStyle="heading.sm" testID={`${testID}-title`}>
          {title}
        </Text>
        <StatusBadge label={SCENARIO.badge} testID={`${testID}-badge`} />
        <Text
          textStyle="body.sm"
          color="secondary"
          tabular
          testID={open ? `${testID}-basis` : `${testID}-summary`}
        >
          {open ? basis : (summary ?? basis)}
        </Text>
        {collapsible ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={open ? hideLabel : showLabel}
            accessibilityState={{ expanded: open }}
            testID={`${testID}-toggle`}
            style={styles.toggle}
            onPress={() => setOpened((was) => !was)}
          >
            <Text textStyle="label.md" style={styles.toggleLabel}>
              {open ? hideLabel : showLabel}
            </Text>
            <View style={open ? styles.up : styles.down}>
              <Icon name="chevron-right" size="sm" />
            </View>
          </Pressable>
        ) : null}
      </View>
      {open ? (
        <View style={styles.content} testID={`${testID}-content`}>
          <View style={styles.inputs}>{children}</View>
          {result ? <View testID={`${testID}-result`}>{result}</View> : null}
          {extra}
          {isModified && onReset ? (
            <Button
              label={SCENARIO.reset}
              variant="secondary"
              size="sm"
              testID={`${testID}-reset`}
              onPress={onReset}
            />
          ) : null}
          <ProjectionNotice testID={`${testID}-notice`} />
        </View>
      ) : null}
    </View>
  );
}
