# Flump mobile (`@flump/mobile`)

The Expo app for iOS and Android (epic E12). Plan: `docs/audit/plans/E12-mobile-rebuild-plan.md`; what slice S1a found while setting it up: `docs/audit/plans/E12-spike-notes.md`.

Today it signs in (slice S2a, on top of S1a, S1b and S2c): the first screen is sign-in with WorkOS AuthKit in the system browser sheet (PKCE, no client secret), then a signed-in placeholder, or the Not invited, session-ended or offline screen. The refresh token is the only thing stored on the phone, in the secure store ("when unlocked, this device only"); the access token stays in memory; sign-out clears both first, with no network. Around that: the native theme from `@flump/tokens/native` in light and dark (it follows the phone's setting), the first six components in `src/components` (`Text`, `Pressable`, `Button`, `Screen`, `Card`, `FlumpLogo`), and two development-only screens: **Device check**, which runs the engine's tax vectors and the shared formatter fixture on the phone's JavaScript engine, and **Component gallery**, which shows every component in every named state in light, dark and 200% text. A third dev screen, **Sign-in check**, answers the WorkOS questions in plan section 5.1 after a real sign-in, showing no token values. `e2e/` holds the end-to-end harness (S2c): a fixture server standing in for WorkOS and the API, and Maestro flows that CI runs on an Android emulator; see `e2e/README.md`.

## Run it locally

You need the repo's Node (`.node-version`, for example `fnm use`) and Bun 1.4.4.

```bash
bun install
bunx turbo run build --filter=@flump/mobile^...
cd apps/mobile
bun run start
```

The second command builds the shared packages: Metro reads their built `dist` files, so run it again after changing a package.

Then, from the Expo prompt:

- **Expo Go on a phone:** install Expo Go (it must support SDK 58), scan the QR code. The phone and the computer must be on the same network.
- **iOS simulator:** press `i`. Needs a Mac with Xcode.
- **Android emulator:** press `a`. Needs Android Studio with an emulator running.

Switch the phone or simulator between light and dark to see the theme follow it. Tap **Device check** (development builds only) to see "All vectors pass" and "All formatting cases match" with the JavaScript engine named. Tap **Component gallery** to see the components.

Sign-in needs four values, all public configuration, never secrets (Expo puts every `EXPO_PUBLIC_*` value in the bundle): `EXPO_PUBLIC_API_URL` (the backend), `EXPO_PUBLIC_WORKOS_CLIENT_ID` (the WorkOS client id, `client_...`; never an API key), `EXPO_PUBLIC_MARKETING_URL` (the site with the legal pages) and, for the e2e build only, `EXPO_PUBLIC_WORKOS_API_URL` (defaults to `https://api.workos.com`). A missing or unsafe value shows "This build is misconfigured". Expo Go cannot finish a sign-in: it never receives the `flump://auth/callback` redirect, so a real sign-in needs a development build (`bunx expo run:android`). It must be HTTPS in a release build; a development build also accepts plain HTTP to `localhost`, `127.0.0.1`, `[::1]`, `10.0.2.2` (the Android emulator's name for your computer) or a `name.local` address.

The Maestro flow `e2e/flows/engine-check.yaml` checks the device check on a debug Android build. CI's `🤖 Mobile e2e (Android)` job runs it in light and dark; to run it by hand, see `e2e/README.md`.

## A real sign-in on your Android phone

Expo Go cannot finish a sign-in, so this needs a development build of Flump on the phone. Two free routes, no new account. Either way, the app's code comes from Metro on your computer, with your own settings, and nothing secret is ever typed into the app except your password, on the WorkOS page.

**Settings (both routes).** Keep `.env.local` in the main checkout's `apps/mobile`, not in a session worktree: a worktree is removed when its session ends, and the file goes with it. Check out the branch you are testing there, copy `apps/mobile/.env.example` to `apps/mobile/.env.local` (git ignores it) and fill in the three lines. To run against the fixture server instead, follow "By hand" in [`e2e/README.md`](./e2e/README.md): it stops this Metro first and starts one that cannot read `.env.local`.

```text
EXPO_PUBLIC_API_URL=<the staging backend's https address>
EXPO_PUBLIC_WORKOS_CLIENT_ID=<the staging WorkOS client id, starting client_>
EXPO_PUBLIC_MARKETING_URL=<the staging marketing site's https address>
```

The client id is public configuration. Never put the WorkOS API key (it starts `sk_`) here or anywhere in the app. Then build the shared packages:

```bash
bun install
```

```bash
bunx turbo run build --filter=@flump/mobile^...
```

**Route A: download the development APK.**

1. The PR gets the `mobile-device-apk` label. The "📲 Mobile device APK (label)" job builds the APK (about 15 minutes). Its summary shows the file's SHA-256.
2. From that run, download the `flump-dev-apk` artifact (you must be signed in to GitHub), unzip it, and check it on your computer with `shasum -a 256 app-debug.apk`. The result must equal the summary's.
3. Put `app-debug.apk` on the phone (USB, or your own cloud drive) and open it. Android asks to allow installs from that app: allow it for this install. "Flump" installs next to Expo Go.
4. On the computer, in `apps/mobile`: `bunx expo start --dev-client`. On the phone (same Wi-Fi), open Flump: it lists the server, or scan the QR code with the camera.

**Route B: build it yourself with Android Studio.** Install Android Studio (free; it brings the Android SDK). On the phone, turn on Developer options and USB debugging, and connect it by USB. Then, in `apps/mobile`: `bunx expo run:android --device` and pick the phone. Keep the cable in while you test.

**The sign-in.** Tap Sign in, sign in with the test user on the WorkOS page, and you see "You are signed in". Then open **Sign-in check**, tap "Run the sign-in check" once and read out the rows: they show no token values, email or name. Go back, tap Sign out (route A briefly opens the WorkOS page), then tap Sign in again and note whether it asks for your password.

**Removing it afterwards.** Long-press the Flump icon and uninstall it (this removes its stored sign-in too). In Android settings, turn off "Install unknown apps" for the app you opened the APK with (route A) or turn off USB debugging (route B). Delete the downloaded APK and, if you like, `apps/mobile/.env.local`.

With `expo-dev-client` installed, `bunx expo start` offers the development build first; press `s` to switch to Expo Go for the component gallery and the device check.

## Checks

| Command (in `apps/mobile`) | What it does                                                                                                                                  |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `bun run lint`             | Biome                                                                                                                                         |
| `bun run check-types`      | TypeScript 7 over `expo/tsconfig.base`                                                                                                        |
| `bun run test`             | Jest with `jest-expo`, on Node                                                                                                                |
| `bun run export`           | Production export for iOS and Android into `dist` (needs the shared packages built)                                                           |
| `bun run check:bundle`     | Fails if the export contains the device check, the gallery or the tax vectors, or if its source maps show a package bundled from two installs |
| `bun run doctor`           | `expo-doctor`, tolerating only its same-version duplicate finding from Bun's isolated linker (see `scripts/run-expo-doctor.ts`)               |

CI runs all of these in the `📱 Mobile checks` job on GitHub's Linux runners. It does not build a native app or run an emulator: the separate `🤖 Mobile e2e (Android)` job does, and proves Hermes at runtime on Android. Nothing in CI proves iOS.

## Rules

Colours, sizes and type come from `useTheme()` (never a hex or rgb value); figures come from `@flump/finance-engine` and are formatted by `@flump/format` (no money maths here). `check:laws` scans `app/` and `src/` with every UI check: raw colours, tabular numbers, style literals, icons, number inputs, tax formulas and copy. `ios/` and `android/` are generated by `expo prebuild` and never committed.

- **Components** live in `src/components/<Name>/` with five files: `Name.tsx`, `Name.styles.ts` (a StyleSheet factory that takes the theme), `Name.test.tsx`, `Name.states.ts` (named prop sets for the gallery and the tests, in place of Storybook) and `index.ts` (AGENTS.md section 1).
- **Raw primitives:** outside `src/components`, Biome refuses React Native's `Text`, `Pressable` and `TextInput`. Use the app's own: they keep text scalable, targets at least 48 points and every control named.
- **The data door:** only `src/data` may import `@flump/api-client` or call `fetch` (O5 seam 2). It holds the WorkOS token calls, the API client and the account check.
- **Tokens:** only `src/auth/tokenStore.ts` touches the secure store, and only for the refresh token. No token value goes into a log, an error message or the screen (`src/auth/noTokenLeaks.test.ts`). It is deleted on sign-out, a rejected refresh and a fresh token the API refuses. A read the store refuses (an iPhone still locked, or a value that can never be decrypted) deletes nothing: the app shows the offline screen, whose Sign out clears it (coordinator, 25 November 2026).
- **200% text:** each component's test renders every state from its `.states.ts` at a text scale of 2 and checks nothing would clip. The look on a real phone is a hand check.
