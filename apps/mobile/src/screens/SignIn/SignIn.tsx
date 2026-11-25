import { legalPage } from "@flump/business-details";
import { Linking } from "react-native";
import type { SignInNotice } from "../../auth/sessionMachine";
import { Button } from "../../components/Button";
import { FlumpLogo } from "../../components/FlumpLogo";
import { InlineAlert } from "../../components/InlineAlert";
import { Screen } from "../../components/Screen";
import { Text } from "../../components/Text";
import { CREATE_ACCOUNT, SIGN_IN, SIGN_IN_NOTICES } from "../../copy/auth";
import { APP_NAME, TAGLINE } from "../../copy/brand";
import { DevLinks } from "../DevLinks";

export interface SignInProps {
  notice: SignInNotice | null;
  /** The browser sheet is open or the code is being exchanged. */
  pending: boolean;
  onSignIn(): void;
  onCreateAccount(): void;
  marketingOrigin: string;
}

const LEGAL_LINKS = ["privacy", "terms"] as const;

/** The first screen when signed out (plan section 9.5, S2b acceptance 1 and 2). */
export function SignIn({
  notice,
  pending,
  onSignIn,
  onCreateAccount,
  marketingOrigin,
}: SignInProps) {
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
      {notice ? (
        <InlineAlert
          message={SIGN_IN_NOTICES[notice]}
          tone={notice === "unavailable" ? "info" : "danger"}
        />
      ) : null}
      <Button label={SIGN_IN} size="lg" pending={pending} onPress={onSignIn} />
      <Button
        label={CREATE_ACCOUNT}
        variant="secondary"
        disabled={pending}
        onPress={onCreateAccount}
      />
      {LEGAL_LINKS.map((key) => {
        const page = legalPage(key);
        return (
          <Button
            key={key}
            variant="link"
            accessibilityRole="link"
            label={page.title}
            onPress={() => void Linking.openURL(`${marketingOrigin}${page.path}`)}
          />
        );
      })}
      <DevLinks />
    </Screen>
  );
}
