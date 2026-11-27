import { useMemo } from "react";
import { View } from "react-native";
import { EXPORT, WEB_EXPORT } from "../../copy/accountData";
import { useTheme } from "../../theme/ThemeProvider";
import { Button } from "../Button";
import { InlineAlert } from "../InlineAlert";
import { Text } from "../Text";
import { createStyles } from "./ExportDataSection.styles";

/** Where the last download got to: web's states, with the share sheet in place of a download. */
export type ExportState = "idle" | "pending" | "shared" | "rateLimited" | "failed";

export interface ExportDataSectionProps {
  state: ExportState;
  /** Offline: the button is disabled (the page says why, once). */
  disabled?: boolean;
  onDownload(): void;
}

const MESSAGES: Partial<Record<ExportState, { text: string; tone: "info" | "danger" }>> = {
  shared: { text: EXPORT.shared, tone: "info" },
  rateLimited: { text: WEB_EXPORT.rateLimited, tone: "danger" },
  failed: { text: WEB_EXPORT.failed, tone: "danger" },
};

/**
 * "Download your data" (E12 S9): web's section, with one sentence before anything is shared that
 * the file holds all the person's figures and leaves Flump's protection once shared.
 */
export function ExportDataSection({ state, disabled = false, onDownload }: ExportDataSectionProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const pending = state === "pending";
  const message = MESSAGES[state];
  return (
    <View style={styles.base}>
      <Text accessibilityRole="header" textStyle="heading.sm">
        {WEB_EXPORT.heading}
      </Text>
      <Text color="secondary">{WEB_EXPORT.description}</Text>
      <Text color="secondary">{EXPORT.beforeSharing}</Text>
      <Button
        label={pending ? WEB_EXPORT.pending : WEB_EXPORT.button}
        variant="outline"
        pending={pending}
        disabled={disabled}
        testID="export-data-button"
        onPress={onDownload}
      />
      {message ? <InlineAlert message={message.text} tone={message.tone} /> : null}
    </View>
  );
}
