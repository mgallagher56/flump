import { Linking } from "react-native";
import { Button } from "../../components/Button";
import { Text } from "../../components/Text";
import {
  OPEN_WEBSITE,
  SIGN_OUT,
  TERMS_REQUIRED_BODY,
  TERMS_REQUIRED_HEADING,
  TERMS_REQUIRED_NOTE,
  TRY_AGAIN,
} from "../../copy/auth";
import { StatusMessage } from "../StatusMessage";

export interface TermsRequiredProps {
  /** The website, where the terms are read and agreed. */
  marketingOrigin: string;
  /** Checks again, once the person has agreed on the website. */
  onRetry(): void;
  /** Left out where the screen shows inside a signed-in screen that has its own way out. */
  onSignOut?: () => void;
}

/**
 * Signed in, but the API answers 403 `terms_not_accepted` (PR #939) until the terms in force are
 * agreed. The phone does not show or record the agreement: it sends the person to the website, then
 * checks again. A plain way on, not an error.
 */
export function TermsRequired({ marketingOrigin, onRetry, onSignOut }: TermsRequiredProps) {
  return (
    <StatusMessage heading={TERMS_REQUIRED_HEADING} body={TERMS_REQUIRED_BODY}>
      <Button
        label={OPEN_WEBSITE}
        accessibilityRole="link"
        size="lg"
        testID="terms-open-website"
        onPress={() => void Linking.openURL(marketingOrigin)}
      />
      <Button label={TRY_AGAIN} variant="secondary" testID="terms-retry" onPress={onRetry} />
      <Text color="secondary">{TERMS_REQUIRED_NOTE}</Text>
      {onSignOut ? <Button label={SIGN_OUT} variant="ghost" onPress={onSignOut} /> : null}
    </StatusMessage>
  );
}
