import { useSession } from "../../auth/SessionProvider";
import { Home } from "../Home";
import { Loading } from "../Loading";
import { Misconfigured } from "../Misconfigured";
import { NotInvited } from "../NotInvited";
import { Offline } from "../Offline";
import { SessionEnded } from "../SessionEnded";
import { SignIn } from "../SignIn";

/** The first route: shows the screen for the session's state (plan section 5.2). */
export function SessionGate() {
  const app = useSession();
  if (!app) return <Misconfigured />;
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
      return <Home onSignOut={signOut} />;
    case "restoredOffline":
      return <Offline onRetry={() => void session.retry()} onSignOut={signOut} />;
    case "sessionEnded":
      return <SessionEnded onSignIn={signIn} />;
    case "notInvited":
      return <NotInvited onSignOut={signOut} />;
  }
}
