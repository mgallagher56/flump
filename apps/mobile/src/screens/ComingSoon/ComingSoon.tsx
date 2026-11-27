import { Linking } from "react-native";
import { Button } from "../../components/Button";
import { Screen } from "../../components/Screen";
import { Text } from "../../components/Text";
import {
  COMING_SOON_BODY,
  comingSoonAction,
  OPEN_FLUMP_WEBSITE,
  websiteButtonName,
} from "../../copy/navigation";
import { useShell, webLink } from "../../navigation/shell";

export interface ComingSoonProps {
  /** The page's key (web's), for the screen's test id: `coming-soon-<key>`. */
  pageKey: string;
  /** The page's name, as web's navigation says it. */
  label: string;
  /** The same page on the website. */
  webRoute: string;
}

/**
 * A page whose own slice is not built yet (E12 S4, plan 9.7): what it is, that it is on the
 * website today, and a link to it there. Never a figure. The header above already names the page.
 */
export function ComingSoon({ pageKey, label, webRoute }: ComingSoonProps) {
  const link = webLink(useShell(), webRoute);
  return (
    <Screen edges={["right", "bottom", "left"]} testID={`coming-soon-${pageKey}`}>
      <Text textStyle="body.md" color="secondary">
        {COMING_SOON_BODY}
      </Text>
      <Button
        label={link.exact ? comingSoonAction(label) : OPEN_FLUMP_WEBSITE}
        accessibilityLabel={websiteButtonName(link, comingSoonAction(label))}
        accessibilityRole="link"
        testID="coming-soon-open-website"
        onPress={() => void Linking.openURL(link.url)}
      />
    </Screen>
  );
}
