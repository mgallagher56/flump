import { useNavigationContainerRef } from "expo-router";
import {
  type ReactElement,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Platform, StyleSheet, View } from "react-native";
import { useSession, useStartProblem } from "../../auth/SessionProvider";
import { lockHidesShell, useAppLock } from "../../auth/useAppLock";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { SIGN_OUT, SIGN_OUT_CONFIRM_TITLE, signOutConfirmMessage } from "../../copy/auth";
import { useSavedFigures } from "../../features/offline/useSavedFigures";
import { type Shell, ShellContext } from "../../navigation/shell";
import { AccountDeleted } from "../AccountDeleted";
import { DeleteAccount } from "../DeleteAccount";
import { FinishDeletion } from "../FinishDeletion";
import { Loading } from "../Loading";
import { Locked } from "../Locked";
import { Misconfigured } from "../Misconfigured";
import { NotInvited } from "../NotInvited";
import { SessionEnded } from "../SessionEnded";
import { SignIn } from "../SignIn";
import { SignInUnavailable } from "../SignInUnavailable";
import { TermsRequired } from "../TermsRequired";

/**
 * Around every signed-in route (`app/(app)/_layout.tsx`): shows the screen for the session's state
 * (plan section 5.2), and the signed-in shell (`children`, the tabs and their pages) only while
 * someone is signed in. Restored without reaching Flump, the shell stays and Home says so (S4,
 * plan 9.7). Every Sign out asks first, saying what sign-out does on this platform.
 *
 * Since S9: an erased account shows the last step of the deletion and a deleted one the
 * confirmation, both in place of the shell; the Not invited and Terms screens open "Delete your
 * account" in place; and while app lock is on, the `Locked` cover replaces the shell (which is not
 * rendered at all) while locked or checking. While unlocked the shell is never unmounted by the
 * lock, so a system sheet (the export's share sheet, a prompt) leaves the person where they were;
 * on iOS an opaque cover goes over it while the app is away (Android has FLAG_SECURE instead).
 */
const noReconnect = () => Promise.resolve();

export function SessionGate({ children }: { children?: ReactNode }) {
  const app = useSession();
  const problem = useStartProblem();
  const [confirmingSignOut, setConfirmingSignOut] = useState(false);
  const [deletingInPlace, setDeletingInPlace] = useState(false);
  const lock = useAppLock(app?.appLock);
  const status = app?.state.status;
  useReturnAfterUnlock(status === "signedIn" || status === "restoredOffline", lock.locked);
  // The sealed cache is read only while the shell itself shows: never behind the lock or the iOS
  // app switcher cover (E12 S7).
  const lockState = useRef({ locked: lock.locked, cover: lock.switcherCover });
  lockState.current = { locked: lock.locked, cover: lock.switcherCover };
  const appLock = app?.appLock;
  const appSession = app?.session;
  const canReadNow = useCallback(
    () =>
      Boolean(appSession?.isRestoredOffline()) &&
      !lockHidesShell(appLock?.getPhase() ?? "off") &&
      !lockState.current.locked &&
      !lockState.current.cover,
    [appSession, appLock],
  );
  const savedFigures = useSavedFigures({
    cache: app?.offlineCache,
    offline: status === "restoredOffline",
    canRead: !lock.locked && !lock.switcherCover,
    reconnect: app ? app.session.reconnect : noReconnect,
    canReadNow,
  });
  const shell = useMemo<Shell | null>(
    () =>
      app
        ? {
            offline: status === "restoredOffline",
            saved: savedFigures.saved,
            restoringSaved: savedFigures.restoring,
            checking: savedFigures.checking,
            tryAgainQuietly: savedFigures.tryAgain,
            signOut: () => setConfirmingSignOut(true),
            retry: () => void app.session.retry(),
            marketingOrigin: app.marketingOrigin,
            webAppOrigin: app.webAppOrigin ?? null,
          }
        : null,
    [
      app,
      status,
      savedFigures.saved,
      savedFigures.restoring,
      savedFigures.checking,
      savedFigures.tryAgain,
    ],
  );
  if (!app) {
    return problem.kind === "unavailable" ? (
      <SignInUnavailable missing={problem.missing} />
    ) : (
      <Misconfigured />
    );
  }
  const { session, state, marketingOrigin } = app;
  const signIn = () => void session.signIn("sign-in");
  const signOut = () => setConfirmingSignOut(true);
  const screen = gateScreen();
  return (
    <>
      {screen}
      <ConfirmDialog
        visible={confirmingSignOut}
        title={SIGN_OUT_CONFIRM_TITLE}
        message={signOutConfirmMessage(Platform.OS === "android" ? "android" : "ios")}
        confirmLabel={SIGN_OUT}
        tone="default"
        onConfirm={() => {
          setConfirmingSignOut(false);
          void session.signOut();
        }}
        onCancel={() => setConfirmingSignOut(false)}
      />
    </>
  );

  /**
   * The signed-in shell, or the app lock's cover in its place while locked or checking. The shell is
   * not rendered behind that cover: a native stack's screens sit outside a parent view's
   * accessibility flags, so a hidden shell still let a screen reader read figures. Unlock comes
   * back to the page (`useReturnAfterUnlock`); what a page held only in its own state (an unsaved
   * field) is lost. While unlocked, the iOS app switcher cover goes over the mounted shell.
   */
  function signedInShell(): ReactElement {
    if (lock.locked) {
      return (
        <Locked
          phase={lock.phase === "locked" || lock.phase === "noScreenLock" ? lock.phase : "checking"}
          onUnlock={() => void app?.appLock?.unlock()}
          onSignOut={signOut}
        />
      );
    }
    return (
      <>
        <ShellContext.Provider value={shell}>{children}</ShellContext.Provider>
        {lock.switcherCover ? (
          <View style={StyleSheet.absoluteFill} testID="app-switcher-cover">
            <Locked phase="checking" onUnlock={() => undefined} onSignOut={signOut} />
          </View>
        ) : null}
      </>
    );
  }

  /** "Delete your account" in place of the Not invited or Terms screen, which have no stack. */
  function deleteInPlace(): ReactElement {
    return <DeleteAccount onCancel={() => setDeletingInPlace(false)} />;
  }

  function gateScreen(): ReactElement {
    switch (state.status) {
      case "loading":
      case "signingOut":
        return <Loading />;
      case "signedOut":
      case "signingIn":
        return (
          <SignIn
            notice={state.status === "signedOut" ? state.notice : null}
            pending={state.status === "signingIn"}
            onSignIn={signIn}
            onCreateAccount={() => void session.signIn("sign-up")}
            marketingOrigin={marketingOrigin}
          />
        );
      case "signedIn":
      case "restoredOffline":
        return signedInShell();
      case "sessionEnded":
        return <SessionEnded onSignIn={signIn} />;
      case "notInvited":
        if (deletingInPlace) return deleteInPlace();
        return <NotInvited onSignOut={signOut} onDeleteAccount={() => setDeletingInPlace(true)} />;
      case "termsRequired":
        if (deletingInPlace) return deleteInPlace();
        return (
          <TermsRequired
            marketingOrigin={marketingOrigin}
            onRetry={() => void session.retry()}
            onSignOut={signOut}
            onDeleteAccount={() => setDeletingInPlace(true)}
          />
        );
      case "deletionPending":
        return <FinishDeletion onSignOut={signOut} />;
      case "accountDeleted":
        return (
          <AccountDeleted
            marketingOrigin={marketingOrigin}
            onClose={() => {
              setDeletingInPlace(false);
              session.acknowledgeDeletion();
            }}
          />
        );
    }
  }
}

type RootState = ReturnType<ReturnType<typeof useNavigationContainerRef>["getRootState"]>;

/**
 * After a real lock (60 seconds away), Unlock returns to the page the person was on, with the same
 * stack under it: the tab it was opened from and the pages between, so Back and the tab bar work as
 * before the lock. The shell is not rendered while locked, so its stack starts again at Home when it
 * comes back; the navigation state last shown while unlocked is kept here and reset back in once
 * unlocked (replacing only the page left it alone, with no Back and no tab bar, and system Back left
 * the app). Nothing is kept past signing out or the session ending, so the next sign-in starts afresh.
 */
function useReturnAfterUnlock(signedIn: boolean, locked: boolean) {
  const navigation = useNavigationContainerRef();
  const lastShown = useRef<RootState | null>(null);
  const returnTo = useRef<RootState | null>(null);
  // Each new state as it arrives: read when the pathname changes, the root state can still be the
  // one before. The lock takes its copy (below) before unmounting the shell empties the stack.
  useEffect(
    () =>
      navigation.addListener("state", () => {
        lastShown.current = navigation.getRootState();
      }),
    [navigation],
  );
  useEffect(() => {
    if (!signedIn) {
      lastShown.current = null;
      returnTo.current = null;
      return;
    }
    if (locked) {
      returnTo.current ??= lastShown.current;
      return;
    }
    const target = returnTo.current;
    returnTo.current = null;
    if (target !== null) navigation.reset(target);
  }, [signedIn, locked, navigation]);
}
