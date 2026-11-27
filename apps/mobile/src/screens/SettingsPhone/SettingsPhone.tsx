import { Card } from "../../components/Card";
import { OptionList } from "../../components/OptionList";
import { Screen } from "../../components/Screen";
import { PHONE } from "../../copy/settings";
import type { ThemePreference } from "../../device/themePreference";
import { useThemeChoice } from "../../theme/ThemeProvider";
import { AppLockRow } from "../AppLockRow";

const THEME_OPTIONS: readonly { value: ThemePreference; label: string }[] = [
  { value: "system", label: PHONE.system },
  { value: "light", label: PHONE.light },
  { value: "dark", label: PHONE.dark },
];

/**
 * Settings, This phone (E12 S9, plan 9.10; CROSS-PLATFORM X9): choices kept on this phone only. The
 * colour theme writes the same stored choice as the header's button. Works offline: nothing here
 * talks to Flump.
 */
export function SettingsPhone() {
  const { preference, setPreference } = useThemeChoice();
  return (
    <Screen edges={["right", "bottom", "left"]} testID="settings-phone">
      <Card>
        <OptionList
          label={PHONE.themeTitle}
          hint={PHONE.themeHint}
          options={THEME_OPTIONS}
          value={preference}
          testID="settings-theme"
          onChange={setPreference}
        />
      </Card>
      <AppLockRow />
    </Screen>
  );
}
