import { router } from "expo-router";
import { type ReactElement, useState } from "react";
import { Platform } from "react-native";
import { useSession, useStartProblem } from "../../auth/SessionProvider";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { SIGN_OUT, SIGN_OUT_CONFIRM_TITLE, signOutConfirmMessage } from "../../copy/auth";
import { Home } from "../Home";
import { Loading } from "../Loading";
import { Misconfigured } from "../Misconfigured";
import { NotInvited } from "../NotInvited";
import { Offline } from "../Offline";
import { SessionEnded } from "../SessionEnded";
import { SignIn } from "../SignIn";
import { SignInUnavailable } from "../SignInUnavailable";
import { TermsRequired } from "../TermsRequired";

/**
 * The first route: shows the screen for the session's state (plan section 5.2). Every Sign out
 * asks first, saying what sign-out does on this platform.
 */
export function SessionGate() {
  const app = useSession();
  const problem = useStartProblem();
  const [confirmingSignOut, setConfirmingSignOut] = useState(false);
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
        return (
          <Home
            onSignOut={signOut}
            onOpenCheckIn={() => router.push("/check-in")}
            marketingOrigin={marketingOrigin}
          />
        );
      case "restoredOffline":
        return <Offline onRetry={() => void session.retry()} onSignOut={signOut} />;
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
