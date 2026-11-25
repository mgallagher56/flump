# E12 spike notes (slice S1a)

Decisions: accepted on 2026-11-25 (O1 Expo, owner; O5 server home, Fable decider). These notes record what slice S1a found while setting up `apps/mobile`; they answer the [U] items in plan section 4.1 and acceptance item 8 of section 9.3.

## Versions

| What | Version | Note |
| --- | --- | --- |
| Expo SDK | 58 (`expo` 58.0.26, published 17 November 2026) | Newest SDK 58 patch past the 7-day release-age gate |
| React Native | 0.88.1 | The version SDK 58's `bundledNativeModules.json` lists |
| React | 19.3.1 (the repo's one React) | SDK 58 lists 19.3.0. Kept 19.3.1: React Native 0.88.1 asks for `react ^19.3.0`, and its renderer (`Libraries/Renderer/implementations/ReactFabric-*.js`) has no exact-version check. `expo.install.exclude` in `apps/mobile/package.json` tells Expo's version check to skip `react` |
| TypeScript | 7.0.2 (the repo's compiler) | SDK 58 expects ~6.0.3. `tsc --noEmit` passes on TypeScript 7 with `expo/tsconfig.base`; `typescript` is also in `expo.install.exclude` |
| Jest | 30.5.2 with `jest-expo` 58.0.15 and React Native Testing Library 14.1.0 | Testing Library 14's `render` is async: tests `await` it |
| Node for Expo CLI | The repo's `.node-version` (26.13.1) | Expo CLI needs Node 22.13 or later; CI's job sets it up with `actions/setup-node` |

## The [U] items in plan section 4.1

1. **Does SDK 58 accept React 19.3.1?** Yes in practice (see the table). `expo-doctor` reports it unless excluded; the exclusion is the documented switch for this, and one React stays in the repo (AGENTS.md section 9 passes).
2. **Is the Bun install isolated or hoisted?** Isolated (`bun.lock` has `configVersion: 1`; packages live in `node_modules/.bun`). What that needed:
   - `@babel/runtime` as an app dependency: Babel's helpers are required from the app, including from the shared packages' code, and isolated installs do not expose Expo's copy. Jest gets `modulePaths: ["<rootDir>/node_modules"]` for the same reason.
   - `@babel/core` 7 pinned in the app's dev dependencies: otherwise Bun resolves `babel-jest`'s peer to the Babel 8 that Stryker brings, and Expo's preset refuses it.
   - Jest's `transformIgnorePatterns` allow the `node_modules/.bun/<name>@<version>/node_modules/` paths.
   - Same-version duplicates: the peer cycle between `expo` and `@expo/cli` makes Bun install a second copy of `expo`, `expo-constants`, `expo-linking` and `expo-status-bar` at the same versions. The production export's source maps list one copy of each package, so the app is not affected; `scripts/check-mobile-bundle.ts` asserts that on every CI run. `expo-doctor`'s duplicate check still fails. `scripts/run-expo-doctor.ts` tolerates exactly that finding (coordinator sign-off, 25 November 2026): a failing run passes only when the summary says one check failed, it is the duplicate check, and every duplicated package has one version. Any other failed check, a version split or output it cannot parse fails. Remove the tolerance when the repo moves to Bun's hoisted linker or Bun or Expo fix the cycle; whether to move the repo is a follow-up, not part of S1a.
3. **Which export condition does Metro pick for the shared packages?** `import`, so Metro reads each package's built `dist` (the export's source map shows `packages/tokens/dist`), not `src` through `module`. The shared packages must be built before Metro runs: Turbo's `export` task depends on `^build`, and the app README says to run the build first. Jest resolves the `default` condition, which is `src`, so a `moduleNameMapper` strips the `.js` from the packages' relative imports.
4. **Does TypeScript 7 work with Expo's base config?** Yes. `packages/typescript-config/expo.json` cannot itself extend `expo/tsconfig.base` (TypeScript resolves the name from the config package, which does not depend on Expo), so the app's `tsconfig.json` extends both: `["expo/tsconfig.base", "@repo/typescript-config/expo.json"]`.

Metro needs no custom setting: `metro.config.js` is the plain `expo/metro-config` default.

The plan names the Turbo task `build`; S1a calls it `export` instead, so the repo-wide `bun run build` (the web Build job) does not export the app. Only `📱 Mobile checks` runs it.

## Hermes and formatting

- `expo export` compiles both production bundles to Hermes bytecode (`.hbc`), so Hermes accepts the syntax of the app and the shared packages.
- **Not run in S1a: the device check on Hermes at runtime.** This machine has no Xcode and no Android SDK, and CI has no emulator until S2c. Jest runs the same `runChecks()` on Node (V8): all tax vectors pass and all formatter fixture cases match. The Hermes result for iOS and Android, and any formatting difference (with its fallback), are still to be recorded: by hand on a Mac and an Android emulator (owner step OS17), or by S2c's `mobile-e2e-android` job running `e2e/flows/engine-check.yaml`.

## Development-only code

The device check route (`app/(dev)/engine-check.tsx`) loads its screen behind `__DEV__`, and the layout registers its title only in development. Expo strips `__DEV__` branches before resolving modules in a production export, so the screen, the vector catalogue and the formatter fixture are absent from the iOS and Android bundles. `scripts/check-mobile-bundle.ts` searches both bundles for the screen's words and a vector id, and fails if they appear or if the tagline is missing; with the guard removed it fails (checked by hand on 25 November). The route path itself remains in production as a stub that redirects to the first screen.

## Left for later slices

- The logo: done in S1b (`FlumpLogo` on `react-native-svg` 15.16.0, the version SDK 58 lists).
- Brand fonts: token text styles name a role (`body`, `heading`), not a font, so the system font is used.
- The native splash and root background colours from tokens, and the stored theme choice (System, Light, Dark) with the header toggle.
- `eas.json` has only an internal `development` profile (simulator build and APK); a development client, `e2e`, `preview` and `production` profiles come with S2c and S19.
- The Panda-specific law checks (tabular numbers, style literals, icons, number inputs): done in S1b; every UI check now scans `apps/mobile`.

## Seam cost

S1a does no seam work: 0 agent-days (running total 0).

## Slice S2a: sign-in with WorkOS

These notes answer the [U] items in plan section 5.1. Evidence is named for each one: a primary source, the code, or the owner's run of the dev-only `sign-in-check` screen. That screen shows no token values, email or name.

### Facts settled without a real sign-in

- **Expo Go cannot finish the sign-in.** Expo Go handles only `exp://` links, so it never receives `flump://auth/callback`. A custom scheme needs a development build (docs.expo.dev, the authentication and linking guides; `@expo/cli` `BundlerDevServer.getNativeRuntimeUrl`; read 25 November 2026). The owner's real sign-in therefore runs in a debug build on their Android phone.
- **The issuer the backend expects** is `https://api.workos.com/user_management/<client id>` (`apps/backend/src/auth/workos-jwt.verifier.ts`; the owner decoded a staging token for that code). The verifier also requires `client_id` to equal the configured id. So a native token on web's client id passes only if WorkOS issues it the same way, which the check confirms.
- **Refresh tokens on web are single-use** (`apps/web/app/utils/auth.server.ts`, the E20-N2 single-flight comment). The app assumes the same: one shared refresh, and the new refresh token saved before the new access token is used.

### Answers from the owner's sign-in check

Pending: the owner runs the check on their phone (steps in the S2a report). Rows to fill in: issuer, claim names, access token lifetime, refresh with no client secret, refresh token replaced on use, old token reused, replacement after reuse, backend `GET /v1/user-profile`, and whether signing in after signing out asks for the password.

### Storage rule as built

The refresh token is deleted on sign-out (before any network call), on a rejected refresh (`invalid_grant`), on a fresh token the API refuses, and on sign-out from Not invited or the offline screen. A network failure never deletes it. A read error deletes nothing (changed from the first design on the review's finding that a locked iPhone throws for a good token, approved by the coordinator on 25 November 2026): the app shows the offline screen, and its Sign out clears the value. A sign-out during a refresh drops the late answer unsaved.

### Android backup

Proved from the prebuild output, not assumed: `scripts/check-android-backup.ts` reads the generated manifest and the rule files it names, and fails unless Auto Backup (`full-backup-content`) and Android 12's cloud backup and device transfer all exclude the `SecureStore` shared preferences. It runs in `🤖 Mobile e2e (Android)` and in the device APK workflow. A run on 25 November found `android:fullBackupContent="@xml/secure_store_backup_rules"` and `android:dataExtractionRules="@xml/secure_store_data_extraction_rules"`. What a real backup and restore does on a phone is still a hand check.

### Not verified

iOS (no Mac with Xcode here; the private browser session is configured but not seen), release builds against real WorkOS, and the WorkOS production environment (OS15).

### Follow-up for S2b or S18

On iOS a Keychain item survives an uninstall, so a reinstalled app finds the old refresh token and signs straight back in. The fix is a marker outside the Keychain (removed with the app) that, when missing on launch, clears the Keychain first. Not built in S2a, by the coordinator's decision.

## Seam cost (S2a)

0 agent-days: the sign-in code follows the existing data door rule (running total 0.5).
