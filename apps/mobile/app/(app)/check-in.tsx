import { Redirect, router } from "expo-router";
import { useSession } from "../../src/auth/SessionProvider";
import { useRefreshCheckInOnLeave } from "../../src/data/checkIn";
import { CheckIn } from "../../src/screens/CheckIn";

/**
 * The monthly check-in (E12 S3, plan 9.6). Signed in only: any other state goes back to the first
 * route, which shows the screen for it. Saved data is read again when the check-in closes, so the
 * row on the signed-in screen reflects what was saved.
 */
export default function CheckInRoute() {
  const app = useSession();
  useRefreshCheckInOnLeave();
  const status = app?.state.status;
  if (!app || (status !== "signedIn" && status !== "restoredOffline")) return <Redirect href="/" />;
  const close = () => (router.canGoBack() ? router.back() : router.replace("/"));
  return (
    <CheckIn
      offline={status === "restoredOffline"}
      marketingOrigin={app.marketingOrigin}
      onClose={close}
    />
  );
}
