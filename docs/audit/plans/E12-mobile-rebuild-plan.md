# E12 Mobile rebuild: implementation plan

Revision 3, 2026-11-14. Written against `origin/main` at `fbd1e8f1`. Revision 2 (2026-11-11, 201 tasks) is in git history at `bf843c3a`; this revision replaces it.

## State of the plan

| Question                  | Answer                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| What is approved to build | **Nothing yet.** No mobile code exists. `apps/mobile-companion` is the parked old prototype and is not touched.                                                                                                                                                                                                                                                                                                              |
| What is on record         | The owner decision that the app is rebuilt from scratch with the web app as the guide (`DECISIONS.md`, stated decisions). Round 2 of `DECISIONS.md` adopted this plan's own recommendations as defaults for the reversible choices (section 10.2). The owner rulings of 14 November (section 1). None of these is an instruction to start.                                                                                   |
| What blocks a start       | 1. The owner approves this revision. 2. The owner answers the four open decisions in section 10.1 (framework and build service, developer accounts, push notifications, offline policy). 3. For slice S2 only: access to the WorkOS dashboard to register a redirect address. 4. For slice S3 only: the web check-in walk-through and its calculated-balance function are merged, so mobile copies a shipped flow.           |
| What does not block       | Store accounts and legal questions (needed at S19, not before). Round 2 of the design polish on web (it changes pages, not the shared packages S1 to S3 use).                                                                                                                                                                                                                                                                |
| What already exists       | The shared packages the app needs: `@flump/tokens` with a generated native theme, `@flump/format`, `@flump/api-contract`, `@flump/api-client`, `@flump/finance-engine`. The backend serves a versioned `/v1` API with account deletion and data export. Section 3 lists each with its state.                                                                                                                                 |
| How it stays current      | [E12-mobile-parity-log.md](./E12-mobile-parity-log.md) records each web change a mobile user would notice. This plan is re-read against `main` at the end of each design round.                                                                                                                                                                                                                                              |

**Goal:** a new `apps/mobile` app for iOS and Android that does what the Flump web app does, signed in through the real WorkOS flow, using the shared maths, formatting, API contract and design tokens, so that web, marketing and mobile feel like one product.

**Companions:** [E12-feature-inventory.md](./E12-feature-inventory.md) (written 2026-11-11; out of date, see section 8.4), [`docs/ux/CROSS-PLATFORM.md`](../../ux/CROSS-PLATFORM.md), [`docs/ux/UX-GUIDELINES.md`](../../ux/UX-GUIDELINES.md), [`docs/ux/STYLE-GUIDE.md`](../../ux/STYLE-GUIDE.md), [`docs/copy/COPY-GUIDE.md`](../../copy/COPY-GUIDE.md), [`docs/api/versioning.md`](../../api/versioning.md).

**Confidence tags.** **VERIFIED IN CODE** means read in the repo at the commit above. **CONFIRMED** means read in a primary source, which is named. **UNCONFIRMED** means not verified; the text says where to check.

## What changed in revision 3

1. **Most of the old milestone 1 is done.** The token package and native theme, the formatter, the API contract and the typed client are on `main`. Their tasks are removed and section 3 records what exists.
2. **The backend moved.** There is a `/v1` API with request validation, one error body, pagination, safe retries and an OpenAPI document. Account deletion with a tombstone, data export, rate limits and receipt download exist. Of the thirteen backend tickets in revision 2, six are closed, two are dropped or parked and three stay open (section 5.5).
3. **Bank linking is out of the mobile plan.** Owner ruling: bank sync waits until Flump has revenue. All bank screens, the bank flag and the bank decisions are parked (section 1.3).
4. **The monthly check-in is the first feature.** Owner ruling. It is slice S3, straight after sign-in.
5. **201 small tasks became 21 slices, each one pull request**, with the first three specified in full (section 8). This follows the owner's rule of fewer, larger PRs.
6. **Rules that AGENTS.md changed are corrected:** subagent models, the local pre-flight, the Direction C palette, en-GB only.

---

## 1. Owner rulings and scope

### 1.1 Rulings of 14 November 2026

These are owner rulings. Where one is not yet on `main` for web, the parity log says so, and mobile follows the ruling, not the older web behaviour.

| #   | Ruling                                                                                                                                                                                                                                                                 | State on web                                                                                                                                     | What it means for mobile                                                                                                                                                                                                                                 |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | **Net worth is the user's choice.** Two settings: property (home value and mortgage together, never one side alone) and student loan.                                                                                                                                  | Merged (PR 697). **VERIFIED IN CODE:** `netWorthCountsProperty` and `netWorthCountsStudentLoan` on the profile; `NetWorthBasis` in the engine.   | The app never works out net worth itself. It shows the figure from `GET /v1/portfolio-snapshot`, which already follows the choices, and says what is left out from `netWorthLeavesOut`. Settings has the same two switches (S9).                         |
| R2  | **Bank sync is deferred until Flump has revenue.** When it comes it is balances only, through an aggregator.                                                                                                                                                           | Bank surfaces are being removed from web pages in polish round 2. The backend refuses to boot with the bank flag on (BE-07).                     | No bank screen, bank flag or bank wording in the app or its store listings. Section 1.3.                                                                                                                                                                 |
| R3  | **The monthly check-in walks through each account** with "Update" or "No change", one card per account on phones. Mortgages and loans default to a calculated balance labelled "Calculated" that the user can override. It is the mobile app's most important flow.    | Not on `main` yet. Today web has one sheet listing every account (`CheckInSheet`, PR 640).                                                        | First feature slice (S3).                                                                                                                                                                                                                                |
| R4  | **Navigation.** The bottom tab bar is for phones only (below 768px). The phone top bar keeps a menu button and the light and dark toggle.                                                                                                                              | Not on `main` yet. **VERIFIED IN CODE:** `NAV_BREAKPOINT` is `64rem` (1024px) in `packages/tokens/src/breakpoints.ts`.                            | Phones get a tab bar with the web's five entries. The header of each top-level screen has a menu button and a light and dark toggle (S4). Tablet layouts are out of the first release.                                                                   |
| R5  | **Loading.** No skeleton for the first 200ms or so. Once shown, a skeleton stays for at least 400ms or so. No generic full-page skeleton between screens that have already loaded. Safe with reduced motion.                                                           | Partly. Web shows `PageSkeleton` after 200ms (UX-GUIDELINES E2). The minimum display time and the "between loaded screens" rule are not on main. | One hook, `useDelayedLoading`, owns the timing (S3). A screen whose data is in the cache shows the data at once. Shimmer stops under Reduce Motion.                                                                                                      |
| R6  | **Tagline:** "Flump: finance without the fog".                                                                                                                                                                                                                         | Not in the copy guide or the marketing site yet.                                                                                                 | Shown on the sign-in screen (S2) and used as the store subtitle (S19).                                                                                                                                                                                   |

### 1.2 Scope

**First store release:** sign-in, the monthly check-in, Home, Accounts and account detail with history, adding and editing accounts, settings (profile, net worth choices, theme, export, delete account), offline reading. These are slices S1 to S9, then S18 and S19.

**Full parity:** every page of the web app (budget, debt, mortgage, pension, savings, take-home, self assessment, tools, onboarding, AI connections, the sandbox). Slices S10 to S17.

**Out of scope:** bank linking (1.3); push notifications and offline editing unless the owner decides otherwise (10.1); widgets, a watch app, tablet layouts, in-app purchases, marketing pages, CSV import (the web keeps it; mobile links to the website).

### 1.3 Parked: bank linking

Revision 2 planned bank connection screens (list, sync, disconnect, token entry, OAuth), a `BANK_CONNECTIONS_ENABLED` flag in the app, an allow-listed bank brand colour file, and decisions D6 and D19. All of it is removed from the milestones under ruling R2.

What stays true:

- The check-in treats every account as typed in by the user. The contract still has `connectionId` on accounts; a row that has one is shown read-only with its saved value, so an account connected in the future does not break the screen.
- Store listings, screenshots and the privacy labels say nothing about bank sync.
- When bank sync returns it is a new plan: balances only, through an aggregator, after revenue. Nothing in the app is built ahead for it.

### 1.4 What the old app teaches

The parked prototype had no tests, a mock sign-in, a mock token on every request, a client that switched to mock data on any failure, writes that reported success without saving, colours copied by hand, seven copies of a currency formatter, tax maths written again in the app, and no accessibility labels. Each is ruled out by a constraint in section 2.

---

## 2. Rules every slice inherits

Copied from AGENTS.md, the `docs/ux` documents, the copy guide and the owner decisions. Where this list and those documents disagree, they win.

**Process**

- Read first: `AGENTS.md`; `docs/ux/CROSS-PLATFORM.md` (all of it); the sections of `docs/ux/UX-GUIDELINES.md` for what the screen does; `docs/ux/STYLE-GUIDE.md` section 12 for each component used; `docs/copy/COPY-GUIDE.md` for any words.
- One slice is one PR. Do not stack a PR on another open PR.
- Local checks before a push: `rtk bun run lint`, `rtk bun run check-types`, `rtk bun run check:laws`, and the tests for the packages the slice touches. CI runs the rest, and a PR is ready only when every CI check on its last commit is green (AGENTS.md section 5).
- Subagent models follow AGENTS.md section 6: `opus` writes code and reviews it, `sonnet` does mechanical work, `haiku` runs exact lookups, `fable` writes plans and makes hard decisions without writing files.
- Every PR that adds or changes a screen runs the parity checklist in CROSS-PLATFORM section 7, states the result, and adds its row to the parity log if it changes a shared flow.

**Money and data**

- No money maths in the app. Tax, National Insurance, student loan, mortgage, debt, forecast, take-home and net worth come from `@flump/finance-engine` or from the backend. A check fails the build on tax thresholds written as literals in `apps/mobile`.
- Tax years use the clock-injectable family in `packages/finance-engine/src/uk-tax-year.ts` (`getCurrentUkTaxYear(now)`, `resolveUkTaxYear`, `getUkTaxYearForDate`, `isSupportedUkTaxYear`, `getUkTaxYearRules`). An unsupported year shows "That tax year isn't supported yet".
- Every figure is formatted by `@flump/format`: whole pounds where a figure is read, pence where the user types or reconciles, `Mar 2030` for dates, "Not set" for a missing value. Tabular numerals on every figure.
- A failure never renders as an empty or zero state. Errors use the `BackendError` kinds from `@flump/api-client`. Saved data shown while offline is labelled with its age.
- Zero is different from unknown. Unknown shows "Not set" and never 0.
- Headline figures and KPI strips read saved data only. What-ifs live in a `ScenarioZone` labelled "Illustration, not saved", never write to saved data and never put money in a link.

**Look and words**

- Colours, sizes, radii, shadows and durations come from `@flump/tokens/native` through `useTheme()`. No hex or rgb literal in `apps/mobile`. The palette is Direction C (teal, sand, warm charcoal); teal is the accent, apricot is debt, red is for errors and destructive actions only.
- One headline figure per screen, in a `HeroFigure`, the same figure as the web page (table in `docs/design/e16-polish/PLAN.md` section 2). At most 4 figures in the first view and 12 before any disclosure.
- Never judge anyone's finances. No "only" or "just" about money, no alarm colour or warning icon on an ordinary balance, no streaks, points or confetti, no comparison with other people, nothing that ranks renting below owning. A missed month is never mentioned.
- Words follow the copy guide: plain, sentence case, en-GB, no exclamation marks. One approved word per idea ("debts", "what you own", "left over each month", "estimate"). Fixed notices come from shared constants and are never reworded.
- Facts, not recommendations (`docs/compliance/advice-boundary-policy.md`).

**Platform**

- Native chrome on purpose: stack headers, the back gesture never blocked, native sheets and pickers, platform alerts for destructive confirmation, edge to edge on Android with insets handled. The table is CROSS-PLATFORM section 5.
- Touch targets are at least 48 by 48. Text follows the system font size and is never switched off from scaling. Layouts hold at 200% text and at 320 points wide.
- Every pressable has a role and a label. Motion honours Reduce Motion. Nothing needs dragging, hover or colour alone.
- Loading follows ruling R5.

**Security**

- No `mock-session-token`, `dev_user_123` or mock fallback anywhere in `apps/mobile`, and no exemption for it in `scripts/check-no-mock-auth.sh`.
- The refresh token lives only in the device's secure store; the access token only in memory. No secret, API key or signing key in the bundle. The only public values are the API address, the WorkOS client id and the redirect scheme.
- A network failure is not the end of a session. A session ends only when the token endpoint rejects the refresh token for good, or a request gets a second 401 after a successful refresh.
- Every destructive action goes through `ConfirmDialog`: name the thing, state the consequence, label the button with the verb.

**Component files.** Each component lives in its own PascalCase directory with `X.tsx`, `X.styles.ts` (a StyleSheet factory that takes the theme), `X.test.tsx`, `X.states.ts` (named prop sets, used by the gallery and the tests, in place of a Storybook file) and `index.ts`. This native variant needs an AGENTS.md edit, which the owner approves in S1 (section 10.3).

### The failures most likely to ship by accident

Each is pinned by a test in the slice named.

1. A failed request or no network shown as "no accounts yet" (S3, S5).
2. A cold start with no network wiping the saved data or ending the session (S7).
3. A 401 signing the user out, or many 401s causing many refreshes (S2).
4. A missing number shown as 0 (S3 and every calculator slice).
5. Sign-out or account deletion leaving data or a working token on the device (S2, S9).
6. A check-in that saves a guess: a calculated balance must be shown as "Calculated" and sent only when the user accepts it (S3).

---

## 3. What exists today

All **VERIFIED IN CODE** at the commit in the header.

| Thing                           | State                                                                                                                                                                                                                                                                                                                                                                                                                    | Left for mobile                                                                                                                                                       |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@flump/tokens`                 | `packages/tokens`. Authored token files, `scripts/build-native-tokens.ts`, the committed `src/native.generated.ts` exported as `@flump/tokens/native` (light and dark colours and shadows, spacing, radii, sizes, font sizes, text styles, durations, easings, z-index, breakpoints). A drift test, a contrast matrix on the generated values, and a contract test against Panda's own export in `packages/ui`.           | The mobile-only contrast pairs (placeholder text, disabled text, tab bar icon states). Extending the literal scans to `apps/mobile`.                                  |
| `@flump/format`                 | `packages/format`. `formatCurrency`, `formatCompactCurrency`, `formatPercent`, `speakCurrency`, `formatDate`, `formatRelativeTime`, `formatTaxYear`, `formatMonthYear`, `formatDuration`. A shared fixture runs on V8 and JavaScriptCore and is pinned to what the web `Money` component shows.                                                                                                                         | Running the same fixture on Hermes for iOS and Android (S1).                                                                                                          |
| `@flump/api-contract`           | `packages/api-contract`. Zod schemas for requests and responses by domain (accounts, app, bank connections, budget, imports, MCP tokens, profile, snapshots, tax, transactions), the route manifest, the error body, pagination, header names, and a generated `openapi.json` guarded against breaking changes by `check:laws`.                                                                                         | A schema for the client policy endpoint (B-A).                                                                                                                        |
| `@flump/api-client`             | `packages/api-client`. `createApiClient({ baseUrl, getAccessToken, onUnauthorised, client, fetch, timeoutMs })`. Calls `/v1`, validates every response with a contract schema, shares one refresh between concurrent 401s and retries once, sends `X-Flump-Client: mobile/<version> (<platform>)`, and has `getClientPolicy()` and `isBelowMin()`. `BackendError` has eight kinds. The web app and MCP client use it.    | Nothing before S2. `getClientPolicy()` calls `/app/client-policy`, which the backend does not serve yet (B-A).                                                        |
| `@flump/finance-engine`         | The only place for maths. Includes the net worth basis (`net-worth-basis.ts`), snapshots and history selectors (`snapshots.ts`), the financial picture (`picture/`), take-home, what-if and the tax-year family. Test vectors: `uk-tax.vectors.ts` and `uk-whatif.vectors.ts`, with an owner sign-off ratchet in `check:laws`.                                                                                          | The check-in row and payload builders live in `apps/web/app/features/snapshot/snapshotModel.ts`, which mobile cannot import. They move to the engine before S3.       |
| Backend API                     | `/v1/...` is the stable surface; unversioned paths are deprecated aliases (`docs/api/versioning.md`). Strict request bodies, one error body with a `code` and `requestId`, cursor pagination, optional `Idempotency-Key` on creates and `If-Match` on updates. Money is a JSON number in pounds. Rate limits are stored in Postgres.                                                                                    | Section 5.5.                                                                                                                                                          |
| Account deletion and export     | `DELETE /v1/user-profile` (typed phrase, recent sign-in required, one transaction, WorkOS user removed, tombstone kept 24 months, later tokens for that user rejected). `GET /v1/user-profile/export`. The web has a public `/account-deleted` page.                                                                                                                                                                    | The mobile screens (S9).                                                                                                                                              |
| Web navigation data             | `apps/web/app/components/navigation/navConfig.ts`: `BOTTOM_BAR_TABS` (Home, Accounts, Budget, Tax and pay, then More) and `AUTH_NAV_ROUTES`.                                                                                                                                                                                                                                                                            | A test that the mobile tab and More entries equal it (S4).                                                                                                            |
| Docker images                   | The three Dockerfiles copy every workspace manifest through a `manifests` stage and install with Bun filters (`--filter './packages/*'` plus the app). A new `apps/mobile` workspace is copied as a manifest and not installed.                                                                                                                                                                                          | S1 proves it: the CI Docker job stays green.                                                                                                                          |
| CI                              | `.github/workflows/ci-pipeline.yml`: lint and types, Vitest, ops script tests, build, Storybook accessibility, E2E smoke, Docker images, dependency audit. Separate advisory workflows for visual regression and the accessibility gate. Merges need green, up-to-date checks (BE-01).                                                                                                                                  | A `mobile-checks` job (S1) and `mobile-e2e-android` (S2). The owner adds each to the required checks.                                                                 |
| Shared versions                 | `scripts/check-dependency-versions.ts` fails CI when a dependency differs between workspaces. Web, marketing and the parked app are all on React 19.3.1; the parked app pins Expo 58.0.23 and React Native 0.88.1. TypeScript is 7.0.2 and Bun 1.4.4 across the repo.                                                                                                                                                  | S1 records the Expo SDK chosen and keeps one React version.                                                                                                           |
| Language                        | Web is English only (`supportedLngs: ["en"]`).                                                                                                                                                                                                                                                                                                                                                                           | Mobile is en-GB only. Strings sit in typed copy modules per feature.                                                                                                  |
| Old app                         | `apps/mobile-companion` is parked. It is still named in `scripts/check-no-mock-auth.sh` and `.dockerignore`.                                                                                                                                                                                                                                                                                                             | Deleted in S20, in its own PR.                                                                                                                                        |

---

## 4. Technology

Recommendations, with the reasoning kept short. The four that need the owner are in section 10.1.

### 4.1 Framework and build service

| Option                                               | For                                                                                                                                                                                             | Against                                                                                                                        |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **Expo (development build) with React Native**       | Same language and React as web. Imports the engine, contract, client, formatter and native theme as they are. Builds for both stores without owning a Mac build machine. The token pipeline and `docs/ux/CROSS-PLATFORM.md` were built for it. | Native module upgrades follow Expo's release pace.                                                                             |
| React Native without Expo                            | Full native control.                                                                                                                                                                            | Hand-kept Xcode and Gradle projects for no gain here.                                                                          |
| Flutter, or Swift and Kotlin                         | Closest platform feel.                                                                                                                                                                          | Cannot import the engine, so the maths would be written twice. Two or three codebases for one person.                          |
| The web app in a wrapper                             | Cheapest.                                                                                                                                                                                       | The owner decided on a native rebuild. Both stores expect more than a wrapped website.                                         |

**Recommendation: Expo with a development build, Hermes, the new architecture, Expo Router for navigation, and EAS Build and Submit on the free plan to start.**

EAS cost (**CONFIRMED**, expo.dev/pricing, read 2026-11-14): the free plan includes 15 Android and 15 iOS builds a month, store submission, and over-the-air updates for 1,000 monthly users. The next plan is $19 a month with $45 of build credit. Builds run on a tag or by hand, not per PR, so the free plan is enough until release work starts.

### 4.2 Navigation

Expo Router, file-based. Groups: `(auth)` for sign-in, `(app)` for the signed-in app with a tab bar: **Home, Accounts, Budget, Tax and pay, More**, the same names, order and icons as the web's `BOTTOM_BAR_TABS`. "More" is an ordinary fifth tab that opens our own list (Savings, Pension, Debt, Mortgage, Self Assessment when switched on, Settings, Connect AI, Free calculators), not the system overflow.

Under ruling R4 the header of each top-level screen carries a menu button, which opens the same list as the More tab, and a light and dark toggle. The theme also has a three-way setting in Settings (System, Light, Dark); the header toggle switches between light and dark and the setting can return to System. `docs/ux` describes the toggle as a setting only and says there is no second menu; section 11 lists the wording change for the coordinator.

The tab bar is for phone widths. Tablets are out of the first release (`supportsTablet: false`), so no rail is built.

### 4.3 State and data

TanStack Query for server state; React context for session and theme; local state for forms. Query keys come from one factory. Queries retry twice on `unavailable` and `server` only. A 401 is handled inside `@flump/api-client`, never by a screen.

The app talks to the backend directly on `/v1` with a bearer token. It does not go through the web app's proxy. Lists follow `X-Next-Cursor` when present. Creates send an `Idempotency-Key` so a retry after a dropped connection cannot create a second row; updates send `If-Match` with the `ETag` last seen and treat a 412 as "this changed elsewhere, reload".

### 4.4 Forms and money entry

react-hook-form with the contract's Zod schemas. One `CurrencyInput` and one `PercentInput` with the decimal pad, tolerant parsing (a typed £, commas, spaces) and formatting on blur from `@flump/format`. Blank means "not given" and is sent as absent. Request bodies are strict on the backend, so a form sends only fields the contract names.

### 4.5 Charts

`react-native-svg` with `d3-shape` and `d3-scale` behind a small charts module. Every chart sits in a `ChartFigure` with a visible one-sentence summary, a "Show data" list, direct labels, dashed forecasts and at most three series. Tap selects a point and shows a fixed readout. No chart is drawn with fewer than three points.

### 4.6 Storage, offline and updates

- Secure store for the refresh token only, readable when the device is unlocked, not synced to the cloud.
- Offline policy is an owner decision (10.1). The default on record is an encrypted read-only cache of the last successful responses, kept 7 days, cleared on sign-out; writes need a connection.
- Push notifications are an owner decision (10.1). The default on record is none at launch.
- Over-the-air updates stay on the preview channel until the owner decides otherwise, because a change to how money is shown should go through store review.

### 4.7 API compatibility

An installed app stays on a phone for months. The policy in `docs/api/versioning.md` covers most of it: within `/v1` only additive changes, clients ignore unknown fields and treat an unknown error `code` as the generic one for its status, breaking changes go to `/v2` with `/v1` served for at least three months more.

Left to build:

- **Minimum version.** Backend ticket B-A adds `GET /v1/app/client-policy` returning `{ minVersion, recommendedVersion }` per platform. The app checks it on launch and on return to the foreground. Below the minimum it shows an "Update required" screen with a store link. If the check itself fails, the app carries on.
- **Unknown values.** An account type the app does not know is shown neutrally with "Update the app to see this", never as an error and never as another type.

### 4.8 Formatting on device

Hermes uses each platform's own number and date formatting, so en-GB output can differ between iOS and Android. S1 runs the `@flump/format` fixture on both and records the result. If a platform differs, the formatter gains a pure fallback with the same tests.

### 4.9 Tests

| Layer                 | Tool                                                        | Scope                                                                                                     |
| --------------------- | ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Pure logic            | Vitest in the shared packages                               | Already in place for tokens, format, contract, client and engine                                          |
| Components and logic  | Jest (jest-expo) with React Native Testing Library          | Primitives, screens with an injected client, the session machine, the check-in flow                       |
| Engine on device      | A dev-only screen and a Maestro flow                        | Proves the bundled engine gives the same answers as its vectors on Hermes                                 |
| End to end            | Maestro against a fixture server                            | Android in CI on every PR that touches `apps/mobile`; iOS by hand, because macOS runners cost ten times   |
| Accessibility         | Assertions per screen, the token contrast matrix, a manual check per slice, full audits in S18 | Each slice's acceptance includes 200% text, 320 points wide, VoiceOver and TalkBack on its screens |
| Wire shape            | The backend's own contract tests                            | Responses are parsed by `@flump/api-contract` on the server, so the fixture server is built from the same schemas |

The fixture server (`apps/mobile/e2e/fixture-server`) serves canned `/v1` responses, built and checked with the contract schemas, and a stand-in for WorkOS that issues test tokens, including expired and rejected ones. A separate `e2e` build profile points at it, so the app's sign-in code has no test branch. CI searches the production bundle for the fixture address and fails on a hit.

---

## 5. Sign-in and security

### 5.1 Facts

**VERIFIED IN CODE**

- Web signs in with `@workos-inc/authkit-react-router` and forwards the access token to the backend as a bearer token.
- The backend verifier (`apps/backend/src/auth/workos-jwt.verifier.ts`) checks an RS256 signature against the WorkOS key set for the client id, requires `exp` and `sub`, accepts one issuer (derived from the client id, or `WORKOS_ISSUER`), and, when a client id is configured, requires the token's `client_id` claim to equal it. Native sign-in must therefore use the same WorkOS client id as web.
- The verifier passes no clock tolerance, so a phone whose clock runs fast can get a 401 on a fresh token (ticket B-A).
- `BackendError` has a `not-invited` kind: during the closed beta a signed-in person who is not on the list is refused. The app needs a screen for it.
- Deleting an account and resetting data need a typed phrase and a recent sign-in.

**CONFIRMED (WorkOS documentation, read 2026-11-11)**

- Exchanging a code needs no client secret when a PKCE code verifier is sent.
- Refreshing a token lists the client secret as optional, and says refresh tokens may be replaced on use.

**UNCONFIRMED: settled at the start of S2, before its code is written**

- Whether a refresh with no secret works in practice, and the exact error for a refresh token that is no longer valid.
- Whether using a refresh token makes the old one invalid at once.
- How long an access token lasts.
- Whether the WorkOS dashboard accepts a custom scheme redirect (`flump://auth/callback`) or needs a web link.
- Whether WorkOS can end a session from a server, without opening a browser.
- How the system sign-in sheet behaves with a private session on iOS and with Custom Tabs on Android.

### 5.2 Session states

`loading` (reading the secure store), then one of: `signedOut`, `signedIn`, `restoredOffline` (a refresh token exists but cannot be checked without a network; saved data can be read, nothing can be written), `sessionEnded` (the refresh token was rejected), `notInvited`.

- Cold start with a refresh token: try a refresh. Success gives `signedIn`. A network failure, timeout or server error gives `restoredOffline`. A rejection gives `sessionEnded` and clears the device.
- A 401 during use: one shared refresh, one retry of the request. A second 401 or a rejected refresh ends the session. A refresh that fails for network reasons does not.
- A new refresh token is saved before the new access token is used.

### 5.3 Flow

1. The app opens the WorkOS sign-in page in the system browser sheet with a PKCE challenge and a `state` value. It never sees the password.
2. It checks `state`, exchanges the code with the verifier and no secret, keeps the access token in memory and the refresh token in the secure store.
3. Sign-out wipes the device first (secure store, saved data, preferences, the token in memory) and does not depend on the network. It then ends the WorkOS browser session where the platform needs it.

If the S2 fact-finding shows a refresh without a secret is refused, the fallback is a small backend route that holds the secret and refreshes on the app's behalf. That is ticket B-B, built only then.

### 5.4 Transport and privacy

- HTTPS only in release builds. Development and e2e builds may use plain HTTP to named local hosts only.
- `src/config.ts` checks the API address and WorkOS values at launch and stops with a plain "This build is misconfigured" screen if they are wrong.
- CI searches the production bundle for secrets, mock tokens, local addresses and dev-only route names.
- No tokens, balances or profile fields in release logs.
- A privacy mode hides amounts; the app switcher shows a blurred screen; the secure store and saved data are left out of device backups.
- Device lock (Face ID, fingerprint) is an optional setting that covers the screen. It is never a way to sign in.
- Error tracking uses the Sentry project the owner approved for backend and web (`DECISIONS.md` round 3, item 7): no session replay, no personal data, scrubbed before the production key is set.

### 5.5 Backend tickets

Revision 2 listed thirteen. Their state today:

| Old id | Ticket                                              | State                                                                                                                                |
| ------ | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| B1     | Account history edit routes                         | **Dropped.** Owner decision E16 D12-B removed history editing; history comes from the check-in (`PUT /v1/snapshots/:month`).         |
| B2     | Refresh route holding the secret                    | Open, built only if S2 shows it is needed. Now **B-B**.                                                                              |
| B3     | Request validation                                  | **Done** (BE-09, strict bodies).                                                                                                     |
| B4     | Password reset uses the signed-in user's own email  | **Done.** `POST /user-profile/send-password-reset` takes no body.                                                                    |
| B5     | Bank OAuth callback                                 | **Parked** with bank linking.                                                                                                        |
| B6     | Account deletion with tombstone                     | **Done** (BE-04).                                                                                                                    |
| B7     | Rate limiting                                       | **Done** (BE-07, Postgres store).                                                                                                    |
| B8     | Balances as decimal strings                         | **Done.** Money is a JSON number (decision D9) and responses are validated.                                                          |
| B9     | Clock tolerance in the token verifier               | Open. Now part of **B-A**.                                                                                                           |
| B10    | Receipts left out of the list, own route, body limit | **Done.** `GET /tax-records/:id/receipt` exists and tax routes have their own body limit.                                           |
| B11    | Avatar size limit                                   | Believed done: `avatarUrl` has its own schema in the contract. Check the limit when S9 is written.                                   |
| B12    | Client policy endpoint                              | Open. Now part of **B-A**.                                                                                                           |
| B13    | Public privacy policy and deletion pages            | Partly. `/account-deleted` exists on web. The marketing privacy and terms pages answer 404 and wait for the solicitor's text.        |

Open backend work for mobile:

- **B-A (one small PR, not blocking S1 to S3):** `GET /v1/app/client-policy` in the manifest and contract, unauthenticated, values from configuration with a default of no minimum; and a 30 second clock tolerance in the verifier with tests either side of it.
- **B-B (only if needed):** the refresh route described in 5.3.

---

## 6. Accessibility and design on a phone

The rules are in `docs/ux`. What this plan adds is how they are checked.

- Target: WCAG 2.2 AA, read for apps as in WCAG2ICT.
- Each slice's acceptance includes: every new screen at 200% text and 320 points wide with nothing clipped and the main action reachable; VoiceOver and TalkBack reach and name every control in a sensible order; Reduce Motion removes slides and shimmer; no interaction needs dragging.
- Recalculated results are announced without moving focus. In a scenario the announcement starts with "Illustration:".
- The component catalogue uses the names in the CROSS-PLATFORM parity matrix (section 3 there), with the same `variant`, `tone` and `size` values and the same states as `@repo/ui`. Mobile imports no `@repo/ui` code.
- A dev-only gallery route renders every component in light, dark and 200% text from its `X.states.ts`. It and the engine check screen are left out of production builds, and CI searches the bundle to prove it.
- Design laws on a phone: a `KpiStrip` of at most four is two columns or a paged row, never a tall stack; a simulator is one column with the outcome figure pinned above the inputs; a table over 8 rows goes in a `CollapsibleDrawer`; every slider is a `SliderField` with an editable value.

---

## 7. Release

- **Builds.** EAS profiles: `development` (development build), `e2e` (points at the fixture server), `preview` (internal), `production` (store).
- **Distribution.** iOS through TestFlight, Android through Play internal testing first. A personal Play account opened after November 2023 must run a closed test with at least 12 testers for 14 days before going public (**UNCONFIRMED**, check Play Console help).
- **Versioning.** `apps/mobile` joins `release-please-config.json` like the other apps. A release PR does not publish a build; a tag or a manual run does.
- **Identifier.** `io.github.mgallagher56.flump`, unless the owner has a domain by then. It cannot change after a listing exists.
- **Store rules read so far.** Apple's guidelines (**CONFIRMED** in substance, read 2026-11-11; quote the sub-clauses only after re-reading them): an app with account creation must offer deletion in the app; a login needs a reviewer account; money management apps "should be submitted by" the organisation providing the service, which is why an organisation account is recommended. Google's rules for personal finance apps are **UNCONFIRMED**.
- **Reviewer access.** A real test account with sample data, entered through the app.
- **Gates before any store submission.** A hosted privacy policy and terms (solicitor's text), in-app deletion working end to end, privacy labels matching what the app collects, no bank claims, the accessibility audits in S18 passed.

### Costs

| Item                                              | Cost                                           | Confidence                                |
| ------------------------------------------------- | ---------------------------------------------- | ----------------------------------------- |
| Apple Developer Program                           | $99 a year                                     | Confident                                 |
| Google Play registration                          | $25 once                                       | Confident                                 |
| D-U-N-S number for an organisation account        | Free, takes days to weeks                      | **UNCONFIRMED**, check each store         |
| A company, if the owner does not have one         | Varies                                         | Owner                                     |
| EAS Build, Submit and Update                      | Free plan to start; $19 a month if it runs out | **CONFIRMED**, expo.dev/pricing           |
| WorkOS                                            | Already in use; same plan for native sign-in   | **UNCONFIRMED** whether mobile adds cost  |
| GitHub Actions                                    | Linux minutes for Android e2e; iOS e2e by hand | Confident                                 |
| Sentry                                            | Free tier, already chosen                      | On record                                 |

---

## 8. Milestones

Each milestone is one PR. Sizes are rough agent-days judged by feel, not counted from tasks. "Depends on" names slices, backend tickets (B-), owner decisions (O, section 10.1) and prerequisites (P, section 8.2).

### 8.1 The list

| Slice | What it delivers                                                                                         | Depends on             | Size |
| ----- | -------------------------------------------------------------------------------------------------------- | ---------------------- | ---- |
| S1    | Project skeleton and CI                                                                                  | O1                     | 5    |
| S2    | Sign-in                                                                                                  | S1, P1                 | 8    |
| S3    | Monthly check-in                                                                                         | S2, P2, P3             | 6    |
| S4    | App shell: tab bar, More list, header with menu and theme toggle, update-required screen, deep links     | S3, B-A                | 4    |
| S5    | Home: net worth hero under the user's choices, key figures, check-in row when due, setup row             | S4, P4                 | 4    |
| S6    | Accounts list, account detail, net worth history                                                         | S5                     | 6    |
| S7    | Offline reading (if O4 keeps the default): saved data, age label, restored-offline state                 | S6, O4                 | 5    |
| S8    | Add, edit and delete an account                                                                          | S6                     | 4    |
| S9    | Settings: profile, net worth choices, theme, privacy mode, device lock, data export, delete account      | S5                     | 6    |
| S10   | Budget                                                                                                   | S6                     | 6    |
| S11   | Debt and mortgage                                                                                        | S8                     | 8    |
| S12   | Pension and savings                                                                                      | S8                     | 7    |
| S13   | Take-home and self assessment                                                                            | S5                     | 7    |
| S14   | Free calculators (the web's one catalogue of tools)                                                      | S4                     | 5    |
| S15   | Onboarding                                                                                               | S8, S10                | 4    |
| S16   | Connect AI: token list, create, revoke                                                                   | S9                     | 3    |
| S17   | Sandbox with sample households, signed out                                                               | S5                     | 3    |
| S18   | Hardening: full VoiceOver and TalkBack audits, performance, security review, offline edge cases          | S9 for the first release | 8  |
| S19   | Release: build profiles, store assets, privacy labels, reviewer account, TestFlight and Play             | S18, O2                | 6    |
| S20   | Retire `apps/mobile-companion`                                                                           | S19, owner             | 2    |
| B-A   | Backend: client policy endpoint and clock tolerance                                                      | none                   | 1    |

Totals: about 108 agent-days for everything; about 63 for the first store release (S1 to S9, B-A, S18 and S19). Calendar time is longer: review, rework, store waiting and the owner's own actions add roughly a third. Revision 2 counted 162 days; the difference is the shared packages and backend work that have since merged, and the bank screens that were removed.

After S6 the page slices (S10 to S17) touch separate screen folders and can run two or three at a time.

### 8.2 Prerequisites outside `apps/mobile`

| Id  | What                                                                                                                                                                                             | Where it lands                                    | Needed by |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------- | --------- |
| P1  | WorkOS dashboard: a redirect address registered for the app, and a test user. Owner action.                                                                                                      | WorkOS                                            | S2        |
| P2  | The web check-in walk-through under ruling R3 is merged, with its calculated-balance function in `@flump/finance-engine`.                                                                        | Web check-in PR                                   | S3        |
| P3  | The check-in row and payload builders (`buildCheckInRows`, `buildSnapshotPayload`, the month helpers) move from `apps/web/app/features/snapshot/snapshotModel.ts` to the engine, with web importing them from there. No behaviour change. | Web check-in PR, or the first commit of S3        | S3        |
| P4  | The feature inventory is written again from the web app after polish round 2 (`DECISIONS.md` round 2: before feature screens start).                                                             | `E12-feature-inventory.md`                        | S5 on     |

### 8.3 The first three slices in full

#### S1. Project skeleton and CI

**Goal.** An empty Flump app that builds, themes itself from the shared tokens, proves the shared packages run on a device, and is covered by CI. No sign-in, no data.

**Files**

- `apps/mobile/package.json` (`@flump/mobile`), `app.config.ts`, `eas.json` (`development` profile), `tsconfig.json`, `metro.config.js`, `babel.config.js`, `jest.config.js`, `.gitignore` (generated `ios`, `android`, `.expo`).
- `apps/mobile/app/_layout.tsx`, `app/index.tsx` (a placeholder screen with the logo and the tagline), `app/(dev)/gallery.tsx`, `app/(dev)/engine-check.tsx`.
- `apps/mobile/src/config.ts` and its test; `src/copy/`; `src/theme/ThemeProvider/` (`useTheme()` over `@flump/tokens/native`, follows the system, remembers a choice).
- `apps/mobile/src/components/{Text,Pressable,Button,Screen,Card,FlumpLogo}/`, each with the five native files.
- `apps/mobile/e2e/flows/engine-check.yaml`.
- `packages/typescript-config/expo.json`.
- `turbo.json` (mobile `lint`, `check-types`, `test`, `build` as a bundle export for both platforms), `biome.json` (an override that forbids the raw React Native `Text`, `Pressable` and `TextInput` outside the components folder), `renovate.json` (one group for `expo`, `expo-*`, `react-native`, `react`, `react-dom` and their types).
- `.github/workflows/ci-pipeline.yml`: a `mobile-checks` job (lint, types, Jest, bundle export, bundle search, `expo-doctor`).
- `scripts/check-design-tokens.ts`, `scripts/check-tabular-nums.ts`, `scripts/check-style-literals.ts` and `scripts/check-no-mock-auth.sh` extended to `apps/mobile`; a new check for tax thresholds written as literals outside the engine.
- `AGENTS.md` section 1: the native file set (owner approves the wording, section 10.3).
- `docs/audit/plans/E12-spike-notes.md`: what was found (below).

**Acceptance**

1. `rtk bun install` leaves the web, backend and marketing builds green, and the CI Docker job passes with the new workspace present.
2. The app starts on an iOS simulator and an Android emulator in light and dark, following the system setting, with no flash of the wrong theme.
3. The engine check screen runs the engine's exported tax vectors on Hermes and shows "All vectors pass"; the Maestro flow asserts it on Android. The `@flump/format` fixture gives the expected strings on both platforms, or the difference is recorded and a fallback added.
4. A Jest test imports `@flump/finance-engine`, `@flump/format`, `@flump/api-contract`, `@flump/api-client` and `@flump/tokens/native`.
5. The repo resolves one React version; `scripts/check-dependency-versions.ts` passes; `expo-doctor` passes in CI.
6. `src/config.ts` throws a named error for a missing address, a non-HTTPS address in a release build, and plain HTTP outside the named local hosts.
7. The law checks fail on a fixture with a hex colour, an untabulated figure, a tax threshold literal and a mock token under `apps/mobile`, and pass on the real tree.
8. `Pressable` enforces a 48 by 48 target and needs a label when it has no text child. Components render at 200% text without clipping.
9. The production bundle export contains neither dev-only route.
10. The spike notes record: the Expo SDK, React Native and React versions; whether Bun's installer needed any setting for Metro; which export condition Metro picked for the shared packages; which TypeScript compiler `apps/mobile` uses; the Hermes formatting result.

**Depends on.** O1 (framework and build service). Nothing else.

**Known risks.** Metro with Bun's workspace links; TypeScript 7 with Expo's base config; Expo wanting a different React from web. Each has a fallback recorded in revision 2, section 3.3, and the spike notes say which was needed.

#### S2. Sign-in

**Goal.** A person signs in with their Flump account through WorkOS, stays signed in across launches, and can sign out leaving nothing behind. Nothing here is mocked.

**First step, before code.** A short script and a throwaway screen answer the six unconfirmed questions in 5.1 against the real WorkOS test environment, and call one protected `/v1` route with the token. The answers go in the spike notes and correct this plan in the same PR. If a refresh without a secret is refused, stop and raise B-B.

**Files**

- `apps/mobile/src/auth/`: `sessionMachine.ts`, `pkce.ts`, `authorizeUrl.ts`, `exchangeCode.ts`, `tokenStore.ts`, `tokenManager.ts`, `classifyRefreshFailure.ts`, `signOut.ts`, `SessionProvider.tsx`, each with a test.
- `apps/mobile/src/data/apiClient.ts`: `createApiClient` wired to the token manager (`getAccessToken`, `onUnauthorised`, `client`).
- `apps/mobile/src/screens/{SignIn,SessionEnded,NotInvited}/` and `src/components/{ErrorState,InlineAlert,ConfirmDialog}/`.
- `apps/mobile/app/(auth)/sign-in.tsx`, `app/(app)/_layout.tsx` (the gate), `app/(app)/index.tsx` (a signed-in placeholder: "You are signed in" and "Sign out").
- `apps/mobile/e2e/fixture-server/` and its tests; flows `signed-out-shows-sign-in.yaml`, `sign-in-happy-path.yaml`, `session-ended.yaml`, `sign-out-clears-device.yaml`; the `e2e` profile in `eas.json`.
- `.github/workflows/ci-pipeline.yml`: a `mobile-e2e-android` job.

**Acceptance**

1. The sign-in screen shows the logo, the tagline "Flump: finance without the fog", "Sign in", "Create account", and links to the privacy policy and terms.
2. Sign-in opens the system browser sheet. A `state` mismatch is refused before any exchange. Cancelling returns to the screen with no error. A failed exchange shows a plain message with no WorkOS text.
3. After sign-in, a call to `GET /v1/user-profile` succeeds against a real backend (recorded by hand in the PR) and against the fixture server (in CI).
4. The refresh token is in the secure store and nowhere else; the access token is never written to disk; neither appears in any log or error message.
5. Every transition in 5.2 has a test. A network failure during refresh never leads to `sessionEnded`. A rejected refresh clears the device once.
6. Ten requests that all get a 401 cause one refresh; each is retried once with the new token. A second 401 ends the session.
7. A person who is not on the beta list sees the `NotInvited` screen with a way to sign out, not an error.
8. Sign-out works with no network, empties the secure store, preferences and memory, and the next launch shows the sign-in screen. On a real iPhone and a real Android phone, signing in after signing out asks for the password again (checked by hand, recorded in the PR).
9. Sign-in, session-ended and not-invited screens pass the per-slice accessibility checks in section 6.
10. The four Maestro flows pass three runs in a row in the Android CI job. The production bundle contains no fixture address.

**Depends on.** S1; P1 (WorkOS dashboard access).

#### S3. Monthly check-in

**Goal.** Once a month a person confirms each balance in under two minutes: one card per account, "Update" or "No change", and at the end the change since last month. This is the flow the app exists for.

**What the flow is**

1. It starts from a row on the signed-in screen, shown when the month has not been recorded: "Update balances for November".
2. One account per card, in the same order as web. Each card shows the account name, its type, the last recorded balance and the month it was recorded, and a position such as "Account 2 of 6".
3. Two actions. **No change** records the shown balance for this month. **Update** opens a `CurrencyInput`, prefilled, and saves the typed balance.
4. For a mortgage or a loan, the shown balance is the calculated one, from the engine, with a "Calculated" badge. The primary action accepts it; **Update** replaces it. If the details needed to calculate are missing, the card shows the last recorded balance like any other account and says nothing is calculated.
5. An account left out of net worth by the user's choices says "Not counted in net worth".
6. A card can be skipped by moving on; a skipped account is not sent.
7. The end screen shows the change in net worth since last month, from a fresh `GET /v1/portfolio-snapshot`, in plain text: no colour judgement, no celebration.

**How it saves.** One `PUT /v1/snapshots/:month` at the end with `{ values: [{ accountId, value }], complete: true }` (**VERIFIED IN CODE:** partial sets are allowed, the latest write wins, and the server stores a debt as negative whatever sign is sent). Leaving early offers to save the cards already answered, sent without `complete`. Saving needs a connection; without one the action is disabled and says why.

**Files**

- `packages/finance-engine/src/check-in.ts` if P3 has not already landed (the moved builders and their tests).
- `apps/mobile/src/data/`: `queryClient.ts`, `queryKeys.ts`, `useDelayedLoading.ts` (ruling R5), each with a test.
- `apps/mobile/src/features/check-in/`: `useCheckInData.ts` (accounts, account details, profile), `checkInFlow.ts` (a reducer: answers, position, finish), `useSaveCheckIn.ts`, each with a test.
- `apps/mobile/src/screens/{CheckIn,CheckInDone}/`.
- `apps/mobile/src/components/{CurrencyInput,FormField,Money,StatusBadge,Skeleton,HeroFigure,Toast}/`.
- `apps/mobile/app/(app)/check-in.tsx`; the check-in row on `app/(app)/index.tsx`.
- Fixture server routes for `GET /v1/accounts`, `GET /v1/account-details`, `GET /v1/user-profile`, `GET /v1/portfolio-snapshot`, `PUT /v1/snapshots/:month`; flows `check-in-walkthrough.yaml`, `check-in-backend-down.yaml`.

**Acceptance**

1. With six accounts in the fixture, the walk-through shows six cards in web's order and ends with one `PUT` whose body passes `UpsertSnapshotRequest` and carries `complete: true`.
2. "No change" sends the last recorded balance; "Update" sends the typed one; a skipped card sends nothing. A blank input is never sent as 0.
3. A mortgage with complete details shows the engine's calculated balance with the "Calculated" badge. The figure equals the engine function's output for the same inputs (the function is injected and observed; the app does no arithmetic). Overriding sends the typed figure. With details missing, no calculated figure is shown.
4. The row and payload logic is the engine's: the app has no copy of `buildCheckInRows` or `buildSnapshotPayload`.
5. Loading: nothing is shown for the first 200ms; a skeleton that appears stays at least 400ms; moving between cards never shows a skeleton; under Reduce Motion the skeleton does not shimmer and cards change without sliding. Each is a timed test of `useDelayedLoading` or the screen.
6. A failed load shows the error state with "Try again", never "no accounts". An empty account list (a successful empty response) shows one sentence and one button to add an account, which links to the website until S8.
7. A failed save keeps every answer on screen and offers to try again. A double tap sends one request.
8. Amounts are whole pounds where read and accept pence where typed; every figure uses tabular numerals; a debt is shown without red.
9. Nothing in the flow mentions a missed month, a streak or a target.
10. The end screen's change figure matches web for the same seeded household (the renting and home-owning households in `apps/e2e/support/personas.ts`), checked by hand and recorded in the PR.
11. Accessibility: each card is one group with a spoken summary ("Current account, £1,204, recorded in October, account 2 of 6"); both actions are 48 by 48 or larger; the position change is announced; the flow works at 200% text and 320 points wide, with VoiceOver and with TalkBack.
12. Both Maestro flows pass three runs in a row in the Android CI job.
13. The PR adds its row to the parity log and states the result of the parity checklist.

**Depends on.** S2; P2 and P3.

**Why it comes before the app shell.** It is the owner's first priority, and it needs only sign-in and a way to start it. The tab bar, Home and the rest arrive around it from S4.

### 8.4 Later slices

Each is specified in full when the slice before it merges, from the web page as it then is and the parity log. Fixed now:

- **S4** follows ruling R4 and section 4.2. Acceptance includes a test that tab and More entries equal `navConfig.ts`, and that a link opened while signed out resumes after sign-in and never performs a write.
- **S5** shows net worth from the snapshot with what it leaves out in words, at most three more figures, the check-in row when due and one setup row. No figure is worked out in the app.
- **S6** shows one balance per account, the same on every screen (the web's R2-1 rule), one figure per row, a history chart only from three recorded months, and tables over 8 rows collapsed. History is not editable.
- **S7** adds the `restoredOffline` behaviour in 5.2 and the test that a cold start with no network keeps saved data.
- **S9** includes the two net worth switches (ruling R1), deletion with the typed phrase, and signing in again when the backend asks for a recent sign-in.
- **S10 to S13** follow the saved versus scenario rule: every simulator screen has a test that changing a scenario input changes no saved figure and sends no request.
- **S14** uses the web's catalogue of tools, with a test that the slugs match.
- **S16** shows a new token once and keeps it out of saved data.
- **S18** uses the `security-reviewer` agent on `apps/mobile/src/auth` and any backend route added for mobile.
- **S20** deletes the old app in its own PR and removes its entries from `scripts/check-no-mock-auth.sh` and `.dockerignore`.

The feature inventory was written on 11 November against a web app that has since lost the forecast page, non-UK tax, history editing, Spanish and the bank screens, and gained the check-in, imports, net worth choices and the tools catalogue. It is rewritten (P4) before S5.

---

## 9. Risks

| #   | Risk                                                                                          | Likelihood | Impact | What reduces it                                                                                         | Who    |
| --- | --------------------------------------------------------------------------------------------- | ---------- | ------ | ------------------------------------------------------------------------------------------------------- | ------ |
| R1  | Metro, Bun workspaces and the shared packages do not resolve, or React is duplicated          | Medium     | High   | S1 is the proof; fallbacks recorded in revision 2                                                       | Agent  |
| R2  | WorkOS refuses a refresh without a secret, or a custom scheme redirect                        | Low to medium | High | Fact-finding at the start of S2; B-B as the fallback; a web link redirect                             | Agent, owner |
| R3  | The web app keeps changing, so parity moves                                                   | High       | Medium | The parity log; slices specified late, from the page as it is; tests that compare nav and tool lists    | Owner  |
| R4  | A store refuses the app: account type for a money app, reviewer access, privacy pages         | Medium     | High   | Organisation account (O2); real reviewer account; privacy pages as a gate; no bank claims               | Owner  |
| R5  | A failure or old saved data shown as empty or zero                                            | Medium     | High   | One state helper; tests in S3, S5 and S7; the offline audit in S18                                      | Agent  |
| R6  | Maths written again in the app                                                                | Medium     | High   | Literal check; engine-only rule; calculators tested by the inputs they pass                             | Agent  |
| R7  | A token leaks through logs, crash reports, backups or the bundle                              | Low        | High   | 5.4; bundle search in CI; S18 review                                                                    | Agent  |
| R8  | Installed versions break after a backend change                                               | Medium     | Medium | `/v1` additive-only policy; client header; the minimum version check (B-A)                              | Agent  |
| R9  | Number formatting differs between iOS and Android                                             | Low        | Medium | The fixture on Hermes in S1; a pure fallback                                                            | Agent  |
| R10 | A phone clock running fast causes sign-outs                                                   | Medium     | Medium | B-A clock tolerance; the client's own skew estimate                                                     | Agent  |
| R11 | S3 is built against a check-in that web then changes                                          | Medium     | Medium | P2: wait for the web walk-through to merge; shared builders in the engine (P3)                          | Coordinator |
| R12 | Expo and React Native upgrades churn                                                          | Medium     | Medium | One Renovate group; `expo-doctor`; Android e2e on every PR                                              | Agent  |
| R13 | Store forms and data protection duties have no one assigned                                   | Medium     | High   | Section 10.2 holds; the owner's list in `DECISIONS.md`                                                  | Owner  |
| R14 | The old app is deleted early, or kept and decays                                              | Low        | Medium | S20 last, in its own PR                                                                                 | Owner  |

---

## 10. Decisions

### 10.1 Open decisions for the owner

These four block a start. "Default on record" is what round 2 of `DECISIONS.md` adopted from the earlier draft; the owner has not yet confirmed any of it for a build.

| #   | Decision                              | Options                                                                                                                                                                         | Recommendation                                                                                                                                                                                                                                         | Default on record                                   | Blocks                 |
| --- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------- | ---------------------- |
| O1  | Framework and build service           | A. Expo with React Native, built with EAS. B. React Native without Expo, built on your own Mac and CI. C. Flutter or fully native. D. Wrap the web app.                          | **A.** It is the only option that reuses the engine, contract, client, formatter and native theme already built, and you already work in React and TypeScript. Start on EAS's free plan (15 builds per platform a month); move to $19 a month if it runs out. | None. The earlier draft assumed A.                  | S1                     |
| O2  | Apple and Google developer accounts   | A. Organisation accounts in both stores (needs a company and a D-U-N-S number). B. Personal accounts. C. No public listing: TestFlight and Play internal testing only, for now.  | **C now, A before a public release.** Nothing before S19 needs a store account, so spend nothing yet. Enrol as an organisation once there is a company: Apple $99 a year, Google $25 once. Apple's wording on money apps makes a personal account a likely refusal. Ask Apple before incorporating for this alone. | Hold: money and legal entity (round 2, D2 and D18). | S19                    |
| O3  | Push notifications                    | A. None at launch. B. One opt-in reminder when the monthly check-in is due. C. A wider set.                                                                                      | **A at launch, B as the first addition.** There is no backend for it today (no device tokens, no scheduler), and the UX guidelines allow only notifications the user asked for. A check-in reminder is the one that fits the product; plan it after the first release as its own slice. | A (round 2, D8-A).                                  | Nothing in S1 to S19   |
| O4  | Offline policy                        | A. Read-only saved data, encrypted, kept 7 days, labelled with its age; changes need a connection. B. Nothing saved: no connection means an error screen. C. Full offline editing with sync. | **A.** Reading your figures on a train is a reason to have an app, and both stores expect more than a website in a wrapper. B is simpler and more private but loses that. C is a separate project and risks saving guesses. | A (round 2, D4-A).                                  | S7                     |

### 10.2 On record from earlier rounds

Adopted as defaults in `DECISIONS.md` round 2 (reversible choices) or held for the owner, a solicitor or money. Unchanged by this revision unless noted.

| Old id   | Subject                                  | Position                                                                                                   |
| -------- | ---------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| D1       | Platforms                                | iOS and Android together to internal testing                                                               |
| D3       | WorkOS setup                             | Custom scheme redirect first, a web link later; secret-free refresh unless S2 shows otherwise              |
| D5       | Deleting the old app                     | After parity is signed off, in its own PR                                                                  |
| D6, D19  | Bank connection on mobile                | **Superseded by ruling R2.** Parked                                                                        |
| D7       | Error tracking                           | Sentry, EU region, as approved for backend and web (round 3, item 7)                                       |
| D9       | Account deletion                         | At once and for good after a typed phrase. Built on the backend                                            |
| D10, D11 | Certificate pinning, over-the-air updates | No pinning; updates on the preview channel only                                                           |
| D12      | Web on the shared client                 | **Done** (BE-10)                                                                                           |
| D13      | How e2e signs in                         | Fixture server with a stand-in for WorkOS                                                                  |
| D14      | Tablets                                  | Phone, portrait, first                                                                                     |
| D15      | Mixed currencies                         | Follow web. Web is UK and pounds only now (E16 D6-B)                                                       |
| D16      | AGENTS.md native variant                 | Adopted in principle; the law text is approved in S1 (10.3)                                                |
| D17      | Signed-out wealth check                  | Not ported                                                                                                 |
| D20      | Privacy policy and deletion page         | Release gates; text held for the solicitor                                                                 |
| D21      | Sign-in methods                          | Email and password, and magic link                                                                         |
| D22      | Spanish                                  | en-GB only                                                                                                 |
| D23      | Token package                            | **Done** (PR 674)                                                                                          |
| D2, D24  | Store fees and the cost table            | Hold: money. See O2 and section 7                                                                          |
| D18      | Legal entity                             | Hold: solicitor. See O2                                                                                    |
| D25      | Store compliance forms                   | Hold: owner, at S19. Positions in round 3, item 10; remove its bank line under ruling R2                   |
| D26      | Data protection duties                   | Hold: solicitor                                                                                            |
| D27      | Disclaimer and sign-in policy            | Reuse the web's approved notice text; email verification required                                          |

### 10.3 Smaller decisions taken in the slices

- **S1:** the wording of the native file set in AGENTS.md section 1. Proposed text is in section 11.
- **S2:** whether B-B is needed; whether iOS uses a private browser session.
- **S4:** whether the header menu button and the More tab both stay, once the owner has seen them together on a phone.

---

## 11. Changes this plan needs in documents it does not own

This revision edits no file but itself and the parity log. The coordinator decides who makes these.

**`docs/ux/CROSS-PLATFORM.md`**

- Section 3, `MobileBottomBar` row: "below 1024px" becomes "below 768px", once ruling R4 is on main.
- Section 3, `ThemeToggle` row, mobile column: "A setting: System, Light, Dark" becomes "A light and dark toggle in the header of top-level screens, and a setting: System, Light, Dark".
- Section 5, "Primary navigation" row, iOS and Android: add "The header of top-level screens keeps a menu button that opens the same list as More (owner ruling, 14 November 2026)".
- Section 5, "Offline" row: add "subject to owner decision O4 in the E12 plan".
- Section 7, "Record": add a checklist line, "If this change alters what a mobile user would see or do in a shared flow, was a row added to `docs/audit/plans/E12-mobile-parity-log.md`?".
- References to "E12 2.6", "E12 2.8", "E12 5.1", "E12 5.2", "E12 section 2.11" and "T1.15 to T1.17" point at revision 2's numbering. In this revision they are sections 4.5, 4.6, 6, 3 and 3.

**`docs/ux/UX-GUIDELINES.md`**

- N2: "there is no second, competing menu" needs the ruling R4 exception for the phone top bar's menu button.
- E2: add the 400ms minimum display and "no full-page skeleton between screens that have already loaded" (ruling R5).

**`docs/copy/COPY-GUIDE.md`**

- Add the tagline "Flump: finance without the fog" to the fixed wording (ruling R6).

**`AGENTS.md`**

- Section 1, a new paragraph: "**`apps/mobile`**: every component lives in its own PascalCase directory with `ComponentName.tsx`, `ComponentName.styles.ts` (a StyleSheet factory that takes the theme), `ComponentName.test.tsx`, `ComponentName.states.ts` (named prop sets, shown by the dev gallery and used by the tests, in place of a Storybook file) and `index.ts`."
- Section 10, after the "What to read before UI work" table: "**Keep mobile in step.** A PR that changes what a user sees or does in a flow the mobile app shares (sign-in, the monthly check-in, navigation, net worth, accounts, settings, loading and error states, shared components, tokens, formatting or fixed wording) adds a dated row to [`docs/audit/plans/E12-mobile-parity-log.md`](./docs/audit/plans/E12-mobile-parity-log.md). The re-sweep session at the end of each design round checks the log against the merged PRs and appends any row that is missing."

**`docs/audit/plans/DECISIONS.md`**

- Record rulings R1 to R6 of 14 November, and that E12 D6 and D19 are superseded by R2.
