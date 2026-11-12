# E12 feature inventory: web app to mobile

Status: **draft for owner review. Nothing implemented.** Companion to [E12-mobile-rebuild-plan.md](./E12-mobile-rebuild-plan.md).

Sources: `apps/web/app/routes`, containers, features and hooks at the base commit of the E12 planning worktree (HEAD `e4ff6c3`), `apps/backend/src` controllers, `packages/finance-engine/src/index.ts`. Compiled by read-only subagents and spot-checked by hand; an independent reviewer pass is recorded in the main plan, section 11. Where a claim could not be verified it is marked **(verify)**.

Priority: **P0** = needed for a releasable v1 (sign-in, honest read of the core financial picture, store rules). **P1** = web parity for the main money pages. **P2** = parity for secondary and public features. **P3** = defer.
Effort in this table is the original per-row estimate (S up to 0.5 day, M about 1 day, L 2 to 3 days, XL more than 3 days). **The main plan's section 8 splits every row into S (0.5 day) and M (1 day) tasks, and its effort table is the authority**; the row-to-task map in section 7 below links each row to its tasks.
Milestone column refers to M0 to M10 in the main plan.

## 1. Authenticated app features

| # | Web route / feature | What it does on web | Backend endpoints used (method path) | finance-engine used | Mobile equivalent | Pri | Eff | MS |
|---|---|---|---|---|---|---|---|---|
| 1 | `/` signed-in dashboard (`_index.tsx`, `HomeDashboard`) | KPI strip, safe-to-spend, financial stage, widgets chosen by `dashboardWidgets`, setup checklist, redirect to onboarding when `onboardingCompleted` is false | GET `/accounts`, `/account-details`, `/user-profile`, `/budget-entries`, `/tax-records`, `/portfolio-snapshot` | `getCurrentUkTaxYear` (pinned `uk-tax-year.ts` family), `calculateSafeToSpend`, `evaluateFinancialStage`, `PortfolioSnapshot` | **Home tab**: KPI cards, widgets honouring `enabledPages` and `dashboardWidgets`, checklist card, pull to refresh | P0 | L | M4 |
| 2 | `/app` gate (`app._index.tsx`) | Chooses landing page from profile | GET `/user-profile` | none | Launch gate in the root layout: signed in and onboarded goes to Home, else onboarding | P0 | S | M3, M6 |
| 3 | `/app/onboarding` (`app.onboarding.tsx`) | Multi-step wizard: profile, pages to enable, optional seed accounts and budget lines the user types in | GET `/user-profile`; PATCH `/user-profile`; GET `/accounts`, `/budget-entries` to detect existing rows; POST `/accounts`, POST `/budget-entries` | `calculateUkTax`, `readOnboardingSeed`, `hydrateBaselineFromSeed`, `clearOnboardingSeed` | Onboarding stack with the same steps, state in memory until each step saves, resumable | P1 | L | M6 |
| 4 | `/app/accounts` (`AccountsContainer`) | Net worth, account list by type, add/edit/delete account, bank connections list | GET `/accounts`, `/account-details`, `/user-profile`, `/bank-connections`; POST `/accounts`; PATCH `/accounts/:id`; DELETE `/accounts/:id` | `PortfolioSnapshot` | **Accounts tab**: grouped list, net worth header, add/edit sheet, delete with `ConfirmDialog` | P0 (view), P1 (edit) | L | M4, M5 |
| 4a | Monthly balance check-in (`MonthlyBalanceCheckInDrawer`, used only by `AccountsContainer`, **VERIFIED IN CODE**) | Drawer to update each account's balance for the month | PATCH `/accounts/:id` or the history endpoints (**verify**; history editing is blocked by B1) | none | Check-in sheet on the Accounts screen | P1 | M | M5 |
| 4b | Annual allowance pill (`AnnualAllowancePill`, used by `SavingsContainer`, `AccountsContainer`, `PensionContainer`) | Shows used and remaining annual allowance | none (derived) | engine **(verify function)** | Pill on Savings, Accounts and Pension | P2 | S | M5 |
| 5 | `/app/accounts/:account` (`AccountDetailContainer`) | Yearly balance history chart and ledger; add year, edit values, delete year | GET `/accounts/:id`; **POST `/accounts/:id/details/year`, PUT `/accounts/:id/details` and the delete-year call do not exist on the backend (audit G-04)**; only GET `/accounts/:id/details` does | none | Account detail screen with chart and ledger in a collapsible section. View is P0. **Editing is blocked until backend ticket B1 lands**; until then the screen is read-only and says so | P0 (view), P1 (edit, blocked) | M + M | M4, M7 |
| 6 | Bank connections (`ConnectBankWizard`, `BankConnectionsList`) | Connect via token or OAuth, sync, refresh, disconnect | GET `/bank-connections`; POST `/bank-connections` (token path returns connection, OAuth path returns `redirectUrl`); POST `/bank-connections/:id/sync`, `/:id/refresh`; DELETE `/bank-connections/:id` | none | List, sync, disconnect (with confirm). Token connect is P1. **OAuth connect is blocked by E6**: no `/bank-connections/callback` route exists and the state is unsigned | P1 (list, sync, disconnect, token connect), P2 (OAuth, blocked) | L | M7 |
| 7 | `/app/budget` (`BudgetContainer`) | Income/expense lines by category, surplus, runway calculator, setup wizard, custom categories | GET `/budget-entries`, `/accounts`, `/account-details`, `/user-profile`; POST `/budget-entries`; PATCH/DELETE `/budget-entries/:id`; POST `/budget-entries/seed-defaults`; POST `/budget-entries/categories`; PATCH `/user-profile`. There is no `/budget-entries/reset` route (verified in review); nothing to port | `calculateSafeToSpend` | **Budget tab**: category sections, add/edit/delete line, surplus card, runway calculator, setup wizard ("add suggested lines" is an explicit user action, never automatic), (the monthly check-in lives on Accounts, row 4a) | P1 | XL (split: view, CRUD, runway, wizard) | M5 |
| 8 | `/app/debt` (`DebtContainer`, feature `debt`) | Debt list, add/edit/delete, avalanche vs snowball, promo cliff tracker, UK instruments (car finance balloon, overdraft cost, student loan), debt-to-wealth bridge | POST/PATCH/DELETE `/accounts` (debts are accounts); GETs as row 7 | `calculateDebtSchedule`, `compareAvalancheAndSnowball`, `evaluateFinancialStage`, `calculateCarFinanceBalloon`, `calculateOverdraftCost`, `calculateZeroPercentCliff`, `evaluateUkStudentLoan`, `calculateDebtToWealthBridge`, `isHighInterestDebt` | **Debt screen**: list, strategy switcher, payoff chart, promo cliff, instruments. **Unknown APR renders "Not calculated", never a fabricated figure** (web fix `dbdb9b7`) | P1 | XL (split) | M5 |
| 9 | `/app/savings` (`SavingsContainer`) | Savings accounts, AER, forecaster, quick-start wizard | POST/PATCH/DELETE `/accounts`; PATCH `/user-profile` (savings settings) | `PortfolioSnapshot`, forecast helpers | Savings screen with forecaster and quick-start | P1 | L | M5 |
| 10 | `/app/pension` (`PensionContainer`) | Pension pots, contributions, salary sacrifice, 100k trap, employer NI saving, forecaster, quick-start wizard, checklist step | POST/PATCH/DELETE `/accounts`; PATCH `/user-profile`; PATCH `/user-profile/checklist` | `calculate100kTaxTrap`, `calculateEmployerNISavings`, `calculateUKEWNITakeHome`, `getCurrentUkTaxYear` (pinned `uk-tax-year.ts` family) | Pension screen with the same calculators | P1 | L | M6 |
| 11 | `/app/mortgage` (`MortgageContainer`) | Mortgage balance/rate/term, LTV milestones, overpayment vs ISA simulator, remortgage shock | PATCH `/accounts/:id`; rate and term via PATCH `/user-profile` | `calculateLtvMilestones`, `calculateMonthlyMortgagePayment`, `calculateMortgageAmortization` | Mortgage screen. **Persist only what the backend stores and keep blank inputs blank** (web fix `1af60a4`) | P1 | L | M6 |
| 12 | `/app/forecast` (`ForecastContainer`, `UKTaxCalculator`) | Wealth forecaster and UK take-home/tax calculator | GET `/accounts`, `/account-details`, `/user-profile` | `calculateUKEWNITakeHome`, `calculateEmployerNISavings`, `UK_STUDENT_LOANS`, forecast helpers | Forecast screen, engine-driven; the old app's local tax maths is not carried over | P1 | L | M6 |
| 13 | `/app/tax` (`TaxContainer`) | Self-assessment records per tax year: add/edit/delete, copy to next year, bulk, tax trap banner, disclaimer, delete tax year | GET `/tax-records`, `/user-profile`, `/accounts`, `/account-details`; POST `/tax-records`; PATCH/DELETE `/tax-records/:id`; POST `/tax-records/bulk`; PATCH `/user-profile` | `calculateUKTax`, `getCategoriesForSource`, tax-year helpers, `buildCopiedRecordForTaxYear`, `getRecordAnnualTotalForTaxYear` | Tax screen per tax year, records by source, copy-year sheet, delete tax year with confirm | P1 | XL (split) | M6 |
| 13a | Payments on account (`PaymentsOnAccountCard`, used by `TaxContainer`) | Self-assessment payment on account estimate | none | engine **(verify function)** | Card on the Tax screen | P2 | M | M6 |
| 14 | Tax receipts (`TaxRecord.receiptFilename`, `receiptMimeType`, `receiptData`) | **Web has it** (verified): file input for image or PDF read as a data URL (`TaxContainer.tsx:242-246,2080-2106`), "View receipt" in `TaxIncomeSectionCard.tsx:46,557,656-672`, download and view | `/tax-records` fields (base64 in the record body). **Backend ticket B10:** the list endpoint returns every record's `receiptData` (**VERIFIED IN CODE**), so mobile needs the list to omit it, a `GET /tax-records/:id/receipt` endpoint and an explicit body-size limit | none | Camera and photo picker attach, PDF viewing and download, size cap and compression, view receipt on demand | P2 | L | M6 |
| 15 | `/app/profile`, tab "Profile & Security" (`UserProfilePanel`) | Edit profile, income/employment fields, change password, send password reset, reset financial data, enabled pages, checklist | GET/PATCH `/user-profile`; POST `/user-profile/change-password`; POST `/user-profile/send-password-reset` (**web sends `{ email }` (`useUserProfile.ts:328-331`); the backend trusts any supplied email. Mobile sends no body and needs ticket B4 so the backend resolves the email from the user id, because WorkOS access tokens may carry no email claim; spike T0.2 checks**); POST `/user-profile/reset-financial-data`; PATCH `/user-profile/checklist` | `calculateIrishTakeHome`, `calculateUKEWNITakeHome`, `getCurrentIrishTaxYear`, `getCurrentUkTaxYear` (pinned `uk-tax-year.ts` family) | Settings area: profile form, security section, data reset with typed confirmation, page toggles | P1 | XL (split) | M6 |
| 16 | `/app/profile`, tab "AI & MCP Access" (`McpConnectionCard`) | Create and revoke personal access tokens, context pack | GET/POST `/mcp-tokens`; DELETE `/mcp-tokens/:id`; GET `/mcp-tokens/context-pack`. **Web has no real UI** (verified): the only call site `UserProfilePanel.tsx:980` renders `<McpConnectionCard />` with no props, so it always builds a fake `flump_pat_` token (`McpConnectionCard.tsx:105-126`), and no web code calls `/mcp-tokens`. This is a build-from-scratch feature on mobile, not a port; mobile wires the real endpoints and never mocks | none | AI & MCP screen: list, create (raw token shown once, copy, cleared on leave), revoke with confirm, export context pack via share sheet | P2 | L | M7 |
| 17 | Setup checklist (`SetupChecklist`) | Links to next steps, marks via checklist endpoint | PATCH `/user-profile/checklist` | none | Checklist card on Home | P1 | S | M4 |
| 18 | Feature gating (`enabledPages`, `isPageEnabled`) | Hides pages the user turned off | profile | none | Navigation reads the same profile fields; a deep link to a disabled page shows an enable prompt | P1 | S | M2, M4 |
| 19a | Dashboard widget settings (`WidgetSettingsModal`, used by 7 widgets) | Per-widget settings and which widgets show | PATCH `/user-profile` (`dashboardWidgets`) | none | Widget settings sheet on Home | P2 | M | M6 |
| 19b | Country and currency selector (`UserProfilePanel.tsx:42-52`: GB, US, DE, FR, IE, ES, IT, CA, AU, NZ, JP) | Sets profile `country` and `currency`, which drive formatting and Irish take-home | PATCH `/user-profile` | `calculateIrishTakeHome` | Selector in Profile; formatter follows the profile currency | P1 | S | M6 |
| 19c | Avatar (`utils/avatar`, `UserAvatar`) | Profile picture processed client side | PATCH `/user-profile` (`avatarUrl`; stored as a data URL in `user_profile.avatar_url`, **VERIFIED IN CODE**; returned on every profile read; backend ticket B11 caps size) | none | Photo picker, compress to a small JPEG data URL under B11's cap | P3 | S | M6 |
| 19 | Safe-to-spend, stage, health score | Dashboard and budget | none (derived) | `calculateSafeToSpend`, `evaluateFinancialStage`, `calculateFinancialHealthScore` (`health-score.ts`, **VERIFIED IN CODE**) | Derived cards on Home and Budget; none of them from an empty budget (web fix `dbdb9b7`) | P1 | M | M4 |

## 2. Unauthenticated and public features

| # | Web route | What it does | Endpoints | Engine | Mobile equivalent | Pri | Eff | MS |
|---|---|---|---|---|---|---|---|---|
| 20 | `/login`, `/signUp`, `/auth/callback`, `/callback` | WorkOS AuthKit hosted sign-in and sign-up | WorkOS hosted pages; backend verifies the JWT | none | Native PKCE sign-in and sign-up in a system browser session (plan section 4) | P0 | XL | M3 |
| 21 | `/logout` | Clears the WorkOS session | none | none | Logout: clear secure storage and cache, end the WorkOS session, return to signed-out screen | P0 | M | M3 |
| 22 | `/sandbox` (demo persona) | Unauthenticated demo with persona data | none | `persistOnboardingSeed` | **Demo mode**: in-memory persona (web has three: `?persona=wealth|high|medium`, `routes/sandbox.tsx:87-92`, data in `utils/demoData.ts`), loud "Demo data, not yours" banner, no backend calls, exit button. Also gives store reviewers a way in | P2 | L | M7 |
| 23 | `/tools`, `/tools/:slug` (7 public calculators) | 100k tax trap; mortgage overpay vs ISA; Section 24; debt snowball vs avalanche; 0% balance transfer cliff; overdraft cost; student loan overpay | none | matching engine functions | **Tools** section, available signed out and in demo: seven calculators | P2 | XL (split 7) | M7 |
| 24 | `/` signed-out marketing home, hero, FAQ, wealth-check teaser | Marketing. The teaser (`InteractiveFinancialTeaser.tsx:226`) saves an onboarding seed via `persistOnboardingSeed` that onboarding then reads | none | none | Not ported. The signed-out to onboarding seed hand-off is **deliberately dropped** (decision D17); signed-out mobile shows sign-in, demo and tools | n/a | none | n/a |
| 25 | `apps/marketing` pricing, security, SEO | Marketing | none | none | Not ported. Link out for privacy policy and terms | n/a | none | n/a |
| 26 | `/ping`, `/$feature._index`, `/app/sandbox` redirects | Plumbing | none | none | Replaced by the deep link table (plan section 2.10) | n/a | none | n/a |

## 3. Cross-cutting web behaviours the app must match

| Behaviour | Web source | Mobile requirement |
|---|---|---|
| Honest error states: a backend outage never looks like an empty account | `services/backend-error.ts` (`BackendError`, 7 kinds), `route-error.server.ts` (generic messages), `features/feedback` (`RouteErrorBoundary`, `RouteErrorState`, `ConfirmDialog`, `useFetcherOutcome`) | Same 7 kinds and generic copy via the shared client package; `ErrorState` and `ConfirmDialog` primitives; stale cached data is labelled stale and never shown as empty |
| 401 while signed in | E5 D1 option B: "Your session has ended" with a button, no redirect loop | Same: error state with "Sign in again" that clears the session |
| Destructive actions confirm | I-06, `ConfirmDialog` | Delete account, delete year, disconnect (single and all), reset financial data, revoke token, delete tax year, delete budget line, sign out of demo |
| Tabular numbers, en-GB | AGENTS.md section 2 | `fontVariant: ['tabular-nums']` on every number; shared formatter package |
| Layout laws | AGENTS.md section 3 | KPI strip one row (horizontal scroll if needed); compact slider field; schedules over 8 rows collapsed |
| Language | web `supportedLngs: ["en", "es"]` (`apps/web/app/i18n.ts:2`) | en-GB only in v1 with the string layer ready for Spanish (decision D22) |
| Dark mode | tokens `{base, _dark}` | Generated light and dark maps from the same tokens, follows system, user override |

## 4. Backend gaps that block or shape mobile features

| ID | Gap | Evidence | Blocks | Owner |
|---|---|---|---|---|
| B1 | Account history endpoints missing | web calls POST `/accounts/:id/details/year`, PUT `/accounts/:id/details` (`app.accounts.$account.tsx:20-39`: `DELETE /accounts/:id/details/:year`, `POST /accounts/:id/details/year`, `PUT /accounts/:id/details`); backend has only GET `/accounts/:id/details` (`finance.controller.ts:115`) | Row 5 edit | G-04, new backend ticket shared with web |
| B2 | Native refresh token path | **WorkOS lists `client_secret` as optional for refresh** (docs read 2026-11-11), so direct public-client refresh is the plan; behaviour for rotation, grace window and error codes is UNCONFIRMED (spike T0.2) | Row 20 | Backend broker only as a fallback (T3.18) |
| B3 | No runtime request validation | no `ValidationPipe`, DTOs are interfaces | Only generic errors possible | E1 D-08/B-02 |
| B4 | `send-password-reset` accepts any supplied email, and falls back to the JWT `email` claim which WorkOS tokens may lack | `user-profile.controller.ts:87-90`, `workos-jwt.verifier.ts:62-65` | Row 15 | E1 follow-up: backend resolves the email from the user id and ignores a body email |
| B5 | Bank OAuth callback missing, state unsigned, two different redirect URIs | `finance.service.ts:206-216`, `:283-292` | Row 6 OAuth | E6 |
| B6 | No account deletion endpoint (new `DELETE /user-profile` proposed) | only `reset-financial-data` exists; web has no delete-account feature either | **Apple guideline 5.1.1(v) requires in-app account deletion when the app offers sign-up**; blocks store release | E12 backend ticket, owner decision D9 |
| B7 | No REST rate limiting | `main.ts` | Hardening | E1, E11 |
| B9 | JWT verifier has no `clockTolerance` | `workos-jwt.verifier.ts:53` | Spurious 401s with phone clock skew | E12 backend ticket (T3.19) |
| B10 | Receipts in list responses; no receipt endpoint; no explicit body limit | `tax.controller.ts:56-63`, `main.ts` | Rows 13, 14 | E12 backend ticket |
| B11 | Avatar as data URL in `user_profile.avatar_url`, returned on every profile read | `user-profile.entity.ts:26` | Row 19c | E12 backend ticket |
| B12 | No client version policy endpoint | none exists | Update-required gate | E12 backend ticket |
| B13 | No web privacy policy or account-deletion page | none found | Store gates | E12 owner and web ticket |
| B8 | `Account.balance` is decimal(12,2) so may arrive as a string | `Account` entity | Parsing must coerce; contract tests pin it | E12 contract package |

## 4b. Backend endpoints web does not use (not needed for mobile)

`GET /` , `GET /transactions`, `POST /transactions`, `GET /tax-records/:id`, `PUT /accounts/:id` (web uses PATCH), `POST /user-profile/update-password` (alias of change-password), `POST` and `GET /mcp` (the MCP transport that users paste into Claude; the AI & MCP screen shows this URL as copy text only), and `POST /bank-connections/:id/sync` (alias of `/refresh`; web uses `/refresh`). Dead web code noted: `GlobalBaselineScenarioBar` has no non-test importer.

## 4c. Engine naming traps for implementers

The engine exports two different functions `calculateUKTax` (`tax-calculator.ts`, records-based self-assessment) and `calculateUkTax` (`uk-tax.ts`, used by onboarding), two tax-year helper families (`getCurrentUKTaxYear` in `tax-rules.ts` and `getCurrentUkTaxYear` in `uk-tax-year.ts`) and `calculateEmployerNISavings` versus `calculateEmployerNiSaving`. Each screen task names the function it uses and why. Real forecast names: `calculateForecast`, `calculateCompoundTrajectory`. Also exported and useful: `calculateFinancialHealthScore`, `calculateSection24Tax`, `calculateSection24LandlordTax`, `calculateMortgageVsIsa`, `analyzePromoCliff`, `projectCrossoverWealth`, `calculateSalarySacrificeSaving`, `calculateScottishIncomeTax`. `persistence.ts` is browser-oriented (`BrowserStorageDriver`, cookie adapter); mobile does not use the onboarding seed helpers.

## 5. Features in the old app that are dropped

Mock auth, biometric as login, sticky mock fallback, fabricated bank connection, "Demo Mode" badge driven by failed requests, per-screen formatters and tax maths (`ForecastScreen`, `ProfileScreen`, `MortgageScreen`). The old app has no feature the web app lacks, so nothing needs preserving.

## 6. Mobile-only and store-mandated items (not rows on the web)

These have no web equivalent but must be built and are part of the parity sign-off (T10.1).

| Item | Why | Tasks | Priority |
|---|---|---|---|
| Account deletion in the app, with backend deletion and tombstone | Apple 5.1.1(v); a still-valid token must not recreate the profile | T7.23, T7.26, T7.27 | P0 |
| Privacy policy and account-deletion web pages | Store forms and review | T7.24, T9.5 | P0 |
| Update-required gate and client policy endpoint | API compatibility (plan 2.13) | T1.4, T4.1, T4.13 | P0 |
| Restored-offline state, stale and offline banners | Offline policy D4 (plan 2.8, 4.2) | T3.7, T2.15 | P0 |
| Reviewer test account | Apple 2.1 (demo mode alone needs prior approval) | T9.6 | P0 |
| Bank connection feature flag, OFF in store builds | Regulatory position D19 | T7.8 | P0 |
| Privacy mode (mask amounts) | Privacy option (plan 4.4) | T2.17 | P0 |
| Biometric app lock and app-switcher masking | Privacy options | T3.13, T3.14 | P1 |
| Demo mode (three personas) | Signed-out exploration; not the review path | T7.21, T7.22 | P2 |
| Finish-setup holding screen (until onboarding exists) | New users are never dead-ended | T3.12 | P0 |

## 7. Row-to-task map

| Inventory row | Plan tasks |
|---|---|
| 1 Home dashboard | T4.5, T4.6, T4.7, T6.22 |
| 2 Launch gate | T3.11, T3.12, T6.29 |
| 3 Onboarding | T6.27, T6.28, T6.29 |
| 4 Accounts | T4.8, T4.9, T5.1, T5.2 |
| 4a Monthly check-in | T5.8 |
| 4b Annual allowance pill | T5.16 (also shown on Accounts and Pension) |
| 5 Account detail and history | T4.10, T7.6, T7.7, T7.28 |
| 6 Bank connections | T7.1 to T7.5, T7.8 |
| 7 Budget | T5.3 to T5.7 |
| 8 Debt | T5.9 to T5.14 |
| 9 Savings | T5.15 to T5.18 |
| 10 Pension | T6.2 to T6.5 |
| 11 Mortgage | T6.6 to T6.9 |
| 12 Forecast | T6.10, T6.11 |
| 13 Tax, 13a Payments on account | T6.12, T6.13, T6.15, T6.16; T6.14 |
| 14 Receipts | T6.17, T6.18, T7.29 |
| 15 Profile and security | T4.11, T6.19 to T6.21, T6.24 to T6.26, T7.31 |
| 16 AI and MCP | T7.9 to T7.12 |
| 17 Checklist, 18 Feature gating | T4.6, T2.18 |
| 19 Derived cards, 19a Widget settings, 19b Country and currency, 19c Avatar | T4.7; T6.22; T6.21; T6.23, T7.30 |
| 20 Sign-in and sign-up | T3.1 to T3.8, T3.15, T3.17 |
| 21 Logout | T3.9, T3.10 |
| 22 Demo | T7.21, T7.22 |
| 23 Public tools | T7.13 to T7.20 |
| Cross-cutting errors, confirm dialog, charts | T2.13, T2.15, T2.16, T2.24 to T2.31 |
