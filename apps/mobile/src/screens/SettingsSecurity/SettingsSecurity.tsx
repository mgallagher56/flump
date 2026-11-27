import { Linking } from "react-native";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { Screen } from "../../components/Screen";
import { Text } from "../../components/Text";
import { OPEN_FLUMP_WEBSITE } from "../../copy/navigation";
import { SECURITY } from "../../copy/settings";
import { useProfile } from "../../data/profile";
import type { WebLink } from "../../navigation/shell";

export interface SettingsSecurityProps {
  /** Restored without reaching Flump: nothing is read, and the button waits for a connection. */
  offline: boolean;
  /** Web's settings, Security tab, where the password is changed. */
  changePassword: WebLink;
}

/**
 * Settings, Security (E12 S9, plan 9.10), as web's "How you sign in": the account email, read only,
 * and Change password, which opens the website in the system browser. The app never shows or takes
 * a password (coordinator, 27 November 2026).
 */
export function SettingsSecurity({ offline, changePassword }: SettingsSecurityProps) {
  const profile = useProfile({ enabled: !offline });
  const email = profile.data?.email;
  return (
    <Screen edges={["right", "bottom", "left"]} testID="settings-security">
      <Card>
        <Text accessibilityRole="header" textStyle="heading.sm">
          {SECURITY.title}
        </Text>
        {/* Shown once read; offline there is nothing to show. */}
        {profile.data !== undefined ? (
          <>
            <Text textStyle="label.md" color="secondary">
              {SECURITY.email}
            </Text>
            <Text testID="settings-email">{email || SECURITY.emailNotSet}</Text>
          </>
        ) : null}
        <Text textStyle="body.sm" color="secondary">
          {offline ? SECURITY.offline : SECURITY.changePasswordLine}
        </Text>
        <Button
          label={changePassword.exact ? SECURITY.changePassword : OPEN_FLUMP_WEBSITE}
          variant="secondary"
          accessibilityRole="link"
          disabled={offline}
          testID="settings-change-password"
          onPress={() => void Linking.openURL(changePassword.url)}
        />
      </Card>
    </Screen>
  );
}
