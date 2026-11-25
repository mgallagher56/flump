import { Link } from "expo-router";
import { Button } from "../../components/Button";
import { FlumpLogo } from "../../components/FlumpLogo";
import { Screen } from "../../components/Screen";
import { Text } from "../../components/Text";
import { APP_NAME, TAGLINE } from "../../copy/brand";

/** The placeholder first screen: the logo, the name and the tagline, in the system's theme. */
export function Welcome() {
  return (
    <Screen centred>
      {/* Decorative: the name in words beside it is what a screen reader reads. */}
      <FlumpLogo size="lg" />
      <Text accessibilityRole="header" textStyle="heading.lg">
        {APP_NAME}
      </Text>
      <Text textStyle="body.lg" color="secondary">
        {TAGLINE}
      </Text>
      {__DEV__ ? (
        <>
          <Link href="/engine-check" asChild>
            <Button variant="link" accessibilityRole="link" label="Device check" />
          </Link>
          <Link href="/gallery" asChild>
            <Button variant="link" accessibilityRole="link" label="Component gallery" />
          </Link>
        </>
      ) : null}
    </Screen>
  );
}
