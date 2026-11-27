import { View } from "react-native";
import { ListRow } from "../../components/ListRow";
import { Screen } from "../../components/Screen";
import { Text } from "../../components/Text";
import { SIGN_OUT } from "../../copy/auth";
import { MORE_SETTINGS_HEADING } from "../../copy/navigation";
import { MORE_FOOTER } from "../../navigation/navItems";
import { moreEntries } from "../../navigation/pageSwitches";
import { DevLinks } from "../DevLinks";

export interface MoreProps {
  /** Opens a page from the list, by its key (`flump://page/<key>`). */
  onOpenPage(key: string): void;
  /** Asks first (SessionGate's confirmation). */
  onSignOut(): void;
  /**
   * The pages the person has switched on (the profile's `enabledPages`). Missing until the profile
   * has been read, or when it cannot be: the default set, Self Assessment off.
   */
  enabledPages?: readonly string[] | null;
}

/**
 * The More tab (E12 S4, plan 9.7): what web's phone drawer lists below the bottom bar for the pages
 * the person has switched on (`pageSwitches.ts`, E12 S9), in its groups and order, then Settings,
 * Connect AI and Calculators, then Sign out. In a development build the device
 * check, gallery and sign-in check links sit at the foot (moved from Home in S5); `DevLinks` is
 * stripped from a production export.
 */
export function More({ onOpenPage, onSignOut, enabledPages }: MoreProps) {
  return (
    <Screen edges={["right", "left"]}>
      {moreEntries(enabledPages).map((entry) =>
        entry.kind === "group" ? (
          <View key={entry.key}>
            <Text accessibilityRole="header" textStyle="label.md" color="secondary">
              {entry.label}
            </Text>
            {entry.pages.map((page) => (
              <ListRow
                key={page.key}
                label={page.label}
                icon={page.icon}
                testID={`more-row-${page.key}`}
                onPress={() => onOpenPage(page.key)}
              />
            ))}
          </View>
        ) : (
          // A group left with one page is a row of its own, as in web's drawer.
          <ListRow
            key={entry.key}
            label={entry.label}
            icon={entry.icon}
            testID={`more-row-${entry.pageKey}`}
            onPress={() => onOpenPage(entry.pageKey)}
          />
        ),
      )}
      <View>
        <Text accessibilityRole="header" textStyle="label.md" color="secondary">
          {MORE_SETTINGS_HEADING}
        </Text>
        {MORE_FOOTER.map((page) => (
          <ListRow
            key={page.key}
            label={page.label}
            icon={page.icon}
            testID={`more-row-${page.key}`}
            onPress={() => onOpenPage(page.key)}
          />
        ))}
        <ListRow
          label={SIGN_OUT}
          icon="log-out"
          accessibilityRole="button"
          testID="more-sign-out"
          onPress={onSignOut}
        />
      </View>
      <DevLinks />
    </Screen>
  );
}
