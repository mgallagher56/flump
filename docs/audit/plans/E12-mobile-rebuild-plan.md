# E12 Mobile rebuild: implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Subagent model law (AGENTS.md section 6): `sonnet` or `haiku` only; `opus` only for read-only planning; never `fable`.

Status: **draft for owner review, revision 2 (2026-11-11). Planning only: no app code written, `apps/mobile-companion` untouched.** Revision 2 folds in a stronger-model review (effort recomputed, offline and auth states reconciled, store and legal position added, many tasks split). Facts about WorkOS and the stores are tagged **CONFIRMED** (read in a primary source during planning, with the source named), **UNCONFIRMED** (could not be verified; the plan says what must be checked and where) or **VERIFIED IN CODE**. Written against HEAD `e4ff6c3`. Companion: [E12-feature-inventory.md](./E12-feature-inventory.md). Owner decision of record (`DECISIONS.md`): the mobile app is rebuilt from scratch with the web app as the functional guide, covering everything the web app does; the old app is not fixed.

**Goal:** A new `apps/mobile` Expo/React Native app that offers every feature of the Flump web app on iOS and Android, signed in through the real WorkOS flow, using shared finance maths, honest error states and the Flump design tokens.

**Architecture:** Expo SDK (Dev Client, Hermes) with Expo Router; a new framework-free `@flump/api-client` (typed, `BackendError`-compatible) and `@flump/api-contract` (zod schemas and types) shared with web later; `@flump/format` for en-GB formatting; native tokens generated from a new `@flump/tokens` package (moved out of `@repo/ui`, which re-exports it); TanStack Query for server state with an encrypted read-only offline cache; WorkOS AuthKit native flow with PKCE, tokens in the OS secure store; all tax, mortgage, debt and forecast maths imported from `@flump/finance-engine`.

**Tech Stack:** Expo + React Native + TypeScript, Expo Router, TanStack Query v5, react-hook-form + zod, react-native-svg + d3-shape + d3-scale, expo-secure-store, expo-auth-session/expo-web-browser, react-native-mmkv (encrypted), Reanimated, Jest (jest-expo) + React Native Testing Library, Vitest for pure packages, Maestro for e2e, EAS Build/Submit/Update, Biome, Turbo, Bun.

**Spec:** the owner decision above, [E12-feature-inventory.md](./E12-feature-inventory.md), audit findings B-07, D-04, F-12, G-03, G-04, G-11, G-14, H-09, I-06, I-12, J-14, K-10, L-07, and the E1, E5, E8 plans.

## Global Constraints
Copied from AGENTS.md, the E1/E5/E8 plans and the owner decisions. Every task inherits these.

- No financial maths in the app. Tax, NI, student loan, mortgage, debt, forecast and take-home come from `@flump/finance-engine` (ADR-006, B-07). A CI check fails the build on tax literals (`12570`, `37700`, `125140`, `50270`) outside the engine.
- **Tax-year API (pinned).** Mobile uses only the clock-injectable, throwing family in `packages/finance-engine/src/uk-tax-year.ts`: `getCurrentUkTaxYear(now)`, `resolveUkTaxYear(year?, now?)`, `getUkTaxYearForDate(iso)`, `isSupportedUkTaxYear`, `getUkTaxYearRules`. It never calls the legacy `getCurrentUKTaxYear()` in `tax-rules.ts` (no clock argument; never throws, so it silently rolls past the last supported year). Unsupported years show "That tax year isn't supported yet". Each screen task names its engine function (map produced by T0.5).
- No `mock-session-token`, `dev_user_123` or sticky mock fallback anywhere in `apps/mobile` or any new package, and **no exemption** for them in `check:auth` (the existing allow-list for `apps/backend/src/auth/dev-bypass.verifier.ts` and `apps/web/app/utils/auth.server.ts` stays; the old `apps/mobile-companion/` prefix is removed only in T10.4). Demo mode is a separate, labelled, in-memory feature with zero network calls.
- A backend failure never renders as an empty or zero state. Errors use the seven `BackendError` kinds and the generic E5 copy. Stale or restored-offline data is labelled with its age and is never presented as current.
- **Network failure is not session end.** A session ends only when the token endpoint terminally rejects the refresh token (`invalid_grant`, 400, 401), or an API request returns a second 401 after a successful refresh. Everything else (offline, timeout, 5xx, DNS) is retryable and keeps tokens and cache.
- Zero hex, rgb or primitive scale tokens in app code, apart from the allow-listed bank brand constants file. Only the semantic namespaces `surface.*`, `text.*`, `border.*`, `primary.*`, `status.*`, `chart.*` through the generated token map. `primary.solid` and `primary.hover` only behind `primary.foreground`.
- Every currency, percentage, date and table cell uses `fontVariant: ['tabular-nums']` and the shared en-GB formatter. UK English copy, sentence case (L-07).
- Every destructive action goes through `ConfirmDialog` (name the thing, state the consequence, destructive button label). No undo, no soft delete (E5 D4-A).
- Colocation law adapted for native (5.5): every component in its own PascalCase directory with `.tsx`, `.styles.ts`, `.test.tsx`, `.states.ts` and `index.ts`.
- Touch targets at least 44 by 44 pt (iOS) and 48 by 48 dp (Android). Text honours the system font scale. Every interactive element has an accessible role and label. The accessibility checklist (5.1) is an **exit criterion of every milestone**, not only M8.
- No secret, client secret, API key or signing key in the bundle, `app.config.ts` extras or any `EXPO_PUBLIC_*` variable other than non-secret URLs and the WorkOS client id (public by design). The refresh token lives only in the OS secure store; the access token only in memory.
- **One React.** `apps/web` and `apps/mobile` must resolve to compatible React versions: the repo pins `react`, `react-dom` and `@types/react` to the version the chosen Expo SDK requires, in one Renovate group with Expo's own check (`expo install --check` or `expo-doctor`) in CI (3.3).
- New shared packages build to `dist` (ESM plus `.d.ts`) and export `import: dist`, like `finance-engine`, because Metro and Node cannot load workspace TypeScript with `.js` specifiers.
- Commits: conventional commits for release-please. Before any PR the four commands pass: `bun run lint`, `bun run check-types`, `bun run test`, `bun run build` (AGENTS.md section 5), prefixed with `rtk`.

## Review Focus
The five failure modes the plan implies that are easiest to ship by accident, most likely first. Each is pinned by a test in the owning task.

1. **Offline or 5xx shown as "no accounts yet".** Expected: error state with retry, or stale data with an age label. Pinned in T4.4 (`useWorkspace` with failing fetch and with an empty 200).
2. **Cold start offline wipes the cache or ends the session.** Expected: refresh failing on the network gives the `restoredOffline` state (cached reads allowed, writes disabled, retry later); only `invalid_grant`, 400 or 401 end the session. Pinned in T3.6 and T3.7.
3. **A 401 mid-session logs the user out, or many 401s cause a refresh storm.** Expected: one single-flight refresh, the original request retried once; a second 401 or a rejected refresh ends the session. Pinned in T1.3 and T3.8.
4. **Numbers arrive as strings, null or unknown** (`Account.balance` is decimal(12,2), optional rates and terms are null). Expected: zero is distinct from unknown; unknown shows "Not set" or "Not calculated", never 0 and never NaN. Pinned in T1.6 and every calculator task.
5. **Sign-out or account deletion leaves data or a working token behind.** Expected: secure store, query cache, MMKV, demo and lock state cleared; after deletion a still-valid access token cannot recreate the profile (tombstone, B6). Pinned in T3.9 and T7.23.

Also easy to miss and covered by the per-milestone accessibility exit check: 200 percent font scale and a 320 pt wide device must not clip, overlap or hide the primary action.


---

## 1. Scope and what was learnt from the old app

**In scope:** every row in the inventory marked P0 to P2, plus the store-mandated items (account deletion, privacy policy link, reviewer access). **Out of scope for v1:** push notifications, widgets, Apple Watch, iPad-optimised layouts, in-app purchases, marketing pages, full offline editing, bank OAuth connect until E6 ships a real callback.

**What the old app teaches (do not repeat):** 0 tests; mock sign-in with a biometric bypass; every request carries `mock-session-token`; `apiFetch` flips a sticky mock mode on any failure, including a 404 from endpoints that do not exist and an empty 204 body; writes report success without persisting; fabricated bank connections; hex and an inverted slate scale copied by hand into `theme.ts`; seven copies of `formatCurrency`; tax and amortisation maths re-implemented; no accessibility props; relative cross-package import; secure store used for a theme preference; no sign-out; one `useState` as navigator. Each is turned into a rule in the Global Constraints or a task below.

## 2. Technology decisions

Each decision: options, trade-offs, recommendation. "Owner" marks a decision in section 10.

### 2.1 Framework

| Option | For | Against |
|---|---|---|
| **Expo (managed, Dev Client) + React Native** | Same language, React and TypeScript as web; shares `finance-engine`, contract and format packages; EAS builds without a Mac for Android; config plugins cover Face ID, secure store, deep links; the old app is already Expo so the team has seen it | Native module upgrades follow Expo SDK cadence; Dev Client needed (no Expo Go) for MMKV |
| Bare React Native | Full native control | Hand-maintained Xcode and Gradle projects, no gain for this feature set |
| Flutter or native Swift/Kotlin | Best platform feel | Cannot share the engine (a second maths implementation is the B-07 failure again); two or three codebases for a one-person project |
| PWA or Capacitor wrapper of the web app | Cheapest | The web app is server-rendered React Router 7 with cookie sessions; owner decision is a native rebuild; store acceptance and a11y control are weaker |

**Recommendation: Expo + React Native with a Dev Client, new architecture on (the Expo default for the pinned SDK), Hermes.** Pin the SDK version chosen in T0.1 (the old app is on SDK 58, RN 0.88; take the latest stable at build time and record it). Expo Go is used only for throw-away spikes.

### 2.2 Navigation

Options: Expo Router (file-based, built on React Navigation 7), plain React Navigation, `react-native-screens` by hand. **Recommendation: Expo Router.** Typed routes, deep links and universal links come from the file tree, one source of truth replaces the old `useState` tab switch and `pageConfig`-style manifests (I-12). Structure: `(auth)` group (sign-in, demo), `(app)` group with bottom tabs **Home, Accounts, Budget, Plan, More**; Plan holds Debt, Savings, Pension, Mortgage, Forecast, Tax; More holds Profile, AI & MCP, Tools, Bank connections, About. Tab order and labels come from one typed manifest, `src/navigation/pages.ts`, which mirrors web `APP_PAGES` keys so the two apps cannot drift (a test compares the key sets).

### 2.3 State and data fetching

Options: TanStack Query; SWR; Redux Toolkit Query; hand-rolled hooks; Jotai only (web uses jotai for the local baseline/scenario atoms). **Recommendation: TanStack Query v5 for server state** (cache, retry, invalidation, persistence, `dataUpdatedAt` for the stale label, offline detection through `onlineManager`) **plus React context for session and theme**, and `useState`/`useReducer` for form and calculator state. No global store. Query keys come from one factory (`queryKeys.ts`). Retry: queries retry 2 times on `unavailable` and `server` only; never on `unauthorised`, `forbidden`, `not-found`, `client`.

**401 handling is in the client, not in screens.** On a 401 the client asks the token manager for one single-flight refresh and retries the original request once. Only a second 401, or a refresh rejected as terminal (4.2), signals session end. Screens never see the intermediate 401.

**Workspace load:** web's `loadWorkspaceSnapshot` fetches accounts, account-details, profile, then optional budget, tax, connections and portfolio-snapshot. Mobile uses per-resource queries composed by screen-level hooks (`useWorkspace({budget, tax, ...})`) following E5 D2-A: any requested core resource failing puts the screen into the error state; optional resources fail per section with "We couldn't load X. Try again" and **no empty-state copy under a failed section**.

### 2.4 API client reuse and a typed shared client

Facts: web has `services/api-client.ts` (browser `apiFetch`) and `backend-client.server.ts` (`backendFetch`), both throwing `BackendError` with seven kinds; `window.ENV` ties the browser one to web. The backend has no OpenAPI and no exported types; DTOs are TypeScript interfaces; `Account.balance` is a decimal string risk.

Options: (a) copy web's client into the app; (b) extract a shared package; (c) generate a client from OpenAPI (needs `@nestjs/swagger` on the backend first); (d) share raw TypeScript types only.

**Recommendation: (b) now, with zod schemas, and keep (c) as a later option.** Two new packages:

- `packages/api-contract` (`@flump/api-contract`): zod schemas and inferred types for each response and request body the mobile app uses (accounts, account details, portfolio snapshot, user profile, budget entries, tax records, bank connections, MCP tokens, context pack). Parsers coerce known wire quirks (decimal strings to numbers, null to undefined) in one place. Backend adoption (controllers validating against the same schemas, which is E1 D-08) is a follow-up, not a prerequisite.
- `packages/api-client` (`@flump/api-client`): `createApiClient({ baseUrl, getAccessToken, onUnauthorised, fetch?, timeoutMs? })` returning typed methods per endpoint, plus `BackendError`, `kindFromStatus`, `ACTION_MESSAGE_BY_KIND` copied from web with identical semantics and tests. Uses only `fetch` and `AbortController`, so it runs in Node tests, React Native and (later) web. 204 and empty bodies are handled explicitly (`allowEmpty`), never as a failure.

Web migration to these packages is **not** in E12 (owner decision D12); a guard test in the new package pins behaviour equal to web's `api-client.test.ts` cases so a later migration is mechanical. Until then the duplication is a known, documented, small cost.

### 2.5 Forms

Options: react-hook-form + zod resolver; Formik; hand state (web style). **Recommendation: react-hook-form with `@hookform/resolvers/zod`**, schemas shared from the contract package, one `FormField` primitive wrapping label, input, helper text and error with accessibility wiring. Blank numeric inputs stay `undefined` and are sent as absent, never as 0 (web fix `1af60a4`). Error text is associated with the field and announced.

### 2.6 Charts and their accessibility

Options: `victory-native` (Skia, rich, heavier, needs Skia), `react-native-gifted-charts`, `react-native-svg` + `d3-shape` (web already uses d3-shape and recharts). **Recommendation: `react-native-svg` + `d3-shape` behind a small `@/charts` module** (Area, Bar, Donut, Line, Progress) so the dependency count stays low and the same shapes as web are produced. Skia is deferred.

Accessibility rules (mirrors E8 `ChartFigure`): every chart is wrapped in `ChartFigure` with a one-sentence text summary as `accessibilityLabel` and an always-available **"View as table"** toggle that renders the data as a list with tabular numbers. Charts are not the only carrier of information. Colours come from `chart.*` tokens; series are distinguishable without colour (pattern or direct labels). Negative values keep their sign and bars never clamp small values (K-10).

### 2.7 Secure storage

`expo-secure-store` (Keychain on iOS, Keystore-backed encrypted prefs on Android) for the refresh token only, with `keychainAccessible: WHEN_UNLOCKED_THIS_DEVICE_ONLY` and no iCloud sync. The access token lives in memory. Non-secret preferences (theme, last tab, runway inputs) use plain `AsyncStorage` or MMKV. The **offline query cache** holds financial data, so it uses MMKV in encrypted mode with a random key generated at first run and kept in secure store (so wiping the Keychain item makes the cache unreadable). Secure store limits (about 2 KB per item on some Android versions) mean the refresh token goes in alone, and a test pins a representative WorkOS-sized token.

### 2.8 Offline behaviour and caching policy

Policy (owner confirms in D4):
- **Reads:** cache last successful responses per resource, encrypted, maximum age 7 days, cleared on sign-out and when a session ends. When offline or the backend is unreachable and a cache exists, show data with a persistent banner "Showing saved data from <relative time>. Can't reach Flump." Without a cache, show the error state. A cache hit is **never** presented as current.
- **Restored, offline, unverified.** On cold start the app has a refresh token but cannot yet prove it is valid (no network). It enters the explicit session state `restoredOffline` (4.2): cached reads are allowed, **all writes are disabled** with an inline reason, a banner explains, and the app retries the refresh on reconnect, on foreground and on a capped back-off. Success moves to `signedIn`; a terminal rejection moves to `sessionEnded` and only then is the cache cleared. This is the only way D4-A and the auth design are consistent.
- **Writes:** online and `signedIn` only. No local queue, no optimistic persistence in v1 (the old app's fake success is the anti-pattern). Optimistic UI is allowed only with rollback on any error.
- **Calculators:** work fully offline, because they are engine calls on typed inputs. Inputs they derive from the workspace use cached data and say so.
- **Refetch:** on foreground, on reconnect, on pull to refresh, after every mutation (invalidate the affected keys).

### 2.9 Push notifications

No backend capability exists (no device tokens, no scheduler, no notification triggers). **Recommendation: out of v1** (D8). If wanted later it needs a device-token endpoint, a scheduler, consent UX and App Store entitlement, which is its own epic. No `expo-notifications` dependency is added now.

### 2.10 Deep links

Scheme `flump://` plus universal and app links on the production host once the owner has a domain (D3). Table (also tested): `flump://home`, `/accounts`, `/accounts/:id`, `/budget`, `/plan/debt|savings|pension|mortgage|forecast|tax`, `/profile`, `/mcp`, `/tools/:slug`, `/auth/callback` (reserved for WorkOS). Rules: a deep link while signed out stores the target and resumes after sign-in; links to unknown routes, unsupported tax years or disabled pages land on Home or an enable prompt, never a crash; no deep link ever performs a mutation or carries a token.

### 2.11 Theming and dark mode from the shared tokens

Facts (**VERIFIED IN CODE**): tokens live in `packages/ui/src/tokens/index.ts` as plain objects (`colors`, `fonts`, `fontSizes`, `spacing`, `radii`, `shadows`, `semanticTokens` with `{ base, _dark }` values that reference `{colors.indigo.600}`); Panda has no React Native target; the old `theme.ts` flattened `{base,_dark}` to `base` and drifted (H-09). The E8 token fixes are **already on main** (`primary.solid` exists, `border.input` is slate.500 light and `rgba(255,255,255,0.40)` dark, `tokens.a11y.test.ts` exists), so mobile has no E8 token dependency left; T1.17 only confirms the existing test passes at the base commit.

Options: (a) NativeWind or Tailwind-style; (b) hand-copy values (the old failure); (c) generate a native token file from `@repo/ui`; (d) **extract tokens into a small `@flump/tokens` package that both the Panda preset and the native generator read**.

**Recommendation: (d).** New `packages/tokens` (`@flump/tokens`) holds the token objects and their tests (moved, not rewritten); `packages/ui/src/tokens/index.ts` re-exports from it so no web import changes; `panda.preset.ts` is unchanged in behaviour. The native generator (`packages/tokens/scripts/build-native-tokens.ts`) resolves each semantic token's `{base,_dark}` references to concrete values and writes `native.generated.ts` (exported as `@flump/tokens/native`, no React or Panda imports), with spacing, radii, font sizes and shadows as numbers (rem to pt at 16). This keeps `apps/mobile` free of `@repo/ui` and its `styled-system`, and stops mobile from depending on the web design system's build. Acceptance for the extraction (T1.15): the generated Panda `styled-system/tokens` output is byte-identical before and after, and web build and tests stay green. If the owner prefers not to touch `packages/ui` (D23), the fallback is option (c): the generator lives in `packages/ui` and mobile imports its `native-tokens` subpath.

The mobile `ThemeProvider` exposes `useTheme()` returning `{ scheme, colors, spacing, radii, type }` with typed semantic keys; the scheme follows the system with a user override in plain storage. A test regenerates the file and diffs it against the committed copy (fails CI when tokens change without regeneration) and runs the E8 contrast pairs against the generated values (5.2). Fonts: web's font stack is loaded with `expo-font`; tabular numerals use `fontVariant`.

### 2.12 Internationalisation and en-GB formatting, tabular numbers

Web uses `useFormatCurrency` (locale per currency, fallback en-GB; I-02 notes this versus the en-GB law) and i18next with **`supportedLngs: ["en", "es"]`** (`apps/web/app/i18n.ts:2`, locale files in `apps/web/public/locales/{en,es}`). Whether mobile ships Spanish is an owner decision (D22); the recommendation is **en-GB only in v1**, but the string layer is built so Spanish is additive: all user-visible strings live in typed `copy` modules per feature and `i18next` is wired at the root with a single `en-GB` resource. If the owner wants Spanish at launch, translations are a separate task per milestone and the copy review gains a Spanish pass; the inventory marks affected rows.

New package `packages/format` (`@flump/format`): `formatCurrency(value, currency)`, `formatPercent`, `formatDate`, `formatTaxYear`, `formatCompactCurrency`, `formatRelativeTime`, all `Intl`-based with `en-GB`, rejecting NaN and null (return a caller-supplied placeholder). Hermes `Intl.NumberFormat` and `DateTimeFormat` with `en-GB` and `currency` style are verified in spike T0.4 before the API is frozen; the fallback if a platform lacks locale data is a pure-JS formatter with the same tests. The app never calls `toLocaleString()` directly (check script). Currency follows the profile currency; the locale-per-currency question (I-02) is followed, not re-decided: the shared package takes whichever way web resolves it, default en-GB.

### 2.13 API versioning and compatibility policy

The backend has no versioning, no OpenAPI and no request validation (B3), and a mobile binary stays on a user's phone for months after the backend changes. Policy:
- **Tolerant reading.** Parsers strip unknown fields and treat unknown enum values (for example an account `type` the app does not know) as `unknown` with a neutral display and "Update the app to see this", never as an error and never silently as a known value.
- **Client identification.** Every request carries `X-Flump-Client: mobile/<app version> (<platform>)` (set by `@flump/api-client`, T1.4).
- **Minimum supported version.** A backend ticket (B12) adds `GET /app/client-policy` (unauthenticated) returning `{ minVersion, recommendedVersion }` per platform. The app checks it on launch and foreground (cached for an hour); below `minVersion` it shows a blocking "Update required" screen with a store link, with no data screens reachable. If the check itself fails, the app proceeds (fail open for this check only).
- **Additive-only changes** for existing endpoints during the supported-version window; breaking changes need a new path and a raised `minVersion` after most users have updated.
- A risk row (R18) and an e2e flow (`update-required-screen`) cover it.


---

## 3. Monorepo structure

### 3.1 Layout

```
apps/
  mobile/                 NEW  @flump/mobile  (Expo app, Expo Router)
  mobile-companion/       OLD  untouched until M10, then deleted in its own PR
packages/
  tokens/                 NEW  @flump/tokens         design tokens (moved from ui) + native generator
  api-contract/           NEW  @flump/api-contract   zod schemas and types
  api-client/             NEW  @flump/api-client     fetch client, BackendError, messages
  format/                 NEW  @flump/format         en-GB formatters
  finance-engine/         EXISTING  reused as is, plus characterisation vectors (T1.21)
  ui/                     EXISTING  re-exports tokens from @flump/tokens; otherwise untouched
  typescript-config/      EXISTING  gains expo.json (extends base, jsx react-native, moduleResolution bundler)
```

All new packages build to `dist` with `tsc` (ESM, `.d.ts`), export `import: ./dist/index.js`, and have Turbo `build` tasks, the same pattern as `finance-engine` (Metro and Node cannot load workspace `.ts` that uses `.js` specifiers).

`apps/mobile` internal layout (all components colocated per the law):

```
app/                       Expo Router routes (thin: import screens)
app/(dev)/                 gallery and engine-smoke screens, dev builds only (see 3.3 item 8)
src/
  screens/<Name>/          screen components (container + presentational split)
  components/<Name>/       shared primitives and composites
  charts/                  scales, axes, ChartFigure, one directory per chart type
  features/<feature>/      hooks, queries, schemas per area (accounts, budget, debt, ...)
  navigation/pages.ts      typed page manifest
  theme/                   ThemeProvider, useTheme
  auth/                    session machine, token manager, workos flow, secure storage
  data/                    queryClient, persistence, queryKeys, offline banners
  config.ts                validated env (fails fast)
  copy/                    typed UK English strings
e2e/                       Maestro flows and the fixture server
```

### 3.2 Reuse map

| Package | Used by mobile for | Notes |
|---|---|---|
| `@flump/finance-engine` | all calculators, tax-year helpers, safe-to-spend, stage, health score | Only module for maths. Tax-year family pinned in Global Constraints. Beware near-duplicate names (inventory 4c): `calculateUKTax` vs `calculateUkTax`, `getCurrentUKTaxYear` (legacy, never throws) vs `getCurrentUkTaxYear` (use this). The onboarding seed helpers in `persistence.ts` are browser-oriented and not used |
| `@flump/api-contract`, `@flump/api-client` | every backend call | New |
| `@flump/format` | all number, currency, date display | New |
| `@flump/tokens` | colours, spacing, radii, type | New (moved out of `@repo/ui`); native output only |
| `@repo/ui` | **not imported** by mobile | Components are DOM and Panda; parity is by design spec, not shared code |
| `@flump/banking`, `@flump/mcp` | not used (server packages) | Bank brand colours copied into one allow-listed constants file; mobile calls the REST token endpoints only |
| `@repo/typescript-config` | tsconfig base | |

### 3.3 TypeScript, Metro, Bun, Turbo integration

Known risks, each pinned by spike T0.1 before any feature work:

1. **Bun linker.** Metro follows symlinks poorly under isolated installs. Expo is believed to document monorepo support (automatic `watchFolders` and resolution from SDK 52, experimental isolated-install support later; UNCONFIRMED here because Expo's docs were not fetched). First try the repo as is; if resolution fails, set `[install] linker = "hoisted"` in `bunfig.toml` only if web, backend and marketing builds and Docker images are unaffected; the fallback is an explicit `metro.config.js` with `watchFolders` and `resolver.nodeModulesPaths`. Recorded in the spike note.
2. **`finance-engine` resolution and proof.** Its exports are `import: ./dist/index.js`, `default: ./src/index.ts`, and its source uses ESM `.js` specifiers Metro cannot map to `.ts`. Use the built `dist` (the `import` condition), with Turbo ordering `finance-engine#build` before `mobile#start`, `#check-types`, `#test` and `#build`; set `unstable_conditionNames` in `metro.config.js` if Metro picks `default`. **A Jest test does not prove what Metro bundles.** The real proof is on a device or emulator: a dev-only `engine-smoke` screen (excluded from production, item 8) runs engine vectors and a Maestro flow asserts "All vectors pass" (T0.1 first, then T1.23 as a permanent CI flow). jest-expo needs `transformIgnorePatterns` that let `@flump/*` ESM `dist` through the transform; a Jest case proves that configuration, nothing more.
3. **TypeScript.** Root pins `typescript 7.0.2` with a `@typescript/typescript6` shim present. T0.1 confirms `expo/tsconfig.base` and `tsc --noEmit` work under the pinned compiler; otherwise `apps/mobile` pins the compiler Expo supports as a workspace-local devDependency. Strict mode on, `noUncheckedIndexedAccess` on, zero `any` (the old app had 30).
4. **Panda and tokens.** Mobile does not import `@repo/ui` at all (it pulls `styled-system`); it imports `@flump/tokens/native`. A test asserts the generated native file imports nothing.
5. **Turbo.** `apps/mobile` defines `lint`, `check-types`, `test`, `build` (an `expo export` bundle check for both platforms, not an EAS build) so the root scripts cover it. `generate` runs the native-token generator. Native builds never run under `turbo run build`; they run in EAS. `dev` is persistent and uncached. Generated native folders (`ios`, `android`, `.expo`) are gitignored (continuous native generation).
6. **Lint and format.** Biome covers `apps/mobile`. A Biome `noRestrictedImports` override forbids `react-native` `Pressable`, `TouchableOpacity`, `Text` and `TextInput` outside the primitives directory. Extra checks added to `check:laws` (T1.18): no hex literals in `apps/mobile/src` except the allow-listed bank brand constants file; no `toLocaleString`; no tax literals; no mock-auth literals.
7. **Docker images.** **VERIFIED IN CODE:** `apps/backend/Dockerfile`, `apps/web/Dockerfile` and `apps/marketing/Dockerfile` each `COPY` every workspace `package.json` (including `apps/mobile-companion/package.json`, lines 11) and run `bun install --frozen-lockfile --ignore-scripts`, which installs every workspace's dependencies, so adding the Expo tree would bloat and slow all three images. Task T0.8 updates all three before any new workspace merges (and T2.23 keeps a CI check): add `COPY` lines for the new workspaces (needed for a frozen lockfile), install only the needed workspaces with a Bun filter (`bun install --frozen-lockfile --ignore-scripts --filter '<app>...'`, confirmed to work with the repo's Bun version in the task), and prove it with a Docker build per image and an image-size comparison. T10.4 removes the old `mobile-companion` COPY lines and the `.dockerignore` special case (N-06 asks for `apps/mobile-companion/**` to be ignored except its `package.json`; that special case goes when the app is deleted).
8. **Dev-only routes in production.** `app/(dev)/gallery` and `engine-smoke` exist only when `EXPO_PUBLIC_ENABLE_DEV_ROUTES=1` (set by the `development` and `e2e` EAS profiles only). Expo Router includes every file under `app/`, so the dev routes are guarded by a Metro `resolver.blockList` entry in production profiles, and CI greps the exported production bundle for `engine-smoke` and `Gallery` and fails on a hit.
9. **React alignment and Renovate.** `apps/web` is on `react` and `react-dom` 19.3.1 and the old app matched; Expo pins the React version per SDK. Rule: the repo uses one React version, set by the Expo SDK chosen in T0.1 (web follows it, or web keeps its own copy and the mobile app never shares a hoisted `react`; T0.1 records which). `renovate.json` gets a `packageRules` group for `react`, `react-dom`, `@types/react`, `@types/react-dom`, `react-native`, `expo` and `expo-*` so they move together, and CI runs `expo-doctor` (T2.2).

### 3.4 CI changes (details in section 6.4)

New jobs in `.github/workflows/ci-pipeline.yml`: `mobile-checks` (ubuntu: lint, types, jest, contract tests, token regeneration diff, `expo export` bundle build for both platforms, bundle greps, `expo-doctor`) added at T2.1; **`mobile-e2e-android` (Maestro on an Android emulator) added right after the first sign-in flow exists (T3.17), not at the end**, so every later milestone is covered by it; iOS e2e is manual or nightly. Remember E11 D7: gates are advisory on a private free repo, and Railway "Wait for CI" is the only enforced gate, so a failing mobile job does not block backend or web deploys unless the owner changes that.

---

## 4. Auth and security

### 4.1 Facts, with their confidence

**VERIFIED IN CODE**
- Web uses `@workos-inc/authkit-react-router` (server session cookie) and forwards the AuthKit access token to the backend as `Authorization: Bearer`.
- Backend (`auth.config.ts`, `workos-jwt.verifier.ts`): mode `workos` when `WORKOS_CLIENT_ID` is set; RS256 signature against `https://api.workos.com/sso/jwks/<clientId>`, requires `exp` and `sub`, accepts issuers `https://api.workos.com` and `https://api.workos.com/user_management/<clientId>` (override `WORKOS_ISSUER`), no audience check, **no `clockTolerance`** (the `jwtVerify` call at `workos-jwt.verifier.ts:53` passes none, so a phone clock a few seconds fast gets 401s on fresh tokens; backend ticket B9). Dev bypass needs `NODE_ENV=development`, no `WORKOS_API_KEY`, `AUTH_DEV_BYPASS=true`, and accepts only `mock-session-token` as `dev_user_123`.
- `getProfile` calls `findOrCreateProfile` (`user-profile.service.ts:161-181`), so any valid token for a deleted user recreates an empty profile (this drives the B6 design).
- The E1 open question (exact issuer string against a live token) is still open; native sign-in uses the same client id and so the same issuer.

**CONFIRMED (primary source: WorkOS docs, read 2026-11-11)**
- Code exchange (`POST /user_management/authenticate`, `grant_type=authorization_code`): `client_secret` optional; `code_verifier` required when the secret is absent (workos.com/docs/reference/authkit/authentication/code).
- **Refresh (`grant_type=refresh_token`): `client_secret` is listed as optional** (workos.com/docs/reference/authkit/authentication/refresh-token). This corrects an earlier draft of this plan that read it as required. Optional means a public-client refresh is allowed; whether WorkOS enforces extra conditions for a client with no secret is not stated.
- The same page says refresh tokens "may be rotated after use, so a replacement refresh token is also provided".
- `workos-node` has a public-client mode and WorkOS publishes iOS and Android SDKs, which suggests native flows are supported (blog and SDK pages, secondary sources).

**UNCONFIRMED (not stated in the docs read; each must be settled in spike T0.2 or T0.3 before M3 is sized)**
- Whether rotation invalidates the old refresh token immediately, any reuse-detection or **grace window** (a "30 seconds" figure was suggested to us but appears nowhere in the pages read), and the error body for a dead refresh token (`invalid_grant` is the OAuth norm but is not documented on the pages read).
- Access-token lifetime.
- Whether the dashboard accepts a **custom URL scheme** redirect URI (`flump://auth/callback`) for production; secondary sources say WorkOS's iOS guide suggests a custom scheme or a Universal Link, but the redirect-URI page redirected and could not be read. Custom schemes can be claimed by other apps (PKCE protects the exchange, not the redirect), so Universal Links or Android App Links are the hardening path.
- Logout without a browser: the session helper docs say the browser should be redirected to the logout URL and mention no session-revoke API; whether a server-side revoke exists (and whether `@workos-inc/node` exposes it) must be checked.
- Whether the access token carries an `email` claim (affects password reset and B4).
- The exact authorize and exchange parameters used in 4.2 (`provider=authkit`, `screen_hint`, an S256 `code_challenge`, `sid`-based hosted logout) come from WorkOS references and secondary sources; T0.2 and T0.3 exercise each one.
- Behaviour of `ASWebAuthenticationSession` with `preferEphemeralSession` and WorkOS hosted pages (cookies, password-manager autofill, whether sign-in after sign-out asks for credentials).

### 4.2 Session states and native flow (recommended)

**States:** `loading` (reading secure store) → `signedOut` (no refresh token) | `signedIn` (access token valid) | `restoredOffline` (refresh token present, validity not yet provable) | `sessionEnded` (refresh terminally rejected). Internal substate `refreshing`.

**Transitions that matter**
- Cold start with a refresh token: attempt refresh. Success: `signedIn`. **Network failure, timeout, DNS, 5xx, any non-terminal result: `restoredOffline`.** Terminal result (`invalid_grant`, 400, 401 from the token endpoint): `sessionEnded`, tokens and cache cleared. `restoredOffline` allows cached reads and disables all writes; it retries on reconnect, on foreground and on a capped back-off, and moves to `signedIn` or `sessionEnded` as the result dictates. It never clears cache or tokens by itself.
- Mid-session API 401: **one single-flight refresh and one retry of the original request.** A second 401, or a terminal refresh rejection, goes to `sessionEnded`. A retryable refresh failure goes to `restoredOffline` (the app is offline or the backend is down), not to `sessionEnded`.
- Proactive refresh: if `exp` is within 60 seconds, refresh first (same single-flight promise). The client estimates clock skew from the `Date` response header and applies it to the `exp` check; backend ticket B9 adds a small `clockTolerance` (30 seconds) so skew cannot reject fresh tokens.
- Rotation: the new refresh token is persisted to secure store **before** the new access token is used and before the old one is discarded. If the app dies after WorkOS rotated but before the write and WorkOS invalidates the old token immediately (UNCONFIRMED), the next cold start gets `invalid_grant` and the user signs in again; this is acceptable and logged only as a terminal refresh rejection.

**Sign-in**
1. Build `GET https://api.workos.com/user_management/authorize` with `client_id`, `redirect_uri`, `response_type=code`, `provider=authkit`, `code_challenge` (S256), `state`; `screen_hint=sign-up` for sign-up. Verifier and state stay in memory for the flow.
2. `expo-web-browser` `openAuthSessionAsync` (ASWebAuthenticationSession on iOS, Custom Tabs on Android). The app never sees credentials. **`preferEphemeralSession` decision (I2):** use `true` on iOS so no hosted-session cookie persists after sign-out (sign-in after sign-out always asks for credentials, no hosted logout round trip needed on iOS). Android Custom Tabs are believed to have no stable ephemeral mode (UNCONFIRMED: Chrome has experimental ephemeral Custom Tabs; T0.3 checks), so the hosted session persists in the browser and Android sign-out needs the hosted logout URL. UNCONFIRMED behaviours (autofill in ephemeral mode, the iOS system consent sheet on logout) are checked in T0.3; the task must include a real-device test that **sign-in after sign-out asks for credentials** on both platforms.
3. Check `state`, exchange the code with `code_verifier` and no secret (CONFIRMED allowed). Access token to memory; refresh token to secure store.

**Refresh path (decided by T0.2):** primary is a direct WorkOS refresh with no secret (documented as optional). **The backend broker is a fallback only**, built (T3.18) only if T0.2 shows secretless refresh is rejected or unreliable. The broker (`POST /auth/mobile/refresh`) holds the secret server-side, is unauthenticated by bearer (the refresh token is the credential), throttled per client IP with Express `trust proxy` set correctly for Railway's proxy so the throttle sees real client IPs rather than the proxy, logs no tokens, and returns generic errors.

**Sign-out (T3.9, T3.10):** clear secure store, query cache, MMKV, privacy and lock state, demo state and the in-memory access token first (local wipe never depends on the network). Then, best effort: iOS with an ephemeral session skips the hosted logout; Android and non-ephemeral iOS open the hosted logout URL (using the `sid` claim) through the auth session. The hosted logout can show a system prompt on iOS; if it fails or is cancelled, the app is already signed out locally and shows a one-line non-blocking notice that the browser session may remain until the user signs out on the website (Android). If WorkOS offers a server-side session revoke (T0.3), the backend calls it from an authenticated `POST /auth/mobile/logout` before the local wipe, which removes the browser dependency.

**Account deletion (store rule, backend B6, task T7.23).** Order matters because a still-valid token for a deleted user would otherwise recreate an empty profile through `findOrCreateProfile`:
1. App sends `DELETE /user-profile` (typed confirmation first).
2. Backend, in this order: (a) revoke the user's WorkOS sessions and delete the WorkOS user (abort here without touching data if this fails, so the user can retry); (b) write a **tombstone** row `(userId, deletedAt)`; (c) delete all user rows in one database transaction (accounts, details, transactions, bank connections with stored provider tokens, budget entries, tax records including receipts, MCP tokens, profile); (d) return 204.
3. `AuthGuard` rejects any token whose `sub` has a tombstone with 401, for as long as tokens could still be valid (keep the tombstone permanently, it holds only an id and a date), so `getProfile` cannot recreate the profile. Deletion is idempotent and has cross-user isolation tests.
4. The app then runs the sign-out wipe.

**Biometric app lock** (optional setting, prompted once after first sign-in): `expo-local-authentication` locks the UI after the configured background time. It protects the screen, never the API; it is not a sign-in path, never stores credentials, and the lock screen offers "Sign out".

Alternatives rejected: AuthKit React SDK in a webview (credentials inside the app process, no shared system browser, review risk); resource-owner password grant (unsafe); the web session cookie (not available to native). Redirect URI: custom scheme first, Universal Link and App Link later once the owner has a domain (D3); registering it in the WorkOS dashboard per environment is an owner task (T0.7).

### 4.3 Transport and bundle policy

- HTTPS only in release. iOS App Transport Security stays default; Android `usesCleartextTraffic` is false in release. The `development` and `e2e` profiles use a **network security config that permits cleartext only for `localhost`, `10.0.2.2` and the e2e fixture host** (no blanket cleartext), and `config.ts` permits an `http` API URL only when `envName` is `development` or `e2e` and the host is in that list; any other combination fails fast.
- `config.ts` validates `EXPO_PUBLIC_API_URL`, the WorkOS client id and auth base URL and fails at launch (developer message in dev, an honest "This build is misconfigured" screen in release).
- **No certificate pinning in v1** (D10).
- No secret in the bundle. Allowed public values: API URL, WorkOS client id, redirect scheme. CI greps the exported production bundle for `sk_`, `WORKOS_API_KEY`, `client_secret`, `mock-session-token`, `dev_user_123`, `10.0.2.2`, the fixture host and the dev-route names, and fails on a hit.
- Logging: no tokens, balances or profile fields in release logs (`console` stripped in production). Crash reporting if adopted (D7) scrubs PII and request bodies.
- **Backend clock tolerance (B9):** add `clockTolerance: "30s"` to `jwtVerify` with a test using a token whose `iat`/`exp` is 20 seconds in the future/past. Without it, clock skew produces spurious 401s that the client would otherwise misread.

### 4.4 Privacy options

- **Privacy mode:** a header toggle masks all monetary amounts; persisted; screen readers read "Hidden".
- **App-switcher masking:** blur overlay when inactive (iOS) and `FLAG_SECURE` through `expo-screen-capture` on Android for balance screens (user setting to allow screenshots).
- **Backups:** secure-store item excluded from iCloud and Android auto backup; the encrypted cache excluded from Android backup.
- **Clipboard:** the MCP token copy sets an expiring clipboard entry where the OS supports it; the raw token is cleared from state when the screen closes.
- **Crash reporting (D7 recommendation changed):** crash-only reporting with PII scrubbing (no breadcrumbs with request bodies, no user identifiers beyond a random install id) is recommended over none, because a finance app with no crash signal cannot be supported; no analytics. Store privacy labels follow the owner's final choice.
- Required links: privacy policy and terms URLs (owner supplies; a hosted privacy policy is an M9 gate, D20).

### 4.5 Honest error states and `ConfirmDialog` equivalents

Components in `src/components`: `ErrorState` (kind-based title and message from the shared copy map, Retry, and for `unauthorised` the "Sign in again" action), `InlineError`, `StaleBanner`, `RestoredOfflineBanner` (explains writes are disabled), `EmptyState` (only for a successful empty response), `LoadingState`, `ConfirmDialog` (focus trap, title naming the thing, consequence text, destructive primary labelled with the verb, cancel as default, optional typed confirmation for account deletion and data reset), `UpdateRequiredScreen`, `useMutationOutcome` (maps a `BackendError` to a toast or inline message with `AccessibilityInfo.announceForAccessibility`). A guard test greps screens for direct `Alert.alert` outside `ConfirmDialog` (I-06).

### 4.6 Backend tickets this plan depends on

| ID | Ticket | Needed by |
|---|---|---|
| B1 | Account history endpoints: `POST /accounts/:id/details/year`, `PUT /accounts/:id/details`, `DELETE /accounts/:id/details/:year` (web already calls them; none exist) | T7.6, T7.7 |
| B2 | Refresh broker `POST /auth/mobile/refresh` (**fallback only**, if T0.2 shows secretless refresh is rejected) | T3.18 |
| B3 | Request validation (E1 D-08) | follow-up |
| B4 | `send-password-reset` ignores a body email and resolves the email from the user id | T6.25 |
| B6 | `DELETE /user-profile` with tombstone and WorkOS user deletion (4.2) | T7.23, M9 |
| B9 | `clockTolerance` in the JWT verifier | T3.19 |
| B10 | Receipts: omit `receiptData` from `GET /tax-records` (list returns metadata only), add `GET /tax-records/:id/receipt`, set an explicit request body limit | T6.17, T6.18 |
| B11 | Avatar: it is a data URL in `user_profile.avatar_url` (**VERIFIED IN CODE**, text column returned on every `GET /user-profile`); cap its size server-side and return it only when asked, or move it to its own endpoint | T6.23 |
| B12 | `GET /app/client-policy` (minimum and recommended client versions) | T4.1 |
| B13 | Web account-deletion route and privacy policy page (apps/web or marketing) | T7.24, M9 gate |
| B5 | Bank OAuth callback, signed state, one `redirect_uri` (E6; see the inventory) | T7.5 |
| B7 | No REST rate limiting (E1/E11; recommended before launch, R27) | none directly |
| B8 | `Account.balance` decimal strings (handled by the contract package, T1.6, T1.19) | none |

Each ticket is implemented by a sized task: B1 is T7.28, B4 is T7.31, B6 is T7.26 and T7.27, B9 is T3.19, B10 is T7.29, B11 is T7.30, B12 is T4.13, B2 is the contingent T3.18, B13 is T7.24; B3 stays a follow-up.

**VERIFIED IN CODE for B10:** `GET /tax-records` does `find({ where: { userId }, order })` with no column selection, so every list response includes every record's base64 `receiptData` (`tax.controller.ts:56-63`), and `receiptData` is in the write allow-list (`:35`). `main.ts` sets no JSON body size option, so Nest's default body limit applies (about 100 kB for Express JSON, UNCONFIRMED for this Nest version), which would reject a base64 photo; the ticket sets an explicit limit (for example 5 MB) and a matching client cap.

---

## 5. Accessibility and design laws

### 5.1 Rules

1. **Screen readers.** Every pressable has `accessibilityRole`, `accessibilityLabel` (never the glyph), `accessibilityState` (selected, disabled, busy, expanded); decorative icons are hidden. Group rows as single focusable elements with a composed label ("Barclays current account, balance £1,204.50, tap to open"). Headings use `accessibilityRole="header"`. Order follows reading order; modals trap focus and restore it on close. Errors and success are announced. Charts: 2.6.
2. **Dynamic type.** `allowFontScaling` stays on; `maxFontSizeMultiplier` is 2.0 on body and 1.6 on dense numeric tiles only, with layouts that wrap rather than truncate. No fixed-height text containers. Minimum visible font is 12 pt (the old app used 9 to 11).
3. **Touch targets.** 44 pt iOS and 48 dp Android minimum via the `Pressable` primitive (`hitSlop` when the glyph is smaller). Spacing between adjacent targets at least 8.
4. **Reduced motion.** `AccessibilityInfo.isReduceMotionEnabled` through a `useReducedMotion()` hook; all Reanimated transitions have a no-motion path (instant or cross-fade); no parallax or auto-playing animation; chart entrance animations off.
5. **Contrast.** Section 5.2.
6. **Colour independence.** Positive and negative values carry a sign or label as well as colour; status badges include text.
7. **Focus and keyboard.** Hardware keyboard and Switch Control: logical order, visible focus where the platform shows one, `returnKeyType` and next-field chaining in forms.
8. **Language.** UK English; the app declares `en-GB` so VoiceOver and TalkBack use the right voice; numbers are formatted for speech by the label builder (for example "one thousand two hundred pounds").

### 5.2 Contrast matrix from E8

E8 defined the token fixes (dark `primary` text indigo.400, `primary.solid` for fills behind `primary.foreground`, `border.input` 3:1, danger and chart pair corrections) and a token test suite checking every semantic text, border, fill and chart pair in both themes (`packages/tokens` after T1.15, today `packages/ui/src/tokens/tokens.a11y.test.ts`). **VERIFIED IN CODE:** `primary.solid` and the stronger `border.input` are already on main, so mobile does not wait for E8 token work; task T1.17 confirms the existing test passes at the base commit and records any E8 item that is genuinely still open (focus rings and sweeps are web-only and irrelevant here). T1.17 then runs the same pair matrix against the generated native values (WCAG 2.x relative luminance, 4.5 for text, 3 for UI boundaries and graphics) in both schemes and adds mobile-specific pairs: placeholder text on `surface.card` inputs, disabled state text, tab bar icon states, badges, charts on `surface.card`, focus indicator against `surface.canvas`. It is a snapshot test: a token change that breaks a pair fails the build. Known caveat carried over: `primary` indigo.600 on the dark card is only 2.77, so graphic fills use `primary` or `chart.primary`, never `primary.solid`.

### 5.3 Design laws on mobile (AGENTS.md sections 2 and 3, adapted)

- Single-row KPI strip: at most four items in one row; on narrow widths it becomes a horizontally scrollable snap row, never a tall 2 by 2 grid (`KpiStrip` component).
- Simulators use a stacked layout on phones (the web two-column split cannot apply): **parameter sheet on top is forbidden above the chart it controls** is satisfied by a sticky result summary (outcome numbers) pinned above a collapsible "Adjust" panel holding `SliderField`s, so the user sees the effect while changing the input. `SliderField`: label left, editable value pill right, slider below, never a full-width text box.
- Tables over 8 rows go in `CollapsibleSection` (amortisation, 12-month ledgers, tax tables).
- Each component directory has the five colocated files adapted for native: `X.tsx`, `X.styles.ts` (StyleSheet factory taking theme), `X.test.tsx` (RNTL), `X.stories.tsx` (decision resolved in 5.5), `index.ts`.

### 5.4 Component catalogue (design-system primitives, built in M2)

`Screen`, `Text` (variants, tabular option), `Pressable`/`Button` (variants, loading state), `IconButton`, `Card`, `Badge`, `KpiStrip`, `SliderField`, `FormField` + inputs (`TextField`, `CurrencyField`, `PercentField`, `DateField`, `Select`, `Switch`), `CollapsibleSection`, `ListRow`, `BottomSheet`, `ConfirmDialog`, `ErrorState`, `EmptyState`, `LoadingState`, `StaleBanner`, `Toast`, `ChartFigure` + charts, `ProgressBar`, `PrivacyAmount`, `SegmentedControl`, `Tabs` wrapper. Web parity names are used where a web component exists (`ConfirmDialog`, `KpiStrip`, `SliderField`, `CollapsibleDrawer` as `CollapsibleSection`).

### 5.5 Storybook equivalent

AGENTS.md requires Storybook with light and dark and zero a11y violations for web. For native: **React Native Storybook** is optional and heavy. **Recommendation (resolved here):** use a lightweight in-app **Gallery route** (`app/(dev)/gallery`, dev builds only) that renders every primitive in light, dark, 200% text and reduced-motion variants, plus RNTL tests for states and a Maestro flow that opens the gallery and runs the accessibility audit step. A `.stories.tsx` file per component is replaced by a typed `X.states.ts` export (list of named prop sets) that the gallery and the tests both consume, so the "visual states" law is one source. The owner can swap in RN Storybook later without changing components.

---

## 6. Testing strategy

| Layer | Tool | Scope | Gate |
|---|---|---|---|
| Unit (pure) | Vitest | `api-contract` parsers, `api-client` (real fetch against a local test server: failing fetch, 204, malformed JSON, timeout, abort, 401 with refresh and retry-once, version header), `format`, token generator, deep link parser, query key factory | `bun run test` via Turbo |
| Engine vectors | Vitest in `finance-engine` | **VERIFIED IN CODE: only `uk-tax.vectors.ts` exists today** (tax). The earlier plan wording implied vectors for every area; it is corrected here. T1.21 adds **characterisation vectors** for debt (`calculateDebtSchedule`, `compareAvalancheAndSnowball`, `calculateZeroPercentCliff`, `calculateOverdraftCost`, `calculateCarFinanceBalloon`, `evaluateUkStudentLoan`), mortgage (`calculateMonthlyMortgagePayment`, `calculateMortgageAmortization`, `calculateMortgageVsIsa`, `calculateLtvMilestones`) and the seven tools, recorded from the engine's current outputs and labelled characterisation (not owner-signed; only tax vectors are signed off under E4) | Same |
| Engine on device | Maestro against a dev build | The dev-only `engine-smoke` screen runs the exported vectors on the real Hermes runtime and shows "All vectors pass"; this is the proof that Metro bundles the same engine. Jest alone proves nothing about the bundle | Android CI from T3.17 (the flow runs locally from M2 and joins the job when it exists) |
| Component | jest-expo + React Native Testing Library | primitives (states, a11y props, scaled text, reduced motion), screens with an injected `ApiClient`, forms, `ConfirmDialog`, error states, banners | Same |
| Integration | jest-expo | auth state machine (every transition in 4.2), single-flight refresh, retry-once, restoredOffline, sign-out wipe, query persistence (encrypted cache, TTL, wrong key), navigation guards, deep links | Same |
| E2E | **Maestro** | flows in 6.2 against the fixture server | Android on CI, iOS local and nightly |
| Accessibility | RNTL a11y assertions per screen, token pair matrix, per-milestone manual checklist, full VoiceOver and TalkBack audits in M8 | | Exit criterion per milestone |
| Contract against the real backend | Bun test in the backend package, **real Postgres mode** | see 6.5 | Backend CI job |

jest-expo needs `transformIgnorePatterns` that transform `@flump/*` ESM `dist`; T2.1 includes a Jest case that imports `@flump/finance-engine` and `@flump/format`.

### 6.1 Why Maestro (and not Detox)

Maestro flows are YAML, run against a built app on a simulator or emulator, need no native test harness inside the app, and handle React Native, Expo Dev Client and system dialogs (permissions, the auth session sheet) better than Detox's grey-box model, which wants build-time configuration and gets brittle across Expo SDK upgrades. For a one-person project the lower setup and maintenance cost wins. Revisit if flakiness exceeds 5 percent of runs.

### 6.2 E2E flows

`signed-out-shows-sign-in`; `sign-in-happy-path`; `session-ended-state` (a second 401 after refresh shows "Your session has ended", the button signs out locally, no loop); `refresh-then-retry` (expired access token, one refresh, request succeeds); `backend-outage-is-not-empty` (503: error state, never "No accounts yet"); **`cold-start-offline-restores`** (kill the fixture server, relaunch: `restoredOffline` shows cached data, a banner, writes disabled, and recovers to `signedIn` when the server returns; the cache is not cleared); `restored-offline-terminal` (the refresh endpoint returns `invalid_grant`: session ends, cache cleared); `demo-mode-walkthrough` (no network, banner visible, exit clears); `accounts-crud-with-confirm`; `budget-add-edit-delete`; `debt-unknown-apr-not-calculated`; `tax-record-copy-year`; `profile-reset-requires-typed-confirmation`; `logout-clears-data` (relaunch shows signed-out and no cached balances); `delete-account-then-token-rejected` (fixture simulates the tombstone: the old token gets 401); `update-required-screen`; `dark-mode-and-large-text-smoke`; `deep-link-while-signed-out-resumes`; `engine-smoke`. The earlier single `stale-cache-banner` flow is replaced by `cold-start-offline-restores`, which is the real scenario.

### 6.3 How e2e authenticates without a mock path in production

A **fixture server** (`apps/mobile/e2e/fixture-server`, a small Bun script) is started by the e2e workflow and serves canned API responses and a fake WorkOS (`/authorize`, `/authenticate` for code and refresh) that issues test tokens, including expired, rotated and `invalid_grant` variants. The e2e build is a separate **EAS profile `e2e`** whose `EXPO_PUBLIC_API_URL` and `EXPO_PUBLIC_WORKOS_AUTH_BASE_URL` point at the fixture server, so the auth module takes its authorize/token base URL from config (default `https://api.workos.com`) and contains no test branch. Cleartext is allowed for that profile only for the fixture host through the network security config (4.3). The production bundle is grepped in CI for the fixture host and token strings. The real backend is not in e2e; the contract test (6.5) covers wire shape. Decision D13 records the alternative.

### 6.4 CI on GitHub free runners and simulator usage

- ubuntu-latest `mobile-checks`: lint, types, Vitest, jest-expo, token regeneration diff, `expo export --platform all`, bundle greps, `expo-doctor`. Estimated 6 to 10 minutes with the Turbo cache.
- **Android e2e** on `ubuntu-latest` with an emulator action (KVM is believed to be available on current Linux runners; verify when the job is built). **Added right after T3.17 and run on every PR that touches `apps/mobile` or the shared packages** for the core flows (sign-in, session end, outage, offline restore), with the full suite nightly and on a `run-e2e` label. Budget about 20 to 30 minutes per full run.
- **iOS e2e:** macOS runners bill at 10 times on private repos, so iOS e2e is a local script plus a manual `workflow_dispatch` job (T8.9). During development agents verify on a local iOS Simulator and the Android emulator.
- EAS Build runs on tags or manual dispatch, not per PR.
- Coverage thresholds for the new packages and `apps/mobile/src/(auth|data|features)` are set from the first green run (`coverage.thresholds`, not the flat keys that F-05 found ignored).

### 6.5 Contract test against the real backend (real Postgres)

The backend's in-memory repositories never return Postgres `decimal` as strings, so a contract test on them proves nothing about `Account.balance`. T1.19 runs in the real-Postgres mode already used by the repo (`TEST_DATABASE_URL`, `REQUIRE_DB_TESTS`; see `apps/backend/src/testing/dbTestMode.ts`, `migrations.integration.spec.ts`), with two users' rows, a signed test JWT through the injected JWKS from E1, and each response parsed by `@flump/api-contract`. To avoid a circular dependency with the schemas, the **order is: T1.5 captures real payload fixtures from the backend in DB mode first; T1.6 to T1.9 write schemas against those fixtures; T1.19 then keeps the fixtures honest in CI**.

### 6.6 Testing the maths

No mobile test re-derives tax maths. Screens are tested by asserting they pass the right inputs to the engine (the calculator function is injected so a spy can observe it) and that unknown inputs produce "Not calculated". Engine correctness stays with E4's owner-signed tax vectors and T1.21's characterisation vectors. **Risk:** E4's owner sign-off of all seven tax years is outstanding work that gates shipping M6's tax, pension and forecast screens (R19).

---

## 7. Release and distribution

### 7.1 Build and signing

EAS Build with profiles in `eas.json`: `development` (Dev Client), `preview` (release build, internal), `production` (store builds, `appVersionSource: remote` with auto-increment), `e2e` (6.3). Credentials managed by EAS; the owner owns the store accounts (D2, D18).

### 7.2 Distribution

iOS: `eas submit` to TestFlight (internal testers first, then external beta after Apple beta review). Android: Play Console internal testing, then closed and open testing. Personal Google Play developer accounts created after November 2023 must run a closed test with at least 12 testers for 14 days before production access (widely documented; UNCONFIRMED in this session because Google's policy page fetched covered deadlines only; check Play Console help before relying on it). Whether the owner's Play account is an organisation account changes this (D18).

### 7.3 Versioning and release-please

`apps/mobile` is added to `release-please-config.json` (`release-type: node`, component `flump/mobile`, package name `@flump/mobile`) and the manifest. `app.config.ts` reads `version` from `package.json`; build numbers and version codes are EAS remote auto-increment. Scope `mobile`. A release-please PR does not publish a store build; a tag-triggered or manual workflow runs `eas build` and `eas submit`. EAS Update (OTA, JS-only) is limited to the `preview` channel until the owner decides production policy (D11), because an OTA change touching money maths must not bypass review.

### 7.4 Environments

| Env | API | WorkOS | Notes |
|---|---|---|---|
| development | local backend (`http://localhost:4000` via LAN IP or `10.0.2.2`); the app does not use the backend dev bypass | staging client id | the only profile besides `e2e` allowed cleartext, and only for local hosts |
| preview | staging API if one exists, else production with a test user | staging or production client | internal |
| production | production API (value to confirm; E5 sample used `https://api.example.test`) | production client id | store |

A WorkOS staging environment is an owner action (D3).

### 7.5 Release checklist (per store build)

All four repo commands green; bundle greps clean; Android Maestro green; VoiceOver and TalkBack pass on Home, Accounts, a form, a chart and `ConfirmDialog`; dark mode and 200 percent text pass; B6 deletion verified end to end including the tombstone; privacy policy and deletion web page live (B13); privacy labels and Play data-safety form reviewed; real reviewer test account working against production (below); bank connection feature flag in its owner-approved state (7.6); changelog from release-please.

### 7.6 Store policy and legal position

**CONFIRMED in substance (Apple App Review Guidelines, developer.apple.com/app-store/review/guidelines, read 2026-11-11; the page text was truncated after 5.2.5, so rules later in section 5 were not read; the sub-letters such as (viii) and (ix) were taken from the fetch summary and should be re-checked on the page before they are quoted to anyone):**
- **3.2.1(viii):** apps for financial trading, investing or money management "should be submitted by the financial institution performing such services" and must hold the licensing and permissions where offered.
- **5.1.1(ix):** apps in banking, financial services and similar highly regulated fields should be submitted by a legal entity providing the services, not an individual developer.
- **5.1.1(v):** if the app supports account creation it must offer account deletion in the app.
- **4.8:** if the app uses a third-party or social login for the primary account it must also offer an equivalent privacy-preserving login option (limits data to name and email, lets the user hide their email, no advertising tracking without consent). The exemption for apps that use only their own sign-in system applies if AuthKit email and password is the only method; the owner must say which AuthKit sign-in methods are enabled (D21).
- **2.1:** apps with a login must provide demo account details; a built-in demo mode may substitute **only with prior Apple approval** and it must show the app's full functionality. The plan therefore provisions a **real production test account for reviewers** (T9.6) and treats demo mode as a feature, not a review strategy.

**UNCONFIRMED (not verifiable from the sources read; must be settled before sign-off, ideally with legal advice):**
- Whether Flump counts as a "money management" app under 3.2.1(viii)/5.1.1(ix) so that an **individual** developer account is likely rejected, and whether a registered company (organisation account, D-U-N-S number) is sufficient without being "the financial institution". The recommendation is to enrol as an organisation (D18).
- **Google Play:** the Financial Services policy (declarations for personal-finance apps, whether bank-data access needs additional declarations, whether an organisation account is required, the data-deletion web URL requirement for apps with account creation). The policy page fetched did not cover these. Check the Play Console "Financial features" declaration and the Data safety account-deletion URL requirement.
- **Regulatory position of bank connections:** audit finding M-07 records marketing that claims FCA AISP status with no FRN or named regulated partner. Operating account-information services in the UK is a regulated activity unless done through an authorised provider; whether Flump's token and OAuth connections need FCA authorisation or a partner is a legal question this plan does not answer. **Recommendation (D19): ship store builds with the bank-connection feature behind a remote-off flag (default OFF, constant `BANK_CONNECTIONS_ENABLED`) until the owner has advice**; the list, sync and disconnect code is built and tested but not reachable in store builds. Store descriptions and screenshots must not claim bank sync.

### 7.7 Cost table (owner approval in D24)

| Item | Cost | Confidence |
|---|---|---|
| Apple Developer Program (individual or organisation) | about $99 a year | confident |
| Google Play developer registration | $25 once | confident |
| D-U-N-S number for organisation accounts (Apple, and Google organisation accounts) | free, takes days to weeks | UNCONFIRMED, check each store |
| Company registration or legal entity, if the owner does not have one (D18) | varies | owner |
| EAS Build and Submit | free tier with limited monthly builds and slower queue; paid plans exist | UNCONFIRMED, check expo.dev/pricing |
| EAS Update | free tier with limits | UNCONFIRMED |
| WorkOS AuthKit | already in use for web; native sign-in uses the same plan | UNCONFIRMED whether mobile affects billing |
| GitHub Actions | Linux minutes for Android e2e; macOS at 10 times (iOS e2e kept manual) | confident |
| Domain for privacy policy, universal links and the API | domain ownership not confirmed | UNCONFIRMED |
| Legal advice on financial promotion, AISP and store listings (D19) | varies | owner |
| Crash reporting vendor, if adopted (D7) | free tiers exist | UNCONFIRMED |

---

## 8. Milestones and tasks

**Sizing:** S = 0.5 day, M = 1 day. There are **no L or XL tasks**: every earlier L was split. Every task is one agent session that ends in a commit with its tests passing and names its dependencies. Tags: **[P0]** = on the shortest path to a store-ready first release (defined below); **[CONTINGENT]** = only if an earlier spike says so; **[BLOCKED]** = cannot start until the named external ticket lands. Tasks use TDD order (failing test, run, implement, pass, commit); the lines give the interface and the acceptance tests, which are the decisions an implementer cannot make alone. Paths are relative to the repo root. `rtk` prefix on every command. Subagent model: `sonnet` for implementation and review, `haiku` for read-only search, `opus` only for a read-only planning agent.

**Effort, recomputed from the task sizes below** (S = 0.5 day, M = 1 day; counted by script from this section, not estimated by feel):

| Milestone | Tasks | S | M | Raw days | P0 tasks | P0 raw days |
|---|---|---|---|---|---|---|
| M0 spikes | 8 | 2 | 6 | 7 | 8 | 7 |
| M1 shared packages | 23 | 8 | 15 | 19 | 17 | 14 |
| M2 shell, design system, charts | 32 | 16 | 16 | 24 | 25 | 19.5 |
| M3 auth | 20 | 8 | 12 | 16 | 17 | 13.5 |
| M4 read-only core | 14 | 3 | 11 | 12.5 | 11 | 9.5 |
| M5 money CRUD | 19 | 4 | 15 | 17 | 2 | 2 |
| M6 wealth, planning, profile, onboarding | 30 | 11 | 19 | 24.5 | 0 | 0 |
| M7 integrations and public | 31 | 15 | 16 | 23.5 | 5 | 4.5 |
| M8 hardening | 10 | 3 | 7 | 8.5 | 5 | 5 |
| M9 release | 10 | 6 | 4 | 7 | 9 | 6.5 |
| M10 retire old app | 4 | 2 | 2 | 3 | 0 | 0 |
| **Total** | **201** | 78 | 123 | **162** | **99** | **81.5** |


Milestone dependency summary:

```
M0 spikes+decisions ──► M1 shared packages ──► M2 shell, design system, charts ──► M3 auth ──► M4 read-only core ──► M5 money CRUD ──► M6 wealth/planning/profile ──► M7 integrations/public
                                                                                       │                                                                  │
                                                  Android e2e CI starts at T3.17 ──────┘             M8 hardening ◄─────────────────────────────────────┘ ──► M9 release ──► M10 retire old app
```

Each milestone ends with an **accessibility exit check** task (5.1 checklist on the screens it added). External prerequisites outside this plan: **E1** (merged; issuer closed in T0.2), **E5** (merged; semantics copied), **E4** owner sign-off of all seven tax years before M6's tax, pension and forecast screens ship (R19), **E6** before T7.5. The backend tickets are **sized tasks in this plan**: B12 is T4.13, B9 is T3.19, B6 is T7.26 and T7.27, B1 is T7.28, B10 is T7.29, B11 is T7.30, B4 is T7.31, B2 is the contingent T3.18, B13 is T7.24; B3 (validation) stays a follow-up. **E8 token work is already on main; there is no E8 dependency.**

### M0. Spikes and prerequisites

Goal: remove the unknowns that could invalidate the design. Output: `docs/audit/plans/E12-spike-notes.md` and, where a spike changes the design, an edit to this plan.

- [ ] **T0.1 Spike: Expo app bundles in the Bun/Turbo monorepo and runs an engine vector on a device (M) [P0].** `bunx create-expo-app` into `apps/mobile` on the current stable SDK; add `@flump/finance-engine`; one screen calls `calculateUKEWNITakeHome` with a fixed input and an `engine-smoke` Maestro flow asserts the figure on iOS Simulator and Android emulator. Acceptance: same figure as the engine's own vector; `bun install` leaves web, backend, marketing `bun run build` green; recorded: SDK/RN/React versions and which side follows the other, linker mode, Metro conditions, TypeScript compiler, bundle size, whether jest-expo needed `transformIgnorePatterns`. Deps: T0.8.
- [ ] **T0.2 Spike: WorkOS code exchange, refresh, rotation, lifetime, errors (M) [P0].** With a WorkOS staging environment (or the owner's), run authorize, exchange without a secret, and refresh **without a secret** from a script and from the spike app; decode a token. Acceptance, each answered in the note: (a) secretless refresh works yes or no (decides T3.18); (b) does rotation invalidate the old refresh token immediately and is there any reuse grace window (the "30 seconds" claim is UNCONFIRMED); (c) access-token lifetime; (d) the exact response body and status for a dead, revoked and reused refresh token (the `invalid_grant`/400/401 classification in T3.6 is built from this); (e) issuer string, `aud`, `sid`, `sub`, `email` claim presence, token size; (f) a protected backend call succeeds, closing the E1 issuer question. Deps: T0.1, D3 (WorkOS dashboard access).
- [ ] **T0.3 Spike: WorkOS redirect, logout, ephemeral session (M) [P0].** Acceptance: (a) the dashboard accepts `flump://auth/callback` for the staging and production clients, or Universal/App Links become mandatory (decide D3); (b) with `preferEphemeralSession` true on a real iPhone, sign-in after sign-out **asks for credentials**, password-manager autofill works, and whether the logout URL shows a system prompt; (c) the same on Android Custom Tabs (no ephemeral mode); (d) whether a WorkOS server-side session revoke exists and `@workos-inc/node` exposes it (decides whether T3.10 can avoid the browser); (e) behaviour of a failed or cancelled hosted logout. Deps: T0.2.
- [ ] **T0.4 Spike: Hermes Intl en-GB and tabular numbers (S) [P0].** On both platforms `Intl.NumberFormat("en-GB", {style:"currency", currency:"GBP"})` gives `£1,234.56`, dates format as `11 Nov 2026`, relative time works or a fallback is chosen, `fontVariant:["tabular-nums"]` aligns digits in the chosen font. Deps: T0.1.
- [ ] **T0.5 Engine API map (M) [P0].** `docs/audit/plans/E12-engine-api-map.md`: for every screen and tool, the exact engine function, signature and year handling, using only the pinned `uk-tax-year.ts` family; list functions that take no year, gaps needing engine additions (to be filed as engine tasks before the screen task), and name collisions (`calculateUKTax` vs `calculateUkTax`). Deps: none.
- [ ] **T0.6 File the backend tickets with specs (M) [P0].** B1, B2 (fallback), B4, B6 (with tombstone and WorkOS deletion order from 4.2), B9, B10, B11, B12, B13, plus E6 and E4 dependency notes. Each ticket: endpoint, request/response shape, ownership scoping rule, cross-user tests expected. Deps: none.
- [ ] **T0.7 Owner actions checklist (S) [P0].** One page of things only the owner can do, with the decision each unblocks: store accounts and legal entity (D18), WorkOS staging and redirect URIs (D3), AuthKit sign-in methods (D21), privacy policy and deletion page (D20), real reviewer test account, cost approval (D24), domain, legal advice on bank connections (D19), store compliance forms (D25: privacy manifest, export compliance, age rating, minimum OS versions, support contact, app name and trademark, recruiting 12 closed testers), UK GDPR and ICO obligations (D26), financial disclaimer wording and MFA policy (D27). Deps: none.
- [ ] **T0.8 Make the three server Dockerfiles workspace-proof (M) [P0].** **VERIFIED IN CODE:** `apps/backend`, `apps/web` and `apps/marketing` Dockerfiles each `COPY` every workspace `package.json` and run `bun install --frozen-lockfile --ignore-scripts`, so the first new workspace (apps/mobile, packages/tokens, api-client, api-contract, format) would break all three builds and Railway deploys. Add `COPY` lines for the planned workspaces now, install only the workspaces each image needs with a Bun filter (confirmed to work with `--frozen-lockfile` and the repo's Bun version in this task), and prove it with a `docker build` per image and an image-size comparison. Acceptance: three builds succeed before and after an empty `apps/mobile/package.json` is added; images contain no Expo or React Native packages. Must merge **before** any task that adds a workspace. Deps: none.

### M1. Shared packages and tokens

Goal: everything the app needs that is not UI exists, tested, in `packages/`.

- [ ] **T1.1 api-client: `BackendError`, kinds, messages (S) [P0].** `packages/api-client/src/{backend-error.ts,messages.ts}`. Same seven kinds, `kindFromStatus`, `ACTION_MESSAGE_BY_KIND` copied verbatim from `apps/web/app/services/route-error.server.ts:26-34` (not exported there). Tests: every kind and status; messages equal web's strings (a test imports a copied fixture of web's map). Deps: none.
- [ ] **T1.2 api-client: request core (M) [P0].** `createApiClient({ baseUrl, getAccessToken, fetch?, timeoutMs? })` with `request<T>(path, { method, body, signal, allowEmpty, schema })`. Tests (ported from web's `api-client.test.ts`): missing token throws `unauthorised` without a request; network failure and timeout throw `unavailable`; caller abort rethrown as is; 4xx other than 401/403 surfaces `message` as `detail`, 5xx never does; empty body without `allowEmpty` is `bad-response`; 204 with `allowEmpty` returns undefined; malformed JSON and schema mismatch are `bad-response` and carry no body. Deps: T1.1, T1.20.
- [ ] **T1.3 api-client: 401 single-flight refresh and retry once (M) [P0].** Option `onUnauthorised(): Promise<"refreshed" | "ended" | "retryable">`. On a 401 the client calls it once for all concurrent requests, retries the original request once if `refreshed`, throws `unauthorised` if `ended` or if the retry also returns 401, throws `unavailable` if `retryable`. Tests: ten concurrent 401s cause exactly one callback call; retry sends the new token; a second 401 ends; `retryable` never reports `unauthorised`. Deps: T1.2.
- [ ] **T1.4 api-client: client header and policy check (S) [P0].** Adds `X-Flump-Client: mobile/<version> (<platform>)` and `getClientPolicy(): Promise<{ minVersion: string; recommendedVersion: string }>` plus `isBelowMin(version, policy)` semver compare. Tests: header present on every request; policy failure is surfaced as a distinct result so callers can fail open; compare edge cases (`1.9.0` vs `1.10.0`). Deps: T1.2.
- [ ] **T1.5 api-contract: capture real payload fixtures (M) [P0].** Run the backend in real-Postgres mode (`TEST_DATABASE_URL`, `REQUIRE_DB_TESTS`) with two users' rows and dump each endpoint's JSON to `packages/api-contract/src/__fixtures__/`. Acceptance: fixtures include decimal strings, nulls, zero values and an empty array for every list endpoint. Deps: none (breaks the schema/contract-test cycle).
- [ ] **T1.6 api-contract: account, account detail, portfolio schemas (M) [P0].** `XSchema` and `type X = z.infer`; coercion of decimal strings to numbers; unknown enum values become `"unknown"` (2.13). Tests: `"1204.50"` becomes 1204.5; null optional numbers become `undefined`; **zero stays 0 and absent stays absent**; unknown `type` yields `unknown`, not an error; unknown fields stripped. Deps: T1.5.
- [ ] **T1.7 api-contract: user profile schema and patch (S) [P0].** Includes `enabledPages`, `dashboardWidgets`, `onboardingCompleted`, `avatarUrl` as nullable, `country`/`currency`. Tests as T1.6; a patch schema that sends only provided fields. Deps: T1.5.
- [ ] **T1.8 api-contract: budget entry and tax record schemas (M).** Tax record list schema **omits `receiptData`** (B10) and has a separate receipt schema. Tests: frequency and source enums tolerant; dates ISO; amount coercion. Deps: T1.5.
- [ ] **T1.9 api-contract: bank connection, MCP token, context pack schemas (S).** Tests: `PublicBankConnection` has no token fields; `rawToken` appears only in the create response schema. Deps: T1.5.
- [ ] **T1.10 api-client methods: accounts, profile, portfolio (M) [P0].** `accounts.list/get/details/allDetails/create/update/remove`, `portfolioSnapshot()`, `profile.get/patch/changePassword/sendPasswordReset()` (no email argument; needs B4)/`resetFinancialData/checklist/deleteAccount()` (B6). Tests: each method hits the right verb, path and typed body; every response validated by its schema; remove methods use `allowEmpty`. Deps: T1.2, T1.6, T1.7.
- [ ] **T1.11 api-client methods: budget and tax (M).** `budget.list/create/update/remove/seedDefaults/addCategory`; `tax.list/create/update/remove/bulk({ records, capPreviousRecordIds })/receipt(id)`. Tests as T1.10. Deps: T1.8, T1.10.
- [ ] **T1.12 api-client methods: connections, MCP, history (S).** `connections.list/connectToken/startOAuth/sync/refresh/remove`; `mcp.tokens.list/create/revoke`, `mcp.contextPack(anonymize: boolean)` always sending `anonymize=` explicitly; `accounts.addYear/updateYear/removeYear` added when B1 defines them. Deps: T1.9, T1.10.
- [ ] **T1.13 format: currency and percent (M) [P0].** `formatCurrency(value, currency?, { placeholder, compact })`, `formatPercent`. Tests: `1234.5` GBP is `£1,234.50`; negative has a true minus; `0` is `£0.00` and `null` is "Not set", never `£0.00`; NaN and Infinity give the placeholder; unknown currency code falls back without throwing. Deps: T0.4, T1.20.
- [ ] **T1.14 format: date, relative time, tax year, speech (S) [P0].** `formatDate`, `formatRelativeTime(from, now)`, `formatTaxYear(startYear)` ("2025/26"), `speakCurrency`. Tests with injected `now`. Deps: T1.13.
- [ ] **T1.15 `@flump/tokens` extraction (M) [P0].** Move the token objects and their tests from `packages/ui/src/tokens` to `packages/tokens`; `packages/ui/src/tokens/index.ts` re-exports; `panda.preset.ts` unchanged. Acceptance: Panda `styled-system/tokens` output byte-identical before and after; `bun run build` and `test` green for web, ui, marketing. Deps: D23.
- [ ] **T1.16 Native token generator (M) [P0].** `packages/tokens/scripts/build-native-tokens.ts` writes `native.generated.ts` (`lightColors`, `darkColors` keyed `surface.canvas` etc., `spacing`, `radii`, `fontSizes` as numbers, `type ColorKey`). Tests: regeneration is byte-identical; every semantic token appears in both maps with a concrete value; no `{colors.` reference remains; the module has no imports. Deps: T1.15.
- [ ] **T1.17 Contrast matrix on generated values (M) [P0].** Confirm the existing token a11y test passes at the base commit and record any genuinely open E8 item; run the pair matrix (4.5 text, 3 UI and graphics, both schemes) on the generated values plus the mobile pairs in 5.2 as a snapshot test. Deps: T1.16.
- [ ] **T1.18 Repo law checks (M) [P0].** `scripts/check-design-tokens.ts` and `check-tabular-nums.ts` include `apps/mobile/src` (bank brand constants file allow-listed); new `scripts/check-no-tax-literals.ts`; `scripts/check-no-mock-auth.sh` scans the new paths with no exemption; a check forbidding `toLocaleString(`. Tests in `scripts/*.test.ts`: a fixture with `#fff`, `toLocaleString(`, `12570` outside the engine, and `mock-session-token` each fail; the real tree passes. Deps: none.
- [ ] **T1.19 Backend contract test in real-Postgres mode (M) [P0].** `apps/backend/src/contract/api-contract.spec.ts` using `dbTestMode`, two users, the injected-JWKS signed token (E1 pattern); every response parsed by `@flump/api-contract`; skipped with a clear message only when `REQUIRE_DB_TESTS` is unset locally, mandatory in CI. Acceptance: fails if a backend field is renamed. The test covers the schemas that exist and gains T1.8 and T1.9 when they land. Deps: T1.6, T1.7.
- [ ] **T1.20 Build format and Turbo wiring for the new packages (S) [P0].** `tsc` build to `dist`, `exports` with `import: dist`, `types`, `check-types`, `lint`, `test` scripts, Turbo tasks, `@repo/typescript-config` base. Deps: none.
- [ ] **T1.21 Engine characterisation vectors: debt and mortgage (M).** `packages/finance-engine/src/test-vectors/{debt,mortgage}.vectors.ts` plus vitest files, recorded from current outputs and labelled characterisation (not owner-signed). Deps: T0.5.
- [ ] **T1.22 Engine characterisation vectors: the seven tools (M).** Same pattern for tax trap, mortgage vs ISA, Section 24, snowball vs avalanche, 0% cliff, overdraft, student loan. Deps: T0.5.
- [ ] **T1.23 Permanent engine-smoke flow (S) [P0].** The dev-only `engine-smoke` screen runs the exported vectors on device and a Maestro flow asserts "All vectors pass". Runs locally from M2; joins the Android CI job when that job exists (T3.17). Starts with the tax vectors and picks up the debt, mortgage and tool characterisation vectors once T1.21 and T1.22 land. Deps: T0.1, T2.1, T2.20.

### M2. App shell, design system, charts

Goal: a signed-out app that launches, themes, navigates, with every primitive and chart tested, and CI.

- [ ] **T2.1 Scaffold `apps/mobile` properly (M) [P0].** `package.json`, `app.config.ts`, `tsconfig.json` (expo base), `metro.config.js`, `babel.config.js`, `jest.config.js` (transform `@flump/*` ESM), `src/config.ts`, `src/copy`; Turbo and root scripts; CI `mobile-checks`. Interface: `loadConfig(env): { apiBaseUrl; workosClientId; workosAuthBaseUrl; redirectScheme; envName }` throwing a named error for a missing URL, a non-https release URL, or `http` outside `development`/`e2e` local hosts. Tests: config table; a Jest case imports `@flump/finance-engine` and `@flump/format`; four root commands pass. Deps: T0.1, T1.18, T1.20.
- [ ] **T2.2 React alignment, Renovate group, expo-doctor (S) [P0].** Pin per 3.3 item 9; `renovate.json` `packageRules` group; `expo-doctor` in CI. Acceptance: CI fails if web and mobile resolve different React versions where they must match. Deps: T2.1.
- [ ] **T2.3 ThemeProvider and `useTheme` (M) [P0].** `useTheme(): { scheme; colors: Record<ColorKey,string>; spacing; radii; type; setPreference(p) }`. Tests: follows system; preference persists and survives a storage read failure (try/catch, falls back to system); unknown key is a type error; no first-paint flash. Deps: T1.16, T2.1.
- [ ] **T2.4 Text and Pressable (M) [P0].** `Text` variants, `tabular`; `Pressable` enforces 44/48 minimum via `hitSlop`/`minHeight` and requires a label when it has no text child (type level). Tests: min target at 100 and 200 percent scale; role and state props; Biome restricted-import fixture. Deps: T2.3.
- [ ] **T2.5 Button and IconButton (S) [P0].** Variants `primary | secondary | destructive | ghost`, `loading`, `disabled`. Tests: states, a11y state busy, no double fire. Deps: T2.4.
- [ ] **T2.6 Screen, Card, Badge (S) [P0].** Safe-area aware screen, scroll variants. Tests: insets applied (mock), badge text not colour-only. Deps: T2.4.
- [ ] **T2.7 ListRow and KpiStrip (M) [P0].** `KpiStrip` accepts 1 to 4 items in one row, snap-scrolls under the width threshold; `ListRow` composes one accessible label. Tests: 5 items is a type error; no wrap at 320 pt; label composition. Deps: T2.6.
- [ ] **T2.8 TextField and FormField (M) [P0].** Label, hint, error linked and announced, return-key chaining. Tests: error announced on submit failure; 200 percent scale no clipping. Deps: T2.4.
- [ ] **T2.9 CurrencyField and PercentField (M) [P0].** Value type `number | undefined`; blank stays `undefined`. Tests: blank never becomes 0; locale-aware paste ("1,234.50"); NaN rejected. Deps: T2.8, T1.13.
- [ ] **T2.10 DateField, Select, Switch (M) [P0].** Tests: invalid dates rejected with a message; select exposes selected state; switch role and label. Deps: T2.8.
- [ ] **T2.11 SliderField (M).** Label top-left, editable value pill top-right, slider below. `accessibilityActions` increment/decrement; out-of-range entry clamps with a message. Deps: T2.8.
- [ ] **T2.12 SegmentedControl and CollapsibleSection (S).** Tests: `expanded` state; selected state exposed. Deps: T2.4.
- [ ] **T2.13 ConfirmDialog (M) [P0].** Props `{ title; consequence; confirmLabel; destructive?; typedConfirmation?; onConfirm(): Promise<void>; onCancel() }`. Tests: focus on cancel; busy state ignores double taps; failure keeps the dialog open with the generic message; typed confirmation enables confirm only on an exact match; hardware back calls cancel; guard test fails on direct `Alert.alert`. Deps: T2.5.
- [ ] **T2.14 BottomSheet and Toast (M) [P0].** Focus trap and restore; Toast announced. Deps: T2.5.
- [ ] **T2.15 ErrorState, StaleBanner, RestoredOfflineBanner, UpdateRequiredScreen (M) [P0].** `ErrorState({ error: BackendError; onRetry; onSignInAgain? })` per kind with the E5 copy. Tests: one case per kind; `unauthorised` shows "Sign in again" and no retry; restored-offline banner says writes are off. Deps: T2.7, T1.1.
- [ ] **T2.16 EmptyState, LoadingState, `useQueryState` (S) [P0].** `useQueryState` returns exactly one of `error | stale | empty | data | loading`; `EmptyState` is constructible only from `empty`. Tests: an empty 200 is `empty`, a failure is never `empty`. Deps: T2.15.
- [ ] **T2.17 PrivacyAmount and privacy mode (S) [P0].** Masked text, label "Hidden", persisted toggle. Tests: screen reader never reads digits when masked. Deps: T2.4.
- [ ] **T2.18 Navigation shell and page manifest (M) [P0].** `app/_layout.tsx`, `(auth)`, `(app)/(tabs)`, `PAGES` with the same eight keys as web `AppPageKey`. Tests: key set equals web's (a script greps web's `ALL_PAGE_KEYS` so drift fails); disabled pages filtered. Deps: T2.7, T2.15.
- [ ] **T2.19 Deep link parser and resume (S) [P0].** Table from 2.10: valid, unknown, disabled, unsupported year, hostile input, never a mutation. Deps: T2.18.
- [ ] **T2.20 Dev-only routes and production exclusion (S) [P0].** Gallery and `engine-smoke` behind `EXPO_PUBLIC_ENABLE_DEV_ROUTES`, `blockList` in production, bundle grep in CI. `X.states.ts` consumed by the gallery. Deps: T2.18.
- [ ] **T2.21 Query client, keys, retry policy (S) [P0].** Retry only on `unavailable` and `server`, max 2. Deps: T2.1, T1.1.
- [ ] **T2.22 Encrypted persister, TTL, wipe (M) [P0].** MMKV encrypted with a random key held in secure store through its own small wrapper (`src/data/secureKey.ts`, not the T3.4 token store); `maxAge` 7 days; `buster` = schema version; decryption failure is a cache miss and deletes the cache. Tests: restart survival; wrong-key unreadable; expired discarded; `clearAllUserData()` empties everything. Deps: T2.21.
- [ ] **T2.23 CI Docker build check (S) [P0].** A CI job that builds the three server images on every PR that touches a workspace `package.json`, `bun.lock` or a Dockerfile, so a new workspace can never silently break Railway deploys again. Acceptance: job green; fails if a Dockerfile lacks a `COPY` for a workspace. Deps: T0.8.
- [ ] **T2.24 Chart scales, axes, resize (M) [P0].** `src/charts/scale` using `d3-scale` and `d3-shape`; time and linear scales, tick formatting through `@flump/format`, `onLayout` resize. Tests: ticks formatted with tabular numbers; zero-width layout renders nothing without crashing; a negative-only series scales correctly. Deps: T1.13, T2.4.
- [ ] **T2.25 Chart touch inspection (M).** Press or drag shows the nearest datum in a tooltip; an accessible alternative (adjustable element with increment/decrement reading each datum). Tests: reduced motion disables tooltip animation; every datum reachable by the accessibility action. Deps: T2.24.
- [ ] **T2.26 ChartFigure with table toggle (M) [P0].** `ChartFigure({ summary; table; children })`. Tests: summary is the accessible label; "View as table" renders every datum with the same values (one data prop feeds both); `chart.*` colours only. Deps: T2.24.
- [ ] **T2.27 AreaChart (S) [P0].** Used for balance history. Tests: gaps not zeros; entrance animation off under reduced motion. Deps: T2.26.
- [ ] **T2.28 BarChart (S).** Negative values keep sign and tiny values keep a minimum bar height (K-10). Deps: T2.26.
- [ ] **T2.29 DonutChart (S).** Labelled segments, no colour-only meaning. Deps: T2.26.
- [ ] **T2.30 LineChart (S).** Multi-series with direct labels. Deps: T2.26.
- [ ] **T2.31 ProgressBar (S).** Uses `chart.primary`, exposes `accessibilityValue`. Deps: T2.4.
- [ ] **T2.32 M2 accessibility exit check (S) [P0].** Gallery walked with VoiceOver and TalkBack at 100 and 200 percent in both schemes; findings fixed. Deps: the P0 primitives and charts (T2.1 to T2.8, T2.13 to T2.19, T2.24, T2.26, T2.27); non-P0 components get their check inside their own milestone's exit task.

### M3. Authentication

Goal: real sign-in, silent refresh, explicit offline-restore, honest session end, complete wipe. Nothing here ships a mock.

- [ ] **T3.1 Session state machine (M) [P0].** `src/auth/sessionMachine.ts`: states `loading | signedOut | signedIn | restoredOffline | sessionEnded` (+ internal `refreshing`), events `RESTORED(token?)`, `SIGN_IN_OK`, `SIGN_OUT`, `REFRESH_OK`, `REFRESH_RETRYABLE`, `REFRESH_TERMINAL`, `SECOND_401`. Tests: every transition in 4.2; `REFRESH_RETRYABLE` never leads to `sessionEnded`; `REFRESH_TERMINAL` clears tokens once; `sessionEnded` never auto-signs-in. Deps: T2.1.
- [ ] **T3.2 PKCE and authorize URL (S) [P0].** `createPkce()`; `buildAuthorizeUrl({ clientId, redirectUri, challenge, state, screenHint? })`. Tests: verifier 43 to 128 chars of the allowed alphabet; challenge matches an RFC 7636 vector; base URL from config. Deps: T0.2.
- [ ] **T3.3 Auth session and code exchange (M) [P0].** `openAuthSessionAsync` with `preferEphemeralSession` per T0.3; `exchangeCode({ code, verifier, clientId, authBaseUrl })` without a secret. Tests: state mismatch rejects before exchange; cancel resolves to `cancelled`, not an error; non-200 gives a generic sign-in error (no WorkOS body text). Deps: T3.2, T0.3.
- [ ] **T3.4 Token store (S) [P0].** Refresh token alone in secure store with `WHEN_UNLOCKED_THIS_DEVICE_ONLY`. Tests: a WorkOS-sized token round-trips through the mock with a 2 KB limit asserted (the Android limit is not a hard 2 KB, low confidence; the test costs nothing); nothing in an error message or log. Deps: T2.1.
- [ ] **T3.5 Token manager: single-flight refresh and rotation (M) [P0].** `getAccessToken(): Promise<string | null>`, `refreshNow(): Promise<"refreshed" | "ended" | "retryable">`. Tests: with a token expiring in under 60 s, ten concurrent calls cause one refresh; rotated refresh token is written before the new access token is used and a crash between writes leaves a usable or cleanly-rejected state; clock skew from the `Date` header is applied. Deps: T3.1, T3.3, T3.4, T0.2.
- [ ] **T3.6 Refresh error classification (S) [P0].** Pure function `classifyRefreshFailure(result)` from T0.2's observed responses: `invalid_grant`, 400, 401 are terminal; network error, timeout, DNS, 5xx, 429, 408 and unknown are retryable. Tests: one case per observed response and per failure type; unknown shapes are retryable. Deps: T0.2.
- [ ] **T3.7 Cold start: `restoredOffline` (M) [P0].** Cold start with a stored refresh token tries a refresh; a retryable result enters `restoredOffline` (cached reads allowed, **all mutations disabled** through one `useCanWrite()` hook, banner), retried on reconnect, foreground and a capped back-off; a terminal result ends the session. **Tests (Review Focus 2):** offline cold start keeps cache and tokens and shows data from cache; no network ever calls `clearAllUserData`; terminal rejection clears everything; recovery to `signedIn` re-enables writes and refetches; writes attempted in `restoredOffline` show the inline reason and send no request. Deps: T3.5, T3.6, T2.22, T2.15.
- [ ] **T3.8 401 mid-session: refresh once, retry once (S) [P0].** Wire T1.3's `onUnauthorised` to `refreshNow()`. Tests (Review Focus 3): expired access token gives one refresh and a successful retry; second 401 ends the session; retryable refresh failure goes to `restoredOffline`, not `sessionEnded`; many parallel 401s cause one refresh. Deps: T1.3, T3.5.
- [ ] **T3.9 Sign-out and complete wipe (M) [P0].** `signOut({ endHostedSession })`. Tests (Review Focus 5): afterwards secure store, MMKV, query client, privacy and lock preferences, demo state and the in-memory token are empty; sign-out works offline and from the lock screen; relaunch is signed-out. Deps: T3.5, T2.22.
- [ ] **T3.10 Hosted logout policy and failure handling (M) [P0].** Per T0.3: iOS ephemeral skips hosted logout; Android and non-ephemeral iOS open the logout URL best effort; a failed or cancelled logout shows a one-line non-blocking notice; if a server-side revoke exists the backend call is made first. Tests: failure never blocks or undoes the local wipe; real-device check that **sign-in after sign-out asks for credentials** (manual, recorded). Deps: T3.9, T0.3.
- [ ] **T3.11 Session gate, session-ended screen, resume (M) [P0].** Route guard; `SessionEnded` shows "Your session has ended" with "Sign in again" (local sign-out, no auto-redirect); a signed-out deep link is stored and opened once after sign-in. Tests: many simultaneous failures trigger the screen once. Deps: T3.1, T2.15, T2.18, T2.19.
- [ ] **T3.12 Temporary "Finish setup later" screen (S) [P0].** Holding screen with "Skip for now" so a new user is never dead-ended before onboarding (T6.27) exists. Deps: T3.11.
- [ ] **T3.13 Biometric app lock (M).** `expo-local-authentication`; lock after configured background time; never a sign-in path; lock screen has "Sign out". Tests: cancel and failure keep it locked and make no API call. Deps: T3.9.
- [ ] **T3.14 Privacy overlay and screen capture setting (S).** Blur overlay when inactive; `FLAG_SECURE` through `expo-screen-capture`. Deps: T3.9.
- [ ] **T3.15 Sign-in screen (M) [P0].** "Sign in", "Create account", privacy and terms links; "Try the demo" hidden behind a constant until T7.22; honest errors for cancelled, failed and offline. Deps: T3.3, T3.11.
- [ ] **T3.16 Fixture server (M) [P0].** `apps/mobile/e2e/fixture-server`: canned API, fake `/authorize` and `/authenticate` for code and refresh with expired, rotated and `invalid_grant` variants, and a switch to go offline. Tests for the server itself. Deps: T2.1.
- [ ] **T3.17 Maestro sign-in flows and the Android CI job (M) [P0].** Flows that need only sign-in and the holding screen: `signed-out-shows-sign-in`, `sign-in-happy-path`, `engine-smoke` (joins from T1.23); `eas.json` profile `e2e`; `mobile-e2e-android` job added to `ci-pipeline.yml`; production bundle grep for the fixture host. The flows that need an authenticated screen reading the API (`session-ended-state`, `refresh-then-retry`, `backend-outage-is-not-empty`, `cold-start-offline-restores`, `restored-offline-terminal`) cannot run until Home reads data, so they are T4.14. Deps: T3.11, T3.15, T3.16.
- [ ] **T3.18 Refresh broker on the backend [CONTINGENT] (M).** Only if T0.2 (a) is "no". `POST /auth/mobile/refresh` per 4.2 with `@nestjs/throttler` (a new dependency; **VERIFIED IN CODE: none exists today**), `trust proxy` configured for Railway, WorkOS errors mapped to a generic 401, nothing logged, the dev-bypass literal remaining only in its existing allow-listed file. Tests: success with a mocked WorkOS SDK; invalid grant gives 401 without detail; body validation; throttle gives 429 per real client IP behind a proxy header. App side: `refreshNow` takes the strategy from config. Deps: T0.2, T0.6.
- [ ] **T3.19 Backend `clockTolerance` (S) [P0].** Add `clockTolerance: "30s"` to `jwtVerify` in `apps/backend/src/auth/workos-jwt.verifier.ts`. Tests: a token 20 s from the future or expired 20 s ago is accepted; 60 s is rejected. Deps: T0.6.
- [ ] **T3.20 M3 accessibility exit check (S) [P0].** Sign-in, session-ended, restored-offline banner, lock screen. Deps: the P0 tasks of M3.

### M4. Read-only core: Home, Accounts, account detail, profile read

Goal: a signed-in user sees an honest, accurate picture of their money.

- [ ] **T4.1 ApiProvider, error boundary, update-required gate (M) [P0].** Provider builds the client from config and the token manager; route-level `ErrorBoundary`; launch and foreground check of `getClientPolicy()` (cached an hour, fail open) showing `UpdateRequiredScreen`. Tests: below-min blocks every data route; policy fetch failure proceeds. Deps: T3.8, T1.4, T2.15, T4.13.
- [ ] **T4.2 Resource hooks: accounts, details, profile, portfolio (M) [P0].** Each returns `{ status, data?, error?, stale? }`. Tests per hook: success, 401, 503, malformed body (`bad-response`), empty 200 array giving `data: []` (the only path to an empty state). Deps: T4.1, T1.10, T2.16.
- [ ] **T4.3 Resource hooks: budget, tax, connections (M).** Same tests. Deps: T4.2, T1.11, T1.12.
- [ ] **T4.4 `useWorkspace` composition (M) [P0].** E5 D2-A semantics. **Tests (Review Focus 1):** all core calls 503 gives `error`, not `data` with empty arrays; core 200 with empty arrays gives a legitimate empty state; an optional resource 500 gives `failed: ["budget"]` and "We couldn't load budget. Try again" with no empty copy; cache while offline gives `data` plus `stale`. Deps: T4.2.
- [ ] **T4.5 Home: KPI strip (M) [P0].** Net worth, other safe KPIs (max 4), pull to refresh, `StaleBanner`, `PrivacyAmount`. Tests: failure or restored-offline never shows zeros; engine-derived KPIs hidden when inputs are missing. Deps: T4.4, T2.7, T2.17.
- [ ] **T4.6 Home: widgets, checklist, feature gating (M).** `dashboardWidgets`, `enabledPages`, checklist items linking to the same pages as web, `profile.checklist` call. Tests: empty `enabledPages` means all enabled (web `isPageEnabled` rule); a disabled page's deep link shows an enable prompt. Deps: T4.5.
- [ ] **T4.7 Home: safe-to-spend, stage, health score (M).** Adapters over `calculateSafeToSpend`, `evaluateFinancialStage`, `calculateFinancialHealthScore` (names verified in code). Tests: `undefined` for insufficient input; no `NaN`; none from an empty budget (web fix `dbdb9b7`). Deps: T4.5, T0.5.
- [ ] **T4.8 Accounts list and net worth (M) [P0].** Grouped by type, liabilities negative with sign, composed row labels. Tests: loading, error, empty and stale states each distinct; liabilities subtract. Deps: T4.4, T2.7.
- [ ] **T4.9 Mixed-currency handling (S) [P0].** Per-currency subtotals with a "mixed currencies" note, no converted total (D15). Tests: two currencies never summed. Deps: T4.8.
- [ ] **T4.10 Account detail, history chart, ledger (M) [P0].** `AreaChart` in `ChartFigure`, ledger in `CollapsibleSection` above 8 rows, read-only with `HISTORY_EDIT_ENABLED = false` and the line "History editing isn't available yet". Tests: missing months are gaps; unknown id gives not-found. Deps: T4.4, T2.27.
- [ ] **T4.11 Profile read, settings shell, About (M) [P0].** Read-only profile summary, settings list, About with version and privacy and terms links, sign-out through `ConfirmDialog`. Tests: sign-out confirm wording; links open the system browser. Deps: T4.2, T3.9, T2.13.
- [ ] **T4.13 Backend: client-policy endpoint (B12) (S) [P0].** `GET /app/client-policy` (unauthenticated) returning `{ ios: { minVersion, recommendedVersion }, android: {...} }` from config with a default of no minimum. Tests: shape; no auth required; values from env; malformed env falls back to no minimum. Deps: T0.6.
- [ ] **T4.14 Maestro flows that read the API (M) [P0].** `session-ended-state` (second 401 after refresh), `refresh-then-retry`, `backend-outage-is-not-empty`, `cold-start-offline-restores`, `restored-offline-terminal`, using Home and Accounts. Acceptance: all pass three runs in a row on the Android job. Deps: T3.7, T3.8, T3.17, T4.4, T4.8.
- [ ] **T4.12 M4 accessibility exit check (S) [P0].** Home, Accounts, detail, Profile at 200 percent in both schemes; VoiceOver and TalkBack pass on a list row and a chart. Deps: the P0 tasks of M4.

### M5. Money management: accounts, budget, debt, savings

Goal: create, edit and delete money data safely. Writes are online and `signedIn` only, confirmed when destructive, invalidate caches, show real errors.

- [ ] **T5.1 Account create (M) [P0].** react-hook-form with `CreateAccountInput`. Tests: blank balance rejected, not saved as 0; failed save keeps the form with the generic message; success invalidates `accounts`, `accountDetails`, `portfolio`; double submit sends one request; disabled in `restoredOffline`. Deps: T4.8, T2.9, T2.10.
- [ ] **T5.2 Account edit and delete (M) [P0].** Delete through `ConfirmDialog` naming the account and stating that its history and transactions are removed. Tests: 404 shows not-found and refreshes. Deps: T5.1, T2.13.
- [ ] **T5.3 Budget view and totals (M).** Category sections, surplus. Frequency normalisation from the engine or a documented helper with tests; if the engine lacks it, add it to the engine first. Deps: T4.4, T0.5.
- [ ] **T5.4 Budget line add and edit (M).** Tests: unknown amount blank rejected; frequency and essential flags. Deps: T5.3.
- [ ] **T5.5 Budget delete and categories (S).** `ConfirmDialog` names the line; custom category echoes the server's returned list. Deps: T5.4.
- [ ] **T5.6 Runway calculator (M).** Inputs persisted in encrypted storage and cleared on sign-out; sticky result above the collapsible adjust panel. Deps: T5.3, T2.11.
- [ ] **T5.7 Budget setup wizard (M).** "Add suggested lines" is an explicit button calling `seedDefaults` once. Tests: never calls it unless tapped; re-tap shows "already added". Deps: T5.4.
- [ ] **T5.8 Monthly balance check-in (on Accounts) (M).** **VERIFIED IN CODE:** `MonthlyBalanceCheckInDrawer` is used only by `AccountsContainer`, so it belongs on the Accounts screen, not Budget. Sheet updating balances per account. Tests: no accounts explains why; partial failure reports which accounts failed. Deps: T5.2, T2.14.
- [ ] **T5.9 Debt list and summary (M).** Debts are liability accounts; summary cards. Tests: unknown APR shows "Not calculated" and is excluded from weighted averages with a note; estimated minimums flagged. Deps: T5.2.
- [ ] **T5.10 Debt add, edit, delete (M).** Deps: T5.9.
- [ ] **T5.11 Payoff strategies and chart (M).** `compareAvalancheAndSnowball`, `calculateDebtSchedule`; schedule in `CollapsibleSection`. Tests: same inputs as a T1.21 vector give the same total interest. Deps: T5.10, T2.27, T0.5.
- [ ] **T5.12 Promo cliff tracker (M).** `calculateZeroPercentCliff`, `analyzePromoCliff` with an injected clock. Deps: T5.10.
- [ ] **T5.13 Car finance balloon and overdraft cost (M).** Deps: T5.10.
- [ ] **T5.14 Student loan and debt-to-wealth bridge (M).** Plans from `UK_STUDENT_LOANS`; `evaluateUkStudentLoan`, `calculateDebtToWealthBridge`. Deps: T5.10.
- [ ] **T5.15 Savings list and CRUD (M).** AER shown with its source; settings patch sends only changed fields. Deps: T5.2.
- [ ] **T5.16 Annual allowance pill (S).** Port of web's `AnnualAllowancePill` (savings). Deps: T5.15.
- [ ] **T5.17 Savings forecaster (M).** `calculateCompoundTrajectory`/`calculateForecast`; hidden until rate and balance are present. Deps: T5.15, T2.27, T2.11.
- [ ] **T5.18 Savings quick-start (S).** Writes one account and settings. Deps: T5.15.
- [ ] **T5.19 M5 accessibility exit check (S).** Forms, sliders and charts at 200 percent. Deps: M5.

### M6. Wealth, planning, profile, onboarding

Goal: the remaining web pages. The engine supports 2020/21 to 2026/27 and throws beyond; screens show "That tax year isn't supported yet". Tax, pension and forecast screens ship only after E4's owner sign-off.

- [ ] **T6.1 Discovery: receipts, avatar, widgets, payments on account (S).** Read `TaxContainer`, `TaxIncomeSectionCard`, `PaymentsOnAccountCard`, `utils/avatar`, `WidgetSettingsModal`; record size limits, accepted types, avatar storage, widget settings shape in the inventory. Deps: none.
- [ ] **T6.2 Pension list and CRUD (M).** Deps: T5.2.
- [ ] **T6.3 Pension: salary sacrifice and employer NI saving (M).** `calculateSalarySacrificeSaving`, `calculateEmployerNISavings` with the pinned year family. Tests: engine called with `getCurrentUkTaxYear(now)` (injected clock); unsupported year message; no thresholds in the app (literal check). Deps: T6.2, T0.5.
- [ ] **T6.4 Pension: 100k trap and take-home (M).** `calculate100kTaxTrap`, `calculateUKEWNITakeHome`. Deps: T6.2.
- [ ] **T6.5 Pension: forecaster and quick-start (M).** Checklist step marking. Deps: T6.3, T2.27.
- [ ] **T6.6 Mortgage screen (M).** Balance, rate, term from profile and account; persists only stored fields; blank stays blank; empty-state CTA. Tests: zero rate and interest-only through the engine; blank term gives no 1-year default (web fix `3cda997`). Deps: T5.2.
- [ ] **T6.7 LTV milestones (S).** `calculateLtvMilestones`. Deps: T6.6.
- [ ] **T6.8 Overpayment vs ISA simulator (M).** `calculateMortgageVsIsa`; overpayment larger than the balance rejected with a message; chart with table; schedule collapsed. Deps: T6.6, T2.26.
- [ ] **T6.9 Remortgage shock (S).** Deps: T6.6.
- [ ] **T6.10 Forecast: wealth forecaster (M).** `calculateForecast`, `projectCrossoverWealth`. Deps: T4.4, T2.27, T2.11.
- [ ] **T6.11 Forecast: UK take-home calculator (M).** Student loan plan select; Scottish bands (`calculateScottishIncomeTax`); same salary gives the engine vector's take-home for 2020/21 and 2026/27. Deps: T6.10.
- [ ] **T6.12 Tax records: list by year and source (M).** `isRecordActiveInTaxYear`, `getRecordAnnualTotalForTaxYear`. Deps: T4.3, T0.5.
- [ ] **T6.13 Tax record add, edit, delete (M).** Categories from `getCategoriesForSource`. Deps: T6.12, T2.13.
- [ ] **T6.14 Payments on account, trap banner, disclaimer (M).** Port of web's `PaymentsOnAccountCard` plus `TaxTrapAlertBanner` and the disclaimer sheet. Deps: T6.12.
- [ ] **T6.15 Tax copy year and bulk (M).** `buildCopiedRecordForTaxYear`, `POST /tax-records/bulk` with `capPreviousRecordIds`. Tests: bulk failure leaves local state untouched. Deps: T6.13.
- [ ] **T6.16 Tax delete year (S).** `ConfirmDialog` with the count; partial failure reports which records failed and refetches. Deps: T6.13.
- [ ] **T6.17 Receipt attach [BLOCKED on T7.29] (M).** `expo-image-picker`/`expo-document-picker`, compression, size cap matching B10's limit. Tests: oversize rejected before any request; unsupported type rejected; permission denial shows a settings prompt; payload never in the persisted cache. Deps: T6.13, T7.29, T6.1.
- [ ] **T6.18 Receipt view and download [BLOCKED on T7.29] (M).** Fetch `GET /tax-records/:id/receipt` on demand; image and PDF viewing; share/save through the OS sheet. Deps: T6.17.
- [ ] **T6.19 Profile edit: personal and income (M).** Patch sends only changed fields; explicit "clear" affordance, blank is not null by accident. Deps: T4.11.
- [ ] **T6.20 Profile edit: pension, mortgage, pages, widgets (M).** Deps: T6.19.
- [ ] **T6.21 Country and currency selector, Irish take-home (M).** The 11 web countries and currencies; `calculateIrishTakeHome` when IE. Tests: unknown country renders the raw code without crashing. Deps: T6.19.
- [ ] **T6.22 Dashboard widget settings (S).** Mirrors `WidgetSettingsModal`; unknown widget keys ignored. Deps: T4.6, T6.1.
- [ ] **T6.23 Avatar [BLOCKED on T7.30] (S).** Photo picker, compress to a small JPEG data URL under B11's cap; or omit with a note. Deps: T6.19, T7.30.
- [ ] **T6.24 Security: change password (S).** Backend client-error text shown only for 4xx. Deps: T4.11.
- [ ] **T6.25 Security: password reset email [BLOCKED on T7.31] (S).** Sends no body; works only once B4 resolves the email server side. Deps: T6.24, T7.31.
- [ ] **T6.26 Security: reset financial data (S).** Typed confirmation "RESET"; after a successful 200 invalidate all queries and show the empty state only then. Deps: T6.24, T2.13.
- [ ] **T6.27 Onboarding: profile and pages steps (M).** Saves per step, resumable, never seeds fake data. Replaces T3.12. Deps: T6.19.
- [ ] **T6.28 Onboarding: optional accounts and budget step (M).** User-typed values only. Deps: T6.27, T5.1, T5.4.
- [ ] **T6.29 Onboarding: completion and resume (S).** Patches `onboardingCompleted`; killing the app mid-flow resumes at the right step; gate in T3.11 routes incomplete users here. Deps: T6.28.
- [ ] **T6.30 M6 accessibility exit check (S).** Deps: M6.

### M7. Integrations and public features

- [ ] **T7.1 Bank connections: list and status (M).** Behind `BANK_CONNECTIONS_ENABLED`. Deps: T4.3, T7.8.
- [ ] **T7.2 Sync, refresh and errors (S).** Provider text never shown; `lastSyncedAt` with stale label. Deps: T7.1.
- [ ] **T7.3 Disconnect single and all (M).** `ConfirmDialog` naming the accounts and history removed; per-item progress and failure report. Deps: T7.1, T2.13.
- [ ] **T7.4 Token connect wizard (M).** Token entry never stored beyond the request; brand colours from the allow-listed constants file. Deps: T7.1.
- [ ] **T7.5 OAuth connect [BLOCKED on E6] (M).** State check, cancel, no token in URLs. Deps: E6, T7.4.
- [ ] **T7.6 History edit: add year [BLOCKED on T7.28] (M).** Flips `HISTORY_EDIT_ENABLED`. Deps: T7.28, T4.10, T2.13.
- [ ] **T7.7 History edit: values and delete year [BLOCKED on T7.28] (M).** Deps: T7.6.
- [ ] **T7.8 Bank connection feature flag (S) [P0].** `BANK_CONNECTIONS_ENABLED` constant default false in store builds, true in development and preview; entry points hidden when off; test proves no bank UI or call is reachable when off. Deps: T2.18.
- [ ] **T7.9 AI & MCP: token list (M).** **Web has no real UI (verified).** Prefix, scopes, expiry, last used, revoked state. Deps: T4.1, T1.12.
- [ ] **T7.10 AI & MCP: create and show once (M).** Raw token shown once with copy and a warning. Tests: raw token absent from state and cache after leaving (`gcTime` 0, excluded from persistence). Deps: T7.9.
- [ ] **T7.11 AI & MCP: revoke and MCP URL (S).** `ConfirmDialog`; the `/mcp` endpoint URL shown as copy text. Deps: T7.9.
- [ ] **T7.12 Context pack export (S).** Anonymise on by default; turning it off needs a confirm; never persisted. Deps: T7.9.
- [ ] **T7.13 Tools hub (S).** Seven items, signed out too. Tests: slugs equal web's seven (script compares against `tools.$slug.tsx`). Deps: T2.18.
- [ ] **T7.14 Tool: 100k tax trap (S).** Deps: T7.13, T1.22.
- [ ] **T7.15 Tool: mortgage overpay vs ISA (S).** Deps: T7.13.
- [ ] **T7.16 Tool: Section 24 (S).** Deps: T7.13.
- [ ] **T7.17 Tool: debt snowball vs avalanche (S).** Deps: T7.13.
- [ ] **T7.18 Tool: 0% balance transfer cliff (S).** Deps: T7.13.
- [ ] **T7.19 Tool: overdraft cost (S).** Deps: T7.13.
- [ ] **T7.20 Tool: student loan overpay (S).** Deps: T7.13.
- [ ] **T7.21 Demo: persona data and `DemoApiClient` (M).** Three personas (`wealth`, `high`, `medium`) as typed constants from web's `utils/demoData.ts` with a test pinning key totals; `DemoApiClient` implements the same interface and is never constructed in a signed-in session. Deps: T4.4.
- [ ] **T7.22 Demo: banner, isolation, exit (M).** "Demo data, not yours" on every screen. Tests: zero `fetch` calls; cannot touch secure store; sign-in from demo wipes demo state; enables the sign-in screen's demo button. Deps: T7.21, T3.15.
- [ ] **T7.23 Delete account UI [BLOCKED on T7.27] (M) [P0].** Typed confirmation, calls `profile.deleteAccount()`, then the T3.9 wipe. Tests (Review Focus 5): success clears everything; failure shows the generic message and keeps the session; the screen explains what is deleted and that it cannot be undone; fixture flow `delete-account-then-token-rejected`. Deps: T7.27, T2.13, T3.9.
- [ ] **T7.24 Web: privacy policy and account-deletion page [BLOCKED on D20] (M) [P0].** B13: public pages on web or marketing (policy text from the owner; deletion instructions and a request route). Deps: D20.
- [ ] **T7.25 M7 accessibility exit check (S).** Deps: M7.
- [ ] **T7.26 Backend B6a: tombstone, WorkOS user deletion, guard (M) [P0].** New `deleted_users(user_id, deleted_at)` table and migration; a WorkOS wrapper that revokes sessions and deletes the user (abort without touching data if it fails); `AuthGuard` rejects any token whose `sub` has a tombstone with 401. Tests: tombstoned id gets 401 on every guarded route; WorkOS failure aborts and writes no tombstone; `getProfile` cannot recreate a tombstoned profile. Deps: T0.6.
- [ ] **T7.27 Backend B6b: `DELETE /user-profile` (M) [P0].** Order per 4.2: WorkOS deletion, tombstone, then one database transaction deleting accounts, details, transactions, bank connections (with stored provider tokens), budget entries, tax records (including receipts), MCP tokens and the profile; 204; idempotent. Tests: cross-user isolation (user B's rows untouched); rollback leaves nothing half-deleted; second call is 204 or 401, never an error. Deps: T7.26.
- [ ] **T7.28 Backend B1: account history endpoints (M).** `POST /accounts/:id/details/year`, `PUT /accounts/:id/details`, `DELETE /accounts/:id/details/:year` exactly as web already calls them, scoped by `userId`. Tests: cross-user 404; year validation. Shared with the web fix for G-04. Deps: T0.6.
- [ ] **T7.29 Backend B10: receipts (M).** `GET /tax-records` omits `receiptData`; `GET /tax-records/:id/receipt`; explicit JSON body limit. Tests: list has no `receiptData`; receipt endpoint is owner-scoped; oversize body returns 413. Deps: T0.6.
- [ ] **T7.30 Backend B11: avatar cap (S).** Size cap on `avatarUrl` writes. Tests: oversize rejected with 400/413. Deps: T0.6.
- [ ] **T7.31 Backend B4: password reset resolves email server side (S).** `send-password-reset` ignores a body email and looks the email up from the user id. Tests: body email ignored; cross-user safe. Deps: T0.6.

### M8. Hardening

- [ ] **T8.1 E2E: accounts, delete account, update-required, deep link, logout wipe (M) [P0].** Flows `accounts-crud-with-confirm`, `delete-account-then-token-rejected`, `update-required-screen`, `deep-link-while-signed-out-resumes`, `logout-clears-data`. Deps: T5.2, T7.23, T4.1, T3.11, T3.9, T4.14.
- [ ] **T8.2 E2E: budget, debt, tax, profile reset (M).** Flows `budget-add-edit-delete`, `debt-unknown-apr-not-calculated`, `tax-record-copy-year`, `profile-reset-requires-typed-confirmation`. Deps: T5.4, T5.10, T6.13, T6.26, T8.1.
- [ ] **T8.3 E2E: dark mode and large text smoke (S).** Deps: T8.1.
- [ ] **T8.4 Full VoiceOver audit on iOS (M) [P0].** Checklist 5.1 across every shipped screen; report in `docs/audit/plans/E12-a11y-report.md`. Acceptance: no P1 finding open. Deps: the shipped screens (the P0 tasks of M2 to M4, T5.1, T5.2, T7.23); later screens are audited through their milestone exit checks.
- [ ] **T8.5 Full TalkBack audit on Android (M) [P0].** Same. Deps: as T8.4.
- [ ] **T8.6 Performance: lists (M).** Virtualised lists with 500 rows (accounts, budget, tax). Deps: M6.
- [ ] **T8.7 Performance: cold start and bundle (S).** Budget under 2.5 s on a mid-range Android emulator profile, recorded for iOS. Deps: M6.
- [ ] **T8.8 Security review (M) [P0].** `security-reviewer` agent (read-only, sonnet) over `apps/mobile/src/auth`, the new backend endpoints, `packages/api-client`; verify bundle greps, ATS and cleartext config, backups, clipboard, hostile deep links, wipe, stripped logs, tombstone. No high finding open. Deps: T3.1 to T3.12, T3.15, T7.23, T7.26, T7.27.
- [ ] **T8.9 iOS e2e script and manual dispatch (S).** Deps: T3.17.
- [ ] **T8.10 Offline and stale edge audit (M) [P0].** Every screen offline with and without cache; network dies mid-mutation; expired cache; schema-version bump; clock skew. Acceptance: no screen shows empty or zero for an unknown. Covers the P0 screens first; later screens are added as they ship. Deps: T4.4, T3.7, T4.14.

### M9. Release

- [ ] **T9.1 EAS profiles and environments (M) [P0].** `eas.json`, `app.config.ts` per environment, bundle id and Android package `io.github.mgallagher56.flump` (D2), Face ID usage string, minimal Android permissions, `userInterfaceStyle: "automatic"`, icons for light and dark. Acceptance: `eas build --profile preview` installs on both platforms. Deps: D2, D3, D18.
- [ ] **T9.2 release-please and versioning (S) [P0].** Add `apps/mobile` to config and manifest; `app.config.ts` reads the version; tag-triggered or manual build workflow. Deps: T9.1.
- [ ] **T9.3 Store assets and metadata (M) [P0].** Screenshots taken from the reviewer test account's sample data (no real data), UK English descriptions, support and privacy URLs; **no mention of bank sync** while D19 is open. Deps: T9.6, owner text.
- [ ] **T9.4 Privacy labels and Play Data safety (S) [P0].** Match the owner's D7 choice. Deps: T9.3.
- [ ] **T9.5 Privacy policy and deletion page live (S) [P0].** Verify T7.24 is deployed and linked from the app and both listings. Deps: T7.24.
- [ ] **T9.6 Real reviewer test account (S) [P0].** A production test user created through WorkOS with sample data entered by hand (no seeding, E2) and credentials in the review notes; demo mode is not relied on (Apple 2.1). Deps: T9.1.
- [ ] **T9.7 TestFlight build and smoke (M) [P0].** Checklist 7.5. Deps: T9.1, T7.23, T9.5.
- [ ] **T9.8 Play internal testing (M) [P0].** Start the closed-test clock if applicable. Deps: T9.1, T9.5.
- [ ] **T9.9 Submission checklist (S) [P0].** Entity (D18), regulatory flag (D19), Apple 4.8 position (D21), all gates ticked and recorded. Deps: T9.7.
- [ ] **T9.10 OTA policy for the preview channel (S).** Deps: T9.1.

### M10. Retire the old app

- [ ] **T10.1 Parity sign-off (M).** Walk the inventory row by row; each P0 to P2 row is done, deliberately deferred with an owner note, or blocked with a ticket. Deps: M8, owner.
- [ ] **T10.2 Delete `apps/mobile-companion` (M).** Separate PR, owner approves: remove workspace, lockfile entries, turbo and CI references, README and `project_rules.md` mentions. Acceptance: `bun install`, the four commands and the three Docker builds pass. Deps: T10.1, D5.
- [ ] **T10.3 Documentation (S).** `apps/mobile/README.md`, a `docs/agents` mobile guideline, AGENTS.md sections 1 and 4 native variants (owner approves the law text). Deps: T10.2.
- [ ] **T10.4 Cleanups (S).** Remove only the `apps/mobile-companion/` prefix from `check-no-mock-auth.sh`; remove the old `COPY` lines from the three Dockerfiles; delete the `.dockerignore` special case. Deps: T10.2.

### Effort and dates

- **Full parity (every P0 to P2 row in the inventory):** 201 tasks, **162 raw agent-days** (161 if the contingent refresh broker is not needed). Raw means implementation plus tests for one task at a time. Real calendar time is longer because of review gates, rework, integration, store waiting and owner actions: with a **1.3x overhead factor** that is about **211 working days, or 42 weeks** (10 months) in one serial stream. M5, M6 and M7 touch separate screen directories, so up to three subagent streams can run in parallel there; assuming that parallelism saves two thirds of those milestones' calendar time (merge and review overhead keep it from being better) the estimate falls to about **154 working days, or 31 weeks**. These figures exceed the first draft's "12 to 14 weeks", which counted milestones of large tasks and left out most of the shared-package, auth-state, chart and release work; the independent reviewer's range of 118 to 153 days was also on large tasks and is in line with this count once splitting is done.
- **P0-only release (first store-ready build):** the tasks tagged [P0] across M0 to M4, the account create/edit tasks (T5.1, T5.2, so the app is not read-only: Apple guideline 4.2 minimum functionality is a rejection risk for a dashboard that cannot add data, UNCONFIRMED but cheap to avoid), the bank-connection flag, account deletion UI, its backend (T7.26, T7.27) and the web policy and deletion page (M7), the core of M8, and M9. That is **99 tasks, 81.5 raw days, about 106 working days or 21 weeks** in one stream. P0 deliberately excludes budget, debt, savings, pension, mortgage, forecast, tax, onboarding, tools, demo, MCP and bank connections (the last is off in store builds anyway, D19). A P0 build also needs the owner's gates (D18, D20, B6, B13) and the store waiting times, which no amount of engineering shortens.
- **Not in these numbers:** B3 request validation (a follow-up), E4's owner sign-off, E6, legal advice, company registration and the D-U-N-S wait, store review and closed-test waiting times, and the owner's own time on D18 to D27. The backend tickets B1, B4, B6, B9 to B12 are sized tasks and are counted.

---

## 9. Risk register

| # | Risk | Likelihood | Impact | Mitigation | Owner |
|---|---|---|---|---|---|
| R1 | Bun, Metro and workspace symlinks fail to resolve `finance-engine` or duplicate React | Medium | High | T0.1 first; fallbacks in 3.3; on-device engine-smoke proof | Agent |
| R2 | WorkOS refuses secretless refresh or custom-scheme redirects | Low to Medium | High | Docs mark `client_secret` optional for refresh; T0.2 and T0.3 prove it; broker T3.18 as fallback; Universal Links | Agent, owner |
| R3 | Issuer mismatch makes the backend reject native tokens | Medium | High | T0.2 decodes a real token; set `WORKOS_ISSUER` | Agent |
| R4 | Missing backend endpoints delay parity or block store approval | High | Medium to High | Tickets T0.6 early; read-only flags; B6 and B13 are release gates | Owner |
| R5 | Apple or Google rejects the app: individual account for a money-management app (3.2.1(viii), 5.1.1(ix)), account deletion, privacy, placeholders, reviewer access | Medium to High | High | Organisation account (D18); B6 and T7.23; real test account (T9.6); privacy policy gate; E7 placeholders replaced | Owner |
| R6 | Backend failure or stale cache shown as empty or zero | Medium | High | Exclusive state helper, T4.4, outage e2e, T8.10 | Agent |
| R7 | Maths drift or duplication returns (B-07) | Medium | High | Literal check, engine-only rule, pinned year API, adapters tested for inputs | Agent |
| R8 | Token leakage via logs, crash reports, backups, clipboard, bundle | Low to Medium | High | 4.3, 4.4, bundle greps, T8.8 | Agent |
| R9 | Expo SDK and RN upgrade churn | Medium | Medium | Pin, Renovate group, e2e on every PR | Agent |
| R10 | Accessibility regressions | Medium | High | Primitives enforce roles and sizes, Biome rule, per-milestone exit checks, T8.4 and T8.5 | Agent |
| R11 | Free-tier CI limits throttle work | Medium | Low to Medium | Android e2e on Linux, iOS manual, EAS on demand | Owner |
| R12 | Hermes Intl lacks `en-GB` data | Low | Medium | T0.4; pure-JS fallback | Agent |
| R13 | Scope: about 162 raw agent-days (about 42 weeks calendar) of effort for a one-owner project; web keeps changing so parity moves | High | Medium to High | Honest estimate in the table above; P0-first release; drift tests (page keys, tool slugs); parity review at M10; `mobile-parity` ticket tag | Owner |
| R14 | Encrypted cache key lost or corrupted | Low | Low | Decryption error is a cache miss; tested | Agent |
| R15 | Fixture-server e2e passes while the real backend drifts | Medium | Medium | T1.19 real-Postgres contract test in backend CI; preview smoke against staging | Agent |
| R16 | Old app deleted before parity, or kept and rots | Low | Medium | M10 gating; own PR | Owner |
| R17 | Regulatory exposure from bank connections (M-07: no FCA registration recorded) | Medium | High | Feature flag OFF in store builds (D19); no bank claims in listings; legal advice before enabling | Owner |
| R18 | Old app versions in the wild break after a backend change | Medium | Medium | Versioning policy 2.13: tolerant parsing, client header, `minVersion` gate (B12), additive changes | Agent |
| R19 | E4 owner sign-off of seven tax years is outstanding and gates M6 tax, pension and forecast | Medium | High | Track as an external prerequisite; ship M6 non-tax screens first; characterisation vectors are not a substitute | Owner |
| R20 | Account deletion leaves a valid token able to recreate the profile | Medium | High | Tombstone in B6, `AuthGuard` check, e2e flow `delete-account-then-token-rejected` | Agent |
| R21 | Clock skew yields spurious 401s | Medium | Medium | B9 `clockTolerance`, client skew estimate from `Date` header | Agent |
| R22 | Refresh rotation without a grace window loses a session on a mid-refresh kill | Low to Medium | Low | Write-ahead order in T3.5; acceptable re-sign-in; T0.2 measures the window | Agent |
| R23 | `packages/tokens` extraction changes web CSS | Low | Medium | Byte-identical Panda output check in T1.15; fallback option (c) in 2.11 | Agent |
| R24 | A single React copy cannot satisfy web and Expo SDK | Medium | Medium | T0.1 records which follows which; Renovate group; `expo-doctor` | Agent |
| R25 | Docker images grow or break when new workspaces are added (verified: the three Dockerfiles copy every workspace manifest) | High without action | Medium | T0.8 before any new workspace, T2.23 CI check | Agent |
| R26 | Store compliance forms and UK GDPR obligations have no owner (privacy manifest, export compliance, age rating, ICO registration, DPAs, data export) | Medium | High | D25, D26, T0.7 | Owner |
| R27 | No REST rate limiting (B7): a retry storm from many devices or a bug reaches the backend unchecked | Low to Medium | Medium | Client retry caps (2.3), single-flight refresh; backend limiter is an E1/E11 item, recommended before launch | Owner |

---

## 10. Decisions needed from the product owner

Format follows `docs/audit/plans/E5-plan-draft.md`. Each lists options, a recommendation and the tasks it blocks.

1. **D1. Which platforms ship first?**
   - A. iOS and Android together to internal testing; iOS to public first, Android on internal and closed testing until M8 passes.
   - B. iOS only for v1.
   - C. Android only.
   - Recommendation: A. The code is shared and testing both from M0 avoids late surprises.
   - Blocks: T9.1, T9.7, T9.8

2. **D2. Developer accounts and the app identifier.**
   - A. Enrol in the Apple Developer Program (about $99 a year) and Google Play ($25 once) now, as decided in D18, and use the bundle id and Android package `io.github.mgallagher56.flump` (reverse-DNS on the owner's GitHub handle, because the owner does not own a `flump` domain; the old app used `com.flump.companion`, which is not reused).
   - B. Enrol later and build simulator and emulator versions only until M8.
   - Recommendation: A before M9. T0.2 and T0.3 do **not** need store accounts (the redirect scheme is independent of the bundle id); T9.1 does. The bundle id `io.github.mgallagher56.flump` cannot change after a listing, and it survives a later transfer to a company developer account.
   - Blocks: T9.1

3. **D3. WorkOS native setup.**
   - A. Custom scheme `flump://auth/callback` now with Universal Links and App Links later; create a WorkOS staging environment; direct secretless refresh unless T0.2 says otherwise.
   - B. Universal Links from day one (needs a hosted association file and a domain).
   - C. Reuse the production WorkOS environment for development (no staging).
   - Recommendation: A, subject to T0.3 confirming the dashboard accepts the scheme. C only with the owner's own account.
   - Blocks: T0.2, T0.3, T3.3

4. **D4. Offline policy.**
   - A. Encrypted read-only cache, 7 days, banners, writes online and `signedIn` only, explicit `restoredOffline` state on cold start (2.8, 4.2).
   - B. No cache (simplest, most private).
   - C. Full offline editing with sync (a separate epic).
   - Recommendation: A.
   - Blocks: T2.22, T3.7, T4.4, T8.10

5. **D5. When is `apps/mobile-companion` deleted?**
   - A. After the signed parity table, in its own PR.
   - B. Immediately.
   - C. Never.
   - Recommendation: A. It stays unmodified until then. It still sends `mock-session-token`, which a production backend rejects, so it is already non-functional there.
   - Blocks: T10.2

6. **D6. Bank connection on mobile (functionality).**
   - A. Build list, sync, disconnect and token connect now behind the flag in D19; OAuth connect waits for E6.
   - B. Send users to the website for any bank connection.
   - C. Hold the whole feature until E6.
   - Recommendation: A.
   - Blocks: T7.1 to T7.5

7. **D7. Telemetry and crash reporting.**
   - A. Nothing but Apple and Google crash reports.
   - B. Crash-only reporting (for example Sentry) with PII scrubbing and no analytics.
   - C. Product analytics.
   - Recommendation: **B** (changed in revision 2): a finance app with no crash signal cannot be supported, and crash-only with scrubbing keeps the privacy label short.
   - Blocks: T9.4

8. **D8. Push notifications.** A. Out of v1. B. In v1 (needs backend device tokens, a scheduler, consent UX). Recommendation: A. Blocks: none.

9. **D9. Account deletion behaviour (store rule).**
   - A. Backend `DELETE /user-profile` (new endpoint) revokes WorkOS sessions, deletes the WorkOS user, writes a tombstone, deletes all rows in a transaction, immediately and irreversibly after typed confirmation (4.2).
   - B. Same with a 14-day grace and restore (needs a retention policy and scheduler).
   - C. Manual email route (Apple rejects this).
   - Recommendation: A, consistent with E5 D4.
   - Blocks: T7.23, T9.7

10. **D10. Certificate pinning.** A. None in v1. B. Pin with backup pins and a remote kill switch. Recommendation: A (Railway certificates rotate; a mismatch is an outage needing a store release). Blocks: none.

11. **D11. Over-the-air updates.** A. Preview channel only. B. Production OTA for JS-only fixes. Recommendation: A until routine; a money-maths bug must not bypass review. Blocks: T9.10.

12. **D12. Migrate web to the shared client and contract packages?** A. Not in E12. B. Last milestone of E12. C. Separate follow-up epic that also adds backend validation from the same schemas (E1 D-08). Recommendation: C. Blocks: none.

13. **D13. How do e2e tests authenticate?** A. Fixture server with a fake WorkOS (no real backend in e2e) plus the real-Postgres contract test. B. Real backend with a test JWKS override (needs a new backend setting and a test user). Recommendation: A. Blocks: T3.16, T3.17.

14. **D14. Tablet and orientation.** A. Phone portrait only (`supportsTablet: false`). B. Responsive tablet layouts and both orientations (about 15 to 20 percent more effort). Recommendation: A. Blocks: T9.1.

15. **D15. Mixed currencies on net worth.** A. Per-currency subtotals with a "mixed currencies" note, no converted total. B. Convert with a rate service. Recommendation: A, and match whatever web does. Blocks: T4.9.

16. **D16. AGENTS.md changes for native.** A. Add a native variant (`X.styles.ts` StyleSheet factory, Gallery instead of Storybook, `X.states.ts` instead of stories). B. Adopt React Native Storybook. Recommendation: A; the owner approves the law text. Blocks: T2.1, T10.3.

17. **D17. Keep the signed-out wealth-check teaser to onboarding seed hand-off?** A. Drop it (mobile has demo and tools). B. Port it. Recommendation: A; unauthenticated financial inputs on a device before sign-in add a privacy surface for little gain. Blocks: T6.27.

18. **D18. Legal entity and store account type (new).** Apple 3.2.1(viii) and 5.1.1(ix) say money-management and financial-services apps should be submitted by the institution or legal entity providing the service, not an individual (CONFIRMED in Apple's guidelines). Google's equivalent is UNCONFIRMED.
    - A. Register or use a company and enrol as an **organisation** in both stores (needs a D-U-N-S number; takes days to weeks).
    - B. Enrol as an individual and accept a likely rejection or request.
    - C. Do not publish publicly; distribute via TestFlight and Play internal testing only.
    - Recommendation: A, with C as the fallback while A is in progress. Ask whether an organisation account satisfies 3.2.1(viii) for an app that only tracks the user's own data (UNCONFIRMED; ask Apple through the App Review contact before spending on a company).
    - Blocks: T9.1, T9.7, T9.8

19. **D19. Regulatory position on bank connections (new).** Audit finding M-07 records marketing claims of FCA AISP status with no FRN or named regulated partner.
    - A. Ship store builds with bank connection **OFF** (T7.8 flag), no bank-sync claims in listings, until the owner has legal advice.
    - B. Ship with it on and a regulated partner named.
    - C. Remove bank connection from mobile permanently.
    - Recommendation: A. Enabling it is a one-line flag change after advice.
    - Blocks: T7.8, T9.3, T9.9

20. **D20. Privacy policy and web account-deletion route as release gates (new).** A. Both must be live before any store submission (T7.24, T9.5); the owner supplies the policy text. B. Submit with placeholders (will be rejected). Recommendation: A. Apple 5.1.1(v) needs in-app deletion; a public web page is also expected in store forms (Google's requirement UNCONFIRMED). Blocks: T7.24, T9.5, T9.7, T9.8.

21. **D21. Which AuthKit sign-in methods are enabled (new).** A. Email and password only (and magic link): Apple 4.8 exemption likely applies. B. Add social providers (Google, Apple): then 4.8 requires an equivalent privacy-preserving option (Sign in with Apple qualifies). Recommendation: A for v1; if B, enable Apple. Blocks: T3.15, T9.9.

22. **D22. Spanish (new).** Web has `supportedLngs: ["en","es"]`. A. Mobile en-GB only in v1, string layer ready. B. Include Spanish (translations plus a review pass per milestone). Recommendation: A. Blocks: copy tasks if B.

23. **D23. Extract `@flump/tokens` from `@repo/ui` (new).** A. Yes (T1.15; touches `packages/ui` imports only through a re-export). B. No: generate native tokens from `@repo/ui` and import its `native-tokens` subpath. Recommendation: A. Blocks: T1.15, T1.16.

24. **D24. Cost approval (new).** Approve the 7.7 table: store fees, any company registration, EAS plan if the free tier is not enough, legal advice. Recommendation: approve the fixed fees now and decide the rest at M8. Blocks: T9.1.
25. **D25. Store compliance checklist (new).** The owner provides or decides: Apple privacy manifest and required-reason API declarations (MMKV, AsyncStorage and Expo modules use some), export-compliance (encryption) answers, age rating and content questionnaires, minimum iOS and Android versions, Android target API level and 16 KB page-size compliance for the chosen React Native and Expo versions, support contact and URL, app name and trademark clearance, and **recruiting the 12 closed-test testers** that gate Google Play production by 14 days. Recommendation: owner works through the checklist during M8 using T0.7; the agent supplies the technical answers. Blocks: T9.3, T9.4, T9.8.

26. **D26. UK GDPR and ICO (new).** Who is the data controller, whether ICO registration is needed, data processing agreements with WorkOS, Railway and any crash vendor (D7), and **data export** (subject access; deletion exists via B6, export does not). Recommendation: owner takes legal advice with D19 and D18; privacy labels (T9.4) follow the answer; add a data-export endpoint only if advised. Blocks: T9.4, T9.9.

27. **D27. Financial disclaimer and sign-in policy (new).** Wording of the "not financial advice" disclaimer for tax, pension, forecast and debt screens (T6.14 ports web's tax disclaimer only), and AuthKit email verification and MFA policy (D21 covers only Apple 4.8). Recommendation: reuse web's approved disclaimer text everywhere and require email verification; MFA optional in v1. Blocks: T6.3, T6.14, T3.15.

---

## 11. Reviewer record

Revision 1 was reviewed by a read-only Sonnet agent against the real routes and controllers (2026-11-11). Confirmed: the three missing history endpoints at `app.accounts.$account.tsx:20-39`; seven `BackendError` kinds; backend auth facts; the web MCP card only ever mocks and nothing calls `/mcp-tokens`; web has no account deletion. Corrected: `POST /budget-entries/reset` does not exist; web has receipt upload; web sends a body on send-password-reset; `ACTION_MESSAGE_BY_KIND` is not exported; no throttler exists; the dev-bypass literal legitimately lives in the backend; new rows for widget settings, country/currency and avatar.

Revision 2 folds in a stronger-model review from the parent session. Each point was checked against the code or a primary source:
- **C1 effort:** recomputed from the task sizes (table at the top of section 8); every L split; P0 date stated separately.
- **C2, C3 auth and offline:** `restoredOffline` state, retryable versus terminal refresh failure, single-flight refresh with retry once (4.2, T3.5 to T3.8); `stale-cache-banner` replaced by `cold-start-offline-restores`; `clockTolerance` absence **VERIFIED IN CODE** (B9, T3.19).
- **C4 decisions:** D18 to D24 added; store position and cost table added (7.6, 7.7). Apple 3.2.1(viii), 5.1.1(ix), 5.1.1(v), 4.8 and 2.1 **CONFIRMED** from Apple's guidelines; Google Play financial rules **UNCONFIRMED**.
- **I1:** WorkOS docs read: refresh `client_secret` is **optional** (correcting revision 1); rotation "may" occur; grace window, error codes, access-token lifetime, custom-scheme redirect and server-side revoke **UNCONFIRMED**, all assigned to T0.2 and T0.3. The broker is a fallback.
- **I2 to I14:** ephemeral session decision and logout handling (T3.10); deletion order with tombstone (B6, 4.2; **VERIFIED IN CODE** that `getProfile` recreates profiles); B10 (**VERIFIED IN CODE:** the list endpoint returns `receiptData`; `avatar_url` is a text column; no body-size option in `main.ts`), B11; versioning policy and B12 (2.13); real-Postgres contract test and fixture-first ordering (T1.5, T1.19, 6.5); on-device engine proof and characterisation vectors (**VERIFIED IN CODE:** only `uk-tax.vectors.ts` exists); pinned `uk-tax-year.ts` family (**VERIFIED IN CODE:** `getCurrentUKTaxYear` takes no clock and never throws); Docker task T2.23 (**VERIFIED IN CODE:** three Dockerfiles copy `mobile-companion/package.json` and install every workspace); inventory additions (`PaymentsOnAccountCard`, `AnnualAllowancePill` exist; check-in drawer is only in `AccountsContainer`; Spanish locale exists; `health-score.ts` row fixed); sequencing (Android e2e at T3.17, exit checks per milestone, T6.25 alone depends on B4, R19 for E4 sign-off; **E8 tokens already on main** so the dependency and blocker are removed); `@flump/tokens` (2.11); charts split with `d3-scale` and touch inspection (T2.24 to T2.31); React alignment and Renovate (3.3 item 9).
- **Minors:** `check:auth` exemption wording fixed; bank brand constants allow-listed; `dist` builds stated; dev routes excluded from production; cleartext profile reconciled with the https rule; crash-only reporting recommended (D7); real reviewer test account (T9.6); trust proxy for the throttle (T3.18).

A second Sonnet reviewer spot-checked revision 2 (arithmetic, dependency closure, contradictions, code claims, tagging). Verified: 192 tasks, 155 raw days and 94 P0 tasks with 77.5 days matched the tables; no L or XL tasks; all code claims (a to l) true; Bun filter flag exists locally (1.3.5), pinned 1.4.4 UNCONFIRMED so T0.8 proves it. Fixed after the spot-check: P0 tasks that depended on whole milestones now name P0 tasks; backend tickets became sized tasks (T4.13, T7.26 to T7.31) and the totals include them; Dockerfiles fixed first (T0.8) because the first new workspace would break all three builds; T3.17 split so API-reading flows run after Home exists (T4.14); T2.22 no longer depends on the token store; stale T1.22/T1.23 references; inventory rows using the legacy tax-year function; store-compliance, GDPR and disclaimer decisions added (D25 to D27); untagged external claims tagged; the inventory gained mobile-only rows and a row-to-task map.
