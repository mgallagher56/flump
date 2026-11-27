import type { ReactNode } from "react";
import { Linking } from "react-native";
import type { Edge } from "react-native-safe-area-context";
import { Button } from "../../components/Button";
import { CHECK_IN } from "../../copy/checkIn";
import { OPEN_FLUMP_WEBSITE, websiteButtonName } from "../../copy/navigation";
import type { WebLink } from "../../navigation/shell";
import { StatusMessage } from "../StatusMessage";

export interface NotSetUpProps {
  /** The website's setup page, or its home page when this build has no web app address. */
  setUp: WebLink;
  edges?: readonly Edge[];
  /** Below the button (Home's development links). */
  children?: ReactNode;
}

/**
 * A person with no profile yet, or who has not finished setup: as web, which sends them to
 * onboarding, the app sends them to the website to set up. Never "could not load" or "out of step":
 * nothing went wrong.
 */
export function NotSetUp({ setUp, edges, children }: NotSetUpProps) {
  return (
    <StatusMessage heading={CHECK_IN.notSetUpHeading} body={CHECK_IN.notSetUpBody} edges={edges}>
      <Button
        label={setUp.exact ? CHECK_IN.notSetUpAction : OPEN_FLUMP_WEBSITE}
        accessibilityLabel={websiteButtonName(setUp, CHECK_IN.notSetUpAction)}
        accessibilityRole="link"
        testID="not-set-up-open-website"
        onPress={() => void Linking.openURL(setUp.url)}
      />
      {children}
    </StatusMessage>
  );
}
