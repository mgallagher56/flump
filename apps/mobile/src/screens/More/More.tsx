import { View } from "react-native";
import { ListRow } from "../../components/ListRow";
import { Screen } from "../../components/Screen";
import { Text } from "../../components/Text";
import { SIGN_OUT } from "../../copy/auth";
import { MORE_FOOTER, MORE_GROUPS } from "../../navigation/navItems";

export interface MoreProps {
  /** Opens a page from the list, by its key (`flump://page/<key>`). */
  onOpenPage(key: string): void;
  /** Asks first (SessionGate's confirmation). */
  onSignOut(): void;
}

/**
 * The More tab (E12 S4, plan 9.7): what web's phone drawer lists below the bottom bar, in its
 * groups and order, then Settings, Connect AI and Calculators, then Sign out. Self Assessment, an
 * opt-in page, arrives with S9's filter for switched-off pages.
 */
export function More({ onOpenPage, onSignOut }: MoreProps) {
  return (
    <Screen edges={["right", "left"]}>
      {MORE_GROUPS.map((group) => (
        <View key={group.key}>
          <Text accessibilityRole="header" textStyle="label.md" color="secondary">
            {group.label}
          </Text>
          {group.pages.map((page) => (
            <ListRow
              key={page.key}
              label={page.label}
              icon={page.icon}
              testID={`more-row-${page.key}`}
              onPress={() => onOpenPage(page.key)}
            />
          ))}
        </View>
      ))}
      <View>
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
    </Screen>
  );
}
