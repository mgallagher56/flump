# E12 Mobile rebuild: implementation plan

Revision 4, 2026-11-25. Written against `origin/main` at `a0805b08`. Revision 3 (2026-11-14) is in git history at `a0805b08`; this revision replaces it.

Decisions: open. O1 (framework) and O5 (where data lives) were decided on 25 November 2026; O2 and O4 keep the defaults on record; the open items are in section 10.1. Slices S1a, D1, B-A and P5 touch none of the open items and can start now.

## State of the plan

| Question | Answer |
| --- | --- |
| What is decided | O1: Expo for iOS and Android (owner, 25 November 2026). O5: the server stays the one home for finance data, built so an encrypted mode stays possible later (Fable decider at the owner's delegation, 25 November 2026). Both are in `DECISIONS.md`. The rulings R1 to R6 of 14 November are in `DECISIONS.md` round 10. |
| What can start now | S1a (project skeleton and CI), and beside it D1 (value map field), B-A (clock tolerance) and P5 (shared copy package, web only). None needs anything from the owner. |
| What blocks later slices | S2a: owner step OS1 (a redirect address and a test user in the WorkOS dashboard), best requested now because it gates the largest risk (R3). S19: owner steps OS3 to OS8 and OS12 to OS16 (accounts, fees, signing, submission keys). S7: nothing now that O4 keeps its default. |
| What already exists | The shared packages: `@flump/tokens` with a generated native theme, `@flump/format`, `@flump/api-contract`, `@flump/api-client`, `@flump/finance-engine` (now with the check-in rules), and the `/v1` API with deletion, export and the client policy route. Section 3. |
| How it stays current | [E12-mobile-parity-log.md](./E12-mobile-parity-log.md) records each web change a mobile user would notice. This plan is re-read against `main` before each slice is specified in full. |

**Goal:** a new `apps/mobile` Expo app for iOS and Android that does what the Flump web app does, signed in through the real WorkOS flow, using the shared maths, formatting, API contract and design tokens, so web, marketing and mobile feel like one product.

**Companions:** [E12-feature-inventory.md](./E12-feature-inventory.md) (written 2026-11-11, out of date: P4), [`docs/ux/CROSS-PLATFORM.md`](../../ux/CROSS-PLATFORM.md), [`docs/ux/UX-GUIDELINES.md`](../../ux/UX-GUIDELINES.md), [`docs/ux/STYLE-GUIDE.md`](../../ux/STYLE-GUIDE.md), [`docs/copy/COPY-GUIDE.md`](../../copy/COPY-GUIDE.md), [`docs/api/versioning.md`](../../api/versioning.md), [E34-shared-finances-research.md](./E34-shared-finances-research.md).

**Confidence tags.** **CODE** means read in the repo at the commit above. **CONFIRMED** means read in a primary source on 25 November 2026, which is named. **[U]** means not confirmed; the text says where to check.

## What was stale in revision 3

Each item was checked against `origin/main` at `a0805b08`.

| # | Revision 3 said | Now (CODE unless marked) | Effect |
| --- | --- | --- | --- |
| 1 | O1 framework open, blocks a start | Decided: Expo (owner, 25 November) | S1a can start |
| 2 | `apps/mobile-companion` is parked; S20 deletes it | Deleted in #827. No Expo or React Native version is pinned anywhere in the repo now | S20 is removed. S1a picks the SDK with no old pin to match |
| 3 | P2: the web check-in walk-through not merged | Merged (#709, #727). `CheckInSheet` is replaced by `CheckInStep`, `CheckInCard`, `CheckInSummary` | S3 copies a shipped flow |
| 4 | P3: the check-in builders must move to the engine | Done. `packages/finance-engine/src/check-in.ts` holds the steps, order, calculated figure (`calculateCheckInBalance`), answers, payloads and summary; the server recomputes a `calculated` value and rejects one that differs. Web re-exports them from `apps/web/app/features/snapshot/checkInModel.ts` | S3 has no prerequisite move |
| 5 | B-A: client policy route and clock tolerance both open | `GET /app/client-policy` is built (`apps/backend/src/config/client-policy.config.ts`, contract `packages/api-contract/src/domains/app.ts`). The verifier still passes no clock tolerance | B-A shrinks to the clock tolerance |
| 6 | `NAV_BREAKPOINT` is 1024px; R4 not on web | `NAV_BREAKPOINT` is `48rem` (768px), built in #704 and #710 | R4 is web behaviour now |
| 7 | Tabs: Home, Accounts, Budget, Tax and pay, More | `BOTTOM_BAR_TABS` is Home, Accounts, Budget, Pay, then a More button | Mobile tab labels follow web: "Pay" |
| 8 | Palette is Direction C (teal, sand, charcoal) | Midnight (dark) and Mint (light) replaced it on 24 November (`DECISIONS.md`; `docs/ux/STYLE-GUIDE.md` section 14) | Mobile takes whatever `@flump/tokens/native` generates; no palette words in this plan |
| 9 | R1 to R6 to be recorded; doc edits listed in section 11 | Recorded in `DECISIONS.md` round 10. CROSS-PLATFORM, UX-GUIDELINES E2, the copy guide tagline and AGENTS.md section 10 (parity rows) are updated | Old section 11 is removed except the native file set wording (10.3) |
| 10 | The tagline is "Flump: finance without the fog" | Same, fixed wording in `COPY-GUIDE.md` section 2.1 | No change |
| 11 | Web pages listed for parity | Web has since gained Retirement (E33), invoicing (E37), mortgage estimates (E39), imports, beta invites and the joint marker on accounts (E34 C1, C2) | P4, the feature inventory rewrite, matters more; new parity slices S21 to S23 |
| 12 | Legal pages wait for a solicitor | Live on the marketing site since 25 November (E19): `/privacy`, `/terms`, `/cookies` and `/accessibility`, written by Fable and approved by an independent Fable reviewer at the owner's delegation, not reviewed by a solicitor. Web Settings links all four. None of them mentions a mobile app yet | The sign-in screen and S9 link them; S19 adds the app to the privacy notice, cookies page and data map before submission (section 8) |
| 13 | Exact to be re-checked at the next revision | Re-checked today: still pre-1.0, no release, no React layer (CONFIRMED, github.com/expo/exact README) | `docs/technology-watch.md` updated |
| 14 | `createApiClient` has no caller | Still true | S2b is its first caller |
| 15 | Subagent models | AGENTS.md section 6 (tiers moved up on 13 November) | Section 2 updated |
| 16 | The check-in stores only finished months | A started check-in is stored (25 November): saves sent with `checkIn: true` write a started `snapshot_checkins` row, `GET /snapshots/check-ins` returns `latestStartedMonth`, and Home says "Continue check-in" when the engine's `selectCheckInPartDone` says so | S3 sends `checkIn: true` and labels the way in the same way |

---

## 1. Owner rulings and scope

### 1.1 Rulings

Rulings R1 to R6 of 14 November 2026 stand as recorded in `DECISIONS.md` round 10. In short: R1 net worth follows the user's two choices (property, student loan) and the app shows the figure from `GET /v1/portfolio-snapshot`, which must itself come from the engine's net worth basis (`packages/finance-engine/src/net-worth-basis.ts`) under O5 seam 1, checked in S5; R2 bank sync waits until Flump has revenue; R3 the monthly check-in walks through each account and is the app's most important flow; R4 the tab bar is for phones, with a header menu button and a theme toggle; R5 loading appears after about 200ms and stays at least about 400ms; R6 the tagline.

### 1.2 Scope

**First store release:** sign-in, the monthly check-in, Home, Accounts and account detail with history, adding and editing accounts, settings (profile, net worth choices, theme, export, delete account), offline reading. Slices S1a to S9, then S18 and S19.

**Full parity:** every page of the web app. Slices S10 to S17 and S21 to S23.

**Out of scope:** bank linking (R2); push notifications (O3); offline editing; widgets, watch, tablet layouts, in-app purchases, marketing pages; CSV import (mobile links to the website); a device-only mode (O5).

---

## 2. Rules every slice inherits

Copied from AGENTS.md, the `docs/ux` documents, the copy guide and the owner decisions. Where they disagree with this list, they win.

**Process**

- Read first: `AGENTS.md`; `docs/ux/CROSS-PLATFORM.md`; the UX-GUIDELINES sections for the screen; STYLE-GUIDE section 12 for each component; the copy guide for any words.
- One slice is one PR. No stacking.
- Local checks before a push: `rtk bun run lint`, `rtk bun run check-types`, `rtk bun run check:laws`, and the tests of the packages touched. CI runs the rest.
- Subagent models follow AGENTS.md section 6: `opus` for code and all review, `sonnet` for mechanical work, `fable` for plans and complicated decisions. Auth, security, data handling and money stay on `opus`.
- Every PR that adds or changes a screen runs the CROSS-PLATFORM section 7 checklist and adds a parity log row where needed.

**Money and data**

- No money maths in the app. Every figure comes from `@flump/finance-engine` or the backend. A check fails on tax thresholds written as literals in `apps/mobile`.
- **O5 seam 1:** no figure exists only on the server. If a slice needs a figure that only a backend service computes, the computation moves into the engine first and the server calls it.
- **O5 seam 2:** screens reach data only through `src/data/` (the `@flump/api-client` instance and one query key factory). A Biome rule forbids `fetch` and `@flump/api-client` imports outside `src/data/`.
- Tax years use the clock-injectable family in `packages/finance-engine/src/uk-tax-year.ts`.
- Every figure is formatted by `@flump/format`, with tabular numerals. Unknown shows "Not set", never 0. A failure never renders as empty or zero. Saved data shown offline carries its age.
- Headline figures read saved data only. What-ifs live in a `ScenarioZone` labelled "Illustration, not saved" and never write.

**Look and words**

- Colours, sizes, radii, shadows and durations come from `@flump/tokens/native` through `useTheme()`. No hex or rgb literal in `apps/mobile`. The palette is Midnight (dark) and Mint (light) since 24 November 2026, replacing Direction C; teal is the brand colour, apricot is debt, red is for errors and destructive actions only.
- One headline figure per screen, in a `HeroFigure`, the same figure as the web page (table in `docs/design/e16-polish/PLAN.md` section 2). At most 4 figures in the first view and 12 before any disclosure.
- Never judge anyone's finances. No "only" or "just" about money, no alarm colour or warning icon on an ordinary balance, no streaks, points or confetti, no comparison with other people, nothing that ranks renting below owning. A missed month is never mentioned.
- Words follow the copy guide: plain, sentence case, en-GB, no exclamation marks. One approved word per idea ("debts", "what you own", "left over each month", "estimate"). Fixed notices come from `packages/finance-engine/src/disclaimers.ts` and are never reworded.
- Facts, not recommendations (`docs/compliance/advice-boundary-policy.md`).

**Platform**

- Native chrome: stack headers, the back gesture never blocked, native sheets and pickers, platform alerts for destructive confirmation, edge to edge on Android.
- Touch targets at least 48 by 48. Text follows the system size; layouts hold at 200% text and 320 points wide.
- Every pressable has a role and a label. Motion honours Reduce Motion.

**Security**

- No mock tokens or mock fallbacks in `apps/mobile`; `scripts/check-no-mock-auth.sh` covers it.
- The refresh token lives only in the secure store, readable when unlocked and on this device only; the access token only in memory. No secret in the bundle.
- A network failure never ends a session. A session ends when the token endpoint rejects the refresh token, or a request gets a second 401 after a successful refresh.
- Destructive actions go through `ConfirmDialog`.

**Component files.** Each component lives in its own PascalCase directory with `X.tsx`, `X.styles.ts` (a StyleSheet factory that takes the theme), `X.test.tsx`, `X.states.ts` (named prop sets for the gallery and tests, in place of a Storybook file) and `index.ts`. The AGENTS.md wording is approved in S1 (10.3).

### The failures most likely to ship by accident

Each is pinned by a test in the slice named.

1. A failed request or no network shown as "no accounts yet" (S3, S5).
2. A cold start with no network wiping saved data or ending the session (S7).
3. A 401 signing the user out, or many 401s causing many refreshes (S2b).
4. A missing number shown as 0 (S3 and every calculator slice).
5. Sign-out or deletion leaving data or a working token on the device (S2b, S9).
6. A check-in that saves a guess (S3).
7. The offline cache restored onto another device from a backup (S7).

---

## 3. What exists today

All **CODE** at `a0805b08`.

| Thing | State | Left for mobile |
| --- | --- | --- |
| `@flump/tokens` | `packages/tokens`: authored tokens, `scripts/build-native-tokens.ts`, the committed `src/native.generated.ts` exported as `@flump/tokens/native` (light and dark colours, shadows, spacing, radii, sizes, type, durations, easings, breakpoints), with drift and contrast tests. Now Midnight and Mint | The mobile-only contrast pairs (placeholder, disabled, tab icon states); literal scans extended to `apps/mobile` |
| `@flump/format` | Currency, percent, dates, tax years, durations; a shared fixture run on V8 and JavaScriptCore | Run the fixture on Hermes, iOS and Android (S1a) |
| `@flump/api-contract` | Zod schemas by domain, the route manifest including `app/client-policy`, the error body, pagination, headers, a guarded `openapi.json` | Nothing before S2b |
| `@flump/api-client` | `createApiClient({ baseUrl, getAccessToken, onUnauthorised, client, fetch, timeoutMs })`: `/v1`, response validation, one shared refresh per burst of 401s, `X-Flump-Client`, `getClientPolicy()`. No caller yet | First caller in S2b |
| `@flump/finance-engine` | All maths. Now includes the check-in rules (`check-in.ts`, `check-in-day.ts`), net worth basis, snapshots, the picture, joint shares (`joint-share.ts`), disclaimers | Run its vectors on Hermes (S1) |
| Backend API | `/v1` stable surface; strict bodies; one error body; cursor pagination; `Idempotency-Key` on creates and `If-Match` on updates; client policy route | B-A: clock tolerance |
| Erasure and export | `apps/backend/src/modules/privacy/`: immediate deletion after a typed phrase with recent sign-in, tombstone, write fence, JSON and CSV export, registry of every table | Mobile screens (S9) |
| Web navigation | `navConfig.ts`: `BOTTOM_BAR_TABS` (Home, Accounts, Budget, Pay) and a More button | S4 test that mobile matches |
| Web copy | Feature copy lives in `apps/web/app/features/*/…Copy.ts`, which mobile cannot import. Fixed notices are in the engine | P5 |
| CI | `.github/workflows/ci-pipeline.yml`: lint and types, Vitest, build, Storybook a11y, E2E smoke, Docker, audit; advisory visual and a11y workflows | `mobile-checks` (S1a) and `mobile-e2e-android` (S2c) |
| Versions | React 19.3.1 (exact pins; `packages/ui` declares the range `^19.2.3`), TypeScript 7.0.2, Bun 1.4.4; `bunfig.toml` holds a 7-day release-age gate | S1a records the SDK and keeps one React |

---

## 4. Technology

### 4.1 Framework (decided: O1)

**Expo with React Native, a development build (not Expo Go), Hermes, Expo Router, EAS Build and Submit.**

Facts, CONFIRMED on docs.expo.dev on 25 November 2026:

- The current SDK is 58 (15 October 2026), with React Native 0.88 and React 19.3.0. It needs iOS 16.4 or later (Xcode 26.4 or later) and Android 7 or later. The New Architecture is always on and cannot be turned off since SDK 55.
- Metro configures itself for a monorepo from SDK 52 when `metro.config.js` uses `expo/metro-config`. Bun workspaces are supported through `workspaces`. Isolated installs are supported from SDK 54, though some libraries may fail with them, and the docs give no hoisted fallback for Bun. Only one copy of React and React Native is allowed.
- Expo Router's version matches the SDK. Routes are typed automatically. Native tabs import from `expo-router/native-tabs` from SDK 58.

**[U] to settle in S1a:** whether SDK 58 accepts the repo's React 19.3.1 or wants 19.3.0 exactly (`expo-doctor` says; one React version is a law, AGENTS.md section 9); whether the repo's Bun install is isolated or hoisted; which export condition Metro picks for the shared packages (`module` points at `src`); whether TypeScript 7 works with Expo's base config. The release-age gate means SDK patch releases arrive a week late, which is fine.

Exact was re-checked on 25 November and is not a candidate (`docs/technology-watch.md`).

### 4.2 Project layout in the monorepo

```text
apps/mobile/                 @flump/mobile, a Bun workspace like apps/web
  app.config.ts              name, scheme "flump", bundle ids, plugins
  eas.json                   profiles: development, e2e, preview, production
  metro.config.js            expo/metro-config, nothing custom unless S1a proves it is needed
  app/                       Expo Router routes only, thin files that render a screen
    _layout.tsx              providers: theme, session, query client
    (auth)/sign-in.tsx
    (app)/_layout.tsx        session gate, tab bar
    (app)/(tabs)/{index,accounts,budget,pay,more}.tsx
    (app)/page/[key].tsx     a More page, also flump://page/<key> (S4)
    (app)/check-in.tsx
    (dev)/{gallery,engine-check}.tsx   left out of production builds
  src/
    config.ts                checked public config (API address, WorkOS client id, scheme)
    auth/                    PKCE, token store, session machine, sign-out
    data/                    the one data door: api client, query keys, cache (O5 seam 2)
    features/<name>/         hooks and reducers per feature
    screens/<Name>/          screen components
    components/<Name>/       primitives, five files each
    theme/                   ThemeProvider and useTheme over @flump/tokens/native
    copy/                    mobile-only words
  e2e/flows/                 Maestro flows
  e2e/fixture-server/        canned /v1 and a WorkOS stand-in, built from the contract schemas
```

The generated `ios/` and `android/` folders are not committed (continuous native generation). Docker images copy the new manifest and do not install it, as for any workspace that is not filtered in.

### 4.3 What is shared and what is not

| Shared, imported as is | Not shared |
| --- | --- |
| `@flump/finance-engine`: every figure, the check-in rules, the net worth basis, disclaimers | `@repo/ui` and Panda CSS: web only. Mobile has its own components with the same names, variants and states (CROSS-PLATFORM section 3) |
| `@flump/api-contract`: schemas and types; forms validate with them | React Router loaders and actions, the web proxy, cookies |
| `@flump/api-client`: transport, refresh, errors | Storybook: replaced by `X.states.ts` and the dev gallery |
| `@flump/format`: every figure and date | Web feature copy modules, until P5 moves the shared flows |
| `@flump/tokens/native`: the generated theme | Playwright: replaced by Maestro |
| Fixed wording: the engine's disclaimers; the tagline | The marketing site |

**P5, shared copy.** When a mobile slice needs words a web flow already uses (first S3, the check-in words in `apps/web/app/features/snapshot/snapshotCopy.ts`), that copy module moves to a new `packages/copy` workspace, imported by both apps, in the same PR. No mobile slice copies web words by hand. `scripts/check-copy.ts` is extended to the new package.

### 4.4 Navigation

Expo Router, file based. `(auth)` for sign-in; `(app)` for the signed-in app with a tab bar whose entries, order and icons equal web's `BOTTOM_BAR_TABS` plus More: **Home, Accounts, Budget, Pay, More**. More is an ordinary fifth tab that opens our own list (the pages web's drawer lists, plus Settings and Connect AI), not the system overflow. S4 chose the JavaScript tab bar with our own `TabBar` over native tabs (`expo-router/native-tabs`): its roles, targets and large-text layout can be tested in Jest, which native tabs cannot (9.7).

Under R4 each top-level screen's header has a menu button that opens the More list, and a light and dark toggle. Both the menu button and the More tab stay (S4, 10.3); the toggle comes with S9.

Deep links use the `flump://` scheme and, later, universal and app links on the website's domain. A link opened while signed out resumes after sign-in and never performs a write.

### 4.5 State and data

TanStack Query for server state; React context for session and theme; local state for forms. Query keys from one factory in `src/data/queryKeys.ts`. Retries twice on `unavailable` and `server` only. A 401 is handled inside `@flump/api-client`.

The app calls `/v1` directly with a bearer token. Creates send an `Idempotency-Key`; updates send `If-Match` and treat 412 as "this changed elsewhere, reload". Money is a JSON number in pounds.

### 4.6 Where data lives (decided: O5)

**The server is the one home for finance data. The phone is a client of the same `/v1` API as web, with an encrypted read-only cache.** Decided by a Fable decider at the owner's delegation; the record, reasons, triggers and marketing limits are in `DECISIONS.md` (25 November 2026). In three lines: the check-in across web and phone, couples sharing (E34), the AI connection and future bank sync all need a server that can read the data; a device-only app loses its history with the phone and splits the product; four cheap seams keep an opt-in encrypted mode possible later.

The four seams, and where each lands:

| Seam | Rule | Lands in |
| --- | --- | --- |
| 1 | No figure only on the server; the engine computes, the server may check | Section 2 rule; every slice's review |
| 2 | One data door: only `src/data/` talks to the API | S1b Biome rule; S2b and S3 follow it |
| 3 | `docs/system/value-map.yaml` gains a field per value: does the server need to read it (sharing, AI connection, bank) or only store it | Slice D1, filled in as slices touch values |
| 4 | Cache encrypted with a device-only key, out of backups, cleared on sign-out | S7 |

**Seam budget.** The decision drops the seams if they cost more than about 5 agent-days in all. Each slice that does seam work states its share in its PR description under "Seam cost", and the plan keeps a running total here. Estimate today: seam 1 is a review rule (0), seam 2 is a lint rule in S1b (0.5), seam 3 is D1 (1), seam 4 is the part of S7 beyond a plain cache (1.5): about 3 in all. If the running total passes 5, the coordinator stops the seam work and records the app as plain option (a) in `DECISIONS.md`.

Running total: 0.5 agent-days (S1a 0; S1b 0.5, the data door rule in `biome.json`; S2c 0; S2a 0; S3 0; S2b 0).

**The cache (S7).** The last successful responses for the screens in the first release, kept 7 days, labelled with their age, read-only; writes need a connection (round 2, E12 D4-A). Platform facts, CONFIRMED on 25 November 2026:

- `expo-secure-store` uses the Keychain on iOS and Keystore-encrypted storage on Android. `keychainAccessible` defaults to "when unlocked" and has "this device only" variants; this-device-only items do not move to a new device. Some iOS versions refused values over about 2048 bytes, so the store holds keys and tokens only (docs.expo.dev/versions/latest/sdk/securestore).
- On Android, secure store data is left out of Auto Backup automatically when the app has no custom backup config. Auto Backup otherwise copies up to 25 MB per app to Google Drive, end-to-end encrypted on Android 9 or later when a screen lock is set (developer.android.com/identity/data/autobackup).
- On iOS everything in the app container except `tmp` and `Library/Caches` is backed up unless marked excluded (Apple documentation).
- `expo-sqlite` can be built with SQLCipher (`useSQLCipher` in its config plugin), opened with `PRAGMA key`. Without SQLCipher in the build the key does nothing silently, so a test checks `PRAGMA cipher_version` (docs.expo.dev/versions/latest/sdk/sqlite).

So S7 uses SQLCipher with a random key kept in the secure store as "when unlocked, this device only", puts the database file in an excluded location on iOS, and adds an Android backup rule that leaves it out. A backup restored to a new phone carries no usable cache, which is the intent: the new phone signs in and fetches.

**Lost or replaced phone.** Sign in on the new phone; everything is on the server. Nothing to restore.

### 4.7 Forms and money entry

react-hook-form with the contract's Zod schemas. One `CurrencyInput` and one `PercentInput` with the decimal pad, tolerant parsing, formatting on blur from `@flump/format`. Blank is sent as absent.

### 4.8 Charts

`react-native-svg` with `d3-shape` and `d3-scale` behind a small charts module. Every chart has a one-sentence summary, a "Show data" list, direct labels, dashed forecasts, at most three series and at least three points.

### 4.9 Updates and compatibility

- Over-the-air updates stay on the preview channel; a change to how money is shown goes through store review (round 2, D11-A). EAS Update's free plan covers 1,000 monthly active users (CONFIRMED, expo.dev/pricing).
- The app checks `GET /v1/app/client-policy` on launch and on return to the foreground; below the minimum it shows "Update required" with a store link; if the check fails it carries on.
- Within `/v1` changes are additive (`docs/api/versioning.md`). An unknown account type is shown neutrally with "Update the app to see this".

---

## 5. Sign-in with WorkOS on mobile

### 5.1 Facts

**CODE**

- Web signs in with `@workos-inc/authkit-react-router` and forwards the access token to the backend as a bearer token.
- The backend verifier (`apps/backend/src/auth/workos-jwt.verifier.ts`) checks RS256 against the WorkOS key set, requires `exp` and `sub`, accepts one issuer, and requires the `client_id` claim to equal the configured client id. So native tokens must carry web's client id, or the verifier must learn a second one. That a native PKCE sign-in on web's client id works is [U], settled in S2a.
- The verifier passes no clock tolerance (B-A).
- `BackendError` has a `not-invited` kind for the closed beta.
- Deletion and reset need a typed phrase and a recent sign-in.

**CONFIRMED (workos.com/docs, read 25 November 2026)**

- WorkOS has no React Native or Expo SDK or guide. The app uses the AuthKit API directly with PKCE.
- The code exchange accepts no client secret when a `code_verifier` is sent.
- A custom scheme redirect registered in the dashboard is shown in WorkOS's Android documentation.

**Answered on the owner's devices, 26 November 2026** (an Android 17 emulator and an iOS 26.1 simulator; detail and evidence in [E12-spike-notes.md](./E12-spike-notes.md), "The owner's real sign-in (S2b)"): refresh needs no secret, so B-B is not needed; the refresh token is replaced on use, and WorkOS accepts the old one for a 30 second grace period, then refuses it, with no reuse detection; an access token lasts 300 seconds; iOS's private sheet keeps nothing, Android's Custom Tab shares Chrome's WorkOS session, and sign-out no longer uses the browser (S2b). The questions as first asked:

**[U] (as asked before S2a): settled at the start of S2, before code**

- Refresh without a secret. The API reference lists `client_secret` as required for the refresh grant, while the iOS SDK documentation describes a public client refreshing without one. S2a tries it against the WorkOS test environment. If it is refused, B-B (a backend route that holds the secret and refreshes for the app) is built first.
- Whether a refresh token is replaced on use and the old one rejected at once.
- How long an access token lasts.
- How the system browser sheet behaves with a private session on iOS and Custom Tabs on Android, and whether signing out needs the browser.

### 5.2 Flow and states

1. The app opens the WorkOS sign-in page in the system browser sheet (`expo-web-browser` auth session) with a PKCE challenge and a `state`. It never sees the password.
2. It checks `state`, exchanges the code with the verifier, keeps the access token in memory and the refresh token in the secure store ("when unlocked, this device only").
3. Sign-out wipes the device first (secure store, cache, preferences, memory) without needing the network, then asks the backend to revoke the WorkOS session (`POST /v1/session/sign-out`; S2b). No browser opens. Every sign-in sends `max_age=0`, so WorkOS asks again even when the browser still holds a WorkOS session.

States: `loading`, then `signedOut`, `signedIn`, `restoredOffline` (refresh token present, no network: read the cache, no writes), `sessionEnded` (refresh rejected; device cleared), `notInvited`. A 401 triggers one shared refresh and one retry; a second 401 or a rejected refresh ends the session; a network failure does not. A new refresh token is saved before the new access token is used.

### 5.3 Transport and privacy

- HTTPS only in release builds; plain HTTP only to named local hosts in development and e2e builds. `src/config.ts` stops with "This build is misconfigured" on bad values.
- CI searches the production bundle for secrets, mock tokens, local addresses, the fixture address and dev-only routes.
- No tokens, balances or profile fields in release logs. Sentry as approved (round 3, item 7): no replay, no personal data.
- Privacy mode hides amounts; the app switcher shows a covered screen; device lock (Face ID, fingerprint) is optional and never a way to sign in.

### 5.4 Backend tickets

- **B-A (small, not blocking S1 to S3):** a 30 second clock tolerance in the verifier, with tests either side. The client policy route is already built.
- **B-B (only if S2a shows it is needed):** a refresh route holding the secret.

---

## 6. Accessibility and the theme on native

- Target WCAG 2.2 AA, read for apps as in WCAG2ICT.
- `ThemeProvider` reads `@flump/tokens/native` light and dark sets, follows the system scheme by default, remembers a three-way choice (System, Light, Dark) and the header toggle switches light and dark. No flash of the wrong theme on launch: the stored choice is read before the first screen renders.
- Token contrast is already tested on the generated values. The S1b components draw only pairs the shared matrix already checks (each button label on its fill, text and status text on every surface, the muted label on the disabled fill); the mobile-only pairs (placeholder, tab icon states) arrive with the input and the tab bar that use them.
- Each slice's acceptance: 200% text and 320 points wide with nothing clipped; VoiceOver and TalkBack reach and name every control in order; Reduce Motion removes slides and shimmer; nothing needs dragging.
- Recalculated results are announced without moving focus; in a scenario the announcement starts with "Illustration:".
- The dev gallery renders every component in light, dark and 200% text from `X.states.ts`. It and the engine check screen are left out of production builds, proved by the bundle search.
- Full audits on real devices in S18.

---

## 7. Testing and CI

### 7.1 Layers

| Layer | Tool | Runs where | Paid minutes |
| --- | --- | --- | --- |
| Shared logic | Vitest in the packages (exists) | CI, Linux | None |
| Components, screens, session machine, check-in flow | Jest with `jest-expo` (needs Jest 30 from SDK 58, CONFIRMED docs.expo.dev) and React Native Testing Library | CI `mobile-checks`, Linux | None |
| Bundle | `expo export` for iOS and Android, then the bundle search | CI `mobile-checks`, Linux | None |
| Project health | `expo-doctor` | CI `mobile-checks` | Same-version duplicates; an SDK release under 7 days old warns (26 November 2026) |
| Engine on device | Dev-only engine check screen plus a Maestro flow | Android emulator in CI; iOS simulator by hand | None |
| End to end | Maestro CLI (free, open source) against the fixture server | Android emulator on a GitHub Linux runner, on PRs touching `apps/mobile` or the shared packages; iOS by hand on a Mac | None [U] |
| Accessibility | Per-screen assertions, token contrast matrix, manual pass per slice, audits in S18 | CI and by hand | None |

Maestro Cloud costs $250 per device per month and its official GitHub Action needs it (CONFIRMED, maestro.dev/pricing), so it is not used. Running Maestro on an Android emulator on a free GitHub runner is described only in a Maestro article, not the docs [U]: S2c proves it, three green runs in a row, or falls back to a manual Android pass recorded in each PR. Standard GitHub-hosted runners are free for public repositories [U, check docs.github.com billing before S2c].

The fixture server serves canned `/v1` responses built and checked with the contract schemas, and a WorkOS stand-in that issues test tokens, including expired and rejected ones. An `e2e` build profile points at it; the sign-in code has no test branch.

### 7.2 Builds without paid minutes

- **CI never runs EAS Build.** Every PR check above runs on GitHub's Linux runners. The e2e Android app is built in the job with Gradle (`expo prebuild` and a debug build) [U, S2c proves the time fits].
- **EAS free plan** (CONFIRMED, expo.dev/pricing and docs.expo.dev/billing/plans): 15 Android and 15 iOS builds a month at low priority, at most 1 macOS build at a time. Enough for internal test builds by hand or on a tag. The next plan is $19 a month with $45 of build credit and high priority.
- **Local builds:** `eas build --local` runs on macOS or Linux (iOS needs a Mac with Xcode, fastlane and CocoaPods), one platform at a time, with no caching and no secret environment variables (CONFIRMED, docs.expo.dev/build-reference/local-builds). The docs do not state that local builds use no credits [U].

---

## 8. Store and signing

- **Profiles.** `development`, `e2e`, `preview` (internal), `production` (store).
- **Distribution.** iOS through TestFlight and Android through Play internal testing first. A personal Play account created after 13 November 2023 must run a closed test with at least 12 testers opted in for 14 days in a row before production (CONFIRMED, Play Console help 14151465). An organisation account does not have this rule [U].
- **Apple.** Apps that let people create an account must let them delete it in the app (Guideline 5.1.1(v), CONFIRMED). The Developer Program costs US$99 a year; organisation enrolment needs a D-U-N-S number (CONFIRMED, developer.apple.com). A login needs a reviewer account with sample data. Money management apps are expected to come from the organisation that provides the service, which is why an organisation account is on record (round 3).
- **Google.** US$25 once. Every app completes the Financial features declaration, even with none; budgeting and net worth trackers are not named in its categories, so "no financial features" looks likely [U] (CONFIRMED that the form is required, Play Console help 13849271).
- **Signing.** EAS can hold the iOS certificates and the Android upload key. Who holds the keys is an owner step (OS6). The Play app signing key is held by Google after enrolment [U].
- **Identifier.** `io.github.mgallagher56.flump` unless the owner has a domain by then. It cannot change after a listing exists (OS2).
- **Versioning.** `apps/mobile` joins `release-please-config.json`. A release PR does not publish a build; a tag or a manual run does.
- **Gates before any store submission.** The privacy notice and terms are hosted (E19, 25 November); before submission the privacy notice, the cookies page and `docs/legal/data-map.md` gain the app: the sign-in tokens in the secure store, the encrypted 7-day cache, and what the stores and Expo collect [U: whether PECR treats the cache as strictly necessary]; in-app deletion working end to end; privacy labels and the Play data safety form matching what the app collects, and saying the data is stored on Flump's servers (O5); no bank or encryption claims beyond the O5 marketing list; the S18 audits passed.

---

## 9. Slices

Each slice is one PR. Sizes are rough agent-days. "Depends on" names slices, backend tickets (B-), owner steps (OS, section 11) and prerequisites (P).

### 9.1 The list

| Slice | What it delivers | Depends on | Size |
| --- | --- | --- | --- |
| **S1a** | Project skeleton, Metro and Bun proof, theme provider, shared packages proved on Hermes, CI `mobile-checks`, spike notes | Nothing | 3 |
| S1b | First six components, dev gallery, law script extensions, Biome rules (raw primitives, the data door), AGENTS.md native file set | S1a | 3 |
| D1 | Value map field for "server must read" (O5 seam 3), filled for the values S1 to S9 touch | Nothing | 1 |
| B-A | Backend: clock tolerance in the verifier | Nothing | 1 |
| P5 | `packages/copy` with the check-in words moved from web; web-only PR | Nothing | 1 |
| S2a | WorkOS spike answers (dev-only sign-in check) plus sign-in: PKCE, token store, session machine with refresh, sign-in, Not invited and session-ended screens, five Maestro flows; B-B raised if needed. Widened by the coordinator on 25 November 2026 | S1a, S2c, OS1 | 4 |
| S2b | What S2a left: update-required screen, `ErrorState` and `ConfirmDialog`, the iOS Keychain wipe after a reinstall, the hand checks on real phones (acceptance 8); `security-reviewer` on `src/auth` | S2a, S1b | 2 |
| S2c | Fixture server with WorkOS stand-in, four Maestro flows, CI `mobile-e2e-android` | S1a | 3 |
| **S3** | Monthly check-in | S2b, S2c, P5 | 6 |
| S4 | App shell: tab bar, More list, header menu and theme toggle, deep links (the update-required screen was built in S2b) | S3 | 4 |
| S5 | Home: net worth hero under the user's choices, key figures, check-in row when due, setup row | S4, P4 | 4 |
| S6 | Accounts list, account detail with joint share line, net worth history | S5 | 6 |
| S7 | Offline reading: SQLCipher cache, age labels, `restoredOffline`, backup exclusion (O5 seam 4) | S6 | 5 |
| S8 | Add, edit and delete an account, including kind, credit limit and joint marker | S6 | 4 |
| S9 | Settings: profile, net worth choices, theme, privacy mode, device lock, export, delete account, links to the four legal pages | S5 | 6 |
| S10 | Budget | S6 | 6 |
| S11 | Debt and mortgage | S8 | 8 |
| S12 | Pension and savings | S8 | 7 |
| S13 | Pay (take-home) and self assessment | S5 | 7 |
| S14 | Free calculators (the web's tools catalogue) | S4 | 5 |
| S15 | Onboarding | S8, S10 | 4 |
| S16 | Connect AI: token list, create, revoke | S9 | 3 |
| S17 | Sandbox with sample households, signed out | S5 | 3 |
| S18 | Hardening: VoiceOver and TalkBack audits, performance, `security-reviewer` on `src/auth` and `src/data`, offline edge cases | S9 | 8 |
| S19 | Release: profiles, store assets, privacy labels, reviewer account, TestFlight and Play | S18, OS2 to OS8, OS12 to OS16 | 6 |
| S21 | Retirement | S12 | 5 |
| S22 | Mortgage estimates (affordability) | S11 | 4 |
| S23 | Invoicing, if self-employed users want it on a phone (decide at P4) | S9 | 6 |

Totals: about 67 agent-days to the first store release (S1a to S9 with D1, B-A and P5, then S18 and S19) and about 125 for everything listed.

**Order to start.** S1a, D1, B-A and P5 can run at the same time now; they touch separate files. S2c can start once S1a merges, while S2a waits for OS1. S3 comes before the shell (S4) because it is the owner's first priority and needs only sign-in and a way to start it. Calendar time is longer by roughly a third for review, store waits and owner steps. E34 slice C7 (household on mobile) is planned with E34, after its C4 lands on web.

After S6 the page slices touch separate folders and can run two or three at a time.

### 9.2 Prerequisites outside `apps/mobile`

| Id | What | Needed by | State |
| --- | --- | --- | --- |
| P1 | WorkOS redirect address and test user | S2a | Owner step OS1 |
| P2 | Web check-in walk-through merged | S3 | **Done** (#709, #727) |
| P3 | Check-in rules in the engine | S3 | **Done** (`check-in.ts`) |
| P4 | Feature inventory rewritten from the web app as it is | S5 | Open |
| P5 | Shared flow copy in `packages/copy` | S3 onward | Open; the check-in move is its own web-only PR, startable now |

### 9.3 S1a. Project skeleton and CI (startable now)

**Goal.** An empty Flump app that builds, themes itself from the shared tokens, proves the shared packages run on Hermes, and is covered by CI. No sign-in, no data, no components beyond what the placeholder screen needs. It answers risks R1 and R2 first.

**Files**

- `apps/mobile/package.json` (`@flump/mobile`), `app.config.ts`, `eas.json` (`development` profile), `tsconfig.json`, `metro.config.js`, `babel.config.js` if the SDK still needs one, `jest.config.js`, `.gitignore` (`ios`, `android`, `.expo`).
- `app/_layout.tsx`, `app/index.tsx` (logo and the tagline), `app/(dev)/engine-check.tsx`.
- `src/config.ts` and test; `src/theme/ThemeProvider/`.
- `e2e/flows/engine-check.yaml`.
- `packages/typescript-config/expo.json`.
- `turbo.json` (mobile `lint`, `check-types`, `test`, `build` as `expo export`), `renovate.json` (one group for `expo`, `expo-*`, `react-native`, `react`, `react-dom` and types).
- `.github/workflows/ci-pipeline.yml`: `mobile-checks` (lint, types, Jest, export for both platforms, bundle search, `expo-doctor`). It runs on every PR, with a fast no-op pass when nothing under `apps/mobile` or the shared packages changed, so it can be required without blocking other PRs. It is added to `.github/required-checks.json` in the same PR; the owner adds it to the branch rules afterwards (OS9).
- `docs/audit/plans/E12-spike-notes.md`.

**Acceptance**

1. `rtk bun install` leaves web, backend and marketing green; the CI Docker job passes with the new workspace.
2. The app starts on an iOS simulator and an Android emulator in light and dark, following the system, with no flash of the wrong theme (iOS checked by hand on a Mac, recorded in the PR).
3. The engine check screen runs the engine's exported tax vectors on Hermes and shows "All vectors pass"; the Maestro flow asserts it on Android locally. The `@flump/format` fixture gives the expected strings on both platforms, or the difference is recorded and a fallback added.
4. A Jest test imports `@flump/finance-engine`, `@flump/format`, `@flump/api-contract`, `@flump/api-client` and `@flump/tokens/native`.
5. One React version in the repo; `scripts/check-dependency-versions.ts` and `expo-doctor` pass.
6. `src/config.ts` throws a named error for a missing address, a non-HTTPS address in a release build, and plain HTTP outside named local hosts.
7. The production export contains no dev route.
8. The spike notes record: SDK, React Native and React versions; the Bun linker and any Metro setting needed; the export condition Metro picked; the TypeScript compiler used; the Hermes formatting result; each [U] in 4.1 answered.

**Known risks.** Metro with Bun's workspace links; React patch mismatch with the SDK; TypeScript 7 with Expo's config. If React must differ, stop and ask the coordinator before any exception to AGENTS.md section 9.

### 9.4 S1b. Components and law checks

**Files.** `src/components/{Text,Pressable,Button,Screen,Card,FlumpLogo}/`, five files each; `app/(dev)/gallery.tsx`; `src/copy/`; `src/data/` (an empty door); `biome.json` (forbid raw React Native `Text`, `Pressable`, `TextInput` outside `src/components`; forbid `fetch` and `@flump/api-client` imports outside `src/data`); `scripts/check-design-tokens.ts`, `check-tabular-nums.ts`, `check-style-literals.ts`, `check-no-mock-auth.sh` extended to `apps/mobile`; a new check for tax threshold literals outside the engine; `AGENTS.md` section 1, the native file set (10.3).

**Acceptance**

1. The law checks fail on fixtures with a hex colour, an untabulated figure, a tax threshold literal, a mock token, and a `fetch` outside `src/data` under `apps/mobile`, and pass on the real tree.
2. `Pressable` enforces 48 by 48 and needs a label when it has no text child. Each component renders at 200% text without clipping, tested from its `X.states.ts`.
3. The gallery shows every component in light, dark and 200% text, and the production export does not contain it.
4. The PR states its seam cost (the data door rule).

**Built (S1b, 25 November 2026).** The tax threshold literal check is the existing one tax engine guard, which already scans `apps/mobile` for the four thresholds and the rate fields; S1b adds a mobile fixture test instead of a second check. `Button` takes its words as a `label` prop, so the mobile overrides only add rules and relax none (coordinator condition, 25 November 2026). Jest has no layout engine, so "200% text without clipping" is checked structurally (sizes and line heights double, no fixed height around text, nothing truncates unless asked, system text size never turned off); the look at 200% on a phone is a hand check. `Card` has the `none` and `resting` elevations; `interactive` and `floating` need native shadow tokens and come with the first screen that uses them.

### 9.5 S2a, S2b and S2c. Sign-in

**Goal.** A person signs in with their Flump account through WorkOS, stays signed in across launches, and can sign out leaving nothing behind. Nothing is mocked.

**S2a, the spike (needs OS1).** A throwaway script and screen answer the [U] items in 5.1 against the WorkOS test environment, including whether a native PKCE sign-in on web's client id gives a token the backend verifier accepts, and call one protected `/v1` route with it. Answers go in the spike notes and correct this plan in the same PR. No app code is kept. If refresh without a secret is refused, stop and raise B-B.

**S2b, auth.** Files: `src/auth/` (`sessionMachine`, `pkce`, `authorizeUrl`, `exchangeCode`, `tokenStore`, `tokenManager`, `classifyRefreshFailure`, `signOut`, `SessionProvider`, each tested); `src/data/apiClient.ts`; `screens/{SignIn,SessionEnded,NotInvited}/`; `components/{ErrorState,InlineAlert,ConfirmDialog}/`; routes `(auth)/sign-in.tsx`, `(app)/_layout.tsx` (the gate), `(app)/index.tsx` (a signed-in placeholder: "You are signed in" and "Sign out"). The `security-reviewer` agent reviews `src/auth` and `src/data` in this PR, as well as the usual review.

**S2c, the e2e harness (needs only S1a).** Files: `e2e/fixture-server/` and its tests (canned `/v1` built from the contract schemas, and a WorkOS stand-in issuing test tokens, including expired and rejected ones); the `e2e` profile in `eas.json`; CI `mobile-e2e-android` (path-filtered as `mobile-checks` is, added to `required-checks.json` once it has passed three runs in a row). CI never uses a real WorkOS user; the test user in OS1 is for the S2a spike and the hand checks only. The four flows (`signed-out-shows-sign-in`, `sign-in-happy-path`, `session-ended`, `sign-out-clears-device`) land with S2b against this harness.

**Acceptance (S2b, with S2c for the flows)**

1. The sign-in screen shows the logo, the tagline "Flump: finance without the fog", "Sign in", "Create account", and links to the privacy notice (`/privacy`) and terms (`/terms`) on the marketing site.
2. Sign-in opens the system browser sheet. A `state` mismatch is refused before any exchange. Cancelling returns to the screen with no error. A failed exchange shows a plain message with no WorkOS text.
3. After sign-in, `GET /v1/user-profile` succeeds against a real backend (recorded by hand in the PR) and against the fixture server (in CI).
4. The refresh token is in the secure store ("when unlocked, this device only") and nowhere else; the access token is never written to disk; neither appears in any log or error message.
5. Every transition in 5.2 has a test. A network failure during refresh never leads to `sessionEnded`. A rejected refresh clears the device once.
6. Ten requests that all get a 401 cause one refresh; each is retried once with the new token. A second 401 ends the session.
7. A person who is not on the beta list sees the `NotInvited` screen with a way to sign out, not an error.
8. Sign-out works with no network, empties the secure store, preferences and memory, and the next launch shows the sign-in screen. On a real iPhone and a real Android phone, signing in after signing out asks for the password again (by hand, recorded in the PR; needs OS17).
9. The three screens pass the per-slice accessibility checks in section 6.
10. The four Maestro flows pass three runs in a row in the Android CI job, or the fallback in 7.1 is recorded. The production bundle contains no fixture address.

**Built (S2c, 25 November 2026).** Built before S2a and S2b because S2a waits for OS1. `e2e/fixture-server/` is one Node server on port 8787 (built-ins only, no new dependency), listening on loopback only, with its signing key, ids and tokens made at runtime. The WorkOS stand-in takes PKCE with S256 only and a state, refuses an unregistered redirect, a client secret and a reused or expired code, and replaces each refresh token on use (the strict answer to a 5.1 [U]; S2a records what real WorkOS does). Scenarios: not invited, sign-in denied, refresh rejected or unavailable, short-lived tokens, a revoke, a minimum version. The canned `/v1` serves the client policy and the profile, each parsed with its contract schema, and 404 for anything else. Biome stops `app/` and `src/` importing `e2e/`; the bundle check fails on the fixture address or `__fixture`. CI `🤖 Mobile e2e (Android)` builds a debug APK with Gradle, starts the fixture server and Metro, boots an API 34 emulator and runs the flows in light and dark with screenshots: today only `engine-check.yaml`, which proves Hermes on Android (iOS stays by hand). No retries; read-only permissions; no secrets; Maestro analytics off; Maestro pinned with a committed SHA-256 and not tracked by Renovate. It joins `required-checks.json` after three green runs (OS9). The `e2e` profile in `eas.json` documents the same build. Still blocked: S2a needs OS1 done and the owner signing in once with the test user while the spike runs (agents never type a password into WorkOS); S2b needs S2a's answers. **Narrowed (26 November 2026, owner: "Yes, do all three").** The job took about 21 minutes on every app or shared-package change. Now: pull requests run light only; a pull request that changes only shared packages runs the smoke set (`engine-check`, `sign-in`); push to `main` and a nightly run (02:23 UTC) run every flow in light and dark; the debug APK is restored from the cache when `scripts/android-apk-cache-key.ts` gives the same key (the nightly run always builds). Measured on PR #953: smoke about 4.5 minutes, every flow in light about 9.5 minutes with the APK cached and about 21 minutes when it is built (12 flows since S2b). The job still reports on every pull request.

**Built (S2a, 25 November 2026).** The coordinator widened S2a from a throwaway spike to the sign-in half of S2b, built against the fixture server, with the spike kept as a development-only screen. `src/auth/`: `pkce` (RFC 7636 S256, checked against the RFC's example), `authorizeUrl` (authorize and logout addresses, and the redirect read state first), `sessionMachine` (the states in 5.2 as a pure reducer that ignores events that do not apply), `session` (sign-in, restore on launch, one shared refresh, sign-out), `tokenStore` (the refresh token only, in expo-secure-store as "when unlocked, this device only"), `claims`, `authDeps` (expo-crypto, expo-secure-store, expo-web-browser) and `SessionProvider`. `src/data/`: `workos` (the code exchange and the refresh, no client secret, failures only `rejected` or `unavailable`), `apiClient` (the app's `@flump/api-client`, whose 401 handling calls the session's refresh) and `account` (`GET /v1/user-profile`). Screens: the gate on `/`, `SignIn`, `Home` (the signed-in placeholder), `NotInvited` (web's wording), `SessionEnded`, `Offline`, `Misconfigured` and `Loading`; component `InlineAlert`. Config gains `EXPO_PUBLIC_WORKOS_CLIENT_ID`, the optional `EXPO_PUBLIC_WORKOS_API_URL` (the fixture server in e2e) and `EXPO_PUBLIC_MARKETING_URL` for the legal links; a bad value shows "This build is misconfigured". iOS opens the sheet as a private session, so sign-out opens the WorkOS logout page on Android only. Expo Go cannot take the `flump://` redirect (it handles only `exp://`), so the real sign-in needs a development build. The spike's questions are answered by the dev-only `sign-in-check` screen after the owner signs in; answers are in the spike notes. Why the plan changed: the e2e harness (S2c) was ready before OS1, so the sign-in could be built and proved against the fixture server first, and the spike then needs one real sign-in instead of a throwaway app. The 401 single-flight refresh and retry came with it, tested, because `@flump/api-client` already does the retry and only needed the session's refresh. Sign-out racing a refresh is closed by an epoch: a WorkOS answer that lands after the device is cleared is dropped unsaved. A read the secure store refuses (an iPhone still locked) keeps the session instead of deleting it. A WorkOS address override is refused in a release build. Android backup exclusion is proved from the prebuild output by `scripts/check-android-backup.ts` in the e2e job. Development build: route A (approved 25 November 2026) is the label-triggered workflow `mobile-device-apk.yml`, which builds an arm64 debug APK with `expo-dev-client` and no JavaScript, client id or fixture value in it (checked by `scripts/check-device-apk.sh`), kept 3 days with its SHA-256 in the job summary; ordinary builds leave the launcher out (`expo.autolinking.exclude`). Route B is Android Studio on the owner's computer. Left for S2b: the update-required screen, `ErrorState` and `ConfirmDialog`, wiping the iOS Keychain on the first launch after a reinstall (a Keychain item survives an uninstall), and the hand checks on real phones (acceptance 8, OS17). Seam cost 0: the code follows the existing data door rule.

**Built (S2b, 26 November 2026).** Started from the owner's real sign-in on both simulators (spike notes, "The owner's real sign-in (S2b)"). Sign-out: the Android logout page stuck on the marketing site because `flump://auth/callback` is not a WorkOS Sign-out URI, and expo-web-browser cannot close a Custom Tab, so the next sign-in showed the stale tab. A Fable decider chose to drop the browser from sign-out on both platforms: the app clears the device, then `POST /v1/session/sign-out` (new backend route, `session.signOut` in the contract) revokes the token's own `sid` with WorkOS, best effort, with one in-memory refresh if the access token has expired. Every authorize address sends `max_age=0`. Sign out asks first in a `ConfirmDialog` whose words say what it does on each platform (on Android, a Google account in the browser can still sign in with one tap). Refresh token reuse: WorkOS's documented 30 second grace period, judged acceptable for the beta by the decider; the dev Sign-in check now waits 65 seconds and tries again. Also: the update-required screen ("Update Flump to carry on", on launch and on return to the foreground, failing open; no store link until a listing exists in S19), `ErrorState` (used by the check-in's load failure) and `ConfirmDialog`, the iOS Keychain wipe on the first launch after a reinstall (`src/auth/reinstall.ts`), the first screen's title "Flump" (the iOS back button read "(app)/index"), `apps/mobile/.env.example`, and fixture scenarios and Maestro flows for sign-out, sign-in after sign-out and update required. The fixture's WorkOS stand-in now keeps the 30 second grace period as real WorkOS does. After the coordinator's device check: the sign-in account check reads only the status (version skew, Fable decider), a check-in read the app cannot parse says "did not understand Flump's answer" rather than "check your connection", and WorkOS accepting an old refresh token after 65 seconds is an open risk that blocks public launch (spike notes). Not in S2b: B-A (the clock tolerance) is its own backend slice; the hand checks of acceptance 8 are owner re-checks listed in the PR. Seam cost 0.

### 9.6 S3. Monthly check-in

**Goal.** Once a month a person confirms each balance in under two minutes, matching the web walk-through as built (#709, #727).

**The flow.** As on web: a row on the signed-in screen when the month is due; one card per account in web's order with name, type, last recorded balance and month, and a position ("Account 2 of 6"); **Update** or **No change**; "No change to the rest" ends the walk-through keeping the remaining balances (owner, 20 November); a mortgage or loan with a saved rate and payment, whose saved balance equals the latest recorded month, shows the engine's `calculateCheckInBalance` figure with a "Calculated" badge; accounts left out of net worth say so; the summary shows what changed and net worth against last month from a fresh `GET /v1/portfolio-snapshot`, in plain words.

**How it saves.** `PUT /v1/snapshots/:month` with the engine's payload builder, sent with `checkIn: true` (the engine's `checkInPayload` sets it), so the server stores the month as started and finishing marks it done. The row on the signed-in screen reads `latestStartedMonth` from `GET /v1/snapshots/check-ins` and says "Continue check-in" when `selectCheckInPartDone` is true, "Start monthly check-in" otherwise. Saving needs a connection; without one the action is disabled and says why.

**Files.** `src/data/{queryClient,queryKeys,useDelayedLoading}.ts`; `src/features/check-in/{useCheckInData,checkInFlow,useSaveCheckIn}.ts`; `screens/{CheckIn,CheckInDone}/`; components `CurrencyInput`, `FormField`, `Money`, `StatusBadge`, `Skeleton`, `HeroFigure`, `Toast`; route `(app)/check-in.tsx` and the check-in row on `(app)/index.tsx`; fixture routes for `GET /v1/accounts`, `GET /v1/account-details`, `GET /v1/user-profile`, `GET /v1/portfolio-snapshot`, `PUT /v1/snapshots/:month`; flows `check-in-walkthrough.yaml` and `check-in-backend-down.yaml`. Words come from `packages/copy` (P5).

**Acceptance**

1. With six accounts in the fixture, the walk-through shows six cards in web's order and ends with one `PUT` whose body passes the contract's snapshot request schema and is built by the engine's payload builder.
2. "No change" sends the last recorded balance; "Update" sends the typed one; "No change to the rest" keeps every remaining balance; a skipped card sends nothing. A blank input is never sent as 0.
3. A mortgage with a saved rate and payment, whose saved balance equals the latest recorded month, shows `calculateCheckInBalance`'s figure with the "Calculated" badge; the figure equals the engine's output for the same inputs (the function is observed, the app does no arithmetic). Overriding sends the typed figure. Otherwise no calculated figure is shown.
4. The app imports the steps, calculated figure, answers, payloads and summary from `packages/finance-engine/src/check-in.ts` and has no copy of them.
5. Loading: nothing for the first 200ms; a skeleton that appears stays at least 400ms; moving between cards never shows a skeleton; under Reduce Motion nothing shimmers or slides. Each is a timed test with a fake clock.
6. A failed load shows the error state with "Try again", never "no accounts". A successful empty list shows one sentence and one button to add an account, which links to the website until S8.
7. A failed save keeps every answer on screen and offers to try again. A double tap sends one request.
8. Amounts are whole pounds where read and accept pence where typed; every figure uses tabular numerals; a debt is shown without red.
9. Nothing in the flow mentions a missed month, a streak or a target.
10. The summary's change figure matches web for the renting and home-owning households in `apps/e2e/support/personas.ts`, checked by hand and recorded in the PR.
11. Accessibility: each card is one group with a spoken summary ("Current account, £1,204, recorded in October, account 2 of 6"); both actions are at least 48 by 48; the position change is announced; the flow works at 200% text, 320 points wide, with VoiceOver and with TalkBack.
12. Both Maestro flows pass three runs in a row in the Android CI job, or the fallback in 7.1 is recorded.
13. Every check-in save sends `checkIn: true`; with a started month and some accounts still to do, the row says "Continue check-in", taken from `selectCheckInPartDone`, never worked out in the app.
14. The PR adds its row to the parity log and states the result of the CROSS-PLATFORM section 7 checklist.

**Built (S3, 25 November 2026).** `packages/copy` (P5) is not on main, so the words are in one module, `src/copy/checkIn.ts`, copied from web's `snapshotCopy.ts` and `CheckInRow.tsx`. Data: `src/data/{queryClient,queryKeys,useDelayedLoading,checkIn,problems,ApiProvider}`, TanStack Query 5 (reads retried twice on `unavailable` and `server` only; the cache is cleared whenever nobody is signed in). Flow: `src/features/check-in/{useCheckInData,checkInFlow,useSaveCheckIn}.ts` follow web's `useCheckIn`: each answer is one `PUT /v1/snapshots/:month` built by `checkInPayload` (so `checkIn: true`, and `complete` on the last), one save at a time, a synchronous guard against a double tap. The app imports the engine from a new narrow entry, `@flump/finance-engine/check-in`: the package root reaches the tax vector catalogue through `tax-year-verification.ts`, and Metro keeps every export, so the bundle search failed on it. Three changes from the text above: (1) `GET /v1/portfolio-snapshot` does not exist; the summary's net worth and change come from the engine's `buildCheckInSummary` over the data read when the check-in opened, as on web. (2) The row shows when there are no accounts yet, so the empty state (one sentence, a link to the website) is reachable until S5's setup row. (3) Saving offline: the screen knows only the session's `restoredOffline` state (no network listener yet); then saving is off and says why, and a failed save keeps the answer with "Try again". The 403 `terms_not_accepted` answer (PR #939, merged during S3) is handled: the account check turns it into a `termsRequired` session state, and a check-in read that gets it mid-session shows the same `TermsRequired` screen, which sends the person to the website to agree, then Try again checks again. The app does not record the agreement itself (still open in the parity log); the fixture server has a `terms` scenario and the flow `terms-required.yaml`. Seam cost 0. Mobile logo: the logo body uses `primary.mark` lit by `primary.markLit`, teal in light, as web (owner, 25 November).

### 9.7 S4. Tabs and the More list

**Goal.** A signed-in person moves between Home, Accounts, Budget, Pay and More as on web's phone layout, and every destination says honestly what it is today.

**Decisions (10.3, small and reversible).**

- **Tab bar:** the JavaScript tab bar (expo-router `Tabs` with our own `TabBar` through the `tabBar` prop). Native tabs cannot be measured in Jest, and our `Text` never caps the font scale, so the bar must adapt to large text, which only our own bar can prove.
- **Menu button and More tab:** both stay, as the 14 November ruling and web as built (`Header.tsx`). The button sits on the right of the header and opens the More tab. Review at S18.
- **One source:** mirror, not move. `navConfig.ts` imports lucide-react and web's `AppPageKey`, and the drawer's footer rows are JSX, so a shared package means a new workspace and several changed web files. Mobile keeps plain data in `src/navigation/navItems.ts`. A Vitest test in `apps/web` pins it, because `mobile-checks` does not run on web-only PRs.
- **Icons:** the lucide shapes web uses, copied as SVG paths into one `Icon` component (ISC licence noted), no new dependency.
- **Switched-off pages:** the shared filter comes in S9. Until then More leaves out the rows that depend on a per-person switch and lead to a page that is off until switched on: Self Assessment (opt-in). The other switchable pages are on by default and still open on web when switched off, so they stay. The parity test names the exception, so a new conditional row cannot appear by accident (coordinator, 26 November 2026). S4 reads no profile field for this.
- **Kept:** tabs, More list, header with title and menu button, placeholders, `flump://` links to each tab, the More pages and the check-in. A link opened signed out shows sign-in and lands on its screen afterwards.
- **Deferred:** the header theme toggle goes to S9 with the stored three-way choice (`ThemeProvider` follows the system only today), approved by the coordinator on 26 November 2026. Universal and app links go to S19.

**The flow.** `SessionGate` moves from the first route into `(app)/_layout.tsx` and wraps the shell.

- `loading`, `signingOut`, `signedOut`, `signingIn`, `sessionEnded`, `notInvited` and `termsRequired` **replace** the shell, as now. Nobody can use a tab in those states. The update gate stays above everything.
- `restoredOffline` **sits within** it: the tab bar and More stay, and Home, the one tab that reads data, shows `Offline` with Try again; the placeholders need no data. S7 turns it into cached reading.
- A terms refusal met mid-session shows `TermsRequired` in the tab's body, as Home does now.

Home keeps the "You are signed in" heading, the check-in row with its empty state, and the dev links, until S5. Accounts, Budget and Pay show `ComingSoon`: the page name, one sentence ("Accounts is not in the app yet. You can use it on the Flump website."), and a link to the same web page. No figures.

More lists, in web's drawer order: Savings, Pension, Retirement, Cards and loans, Mortgage, Settings, Connect AI, Calculators, then Sign out (with the existing confirmation). Sign out also stays on the offline, terms and Not invited screens. Each page row opens `ComingSoon` for its page. The Home sign-out button goes.

**Files.**

- Routes: `app/_layout.tsx` (one `(app)` entry); new `app/(app)/_layout.tsx`, `(app)/(tabs)/{_layout,index,accounts,budget,pay,more}.tsx`, `(app)/page/[key].tsx`.
- Data and words: `src/navigation/navItems.ts` (plain data, no imports); `src/copy/navigation.ts`.
- Components, five files each: `TabBar`, `AppHeader`, `ListRow`, `Icon` (shapes in `src/navigation/iconShapes.ts`).
- Screens: `screens/{More,ComingSoon}/`; `SessionGate` (takes children, offers sign-out through context); `Home`.
- Config: `src/config.ts` gains an optional `webAppOrigin` from `EXPO_PUBLIC_WEB_APP_URL`, checked as the marketing address is. When it is unset the placeholder links to the marketing home page, so no existing build breaks. `eas.json`, the CI e2e env, README.
- Web, small: export `withoutBarPages` from `MobileNavDrawer.tsx`; lift the three footer routes into `DRAWER_FOOTER_ROUTES` in `navConfig.ts`; new `apps/web/app/components/navigation/mobileNavParity.test.tsx`.
- End to end: `e2e/flows/tabs.yaml`; `e2e/subflows/sign-out.yaml` (through More); the screenshot list in `e2e/run-android-flows.sh` and its test; gallery entries.
- Docs: 4.2 and 4.4 corrected; 10.3 filled in; parity log.

**Acceptance**

1. The parity test fails if mobile's tabs differ from `BOTTOM_BAR_TABS` plus More in key, order, label, route or icon, or if the More rows differ from `withoutBarPages(AUTH_NAV_ROUTES)`, less a named exception list (Self Assessment until S9), plus `DRAWER_FOOTER_ROUTES`. Labels equal `apps/web/public/locales/en/common.json`.
2. Every placeholder names its page, shows no figure, and its link opens `webAppOrigin` plus that row's web route (Connect AI: `CONNECT_AI_ROUTE`).
3. Home shows the check-in row, "Continue check-in" and the empty state exactly as in S3. Its tests pass unchanged apart from sign-out.
4. Session states: a Jest test per state proves which replace the shell and that `restoredOffline` keeps the tab bar, with Try again on Home. The existing terms, session-ended and sign-out flows still pass.
5. Each tab has role `tab` inside a `tablist`, announces selected, and is at least 48 by 48. The current tab and current More row are marked without colour alone.
6. At 320 points wide and 200% text no label is clipped, shortened or broken mid-word: at large text the icons go and the bar lays its tabs out in as many columns as the longest label fits, wrapping to more rows. Proved in Jest at 320 points and 200% text, in light and dark; the fit is checked on a device.
7. The colour pairs the bar draws (label and icon, selected and not) are pairs the shared contrast matrix already checks, or join it (section 6).
8. `flump://accounts`, `flump://more` and `flump://page/pension` open their screens. Signed out they show sign-in, then the screen. An unknown key shows not found with one way back. No link performs a write.
9. `tabs.yaml` signs in, visits each tab, opens More and one More page, with a screenshot of each, in light and dark. The runner settles the app first, with no retries.
10. The gallery shows `TabBar`, `AppHeader`, `ListRow` and `Icon` in light, dark and 200% text. Dev screens stay out of the production bundle.
11. Lint, types, `check:laws` and the mobile and web tests pass, including the mobile law checks for the new directories.
12. The parity log marks the navigation rows done or part done and records the theme toggle and the filter deferred to S9. The PR states the CROSS-PLATFORM section 7 result.

**Built (S4, 26 November 2026).** As above, with these details. `SessionGate` wraps `app/(app)/_layout.tsx` and gives the tabs a shell context (`src/navigation/shell.ts`: offline, sign out, Try again, the two websites). The tab bar lays its tabs out by an estimate of the longest label's width (`tabLayout` in `TabBar.styles.ts`): five a row at the normal size on 320 points, two a row over three rows at 200% text, icons gone from 1.5 times; the real fit is a device check. The More list is a pushed page per row (`page/[key]`), so the tab bar hides there and Back returns to More. The web test also pins each icon's shapes to lucide-react's. `EXPO_PUBLIC_WEB_APP_URL` is optional (coordinator, 26 November 2026); without it placeholder links open the marketing site's home page; links open in the system browser, never an in-app sheet. The tabs are the `(app)` stack's initial route, so a page opened cold by a link has Back to them. `app/+native-intent.ts` ignores Android's copy of the sign-in redirect while the app is open, so a link opened signed out lands on its screen after sign-in. Expo Router's route tests (`src/navigation/routes.test.tsx`) needed `standard-navigation` added to Jest's transform list. After the coordinator's device check: any unknown link (`flump://nope`) lands on `app/(app)/+not-found.tsx`, inside the gate, with one way back to Home, instead of Expo Router's own page; the router plugin's `sitemap: false` removes the development-build route list. After the full device check (26 November 2026): the tab bar is one View per row of equal flex cells, because Android rounded five 20% cells up and wrapped the fifth at normal text; stacked pages draw the same header with Back; icons grow with the text size up to double; the header button says "Open More"; More's last group is headed "Settings and tools"; placeholders say "This page is not in the app yet" and, with no web app address, "Open the Flump website"; Pay uses lucide's banknote, not web's calculator, which Calculators keeps (the parity test's one icon exception; web follows when its phone screenshots are redone); the check-in reads only the profile fields it uses, so a person with no profile yet or with setup unfinished is sent to the website to set up instead of seeing a load error; and the theme reads the system setting again when the app returns to the front.

### 9.8 Later slices

Each is specified in full when the slice before it merges, from the web page as it then is and the parity log. Fixed now:

- **S5:** before the hero is built, check that the backend's net worth for `GET /v1/portfolio-snapshot` is computed by the engine's net worth basis; if any part is computed only in a backend service, move it to the engine first (O5 seam 1).
- **S6:** one balance per account everywhere; the joint share line as on web (E34 C1); history chart only from three recorded months; history not editable.
- **S7:** SQLCipher with the key check; the database out of iCloud and Android backups; a test that a cold start with no network keeps saved data; a test that a restored backup without the key shows no cached data and asks to sign in.
- **S9:** the two net worth switches (R1), export, deletion with the typed phrase, recent sign-in when asked; the four legal pages linked, opening in the browser. Web's optional browser storage switch has no mobile counterpart (parity log, 25 November).
- **S10 to S13, S21, S22:** saved versus scenario: changing a scenario input changes no saved figure and sends no request.
- **S16:** a new token is shown once and never cached.
- **S18:** `security-reviewer` again on `apps/mobile/src/auth`, `src/data`, the cache and any backend route added for mobile (the first review is in S2b).

---

## 10. Decisions

### 10.1 Decisions

| # | Decision | State | Blocks |
| --- | --- | --- | --- |
| O1 | Framework and build service | **Decided 25 November 2026 (owner):** Expo for iOS and Android, EAS on the free plan to start | Nothing now |
| O2 | Apple and Google developer accounts | Default on record (round 3, items 10, 15, 16): organisation accounts after incorporation and the hardening milestone. Paying and enrolling are owner steps (section 11) | S19 |
| O3 | Push notifications | Default on record (round 2, D8-A): none at launch. A check-in reminder is the first candidate after release, as its own plan | Nothing |
| O4 | Offline policy | Default on record (round 2, D4-A), confirmed by O5: encrypted read-only cache, 7 days, writes online | Nothing now |
| O5 | Where mobile data lives | **Decided 25 November 2026 (Fable decider, owner's delegation):** option (d), server as the one home, with four seams for a later opt-in encrypted mode (4.6) | Nothing |

### 10.2 On record from earlier rounds

Adopted in `DECISIONS.md` round 2 (reversible defaults) or round 3, updated where noted.

| Old id | Subject | Position |
| --- | --- | --- |
| D1 | Platforms | iOS and Android together to internal testing |
| D3 | WorkOS setup | Custom scheme redirect first, a web link later; secret-free refresh unless S2a shows otherwise |
| D5 | Deleting the old app | **Done** (#827) |
| D6, D19 | Bank connection on mobile | Superseded by ruling R2. Parked |
| D7 | Error tracking | Sentry, EU region, no replay, no personal data (round 3, item 7) |
| D9 | Account deletion | At once and for good after a typed phrase; built on the backend |
| D10, D11 | Certificate pinning, over-the-air updates | No pinning; updates on the preview channel only |
| D13 | How e2e signs in | Fixture server with a WorkOS stand-in |
| D14 | Tablets | Phone, portrait, first |
| D15 | Currencies | UK and pounds only, as web |
| D16 | AGENTS.md native file set | Adopted in principle; wording approved in S1b (10.3) |
| D17 | Signed-out wealth check | Not ported |
| D20 | Privacy policy and deletion page | Release gates. The four legal pages are live (E19, 25 November 2026), written and approved by Fable at the owner's delegation; S19 adds the app to them |
| D21 | Sign-in methods | Email and password, and magic link |
| D22 | Language | en-GB only |
| D2, D24 | Store fees | After incorporation and the hardening milestone (round 3, item 16); paying is an owner step |
| D18 | Legal entity | Sole trader now; incorporate about 8 weeks before Apple enrolment (round 3, item 15) |
| D25 | Store compliance forms | Positions in round 3, item 10, filed by the owner at S19; the bank line falls away under R2 |
| D26 | Data protection duties | Sequence in round 3, item 15 |
| D27 | Disclaimer and sign-in policy | The web's approved notice text; email verification required |

### 10.3 Smaller decisions taken in the slices

- **S1b:** the AGENTS.md section 1 wording for the native file set. Approved by the coordinator on 25 November 2026 and added verbatim: "**`apps/mobile`**: every component lives in its own PascalCase directory with `ComponentName.tsx`, `ComponentName.styles.ts` (a StyleSheet factory that takes the theme), `ComponentName.test.tsx`, `ComponentName.states.ts` (named prop sets, shown by the dev gallery and used by the tests, in place of a Storybook file) and `index.ts`." The coordinator approves it (round 2 adopted it in principle).
- **S2a and S2b:** whether B-B is needed (no: refresh needs no secret); whether iOS uses a private browser session (yes). S2b, by a Fable decider on 26 November 2026: refresh token reuse within WorkOS's 30 second grace period is acceptable for the beta; sign-out opens no browser and revokes on the server (`POST /v1/session/sign-out`); every sign-in sends `max_age=0`, always, with no "signed out on purpose" marker. Suggested to the owner, not required: in the WorkOS dashboard's Sessions tab, an inactivity timeout (14 days) and a maximum session length (30 days).
- **S3:** the shape of `packages/copy` (one module per flow, re-exported by web).
- **S4:** the JavaScript tab bar, not native tabs; the header menu button and the More tab both stay (9.7, by a Fable planner on 26 November 2026).

---

## 11. Owner-only steps and costs

Agents never do these. Each is listed with when it is needed.

| # | Step | Needed by | Cost |
| --- | --- | --- | --- |
| OS1 | WorkOS dashboard: register the redirect `flump://auth/callback` for the existing client in the test environment, and create a test user for the S2a spike and the hand checks (CI uses the stand-in, not a real user). During the S2a spike, sign in once with that test user in the browser sheet the spike opens: agents never type a password into WorkOS. Best done now | S2a | None expected; whether native sign-in changes the WorkOS bill [U] |
| OS2 | Choose the app identifier (`io.github.mgallagher56.flump` or a domain-based one). Permanent once a listing exists | S19 | None, or a domain |
| OS3 | Create an Expo account and an EAS project for the app; decide whether to move to the $19 a month plan if 15 builds a platform a month run out | First EAS build (S19, or earlier for internal test builds) | Free; $19 a month if needed |
| OS4 | Apple Developer Program enrolment, as an organisation after incorporation (round 3), with a D-U-N-S number | S19 | US$99 a year; D-U-N-S free [U] |
| OS5 | Google Play developer registration, as an organisation; if personal, recruit 12 testers for a 14-day closed test | S19 | US$25 once |
| OS6 | Signing: create or approve the iOS distribution certificate and the Android upload key, and decide whether EAS holds them | S19 | None |
| OS7 | Store listings, privacy labels, the Play data safety form and the Financial features declaration, filed under the positions on record (round 3, item 10) and O5 | S19 | None |
| OS8 | A reviewer account with sample data for Apple and Google | S19 | None |
| OS9 | Add `mobile-checks` and `mobile-e2e-android` to the branch rules on GitHub, each after its PR has merged with the job in `required-checks.json` (both are in `required-checks.json`; since 26 November 2026 the e2e job runs light only on pull requests, the smoke set when only shared packages change, and every flow in light and dark on `main` and nightly, so it still reports on every pull request) | After S1a and S2c | None |
| OS10 | Sentry: a mobile project and its key, after the scrubber tests | S18 | Free tier |
| OS11 | Incorporation, if not done, about 8 weeks before Apple enrolment (round 3, item 15) | Before OS4 | Varies |
| OS12 | Submission keys for EAS Submit: an App Store Connect API key, and a Google Play service account with access to the app | S19 | None |
| OS13 | The first Android upload may need to be made by hand in the Play Console before EAS Submit can upload [U] | S19 | None |
| OS14 | An `EXPO_TOKEN` repository secret, if builds are started from tags in GitHub Actions | S19, if used | None |
| OS15 | WorkOS production environment: register the app's redirect there too, before a store build points at it | S19 | None |
| OS16 | Store answers: Apple's export compliance question, now that the cache uses SQLCipher (round 3 set `ITSAppUsesNonExemptEncryption=false`; whether that still holds is [U]); the account deletion web address Play asks for | S19 | None |
| OS17 | A real iPhone and a real Android phone for the hand checks from S2b on, and a Mac with Xcode for iOS simulator checks | S1a (Mac), S2b (phones) | Owner's own devices |
| OS18 | A domain, if universal and app links are wanted, and its association files | After the first release | Domain cost |

Other costs: GitHub Actions for Android e2e on a public repository, expected free [U]; Maestro CLI free, Maestro Cloud not used ($250 per device a month).

---

## 12. Risks

| # | Risk | Likelihood | Impact | What reduces it |
| --- | --- | --- | --- | --- |
| R1 | Metro, Bun workspaces and the shared packages do not resolve, or React is duplicated | Medium | High | S1a is the proof; Expo's monorepo support since SDK 52 |
| R2 | SDK 58 wants React 19.3.0 while the repo has 19.3.1 | Medium | Medium | `expo-doctor` in S1a; ask before any version exception |
| R3 | WorkOS refuses refresh without a secret | Medium | High | S2a spike; B-B |
| R4 | Android e2e on free runners is too slow or flaky | Medium | Medium | S2c proves it; manual fallback recorded per PR |
| R5 | The web app keeps changing, so parity moves | High | Medium | Parity log; slices specified late; tests that compare nav and tools lists |
| R6 | A store refuses the app | Medium | High | Organisation account; reviewer account; privacy pages; claims within the O5 list |
| R7 | A failure or old cached data shown as empty or zero | Medium | High | Tests in S3, S5, S7; S18 audit |
| R8 | Maths written again in the app, or a figure only the server computes | Medium | High | Literal check; O5 seam 1 |
| R9 | A token or the cache leaks through logs, backups or the bundle | Low | High | 5.3; 4.6 backup exclusion; bundle search; S18 |
| R10 | A phone clock running fast causes sign-outs | Medium | Medium | B-A |
| R11 | Marketing over-claims privacy | Medium | High | The O5 list in `DECISIONS.md`; claims register |
