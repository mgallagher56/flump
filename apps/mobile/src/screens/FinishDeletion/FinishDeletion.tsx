import { Button } from "../../components/Button";
import { PhraseConfirm } from "../../components/PhraseConfirm";
import { Screen } from "../../components/Screen";
import { Text } from "../../components/Text";
import { DELETE_PHRASE, typePhraseLabel, WEB_FINISH_DELETION } from "../../copy/accountData";
import { SIGN_OUT } from "../../copy/auth";
import { useDeletionFlow } from "../../features/account-data/useAccountData";

/**
 * The last step of a deletion that stopped half way (E12 S9): the data is gone but the login is
 * not, after `identity_pending` or any 410 `account_deleted`. It replaces the signed-in shell, in
 * web's `FinishDeletionPanel` words, and repeats the (safe to repeat) delete request.
 */
export function FinishDeletion({ onSignOut }: { onSignOut(): void }) {
  const flow = useDeletionFlow("finish");
  return (
    <Screen testID="finish-deletion">
      <Text accessibilityRole="header" textStyle="heading.md">
        {WEB_FINISH_DELETION.heading}
      </Text>
      <Text>{WEB_FINISH_DELETION.deleted}</Text>
      <Text color="secondary">{WEB_FINISH_DELETION.lastStep}</Text>
      <PhraseConfirm
        phrase={DELETE_PHRASE}
        label={typePhraseLabel(DELETE_PHRASE)}
        confirmLabel={flow.confirmLabel}
        pendingLabel={flow.pendingLabel}
        pending={flow.pending}
        message={flow.message}
        action={flow.action}
        onConfirm={flow.confirm}
        testID="finish-deletion-confirm"
      />
      <Button label={SIGN_OUT} variant="ghost" onPress={onSignOut} />
    </Screen>
  );
}
