import { Redirect } from "expo-router";

/**
 * flump://auth/callback, the sign-in redirect. The browser sheet hands the address to the waiting
 * sign-in, but Android also opens the app at it; this sends that copy back to the first screen.
 */
export default function AuthCallback() {
  return <Redirect href="/" />;
}
