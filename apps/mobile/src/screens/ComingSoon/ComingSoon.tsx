import { Linking } from "react-native";
import { Button } from "../../components/Button";
import { Screen } from "../../components/Screen";
import { Text } from "../../components/Text";
import { comingSoonAction, comingSoonBody } from "../../copy/navigation";
import { useShell, webPageUrl } from "../../navigation/shell";

export interface ComingSoonProps {
  /** The page's name, as web's navigation says it. */
  label: string;
  /** The same page on the website. */
  webRoute: string;
}

/**
 * A page whose own slice is not built yet (E12 S4, plan 9.7): what it is, that it is on the
 * website today, and a link to it there. Never a figure. The header above already names the page.
 */
export function ComingSoon({ label, webRoute }: ComingSoonProps) {
  const shell = useShell();
  return (
    <Screen edges={["right", "bottom", "left"]}>
      <Text textStyle="body.md" color="secondary">
        {comingSoonBody(label)}
      </Text>
      <Button
        label={comingSoonAction(label)}
        accessibilityRole="link"
        testID="coming-soon-open-website"
        onPress={() => void Linking.openURL(webPageUrl(shell, webRoute))}
      />
    </Screen>
  );
}
