import { useMemo } from "react";
import { Platform, View } from "react-native";
import { APP_LOCK } from "../../copy/accountData";
import { useTheme } from "../../theme/ThemeProvider";
import { InlineAlert } from "../InlineAlert";
import { Switch } from "../Switch";
import { Text } from "../Text";
import { createStyles } from "./AppLockSetting.styles";

export interface AppLockSettingProps {
  /** On or off, as stored. */
  value: boolean;
  /** `noScreenLock`: the phone has no passcode or biometrics, so the switch is disabled. */
  availability: "available" | "noScreenLock";
  /** The phone is asking for confirmation, or the state is still being read. */
  busy?: boolean;
  /** What went wrong with the last change. */
  message?: string | null;
  /** Asks to change; the caller asks the phone to confirm first. */
  onChange(next: boolean): void;
}

/**
 * App lock on the This phone page (E12 S9): one switch, off by default. Turning it on or off asks
 * the phone first (the caller does). It is a screen gate on this phone, and its words never call it
 * encryption or a protection of the account. On Android it also says screenshots are off while it
 * is on (the lock sets FLAG_SECURE there; iOS keeps its cover instead).
 */
export function AppLockSetting({
  value,
  availability,
  busy = false,
  message,
  onChange,
}: AppLockSettingProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const unavailable = availability === "noScreenLock";
  return (
    <View style={styles.base}>
      <Switch
        label={APP_LOCK.label}
        hint={APP_LOCK.hint}
        value={value}
        busy={busy}
        disabled={unavailable}
        testID="app-lock-switch"
        onValueChange={onChange}
      />
      {Platform.OS === "android" ? (
        <Text textStyle="body.sm" color="secondary">
          {APP_LOCK.screenshotsOff}
        </Text>
      ) : null}
      {unavailable ? (
        <Text textStyle="body.sm" color="secondary">
          {APP_LOCK.noScreenLock}
        </Text>
      ) : null}
      {message ? <InlineAlert message={message} /> : null}
    </View>
  );
}
