import { type ReactElement, type ReactNode, useMemo, useState } from "react";
import { Platform } from "react-native";
import { useSession, useStartProblem } from "../../auth/SessionProvider";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { SIGN_OUT, SIGN_OUT_CONFIRM_TITLE, signOutConfirmMessage } from "../../copy/auth";
import { type Shell, ShellContext } from "../../navigation/shell";
import { Loading } from "../Loading";
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
 */
export function SessionGate({ children }: { children?: ReactNode }) {
  const app = useSession();
  const problem = useStartProblem();
  const [confirmingSignOut, setConfirmingSignOut] = useState(false);
  const status = app?.state.status;
  const shell = useMemo<Shell | null>(
    () =>
      app
        ? {
            offline: status === "restoredOffline",
            signOut: () => setConfirmingSignOut(true),
            retry: () => void app.session.retry(),
            marketingOrigin: app.marketingOrigin,
            webAppOrigin: app.webAppOrigin ?? null,
          }
        : null,
    [app, status],
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
        return <ShellContext.Provider value={shell}>{children}</ShellContext.Provider>;
      case "sessionEnded":
        return <SessionEnded onSignIn={signIn} />;
      case "notInvited":
        return <NotInvited onSignOut={signOut} />;
      case "termsRequired":
        return (
          <TermsRequired
            marketingOrigin={marketingOrigin}
            onRetry={() => void session.retry()}
            onSignOut={signOut}
          />
        );
    }
  }
}
