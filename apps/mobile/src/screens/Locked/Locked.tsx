import { Button } from "../../components/Button";
import { FlumpLogo } from "../../components/FlumpLogo";
import { Screen } from "../../components/Screen";
import { LOCKED } from "../../copy/accountData";
import { SIGN_OUT } from "../../copy/auth";
import { StatusMessage } from "../StatusMessage";

export interface LockedProps {
  /** `checking`: the flag is still being read on a cold start, so the cover shows with no words. */
  phase: "checking" | "locked" | "noScreenLock";
  onUnlock(): void;
  /** Asks first (SessionGate's confirmation). */
  onSignOut(): void;
}

/**
 * The cover while app lock is on and the app is locked (E12 S9): in place of the signed-in shell, on a
 * cold start, after 60 seconds away and in the app switcher. It shows no figures. A phone whose
 * screen lock was removed cannot unlock: only Sign out is offered.
 */
export function Locked({ phase, onUnlock, onSignOut }: LockedProps) {
  if (phase === "checking") {
    return (
      <Screen centred scroll={false} testID="locked">
        <FlumpLogo size="md" />
      </Screen>
    );
  }
  const noScreenLock = phase === "noScreenLock";
  return (
    <StatusMessage heading={LOCKED.heading} body={noScreenLock ? LOCKED.noScreenLock : LOCKED.body}>
      {noScreenLock ? null : (
        <Button label={LOCKED.unlock} size="lg" testID="locked-unlock" onPress={onUnlock} />
      )}
      <Button label={SIGN_OUT} variant="secondary" testID="locked-sign-out" onPress={onSignOut} />
    </StatusMessage>
  );
}
