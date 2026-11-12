# Track I - UX, interaction and information architecture

Method: static code review of every file in `apps/web/app/routes`, the containers and components they render, the marketing pages and the mobile companion navigation. No browser, no runtime pass, no screenshots. Every state or layout claim below is read from source, so anything about how a screen looks or feels at 375/768/1440 px is unverified. Skills: the design-critique, interaction-design and journey-mapping skills and the `frontend-design` skill were used only as a lens (Nielsen heuristics, state coverage, excise); their files were not loaded.

Yardstick: Nielsen's 10 heuristics plus AGENTS.md section 3 (KpiStrip, SimulatorSplitLayout, SliderField, CollapsibleDrawer).

## Summary

The most important UX problem is not layout, it is **trust**. Three screens show numbers that the user did not provide and the code did not compute: the Debt page (invented debts), the dashboard Debt widget (hard-coded date, counts and savings) and the Budget dashboard ("MTD Settled Actuals" is always 92% or 78% of budget). Next is a family of **silent failures**: every data loader swallows errors and returns an empty list, so a backend outage looks like "you have no data", and onboarding swallows save errors and navigates on. Third, the **first-run journey** has no bank-connect step, pre-fills fictional numbers that get saved as real data, and marketing promises (Pro trial, one-click account deletion) that nothing in the product implements.

AGENTS.md layout laws are broadly not followed on the web app (zero use of `SimulatorSplitLayout`, `KpiStrip` or `SliderField` in routes, containers or components; zero sticky parameter panels), but that is Track H's headline. Here it is rated by user impact.

What is good, so it is not lost: the "Reset Financial Data" flow is a model destructive action (collapsed Danger Zone, modal, type RESET, disabled button until typed, error and success states). The connect-bank wizard has explicit select, method, consent, syncing, success and error steps. The onboarding is a 3-step form with progress. The tax module puts its 18-row multi-year table on a secondary tab as the law asks.

## First-run journey map (marketing, sign-up, onboarding, connect bank, first insight)

| Stage                | What the code does                                                                                                                                | Friction, dead ends, missing states                                                                                                                                                                                                                      |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Marketing landing | `apps/marketing` HomePage and Pricing link to `${appUrl}/signUp`, `/signUp?plan=free                                                              | pro`. A second public home also exists inside the web app (`LoggedOutHome`, 15 duplicated section components) and is what `/` serves to signed-out visitors.                                                                                             | Two public homes to keep in sync. `?plan=` is dropped (see I-07). "Start 14-day free Pro trial" leads to a plain sign-up with no trial. |
| 2. Sign-up           | `routes/signUp._index.tsx` immediately redirects to WorkOS AuthKit with `returnTo=/app`.                                                          | No Flump-owned screen. That is fine, but a failure on return shows only `callback.tsx`'s inline error (no support link, no retry beyond "Return to Log In"). `callback.tsx` and `auth.callback.tsx` are byte-identical apart from the component name.    |
| 3. Post-auth routing | `/app` (`app._index.tsx`) fetches the profile and redirects to `/`; `/` loader redirects to `/app/onboarding` if `onboardingCompleted === false`. | Two redirects and two backend round trips before anything renders. If the profile fetch fails, the empty `catch {}` at `app._index.tsx:25` sends the user to `/` with no onboarding. Only `/` gates on onboarding: deep links like `/app/budget` do not. |
| 4. Onboarding        | `app.onboarding.tsx`, 1,226 lines, 3 steps, ~15 inputs. No auth-provider step, no bank step.                                                      | Fictional defaults are pre-filled and saved (I-05). Errors are swallowed. No "skip" and no "I'll do this later". Seed banner from the demo can complete the whole flow in one click.                                                                     |
| 5. Connect bank      | `ConnectBankWizard` is reached from the Accounts page only. Not offered during onboarding.                                                        | Needs a developer token for most paths (I-08). OAuth return goes to the WorkOS callback. 10 banks listed.                                                                                                                                                |
| 6. First insight     | `/` dashboard: 4 KPI cards, setup checklist, widgets shown only for "configured" modules.                                                         | KPI cards show `£0` rather than an empty state when there is no data (`_index.tsx` safe defaults make the strip always render). First insight for a typical user is the onboarding numbers they typed in, plus the invented debt widget (I-02).          |

## Monthly budget review journey map

| Step                      | What exists                                                                                                                                           | Gap                                                                                                                                                                                                                                          |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Open Budget               | `/app/budget` -> `BudgetContainer` (569 lines) -> `BudgetDashboard` (1,012 lines) with tabs: dashboard, wizard, one tab per category, "Add" category. | No month selector, no history, no "this month vs last month". Budget entries are recurring monthly amounts, not dated transactions.                                                                                                          |
| Compare plan with reality | `BudgetDashboard.tsx:208-214` computes "actuals".                                                                                                     | `actualMtdGbp` is declared in `types/budget.ts:16` and **never populated anywhere in the repo**, so "MTD Settled Actuals" is always a fabricated 92%/78% of budget (I-03). The core "did I stick to the budget" question cannot be answered. |
| Update balances           | `MonthlyBalanceCheckInDrawer`                                                                                                                         | Lives on the Accounts page, not the Budget page, so the monthly ritual spans two screens with no link between them.                                                                                                                          |
| Review renewals           | "Upcoming bill renewals" card in `BudgetDashboard.tsx:706-770`.                                                                                       | Only bills with a `contractEndDate` within 30 days. Nothing says why it is empty.                                                                                                                                                            |
| Act                       | "Review Bills & Renewals" link.                                                                                                                       | No close-the-loop step (no "month reviewed" marker, no surplus allocation prompt to savings or debt).                                                                                                                                        |

## Findings

### [I-01] Debt page invents four debts and hard-coded inputs for users without debt data

- Severity: P0
- Location: `apps/web/app/containers/debt/DebtContainer.tsx:31-65` (defaultDebts), `:105-108`, `:117-125`, `:147-153`; `apps/web/app/components/debt/DebtAccountsList.tsx:135`
- Evidence: `defaultDebts` is "Barclaycard Platinum", "Klarna Pay in 3", "Lloyds Arranged Overdraft" and "Tesco Personal Loan". The initial state is `items.length > 0 ? items : defaultDebts` with no "sample data" label (a grep for sample/example/illustrat in the container and `components/debt` finds nothing). `budgetSurplus = budgetData?.monthlySurplus || 150`, and `evaluateFinancialStage` is fed `liquidSavings: 800` and `monthlyEssentialExpenses: 1600` as literals. `handleAddDebt` and `handleDeleteDebt` only call `setDebts`; nothing is saved, so added or deleted debts vanish on reload and are never reflected on the dashboard.
- Impact: A debt-free user opens `/app/debt` and is told which of four cards to pay off first, with a payoff date. The "financial stage" recommendation is computed from literals, not the user. Edits look saved and are not. This is a wrong financial result on a core page.
- Recommendation: Replace the fallback with an empty state ("No debts yet. Add your cards and loans") and an optional, clearly labelled "Try with example debts" toggle. Feed `evaluateFinancialStage` real liquid savings and essential expenses from the loader. Persist add, edit and delete through the accounts action like the savings page does, with a confirm on delete.
- Effort: M

### [I-02] Dashboard Debt widget and loader fabricate figures

- Severity: P0
- Location: `apps/web/app/components/dashboard/widgets/DebtWidget.tsx:64-67`; `apps/web/app/routes/_index.tsx:236-243`; `apps/web/app/components/dashboard/HomeDashboard.tsx:259-264`
- Evidence: Widget: `data.totalDebt || 4650`, `data.debtFreeDate || "August 2026"`, `data.interestSaved || 840`, `data.highInterestCount || 2`. Loader: `highInterestDebt: totalLiabilities`, `highInterestCount: totalLiabilities > 0 ? 2 : 0`, `debtFreeDate: totalLiabilities > 0 ? "October 2026"` (a date already in the past; today is November 2026), `interestSaved: Math.round(totalLiabilities * 0.18)`, `monthlyMinimumTotal: totalLiabilities * 0.025`. The widget is shown whenever `totalLiabilities > 0` (`HomeDashboard.tsx:259-264`), and `totalLiabilities` comes from `PortfolioSnapshot.getTotalLiabilities()` which on its face includes any mortgage account. Onboarding itself creates a "Residential Mortgage" account.
- Impact: A user whose only liability is a mortgage sees "Total Unsecured Debt", "2 High APR Accounts", a debt-free date in the past and an invented "interest saved". In edit mode with no debt the widget shows £4,650. I did not check how `getTotalLiabilities` treats mortgages at runtime, so the mortgage case is read from code only; the hard-coded literals are certain.
- Recommendation: Compute these from real liability accounts (APR, minimum payment) via the finance engine, or hide the stat boxes when the data is missing. Delete the `||` fallbacks. Rename the widget metric to match what it sums.
- Effort: M

### [I-03] Budget "MTD Settled Actuals" is always 92% or 78% of the budget

- Severity: P0
- Location: `apps/web/app/components/budget/BudgetDashboard.tsx:208-214` (computation), `:498-501` and `:587-590` (display); `apps/web/app/types/budget.ts:16`
- Evidence: `e.actualMtdGbp !== undefined ? e.actualMtdGbp : toMonthly(e) * 0.92` for priority bills and `* 0.78` for flexible spend. `grep actualMtdGbp` across apps and packages finds only the type declaration and these two lines, so the field is never set by the backend, the form or the demo data.
- Impact: The central monthly-review number is a constant fraction of what the user budgeted, labelled as settled actuals. Users will conclude they are under budget when nothing has been measured. This breaks the monthly review journey and is a wrong financial result.
- Recommendation: Until actuals exist (bank sync or manual entry), hide the "Actuals" column and show a prompt to connect a bank or log spend. When built, populate `actualMtdGbp` from synced transactions.
- Effort: S to hide, L to build properly

### [I-04] Loaders swallow every error, so an outage looks like an empty account

- Severity: P1
- Location: `apps/web/app/services/backend-client.server.ts:77-84` (fetchJson), `:68`; `apps/web/app/routes/_index.tsx:250-270` (catch block); `apps/web/app/routes/app.profile.tsx:15-20`; `apps/web/app/routes/app._index.tsx:25`; `apps/web/app/routes/app.onboarding.tsx:48-50`
- Evidence: `fetchJson` returns the fallback (`[]` or `null`) on non-OK and on exceptions, with no error flag in the returned snapshot. The home loader's `catch` returns `user` with zeroed data and no error field. The profile loader falls back to `DEFAULT_PROFILE`. The root `ErrorBoundary` (`root.tsx:136`) is never reached for these cases. `grep useNavigation|navigation.state` in the web app finds no usage, so there is also no pending indicator while the 7 parallel fetches run.
- Impact: With the backend down or a token rejected, a user with real data sees `£0` net worth, an empty budget "set up your budget" prompt and a setup checklist, and may re-enter data (and on `/app/profile`, save `DEFAULT_PROFILE` values over their real profile). Nielsen: visibility of system status, error recovery.
- Recommendation: Return `{ ok: false, failed: [endpoints] }` from `loadWorkspaceSnapshot` and render a non-blocking "We couldn't load X. Retry" banner on affected pages. Never render empty-state onboarding copy when the fetch failed. Add a global pending bar using `useNavigation`.
- Effort: M

### [I-05] Onboarding saves fictional defaults as the user's real data and hides failures

- Severity: P1
- Location: `apps/web/app/routes/app.onboarding.tsx:97-118` (defaults), `:288-330` (account and budget creation), `:355-362` (catch), `:64-84` (action), `:420` and `:458-545` (step tabs)
- Evidence: Defaults are age 32, gross salary £45,000, take-home £2,900, housing £900, other outgoings £1,100, cash £5,000, pension pot £15,000, pension 5%. A user who clicks Next, Next, Finish persists a "Cash and emergency savings" account of £5,000, a pension of £15,000 and three budget entries. `createAccountSafe` and `createBudgetEntrySafe` ignore both thrown errors and non-OK responses (`fetch` does not throw on 500). `updateProfile` runs first and sets `onboardingCompleted: true`; if the account creation then fails, onboarding is complete with no accounts. The outer `catch` calls `navigate("/")` regardless. The step headers are clickable tabs (`onClick={() => setStep(n)}`), so step 3 can be reached and finished without ever seeing steps 1 and 2.
- Impact: First-run data quality (fabricated assets feed net worth, forecasts and the "stage" classification) and a silent half-saved state. Heuristic: error prevention, visibility of status. Placeholders would be safe, pre-filled values are not.
- Recommendation: Start fields empty (use `placeholder` for hints) and require at least income before Finish. Check `res.ok` per call, show a summary "We saved X of Y items, retry" screen and do not set `onboardingCompleted` until the profile and seed items succeed. Add an explicit "Skip for now" that leaves the profile incomplete rather than faking values. Add a final step offering "Connect your bank" (the only route to real data).
- Effort: M

### [I-06] Destructive actions without confirmation, and three different confirmation styles

- Severity: P1
- Location: `apps/web/app/components/accounts/AccountDetails.tsx:38-48` and `:286-291` (delete a whole year of balances); `apps/web/app/components/dialogs/addEditAccountsDialog/AddEditAccountsDialog.tsx:279-291` (remove account); `apps/web/app/components/debt/DebtAccountsList.tsx:135`; `apps/web/app/components/budget/BudgetSetupWizard.tsx:258-272`; `apps/mobile-companion/src/screens/DashboardScreen.tsx:546-553` (Disconnect All Bank Connections)
- Evidence: The trash icon beside each year header in the balance ledger submits `intent: "deleteYear"` directly. "Remove account" in the edit dialog submits `intent: "delete"` and closes the dialog. Mobile "Disconnect All Bank Connections" loops `deleteBankConnection` with no `Alert` and no error handling. Contrast with: `BudgetCategoryTable.tsx:209` and `TaxContainer.tsx:311-328` which use native `window.confirm`, `BankConnectionsList.tsx:63` (native confirm), `SavingsAccountsList.tsx` (inline confirm state) and `PensionAccountsList.tsx:631` (custom modal), and `UserProfilePanel.tsx:1179-1345` (type-to-confirm modal).
- Impact: One mis-click removes a year of history or an account and its balance history. There is no undo. The mix of native `confirm()` (unstyled, blocks, inaccessible theming), inline and modal confirms is inconsistent. Heuristic: error prevention, consistency.
- Recommendation: Create one `ConfirmDialog` pattern (name the thing, state the consequence, destructive button label) and use it for all of the above. Offer undo (soft delete with a toast) for single-row deletes. Add an `Alert.alert` confirm to the mobile bulk disconnect.
- Effort: M

### [I-07] Marketing promises that the product does not implement

- Severity: P1
- Location: `apps/marketing/src/pages/PricingPage.tsx:268`, `:409-415`; `apps/web/app/routes/signUp._index.tsx`; `apps/marketing/src/pages/SecurityPage.tsx:235-239`; `apps/marketing/src/components/ComparisonMatrix.tsx:75-80`
- Evidence: Pricing shows a Free and a Pro plan with a "Start 14-day free Pro trial" button linking to `/signUp?plan=pro`. The sign-up loader never reads `plan`, and a search of `apps/web/app` and `apps/backend/src` for plan, billing, stripe or subscription finds nothing relevant. The Security page states "one-click permanent erasure: deleting your account permanently purges all historical data". There is no delete-account control in `UserProfilePanel` (only "Reset Financial Data") and no user-deletion endpoint in the backend controllers (`@Delete` exists only for accounts, bank connections, MCP tokens, budget entries and tax records). The comparison table claims "FCA Open Banking read-only sync (UK banks and cards)" as a Flump feature.
- Impact: A new user cannot get the trial or the Pro tier they were sold, and cannot exercise the erasure right the site advertises (UK GDPR exposure as well as a UX failure). Visitors who pick Pro and Free arrive at the identical product.
- Recommendation: Either build plan selection and account deletion, or remove or soften the claims ("Pro coming soon" with a waitlist). Carry `plan` through sign-up in `returnTo` or a cookie at a minimum. Add "Delete account" next to the Danger Zone with the same type-to-confirm pattern.
- Effort: S (copy) to L (billing)

### [I-08] Connect-bank flow asks for developer tokens, and the OAuth path looks non-functional

- Severity: P1
- Location: `apps/web/app/components/dialogs/connectBankWizard/ConnectBankWizard.tsx:36-115` (BANKS), `:195-199`, `:495-545`, `:569-600`, `:861-915`; `packages/banking/src/server/orchestrator.ts:145-175`; `apps/web/app/routes/app.accounts._index.tsx:110-125`
- Evidence: All 10 banks have `directSync: true`, so the "unsupported" step (`step === "unsupported"`, lines 861-915, which says direct sync is only available for Monzo and Starling) is unreachable and its copy is stale. For every bank the method step offers "Developer Token" first. The OAuth branch builds URLs with `client_id=flump-client` (placeholder) and guessed endpoints (e.g. `https://api.hsbc.com/oauth/v1/authorize`), and the action sets the return URL to `${origin}/auth/callback`, which is the WorkOS sign-in callback route (`routes/auth.callback.tsx` runs `authLoader`), not a bank-connection callback. I have not run it; read from code the return would be treated as a failed sign-in.
- Impact: A typical user (Lloyds, Barclays, HSBC, NatWest, Santander) is asked to paste an "Open Banking Access Token" they cannot obtain, or is sent to a bank with a client id that bank will reject. This breaks the "connect bank" step of the first-run journey for most UK users, and the screen presents it as supported. Dead end with no fallback to manual or CSV entry in the same dialog.
- Recommendation: Gate each bank by what the backend actually supports (`provider.registry`), hide the rest, and show "Enter balances manually" or CSV as an alternative on every failure. Hide the developer-token option behind an "Advanced" disclosure. Point OAuth returns at the backend's `/bank-connections/callback`. Remove or fix the dead "unsupported" step.
- Effort: M

### [I-09] Simulator and dashboard layouts ignore the progressive disclosure laws

- Severity: P1
- Location: `apps/web/app/containers/{debt,mortgage,forecast,pension}/*`, `components/forecast/SavingsForecaster.tsx:81`, `components/pension/PensionForecasterCard.tsx:520`, `containers/debt/DebtContainer.tsx:307`, `containers/mortgage/MortgageContainer.tsx:451`, `:646`, `components/dashboard/HomeDashboard.tsx:363-367`
- Evidence: A search for `SimulatorSplitLayout`, `KpiStrip`, `SliderField` and `CollapsibleDrawer` in `apps/web/app` finds them only in `features/sandbox` and `features/debt/PayoffStrategyControls`; none of the four simulator routes use them. A search for `sticky` in the debt, savings forecaster, pension forecaster, mortgage and UK tax calculator files finds nothing, so no parameter panel is sticky. Debt, SavingsForecaster and PensionForecaster do use a 12-column grid (a de facto split) but without sticky controls. The mortgage page has two 5-up grids (`repeat(5, 1fr)` at `lg`) for loan details, which exceeds the 4-item KPI maximum. `HomeDashboard` builds its own 4-card grid with `sm: repeat(2, 1fr)`, i.e. a 2x2 block on tablets, which the law forbids. Sliders: raw `type="range"` or `FLPSlider` in `SavingsForecaster` (5), `MortgageTracker` (3), `OverpayVsSaveCompare` (2), `OverpaymentSimulator`, `RemortgageShockSim`, `PayoffStrategySwitcher`; pension inputs are number fields with `Number(e.target.value) || 0` (`PensionForecasterCard.tsx:572-761`), so clearing a field snaps it to 0 or 1.
- Impact: On long simulator pages the user scrolls past the chart they are controlling, losing the cause-and-effect feedback that is the point of a simulator. Inconsistent slider anatomy between pages. Rated P1 because these are core screens named in the law.
- Recommendation: Adopt `SimulatorSplitLayout` (with sticky left panel) on `/debt`, `/mortgage`, `/pension`, `/forecast`; `SliderField` for all parameters; `KpiStrip` for page metrics, capped at 4 (split the mortgage 5-up into two groups). See Track H for the migration decision.
- Effort: L

### [I-10] Demo mode is confusing: two demos, unreachable app pages and a persona that leaks into real onboarding

- Severity: P2
- Location: `apps/web/app/utils/demoData.ts:208-215`; `apps/web/app/routes/_index.tsx:23-25`, `:330`; `apps/web/app/components/dashboard/DemoModeBanner.tsx`; `apps/web/app/routes/sandbox.tsx:70-140`; `apps/web/app/components/dashboard/DashboardWidgetCard.tsx:274`; `apps/web/app/components/home/HomeHero.tsx:198`
- Evidence: `/?demo=true` (banner "Live Sandbox", "Exit Demo") and `/sandbox` (title "Live Demo Sandbox (Read-Only)" with personas) are two different demos with overlapping names. `isDemoMode` is checked before auth in the home loader, so a signed-in user who adds `?demo=true` sees Alex Morgan's data under a "Create Free Account" banner. Widget links in demo go to `page.route` (`/app/...`), which require sign-in, so clicking a demo widget sends an anonymous visitor to the WorkOS login. In demo, "Customize Dashboard" calls `updateProfile` (PATCH) with no session. `sandbox.tsx` "Save and create account" writes the persona's salary and modules into the onboarding seed; the onboarding seed banner then offers a one-click Finish that stores it as real data (see I-05). The banner copy hard-codes "£85k salary, Monzo, Vanguard ISA, Standard Life Pension" and hex colours.
- Impact: Visitors cannot tell which demo is "the" demo, hit a login wall mid-demo, and can end up with a fictional salary in their real profile. Runtime behaviour of the PATCH in demo was not tested.
- Recommendation: Keep one demo entry (`/sandbox`), redirect `/?demo=true` to it, disable navigation and persistence in demo with an inline tooltip ("Create a free account to open this"), ignore `demo=true` when signed in, and have the seed pre-fill as placeholders with explicit confirmation.
- Effort: M

### [I-11] No route-level loading, 404 or per-route error states

- Severity: P2
- Location: `apps/web/app/root.tsx:136-160`; `apps/web/app/routes/$feature._index.tsx`; all `apps/web/app/routes/app.*.tsx`
- Evidence: Only the root `ErrorBoundary` exists (a bare page with no header, no retry button and no `isRouteErrorResponse` branch, so a 404 and a 500 both say "Uh oh... Something went wrong"). `$feature._index.tsx` redirects any unknown single-segment URL (`/foo`) to `/` silently, so top-level typos never 404, while an unknown `/app/foo` hits the generic boundary. No route exports its own `ErrorBoundary` or `HydrateFallback`. `useNavigation` is unused, so slow server loaders give no feedback on click.
- Impact: Users get no confirmation that a click registered and no way to recover from an error without browser reload. Heuristic: visibility of system status, help users recover from errors.
- Recommendation: Add a root boundary that renders the app shell, distinguishes 404 from 5xx, and links to Home and Retry. Add a top progress bar driven by `useNavigation().state`. Make `/` the redirect only for known legacy keys and 404 the rest.
- Effort: S

### [I-12] Navigation is inconsistent between desktop web, mobile web and the native companion

- Severity: P2
- Location: `apps/web/app/components/structure/header/Header.tsx:38-84`; `apps/web/app/components/structure/header/MobileNavDrawer.tsx:129-150`; `apps/web/app/components/navigation/MobileBottomBar.tsx:80-110`; `apps/mobile-companion/src/navigation/RootNavigator.tsx:35-60`, `:190-235`
- Evidence: Desktop nav lists Debt, Budget, Accounts, Wealth (Savings, Pension, Mortgage) and Planning (Forecast, Tax). The mobile web drawer's `rawAuthRoutes` omits Debt entirely, and the bottom bar shows only Budget, Savings, Accounts, Tax plus More. So `/app/debt` is unreachable from mobile navigation (only from the dashboard widget). The mobile web bottom bar has no Home/Dashboard tab (Home appears only in the drawer). The native companion has Dashboard, Accounts, Budget and More (Forecast labelled "Savings Forecasts", Mortgage, Profile; Tax is a screen but check the menu), with **no Debt, Savings or Pension screens**. The native `LoginScreen` offers "Sign In with Mock Auth" (`LoginScreen.tsx:36-73`) and the screens have no accessibility labels (Track J/G).
- Impact: The same product has three different information architectures. Mobile web users cannot reach a core page; native users cannot reach three. Labels also differ ("Forecast" vs "Savings Forecasts").
- Recommendation: Define one route manifest (`pageConfig.ts` already has `APP_PAGES` with categories) and generate the desktop menu, drawer and bottom bar from it. Put Home first on mobile web. Decide explicitly which pages the native companion owns and say so in its More menu.
- Effort: M

### [I-13] Monthly review has no time dimension or closing step

- Severity: P2
- Location: `apps/web/app/containers/budget/BudgetContainer.tsx`; `apps/web/app/components/budget/BudgetDashboard.tsx`; `apps/web/app/components/accounts/MonthlyBalanceCheckInDrawer.tsx`; `apps/web/app/containers/accounts/accountsContainer/AccountsContainer.tsx:17`
- Evidence: See the journey table above. There is no month picker in the Budget container; check-in is on the Accounts page.
- Impact: Users cannot do a monthly review in the product, only look at a static plan.
- Recommendation: Add a month selector and a "Review this month" panel combining balance check-in, planned vs actual (once I-03 is fixed) and surplus allocation. Link the check-in from the Budget page.
- Effort: L

### [I-14] Overloaded screens and long forms

- Severity: P2
- Location: `apps/web/app/containers/tax/TaxContainer.tsx` (2,198 lines, 130 inline `style={{`), `components/budget/UserProfilePanel.tsx` (1,348), `routes/app.onboarding.tsx` (1,226), `containers/mortgage/MortgageContainer.tsx` (1,225), `components/budget/RunwayCalculator.tsx` (1,236), `components/pension/PensionForecasterCard.tsx` (1,180), `components/budget/BudgetDashboard.tsx` (1,012), `components/dialogs/connectBankWizard/ConnectBankWizard.tsx` (928); native `TaxScreen` 1,316, `MortgageScreen` 1,307, `ProfileScreen` 1,209
- Evidence: Line counts from `wc -l`. `UserProfilePanel` combines personal details, income, property and BTL, notification/dashboard options, change-password modal, AI connections tab and the reset Danger Zone, with a single "Save Profile" at the bottom (`:897`); the form has no dirty-state indicator or unsaved-changes guard. Tax has 4+ tabs, a record modal with about 13 form fields (`TaxContainer.tsx:127-143`), receipt upload and a copy-year modal. The mortgage page has four tabs with five-value edit grids.
- Impact: Cognitive load, long scroll, hard-to-test components, and edits made in one section lost on navigation. This is a signal, not a violation by itself; each page uses tabs sensibly.
- Recommendation: Split Profile into Profile, Security and Data tabs/routes, each with its own save. Add an unsaved-changes guard (`useBlocker`). Break TaxContainer by tab (Track B/H cover the structure).
- Effort: L

### [I-15] Change-password and sensitive-setting flows are thin

- Severity: P3
- Location: `apps/web/app/components/budget/UserProfilePanel.tsx:363-387`; `apps/web/app/hooks/useUserProfile.ts:326-343`
- Evidence: The modal asks for new password and confirmation only (min 8 characters, client-side). It does not ask for the current password, does not mention other sessions, and auto-closes 2 seconds after success. Error and success states exist and are announced in text. The user-profile checks and the reset flow are well covered.
- Impact: Low UX risk, but an account-takeover vector if a session is left open (security detail is Track D). Heuristic: error prevention.
- Recommendation: Require re-authentication or the current password, show requirements inline as the user types, and keep the success message until dismissed.
- Effort: S

### [I-16] Table audit against the 8-row law: mostly compliant, with unbounded lists

- Severity: P3
- Location: see table
- Evidence: Rows counted from source. "Unbounded" means rows are one per user record.

| #   | Site                                                         | Rows                           | Collapsed or on a secondary tab?              | Verdict                        |
| --- | ------------------------------------------------------------ | ------------------------------ | --------------------------------------------- | ------------------------------ |
| 1   | `accounts/AccountDetails.tsx:269` monthly ledger             | 12 months + 2 footer rows (14) | Table/Edit is a view toggle against the chart | Compliant by tab; not a drawer |
| 2   | `containers/tax/TaxContainer.tsx:1191` multi-year comparison | 18 body rows                   | "multi-year" tab                              | Compliant                      |
| 3   | `containers/tax/TaxContainer.tsx:1679-1717` records table    | unbounded                      | Inside tab                                    | Needs pagination               |
| 4   | `tax/TaxIncomeSectionCard.tsx:533`                           | unbounded per section          | Expandable sections                           | Compliant by section; no cap   |
| 5   | `tax/CopyTaxYearModal.tsx:538`                               | unbounded candidates           | Modal                                         | Acceptable; no cap             |
| 6   | `forecast/UKTaxCalculator.tsx:502` breakdown                 | about 7                        | Inline                                        | Compliant (under 8)            |
| 7   | `debt/DebtAccountsList.tsx:85`                               | unbounded                      | "accounts" tab                                | Acceptable                     |
| 8   | `savings/SavingsAccountsList.tsx:427`                        | unbounded                      | Always visible                                | No cap                         |
| 9   | `pension/PensionAccountsList.tsx:479`                        | unbounded                      | Always visible                                | No cap                         |
| 10  | `web home/ComparisonMatrix.tsx:160`                          | 6                              | Inline                                        | Compliant                      |
| 11  | `marketing ComparisonMatrix.tsx:123`                         | 6                              | Inline                                        | Compliant                      |
| 12  | `marketing pages/SecurityPage.tsx:273`                       | about 5                        | Inline                                        | Compliant                      |
| 13  | `ai-connections/McpConnectionCard.tsx:810` tokens            | unbounded                      | Inline                                        | No cap                         |
| 14  | `sandbox/SandboxTemplates.tsx`                               | n/a                            | `CollapsibleDrawer`                           | Compliant                      |

- Impact: The law is mostly met through tabs, not through `CollapsibleDrawer`. Real risk is only for users with many records.
- Recommendation: Cap lists at 8 with "Show all N", or paginate the tax records table; no amortisation schedule exists in the web app, so that part of the law is moot today.
- Effort: S

## Heuristic scorecard (condensed)

| Heuristic                      | Rating | Main evidence                                                   |
| ------------------------------ | ------ | --------------------------------------------------------------- |
| Visibility of system status    | Weak   | I-04, I-11 (no pending UI, silent failures)                     |
| Match with the real world      | Mixed  | UK terms are good; "Unsecured Debt" shows mortgage (I-02)       |
| User control and freedom       | Weak   | I-06 no undo; onboarding has no skip (I-05)                     |
| Consistency and standards      | Weak   | I-06 three confirm styles, I-12 three IAs, I-09 slider variants |
| Error prevention               | Weak   | I-05 defaults, I-06, I-15                                       |
| Recognition rather than recall | Fair   | Setup checklist, wizard progress                                |
| Flexibility and efficiency     | Fair   | Customisable dashboard with drag and reorder                    |
| Aesthetic and minimal design   | Fair   | Heavy inline styles; large pages (I-14)                         |
| Error recovery                 | Weak   | I-04, I-11, generic error page                                  |
| Help and documentation         | Weak   | No inline help; i18n covers 15 of 146 component files (Phase 1) |

## State coverage (read from code)

| Area                | Loading                  | Empty                        | Error               | Success        |
| ------------------- | ------------------------ | ---------------------------- | ------------------- | -------------- |
| Connect bank wizard | Yes (syncing step)       | n/a                          | Yes                 | Yes            |
| Budget dashboard    | None (server loader)     | Yes (`isBudgetEmpty` card)   | None (I-04)         | n/a            |
| Debt page           | None                     | Replaced by fake data (I-01) | None                | None           |
| Home dashboard      | None                     | KPI zeros, checklist         | Silent zeros (I-04) | n/a            |
| Profile save        | "Saving..."              | n/a                          | Yes                 | "Saved!"       |
| Reset data          | "Resetting..."           | n/a                          | Yes                 | Yes            |
| Onboarding          | `isSubmitting` only      | n/a                          | Swallowed (I-05)    | None; redirect |
| Mobile dashboard    | Spinner, pull to refresh | Not checked                  | Not checked         | Not checked    |

## Limits

- No browser or device pass: no screenshots, no 375/768/1440 responsive checks, no focus order, no dark-mode contrast. Accessibility is Track J.
- I did not run the backend, so runtime behaviour of the three data-integrity findings (I-01 to I-03), the mortgage-as-debt case in I-02 and the OAuth return in I-08 is read from code only. The literals and missing calls cited are certain; the downstream effects are inferred.
- I did not read every file in the 4,276 lines of routes and 111 components line by line. I read all routes' loaders and actions, the onboarding, dashboard, budget, debt, accounts, bank wizard, profile, navigation and demo code in detail, and sampled the tax, mortgage, pension and forecast containers (layout and state structure only). Tools pages (`tools._index`, `tools.$slug`) and most marketing sections (HowItWorks, FAQ, McpPage) were not reviewed for UX.
- Copy and microcopy quality is Track L. i18n coverage came from the Phase 1 sweep, not re-measured here.
- The native app was reviewed only for navigation, destructive actions and login; its screens were not read in full.

## Quick wins

1. Delete the `|| 4650`, `|| "August 2026"`, `|| 840`, `|| 2` fallbacks in `DebtWidget.tsx:64-67` and the hard-coded `"October 2026"` in `_index.tsx:239` (30 minutes, removes invented numbers).
2. Hide the "MTD Settled Actuals" columns in `BudgetDashboard.tsx` until `actualMtdGbp` is real.
3. Replace `defaultDebts` in `DebtContainer.tsx` with an empty state.
4. Put a confirm on `onRemoveYear` in `AccountDetails.tsx` and on `handleRemoveAccount` in `AddEditAccountsDialog.tsx`, and an `Alert` on the mobile "Disconnect All".
5. Add Debt to `MobileNavDrawer` and a Home tab to `MobileBottomBar`.
6. Make the onboarding defaults placeholders, check `res.ok` in `createAccountSafe`, and only navigate on success.
7. Remove or reword the Pro-trial and "one-click deletion" claims until they exist.
8. Add `isRouteErrorResponse` handling and a Home link to the root `ErrorBoundary`; add a `useNavigation` progress bar.
9. Change the 2-column `sm` breakpoint on the dashboard KPI row to stay single row from `sm` (or adopt `KpiStrip`).
10. Delete `routes/auth.callback.tsx` or `routes/callback.tsx` after confirming which one WorkOS is configured to call.
