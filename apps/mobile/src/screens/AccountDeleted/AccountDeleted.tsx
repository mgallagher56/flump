import { Linking } from "react-native";
import { Button } from "../../components/Button";
import { Text } from "../../components/Text";
import { ACCOUNT_DELETED_CLOSE, WEB_ACCOUNT_DELETED } from "../../copy/accountData";
import { StatusMessage } from "../StatusMessage";

export interface AccountDeletedProps {
  /** The public marketing site, where web's home link goes. */
  marketingOrigin: string;
  /** On to the sign-in screen. */
  onClose(): void;
}

/**
 * After a deletion (E12 S9): the device is already wiped, as at sign-out, and this replaces the
 * signed-in shell in web's `AccountDeletedNotice` words.
 */
export function AccountDeleted({ marketingOrigin, onClose }: AccountDeletedProps) {
  return (
    <StatusMessage heading={WEB_ACCOUNT_DELETED.heading} body={WEB_ACCOUNT_DELETED.body}>
      <Text color="secondary">{WEB_ACCOUNT_DELETED.thanks}</Text>
      <Button
        label={WEB_ACCOUNT_DELETED.homeLink}
        variant="outline"
        accessibilityRole="link"
        testID="account-deleted-home"
        onPress={() => void Linking.openURL(marketingOrigin)}
      />
      <Button
        label={ACCOUNT_DELETED_CLOSE}
        variant="ghost"
        testID="account-deleted-close"
        onPress={onClose}
      />
    </StatusMessage>
  );
}
