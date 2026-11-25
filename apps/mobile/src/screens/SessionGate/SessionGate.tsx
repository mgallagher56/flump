import { router } from "expo-router";
import { useSession, useStartProblem } from "../../auth/SessionProvider";
import { Home } from "../Home";
import { Loading } from "../Loading";
import { Misconfigured } from "../Misconfigured";
import { NotInvited } from "../NotInvited";
import { Offline } from "../Offline";
import { SessionEnded } from "../SessionEnded";
import { SignIn } from "../SignIn";
import { SignInUnavailable } from "../SignInUnavailable";

/** The first route: shows the screen for the session's state (plan section 5.2). */
export function SessionGate() {
  const app = useSession();
  const problem = useStartProblem();
  if (!app) {
    return problem.kind === "unavailable" ? (
      <SignInUnavailable missing={problem.missing} />
    ) : (
      <Misconfigured />
    );
  }
  const { session, state, marketingOrigin } = app;
  const signIn = () => void session.signIn("sign-in");
  const signOut = () => void session.signOut();
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
      return <Home onSignOut={signOut} onOpenCheckIn={() => router.push("/check-in")} />;
    case "restoredOffline":
      return <Offline onRetry={() => void session.retry()} onSignOut={signOut} />;
    case "sessionEnded":
      return <SessionEnded onSignIn={signIn} />;
    case "notInvited":
      return <NotInvited onSignOut={signOut} />;
  }
}
