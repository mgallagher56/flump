import { Button } from "../../components/Button";
import { PhraseConfirm } from "../../components/PhraseConfirm";
import { Screen } from "../../components/Screen";
import { Text } from "../../components/Text";
import {
  CANCEL,
  DATA_PAGE,
  DELETE_PHRASE,
  typePhraseLabel,
  WEB_DELETE,
} from "../../copy/accountData";
import { useDeletionFlow } from "../../features/account-data/useAccountData";

export interface DeleteAccountProps {
  /** Restored offline: nothing can be sent, and the page says why. */
  offline?: boolean;
  /** Shown in place of the Not invited or Terms screen: the way back there. */
  onCancel?: () => void;
}

/**
 * "Delete your account" (E12 S9, plan 9.10): web's list of what goes, then the typed phrase and the
 * danger button, on a page of its own because the platform alert cannot hold a field. What each
 * answer leads to is `useDeletionFlow`'s.
 */
export function DeleteAccount({ offline = false, onCancel }: DeleteAccountProps) {
  const flow = useDeletionFlow("delete");
  return (
    <Screen edges={onCancel ? undefined : ["right", "left", "bottom"]} testID="delete-account">
      <Text accessibilityRole="header" textStyle="heading.md">
        {WEB_DELETE.confirmTitle}
      </Text>
      <Text>{WEB_DELETE.listIntro}</Text>
      {WEB_DELETE.list.map((line) => (
        <Text key={line} color="secondary">
          {line}
        </Text>
      ))}
      <Text color="secondary">{WEB_DELETE.retention}</Text>
      <Text>{WEB_DELETE.final}</Text>
      {offline ? <Text color="secondary">{DATA_PAGE.offline}</Text> : null}
      <PhraseConfirm
        phrase={DELETE_PHRASE}
        label={typePhraseLabel(DELETE_PHRASE)}
        confirmLabel={flow.confirmLabel}
        pendingLabel={flow.pendingLabel}
        pending={flow.pending}
        disabled={offline}
        message={flow.message}
        action={flow.action}
        onConfirm={flow.confirm}
        testID="delete-account-confirm"
      />
      {onCancel ? <Button label={CANCEL} variant="ghost" onPress={onCancel} /> : null}
    </Screen>
  );
}
