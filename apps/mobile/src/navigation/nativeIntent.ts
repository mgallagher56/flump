/**
 * Links the system opens the app with (`app/+native-intent.ts`, Expo Router). Android also opens the
 * app at the sign-in redirect, `flump://auth/callback`, while the browser sheet hands the same
 * address to the waiting sign-in. With the app already open, that copy is ignored, so the person
 * stays where they were: a `flump://` link opened while signed out then lands on its own screen
 * after sign-in (E12 S4). On a cold start it still opens the callback route, which goes home.
 */
const SIGN_IN_CALLBACK = /^(?:flump:\/\/\/?|\/)?auth\/callback(?:[/?#]|$)/;

export function redirectSystemPath({
  path,
  initial,
}: {
  path: string;
  initial: boolean;
}): string | null {
  return !initial && SIGN_IN_CALLBACK.test(path) ? null : path;
}
