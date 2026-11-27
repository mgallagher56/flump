import { LEGAL_PAGES } from "@flump/business-details";
import { Linking, View } from "react-native";
import { Button } from "../../components/Button";
import { InlineAlert } from "../../components/InlineAlert";
import { Screen } from "../../components/Screen";
import { Text } from "../../components/Text";
import { DATA_PAGE } from "../../copy/accountData";
import { AccountDataActions } from "../AccountDataActions";

export interface DataSettingsProps {
  /** Restored offline: the two actions are disabled, with one line saying why. */
  offline?: boolean;
  /** The marketing site, where the legal pages live. */
  marketingOrigin: string;
  onOpenDelete(): void;
}

/**
 * Settings, Data (E12 S9, plan 9.10): web's Data tab less its browser storage switch. Download your
 * data, Delete your account, and the four legal pages from `LEGAL_PAGES`, opened in the system
 * browser as on the sign-in screen.
 */
export function DataSettings({
  offline = false,
  marketingOrigin,
  onOpenDelete,
}: DataSettingsProps) {
  return (
    <Screen edges={["right", "left", "bottom"]} testID="data-settings">
      {offline ? <InlineAlert tone="info" message={DATA_PAGE.offline} /> : null}
      <AccountDataActions offline={offline} onOpenDelete={onOpenDelete} />
      <View>
        <Text accessibilityRole="header" textStyle="heading.sm">
          {DATA_PAGE.legalHeading}
        </Text>
        {LEGAL_PAGES.map((page) => (
          <Button
            key={page.key}
            variant="link"
            accessibilityRole="link"
            accessibilityLabel={page.title}
            label={page.title}
            onPress={() => void Linking.openURL(`${marketingOrigin}${page.path}`)}
          />
        ))}
      </View>
    </Screen>
  );
}
