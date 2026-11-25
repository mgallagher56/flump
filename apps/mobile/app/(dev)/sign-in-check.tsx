import { Redirect } from "expo-router";
import type { ComponentType } from "react";

/**
 * Dev only: the S2a sign-in check against real WorkOS. Production bundles replace `__DEV__` with
 * false and drop the screen; the route only sends a release build back home.
 * scripts/check-mobile-bundle.ts proves it on every PR.
 */
const SignInCheckRoute: ComponentType = __DEV__
  ? require("../../src/screens/SignInCheck").SignInCheck
  : () => <Redirect href="/" />;

export default SignInCheckRoute;
