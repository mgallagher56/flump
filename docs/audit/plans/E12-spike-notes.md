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

### What S2a assumed before the owner's sign-in

Kept as the record of S2a's assumptions; the answers are in "The owner's real sign-in (S2b)" below. Each question was open, and the code made the assumption below. Each one fails safe: a wrong guess can stop a feature working, but it never signs anyone in wrongly, keeps a token after sign-out or deletes a good one.

| Question | What the code assumes | If the answer differs |
| --- | --- | --- |
| Issuer format | Nothing in the app; the backend accepts only `https://api.workos.com/user_management/<client id>` with `client_id` equal to web's | The backend refuses the token; the app ends the session and clears the device. Native sign-in would then need the verifier to learn the native issuer or client id |
| Refresh token replaced on use, old one refused | Either way works: the newest token is always saved before the new access token is used, and one refresh is shared | No change needed. If reuse also kills the replacement, the single shared refresh already avoids reuse |
| Access token lifetime | Nothing: the app refreshes when the API answers 401 | No change needed |
| Refresh with no client secret | Works (WorkOS docs for a public client with PKCE) | WorkOS answers `invalid_client`, read as `unavailable`: the session is not ended, but once the access token expires the person stays on the offline screen until they sign out. B-B (a backend refresh route) is then built |
| A spent refresh token's answer | 400 or 401 `invalid_grant` | Read as `unavailable`: the token is kept, the offline screen shows, and its Sign out clears it |
| Sign-out redirect | WorkOS accepts `flump://auth/callback` as `return_to` on logout (Android only) | Its page shows an error the person closes. The device is already clear, but the browser's WorkOS cookie may survive, so the next sign-in might skip the password (a shared-phone risk until fixed by allowing the address in the WorkOS dashboard) |
| Password asked again after sign-out | Yes on Android (logout page), yes on iOS (private session) | As the row above |

The owner reads these off the dev-only Sign-in check and the sign-out by hand; the observations list is in the S2a report to the coordinator.

### The owner's real sign-in (S2b)

On 26 November 2026 the owner ran development builds on an Android 17 emulator and an iOS 26.1 simulator and signed in with WorkOS on both, then ran the dev-only Sign-in check. Results were the same on both platforms unless a row says otherwise.

| What | Result |
| --- | --- |
| Issuer | `https://api.workos.com/user_management/<client id>`, web's client id: the format the backend expects |
| Access token claims | `auth_time`, `client_id`, `exp`, `iat`, `iss`, `jti`, `org_id`, `permissions`, `role`, `roles`, `sid`, `sub`. No email or name |
| Access token lifetime | 300 seconds |
| Refresh with no client secret | Accepted |
| Refresh token replaced on use | Yes |
| Old refresh token used again at once | Accepted |
| Replacement after that reuse | Not tried (the check tried it only when the reuse was refused) |
| `GET /v1/user-profile` with the new token | ok: the backend verifier accepts native tokens |
| Close and reopen the app | Still signed in |
| Sign-out, Android | Opens the browser, ends on the marketing site and leaves the window open. Chrome is then signed out of the web app too (one WorkOS browser session) |
| Sign-in after sign-out, Android | The window still shows the marketing page, not the sign-in page. The sign-in completes (closing the window leaves the app signed in), but the window neither shows the right page nor closes |
| Password after sign-out, Android | Not asked: Google was remembered and one tap signed in |
| Sign-out, iOS | Returns straight to the app (no browser) |
| Sign-in, iOS | Email and password every time: the private session keeps nothing |
| Back button on the Sign-in check, iOS | Read "(app)/index" (fixed in S2b: the first screen has a title) |

### The plan's section 5.1 [U] questions, answered

1. **Refresh without a secret:** works. B-B (a backend refresh route) is not needed.
2. **Is a refresh token replaced on use, and the old one rejected at once?** Replaced, yes. Rejected at once, no: WorkOS keeps a 30 second grace period in which the old token returns the same new tokens, and refuses it with `invalid_grant` after that (workos.com/docs/authkit/session-resilience, read 26 November 2026). WorkOS documents no reuse detection that ends the session, and no setting for it. The extended Sign-in check measures both halves; see "Refresh token reuse" below.
3. **How long an access token lasts:** 300 seconds (the dashboard's "Access token duration"). The app does not depend on it: it refreshes on a 401.
4. **The system browser on each platform, and whether sign-out needs the browser:** iOS's private session keeps no cookie, so sign-in asks every time and sign-out needs no browser. Android's Custom Tab shares Chrome's cookies, so a WorkOS session outlives the app's sign-out unless something ends it. Opening the logout page did end it, but WorkOS sent the window to its default Sign-out URI (the marketing site) because `flump://auth/callback` is not a registered Sign-out URI, so the window never came back. What S2b does about it is under "Sign-out on Android" below.

### Refresh token reuse

**What WorkOS does.** A refresh token is replaced on every use. The old one keeps working for 30 seconds and gives back the same new pair ("The grace period is 30 seconds", workos.com/docs/authkit/session-resilience, read 26 November 2026), so two requests racing to refresh both succeed. After 30 seconds it is refused. WorkOS documents no reuse detection (a late reuse does not end the session) and no setting to change either.

**The security consequence, plainly.** Anyone who copies a refresh token can use it for as long as the session lasts, unless the person refreshes first; and if they refresh first, the person's own copy is refused after 30 seconds and the person is signed out, while the copier stays signed in. WorkOS will not notice that two parties used the same token. This is the ordinary risk of any refresh token without reuse detection.

**What the app does about it.** The refresh token is only in the secure store (Keychain or Keystore, "when unlocked, this device only", left out of backups) and never in a log, an error or the screen. Only one refresh runs at a time, and the new token is saved before the new access token is used. Sign-out now revokes the WorkOS session on the server (below), which ends the refresh token everywhere at once; an access token already issued keeps working until it expires (at most 300 seconds). A reinstall on iOS clears the Keychain first. What it cannot do: end a session for someone who loses a phone and never signs out, or sign out with no network. Both are bounded by WorkOS's session timeouts.

**Owner-only setting that tightens it.** The WorkOS dashboard's Sessions tab has "Maximum session length" and "Inactivity timeout" (they apply to web too). The decider suggests 30 days and 14 days; the current values were not visible to agents. This is a suggestion for the owner, not a requirement for the beta.

**Measured, not assumed.** The dev Sign-in check now sends the old token again at once, records whether it gave back the same new token, waits 65 seconds and sends it again, then tries the newest token. Expected from the docs: accepted, yes, rejected, accepted. The owner re-runs it on one simulator (the report's owner list).

**Decider verdict (Fable, 26 November 2026).** Acceptable for the beta, with no app change beyond the server revoke: it is WorkOS's documented behaviour, a replay needs a token that only the secure store holds, and the single shared refresh already suits a grace period. Condition: record a replay after 60 seconds or more being refused, which the extended check does.

### Sign-out on Android

**Why the window stuck.** S2a's sign-out opened `GET /user_management/sessions/logout` with `return_to=flump://auth/callback` in a Custom Tab. `return_to` must be one of the dashboard's "Sign-out URIs" (workos.com/docs/authkit/sessions), and the app's address is not one, so WorkOS sent the tab to its default (the marketing site). The redirect never reached the app, so nothing closed the tab, and expo-web-browser cannot close a Custom Tab on Android ("Users on Android need to manually press the 'x' button", its source). The next sign-in brought that same tab task forward, still on the marketing page, while the new sign-in finished behind it. Whether WorkOS accepts a custom scheme as a Sign-out URI at all is not documented.

**What S2b does instead (Fable decider, 26 November 2026, option b of three).** Sign-out never opens a browser on either platform. The app clears the device first, shows the sign-in screen, then calls a new backend route, `POST /v1/session/sign-out`, with the access token it held. The backend takes the session id only from the verified token's `sid` and revokes it with WorkOS's session revoke API, which needs the API secret and so cannot be called from the app. If the access token has expired, the app refreshes once in memory, never saving, and tries once more. It is best effort and silent: with no network the device is still clear. No dashboard step is needed. An access token already issued keeps passing the backend's check until it expires (at most 300 seconds), as the backend verifies tokens without asking WorkOS; the phone no longer holds it. Rejected: (a) keep the browser logout and register a Sign-out URI, which depends on undocumented custom-scheme support and leaves the window problem on any failure; (c) both.

**Fresh sign-in every time.** Every authorize address now carries `max_age=0` ("A value of 0 forces the user to re-authenticate", get-authorization-url reference), so a WorkOS session left in Chrome never signs anyone in without asking. The decider chose always on, with no marker for "signed out on purpose": sign-in only happens on a first launch, after sign-out or after a session ends, so it costs nothing, and iOS already behaves this way.

**What remains true on Android, and the words that say so.** A Google account signed in to the phone's browser can still sign in with one tap after choosing Google: that is Google's session, which neither Flump nor WorkOS can clear. Sign out now asks first (`ConfirmDialog`). On both platforms it says "This removes your sign-in from this phone. Your data stays in your Flump account."; on Android it adds "If you sign in with Google, the Google account in this phone's browser can sign you back in without a password." The decider also suggested saying that phone sign-out does not sign the web app out; that is left out because the owner saw the opposite with the old logout page, and whether revoking the app's `sid` touches Chrome's session is not yet known (owner re-check).

### Storage rule as built

The refresh token is deleted on sign-out (before any network call), on a rejected refresh (`invalid_grant`), on a fresh token the API refuses, and on sign-out from Not invited or the offline screen. A network failure never deletes it. A read error deletes nothing (changed from the first design on the review's finding that a locked iPhone throws for a good token, approved by the coordinator on 25 November 2026): the app shows the offline screen, and its Sign out clears the value. A sign-out during a refresh drops the late answer unsaved.

### Android backup

Proved from the prebuild output, not assumed: `scripts/check-android-backup.ts` reads the generated manifest and the rule files it names, and fails unless Auto Backup (`full-backup-content`) and Android 12's cloud backup and device transfer all exclude the `SecureStore` shared preferences. It runs in `🤖 Mobile e2e (Android)` and in the device APK workflow. A run on 25 November found `android:fullBackupContent="@xml/secure_store_backup_rules"` and `android:dataExtractionRules="@xml/secure_store_data_extraction_rules"`. What a real backup and restore does on a phone is still a hand check.

### Not verified

iOS (no Mac with Xcode here; the private browser session is configured but not seen), release builds against real WorkOS, and the WorkOS production environment (OS15).

### The Keychain after a reinstall (built in S2b)

On iOS a Keychain item survives an uninstall, so a reinstalled app would find the old refresh token and sign straight back in. S2b keeps a marker in the app's preferences (NSUserDefaults through React Native's `Settings`, removed with the app): when it is missing on launch, the secure store is cleared before it is first read, and the marker is set only once the clear worked (`src/auth/reinstall.ts`). Android needs none: uninstalling removes the app's storage. One side effect: the first launch of the S2b build on a phone that already ran S2a signs out once.

## Seam cost (S2a)

0 agent-days: the sign-in code follows the existing data door rule (running total 0.5).

## Seam cost (S2b)

0 agent-days: the server sign-out call and the version check sit in `src/data`, behind the existing data door rule (running total 0.5).
