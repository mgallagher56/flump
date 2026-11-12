# Phase 1 — Automated sweeps

Captured 2026-11-11 against `main`. These are grep and file-system counts, so treat them as leads for the Phase 2 tracks, not final findings. Excluded from every count: tests, stories, `node_modules`, `styled-system`, `dist`, `build`, `coverage`. Counts are **lines matched** unless a unit is stated. Hex and style counts include token-like files outside `tokens/` and `preset` files, so some are legitimate.

## 0. Urgent: confirmed by reading the code

These were found by the "mock" sweep and then read directly. They are not grep guesses.

| #   | Location                                     | What the code does                                                                                                               | Why it matters                                                                         |
| --- | -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| 1   | `apps/backend/src/auth/auth.guard.ts:25`     | A bearer token equal to the literal `mock-session-token` is accepted with no environment check and authenticates as `user_mock`. | Anyone who knows the string is authenticated in any environment.                       |
| 2   | `apps/backend/src/auth/auth.guard.ts:33-43`  | A JWT's payload is base64-decoded and `sub`/`id` is trusted. **The signature is never verified.**                                | Anyone can craft a token with another user's `sub` and read or write that user's data. |
| 3   | `apps/backend/src/auth/auth.guard.ts:46-49`  | If decoding fails and `WORKOS_API_KEY` is unset, the request is authenticated as `dev_user_123`.                                 | A missing environment variable silently turns off authentication.                      |
| 4   | `apps/backend/src/auth/auth.guard.ts:12`     | `/bank-connections/callback` skips auth entirely.                                                                                | Needs a check that it validates `state` or an equivalent.                              |
| 5   | `packages/mcp/src/auth/token-verifier.ts:81` | `mock-session-token` or any token starting `mock_mcp_` is accepted and returns scopes `mcp:read:anonymized` and `mcp:simulate`.  | The same unconditional bypass, on the MCP surface.                                     |

Items 1 to 3 together mean **the backend currently has no effective authentication** unless something upstream blocks these paths. Verify in Track D before relying on this: check whether the backend is reachable from outside the web app in the deployed setup, and whether the MCP surface is exposed. Rated P0 pending that check.

## 1. Structure (AGENTS.md Law 1: colocated directories)

Share of component files that live in a same-named `Name/Name.tsx` directory:

| Scope                           | Component files | Not colocated                                                                                           |
| ------------------------------- | --------------- | ------------------------------------------------------------------------------------------------------- |
| `packages/ui/src`               | 32              | 4 (`index.tsx`, `components/forms/Button.tsx`, `components/layout/{SectionBand,AppSectionDivider}.tsx`) |
| `apps/web/app/components`       | 102             | **102**                                                                                                 |
| `apps/web/app/containers`       | 9               | **9**                                                                                                   |
| `apps/web/app/features`         | 4               | 0                                                                                                       |
| `apps/marketing/src/components` | 11              | 10                                                                                                      |
| `apps/marketing/src/pages`      | 6               | 5                                                                                                       |

- Every directory that is colocated has all four siblings (`.styles.ts`, `.stories.tsx`, `.test.tsx`, `index.ts`). The compliant code is complete, but it's a small fraction of the total.
- `packages/ui/src/components/forms/Button.tsx` sits next to `primitives/Button/`. Looks like a **duplicate Button**. Check in Track H.
- Stories: 54 story files under `packages/ui` and `apps/web`. **33 of them have no `play()` test.** The Storybook preview has a side-by-side light and dark decorator, so dark mode is covered globally, but the a11y config only enables `color-contrast` explicitly.
- Large components (non-test source over 1,000 lines): `TaxContainer.tsx` 2,198, `UserProfilePanel.tsx` 1,348, mobile `TaxScreen.tsx` 1,316, mobile `MortgageScreen.tsx` 1,307, `RunwayCalculator.tsx` 1,236, `app.onboarding.tsx` 1,226, `MortgageContainer.tsx` 1,225, mobile `ProfileScreen.tsx` 1,209, `PensionForecasterCard.tsx` 1,180, `tax-rules.ts` 1,139, mobile `ForecastScreen.tsx` 1,093, `BudgetDashboard.tsx` 1,012.

## 2. Styling (Law 2: tokens and numerics)

| Check                                                  | Count           | Notes                                                                                                                                                                                                                                                                                                                                |
| ------------------------------------------------------ | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Hex, `rgb()`, `hsl()` literals                         | **1,245 lines** | web 793, marketing 244, mobile 188, ui 20. About 567 are `rgb(a)()`. Top colours: `#10b981` ×136, `#ef4444` ×81, `#6363f1` ×71, `#f59e0b` ×45. Worst files: marketing `PricingPage` 47, `SecurityPage` 45, mobile `theme.ts` 44 (a token file, so probably fine), web `BudgetDashboard` 43, `RunwayCalculator` 39, `TaxContainer` 36 |
| Primitive scale tokens (`success.500`, `warning.500`…) | **107 lines**   | Direct violations. First hits in `SavingsForecaster.tsx` and `UKTaxCalculator.tsx`                                                                                                                                                                                                                                                   |
| `style={{` lines                                       | **2,213**       | Concentrated in `TaxContainer` 130, `app.onboarding` 85, `BudgetDashboard` 66, `PensionForecasterCard` 65, `MortgageContainer` 63, marketing `SecurityPage` 63. Many hex colours are written inline here, which is where the hex and the "style soup" findings overlap                                                               |
| Files that format numbers                              | 94              | Matched `formatCurrency`, `Intl.NumberFormat`, `toLocaleString`, or `£`                                                                                                                                                                                                                                                              |
| …of those mentioning `tabular`                         | 27              | **67 do not.** Includes `HomeHero`, `PensionAccountsList`, `DebtAccountsList`, `TaxIncomeSectionCard`, `PaymentsOnAccountCard`, `AccountsWidget`, `TaxWidget`. The check is by file, so a file can pass while one value is missed                                                                                                    |
| `toLocaleString()` with no locale                      | ~10 in web      | E.g. `app.onboarding.tsx` ×6, `GlobalBaselineScenarioBar`, `DebtContainer`, `WealthCheckHeroWidget`. Output depends on the user's browser locale, which breaks the en-GB rule                                                                                                                                                        |
| Manual `£` string building                             | 34 lines        | Bypasses `useFormatCurrency()`                                                                                                                                                                                                                                                                                                       |
| `toFixed(`                                             | 58 lines        | Triage for money and percentages in Track C                                                                                                                                                                                                                                                                                          |

`useFormatCurrency` picks a locale per currency (`en-SG`, `de-CH`, and so on) and falls back to `en-GB`. That's reasonable, but the law says en-GB. Decide which is right and update one of them. Mobile screens each re-implement their own `Intl.NumberFormat` helper (7 copies).

## 3. Code quality

| Check                                                   | Count     | Notes                                                                         |
| ------------------------------------------------------- | --------- | ----------------------------------------------------------------------------- |
| `: any` / `as any` / `<any>`                            | **305**   | Highest-value type-safety sweep. Split by package in Track C                  |
| `@ts-ignore` / `@ts-expect-error`                       | 1         | Fine                                                                          |
| `as unknown as`                                         | 0         |                                                                               |
| `biome-ignore`                                          | 7         |                                                                               |
| `console.log` / `debug`                                 | 2         |                                                                               |
| `console.error` / `warn`                                | 50        | Fine if there is no structured logger. Check backend                          |
| `TODO` / `FIXME` / `HACK`                               | **0**     | Unfinished work is not marked. It shows up as "mock" instead                  |
| "mock", "stub", "not implemented", "dummy", "fake data" | 117 lines | See §4                                                                        |
| `placeholder`                                           | 86        | Mostly input `placeholder=` text. Not a debt signal                           |
| Empty `catch`                                           | 2         | `root.tsx:92` (theme script) and `app._index.tsx:23`                          |
| `dangerouslySetInnerHTML`                               | 2         | `root.tsx:76,82` (inline scripts). Check for CSP interaction                  |
| `eval` / `new Function`                                 | 0         |                                                                               |
| `document.cookie` writes                                | 3         | `finance-engine/src/persistence.ts`. Sets `SameSite=Lax` but no `Secure` flag |

### Hardcoded URLs and config

- `http://localhost:4000` appears as a fallback in **at least 17 places** in web: `root.tsx`, 6× in `useUserProfile.ts`, `BudgetContainer`, and most `app.*.tsx` routes. Each repeats `process.env.VITE_API_URL || "http://localhost:4000"`. This should be one validated config value. `logout._index.tsx` hardcodes `http://localhost:3001`.
- Mobile hardcodes `localhost:4000` and `10.0.2.2:4000`, and a token string `mock-session-token`.
- `process.env.*` is read directly with no validation in `marketing/server.ts` (8), `session.server.ts`, `plaid.ts`, `crypto.ts`, `mcp/transports/stdio.ts`. There is no single env schema.

## 4. Mocked and unfinished functionality

117 lines across 5 workspaces: mobile 59, web 36, banking 14, backend 5, mcp 3.

- **Mobile app (`apps/mobile-companion`):** `api/client.ts` has 54 hits. It uses an in-memory mock store as a fallback "when the backend is unreachable", with a mock token. `LoginScreen.tsx` calls `handleMockSignIn` and the button says "Sign In with Mock Auth" / "Sign In with WorkOS (Mock)". So **there is no real auth in the mobile app**. No test files, no accessibility labels (0 of 11 screens).
- **Banking (`packages/banking`):** `orchestrator.ts` has 12 mock/stub hits. `plaid.ts:139` builds a fake access token (`access-sandbox-…`) and encrypts that. Need to confirm whether a real Plaid exchange exists at all.
- **Backend:** `auth.guard.ts` (see §0). `providers/` contains Monzo, Starling, Trading212 and open-banking providers. Their implementation state needs checking in Track G.
- **Web:** `app.accounts._index.tsx` (6), `app.accounts.$account.tsx` (4), `McpConnectionCard.tsx` (4), `app.tax.tsx`, `app.onboarding.tsx`, `useUserProfile.ts` (3 each), the connect-bank wizard and add/edit-accounts dialog (2 each). `utils/demoData.ts` is 989 lines of demo content, and a `DemoModeBanner` exists. Check that demo mode can never be reached by a signed-in user, and that real and demo data don't mix.

## 5. Layout laws (Law 3)

| Law                                                            | Finding                                                                                                                                                                                                                                                                      |
| -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SimulatorSplitLayout` on `/debt /mortgage /pension /forecast` | **0 of 4.** Used only in the sandbox feature. The four route files and their containers don't reference it                                                                                                                                                                   |
| `KpiStrip` for top-level metrics                               | Used in 3 files total, all inside `packages/ui` or sandbox. The web dashboard and simulators don't use it                                                                                                                                                                    |
| `SliderField`                                                  | Same: 3 files total. Web has its own `FLPSlider` and about 20 raw slider hits across `SavingsForecaster`, `UKTaxCalculator`, `PayoffStrategySwitcher`, the mortgage simulators, `TaxTrapAlertBanner`. The `packages/ui` components exist but the app mostly doesn't use them |
| `CollapsibleDrawer` for tables over 8 rows                     | Used in 3 files. 14 files render tables (`TaxContainer`, `UKTaxCalculator`, `AccountDetails`, the debt/pension/savings account lists, both `ComparisonMatrix` files, `SecurityPage`…). Row counts need checking per table in Track I                                         |

In short, the design system in `packages/ui` is largely **not adopted** by `apps/web`. Web still runs on its own `FLP*` components (`components/core/…`). This is the biggest structural finding for Track H.

## 6. Accessibility signals

| Check                                                | Result                                                                                  |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Biome a11y warnings (Phase 0)                        | 20: `useKeyWithClickEvents` 7, `useSemanticElements` 7, `noStaticElementInteractions` 6 |
| `onClick` on `div`/`span`/`li`/`td`/`tr`             | 5 (single-line match only, so likely an undercount)                                     |
| `<img>` without `alt`                                | 0                                                                                       |
| Files with `aria-label` (web, ui, marketing)         | 58                                                                                      |
| `accessibilityLabel` / `accessibilityRole` in mobile | **0 of 11 screens**                                                                     |
| `outline: none` / `outline: 0`                       | **48** lines. Check each has a visible `:focus-visible` replacement                     |
| `prefers-reduced-motion` handled                     | 2 files                                                                                 |

## 7. i18n

- `react-i18next` is set up (`public/locales/en`, `es`), but only **15 of 146** web component files use `useTranslation`. The great majority of UI text is hardcoded English. A Spanish locale exists but would translate almost nothing.
- Marketing and mobile don't use it at all.

## 8. Not covered by the sweeps (left to Phase 2)

- Dead code and unused exports (`knip` or similar isn't installed; adding it is a Track A task).
- Real accessibility violations: needs the runtime pass in Track J.
- Whether numbers in the 67 no-`tabular` files are visually affected.
- Backend authorisation, input validation, and N+1 queries: needs code reading, not grep.

## 9. What Phase 2 should do with this

1. **Track D (security) goes first**, using §0 as its starting point. It also needs to cover the unsigned JWT and the Plaid token handling.
2. **Track G** takes §4 plus the mobile findings and decides, per feature, whether it's ship-blocking, flagged, or deleted.
3. **Track H** works from §1, §2 and §5. The single decision that matters is whether `apps/web` migrates to `packages/ui` or the law set is relaxed for web.
4. **Track C** splits the 305 `any` uses by package, starting with `finance-engine`, `banking` and `backend`.
5. **Track N** adds an env schema, a lint rule or script to enforce Law 1 and Law 2, and removes committed coverage output.
