import { Redirect } from "expo-router";
import type { ComponentType } from "react";

/**
 * Dev only. Production bundles replace `__DEV__` with false and drop the dead branch, so neither the
 * screen nor the tax vector catalogue ships; the route only sends a release build back home.
 * scripts/check-bundle.ts proves it on every PR.
 */
const EngineCheckRoute: ComponentType = __DEV__
  ? require("../../src/screens/EngineCheck").EngineCheck
  : () => <Redirect href="/" />;

export default EngineCheckRoute;
