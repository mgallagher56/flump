import { Redirect } from "expo-router";
import type { ComponentType } from "react";

/**
 * Dev only. Production bundles replace `__DEV__` with false and drop the dead branch, so neither the
 * gallery nor the components' named states ship; the route only sends a release build back home.
 * scripts/check-mobile-bundle.ts proves it on every PR.
 */
const GalleryRoute: ComponentType = __DEV__
  ? require("../../src/screens/Gallery").Gallery
  : () => <Redirect href="/" />;

export default GalleryRoute;
