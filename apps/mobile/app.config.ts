import type { ExpoConfig } from "expo/config";

/**
 * Flump mobile app config (E12 S1a). No signing, store or EAS project values yet: those are owner
 * steps OS2, OS3 and OS6 in docs/audit/plans/E12-mobile-rebuild-plan.md section 11. The bundle
 * identifiers below are placeholders until the owner picks the app identifier (OS2).
 */
const config: ExpoConfig = {
  name: "Flump",
  slug: "flump",
  scheme: "flump",
  version: "0.0.0",
  orientation: "portrait",
  // Follow the system light or dark setting; the theme provider reads the same setting.
  userInterfaceStyle: "automatic",
  ios: {
    supportsTablet: false,
    bundleIdentifier: "app.flump.mobile",
  },
  android: {
    package: "app.flump.mobile",
  },
  // Over-the-air updates come with a later slice (plan section 4.9); off until then.
  updates: { enabled: false },
  // expo-secure-store's plugin points Android Auto Backup and device transfer at rules that leave
  // out the secure store (the refresh token). scripts/check-android-backup.ts checks the prebuild
  // output in CI. Face ID is not used.
  // expo-router: no `_sitemap` route, which in a development build lists every route; unknown
  // links land on app/(app)/+not-found.tsx inside the session gate (E12 S4).
  plugins: [
    ["expo-router", { sitemap: false }],
    ["expo-secure-store", { configureAndroidBackup: true }],
  ],
  experiments: {
    typedRoutes: true,
  },
};

export default config;
