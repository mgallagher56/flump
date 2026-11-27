import { ListRow } from "../../components/ListRow";
import { Screen } from "../../components/Screen";
import { SETTINGS } from "../../copy/settings";

/** The four Settings pages, in web's order (Profile, Security, Data) with This phone after Profile. */
const SETTINGS_PAGES = [
  { key: "profile", label: SETTINGS.profile },
  { key: "phone", label: SETTINGS.phone },
  { key: "security", label: SETTINGS.security },
  { key: "data", label: SETTINGS.data },
] as const;

type SettingsPageKey = (typeof SETTINGS_PAGES)[number]["key"];

export interface SettingsProps {
  /** Opens a Settings page (`/settings/<key>`). */
  onOpen(key: SettingsPageKey): void;
}

/**
 * Settings (E12 S9, plan 9.10): web's settings tabs as a list, each row a pushed page, since the app
 * has no tabs component. This phone is the app's own group: the colour theme and app lock.
 */
export function Settings({ onOpen }: SettingsProps) {
  return (
    <Screen edges={["right", "bottom", "left"]} testID="settings">
      {SETTINGS_PAGES.map((page) => (
        <ListRow
          key={page.key}
          label={page.label}
          testID={`settings-row-${page.key}`}
          onPress={() => onOpen(page.key)}
        />
      ))}
    </Screen>
  );
}
