# Track G: Stubbed, mocked and unfinished functionality

Audited 2026-11-11 against `main`. Read-only, code reading only (no runtime pass). Method: promised (`docs/pages_and_features.md`, `docs/app_functionality.md`, marketing copy) versus delivered, traced from UI to backend to provider.

## Summary

The core web CRUD paths (accounts, budget, tax, profile, savings, pension, mortgage, forecast, debt) are real and call real backend endpoints. The unfinished parts cluster in five places: (1) mock or dev behaviour that is live in production code paths and leaks into real users, (2) the bank OAuth flow, which has no callback handler, (3) the MCP "AI connection" UI, which is a local fake, (4) the mobile companion app, which is a demo with mock auth, and (5) marketing claims (Pro tier, CSV import, FCA Open Banking for all banks, enquiry form) that have no backend behind them.

Phase 1's `TODO` count of 0 is accurate but misleading. Unfinished work is not marked anywhere, so the table below is the only inventory.

Grep leads from Phase 1 that were checked:

- "`plaid.ts:139` builds a fake access token": confirmed, and the whole Plaid adapter returns hardcoded accounts and transactions. It is also unused (no caller of `registerAdapter` or `getAdapter` outside tests), so it is dead code, not a live leak.
- "`providers/` Monzo, Starling, Trading212, open-banking state needs checking": Monzo, Starling and Trading212 are real HTTP clients. Open-banking-standard is real HTTP code but unproven (see G-05).
- "`/bank-connections/callback` skips auth": confirmed, and worse, no handler exists at that path (G-02).
- Web `utils/demoData.ts` and `DemoModeBanner`: reachable only via `/?demo=true` and `/sandbox`. Demo data is not mixed into signed-in loaders. The leak risk is the other direction (G-03, G-10).

## Feature table

State key: real = wired end to end; partial = works with a broken or missing leg; mock = returns fabricated data or fakes success; stub = placeholder, not reachable or no behaviour.
Action key: ship-blocking, hide-behind-flag, delete, fine.

### Web routes (`apps/web/app/routes`)

| Feature                                                             | Location                                                                                 | State                                                                  | Action                                                                                                                        |
| ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `/` logged-out landing, `/tools`, `/tools/:slug`                    | `_index.tsx`, `tools._index.tsx`, `tools.$slug.tsx`                                      | real (client math)                                                     | fine. `/tools*` also exists on marketing (duplicate surface, docs list it under marketing only)                               |
| `/login`, `/signUp`, `/logout`, `/callback`, `/ping`                | `login._index.tsx`, `signUp._index.tsx`, `logout._index.tsx`, `callback.tsx`, `ping.tsx` | real (WorkOS)                                                          | fine                                                                                                                          |
| `/auth/callback`                                                    | `auth.callback.tsx`                                                                      | real but duplicate of `callback.tsx` (only the component name differs) | delete once WorkOS redirect URI is confirmed as `/callback`. It is also the URL the bank OAuth fallback sends users to (G-02) |
| `/app` redirector                                                   | `app._index.tsx`                                                                         | real                                                                   | fine                                                                                                                          |
| `/` signed-in dashboard                                             | `_index.tsx`                                                                             | real, plus `?demo=true` branch                                         | fine; see G-10                                                                                                                |
| `/app/accounts` list, manual add/edit/delete                        | `app.accounts._index.tsx:31-75`                                                          | real                                                                   | fine                                                                                                                          |
| `/app/accounts` bank connect (PAT)                                  | same, `connectBank` intent; backend `finance.service.ts` token path                      | real for Monzo, Starling, Trading212                                   | fine                                                                                                                          |
| `/app/accounts` bank connect (OAuth)                                | same `:78-125`; `finance.service.ts:160-172`                                             | stub: redirect works, callback does not exist                          | ship-blocking or hide (G-02)                                                                                                  |
| `/app/accounts/:account` view                                       | `app.accounts.$account.tsx:60-91`                                                        | real                                                                   | fine                                                                                                                          |
| `/app/accounts/:account` add year, delete year, edit monthly values | `app.accounts.$account.tsx:16-55`; `AccountDetailContainer.tsx:95-130`                   | broken: calls three backend endpoints that do not exist                | ship-blocking (G-04)                                                                                                          |
| `/app/budget`                                                       | `app.budget.tsx` -> `BudgetContainer`                                                    | real                                                                   | fine                                                                                                                          |
| `/app/debt`, `/forecast`, `/mortgage`, `/pension`, `/savings`       | route files + containers, backend accounts and profile                                   | real (derive from accounts and profile)                                | fine. Layout-law gaps belong to Track H                                                                                       |
| `/app/tax`                                                          | `app.tax.tsx`                                                                            | real; first load seeds fake records (G-01)                             | ship-blocking via G-01                                                                                                        |
| `/app/profile`                                                      | `app.profile.tsx`, `UserProfilePanel`                                                    | real except the MCP card (G-06)                                        | fine, except G-06                                                                                                             |
| `/app/onboarding`                                                   | `app.onboarding.tsx`                                                                     | real                                                                   | fine                                                                                                                          |
| `/sandbox`, `/app/sandbox`                                          | `sandbox.tsx`, `app.sandbox.tsx` (redirect)                                              | real demo, public by design                                            | fine; see G-10                                                                                                                |
| `/$feature` legacy redirects                                        | `$feature._index.tsx`                                                                    | real                                                                   | fine                                                                                                                          |
| Synced bank transactions display                                    | no web consumer of `/transactions`                                                       | stub: data stored, never shown (docs promise "Transaction Logs")       | hide the promise in docs or build the view (G-09)                                                                             |

### Banking providers

| Provider                                                                           | Location                                                                                                    | State                                                                                                                                                                 | Action                                                 |
| ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| monzo                                                                              | `apps/backend/src/providers/monzo.provider.ts`                                                              | real (PAT works; OAuth blocked by G-02)                                                                                                                               | fine                                                   |
| starling                                                                           | `starling.provider.ts`                                                                                      | real (same)                                                                                                                                                           | fine                                                   |
| trading212                                                                         | `trading212.provider.ts`                                                                                    | real for API key; OAuth URLs unverified                                                                                                                               | fine; remove OAuth path if T212 has no OAuth           |
| open-banking-standard (hsbc, barclays, revolut, santander, natwest, lloyds, chase) | `open-banking-standard.provider.ts:19-70, 74-230`                                                           | partial/unproven: plain OAuth2 code flow, no PKCE, no consent id, no mTLS or signed request. Registered in the backend but the web UI marks these banks "coming soon" | hide-behind-flag (G-05)                                |
| plaid                                                                              | `packages/banking/src/server/adapters/plaid.ts:109-260`                                                     | mock: hardcoded accounts and transactions, fake `access-sandbox-...` token. Not wired                                                                                 | delete or move to test fixtures (G-07)                 |
| csv                                                                                | `packages/banking/src/server/adapters/csv.ts`                                                               | real parser, not wired to any route or UI                                                                                                                             | wire it (promised on Pricing) or hide the claim (G-08) |
| sandbox                                                                            | `packages/banking/src/server/adapters/sandbox.ts`                                                           | mock, not wired                                                                                                                                                       | delete or keep as test fixture only (G-07)             |
| orchestrator mock generators                                                       | `orchestrator.ts:205-310` (`getMockInstitutionAccounts`, `generateMockHistory`, `generateMockTransactions`) | mock, no callers                                                                                                                                                      | delete                                                 |
| orchestrator `getOAuthUrl`                                                         | `orchestrator.ts:145-180`                                                                                   | stub: `client_id=flump-client` placeholder, URLs differ from provider classes                                                                                         | delete (G-02)                                          |

### MCP

| Feature                                   | Location                                                                                       | State                                                                                                                                         | Action                                   |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| `@flump/mcp` server, 8 tools, 4 resources | `packages/mcp/src/tools/*`, `resources/*`                                                      | real (8 `registerTool` calls match the marketing "8 tools")                                                                                   | fine                                     |
| Remote endpoint and PAT store             | `apps/backend/src/mcp.controller.ts`, `mcp.service.ts`                                         | real (create, list, revoke, context pack)                                                                                                     | fine, auth bypass is Track D (G-03)      |
| Web token management UI                   | `McpConnectionCard.tsx:126-136, 165-170, 176-190`; rendered bare at `UserProfilePanel.tsx:987` | mock: no `onGenerateToken`, `onRevokeToken` or `onFetchContextPack` is passed, and the web never calls `/mcp-tokens`                          | ship-blocking or hide-behind-flag (G-06) |
| `npx -y @flump/mcp` setup snippet         | `McpConnectionCard.tsx:~95-110`; `packages/mcp/package.json` `"private": true`                 | stub: package is not published                                                                                                                | hide-behind-flag (G-06)                  |
| stdio transport                           | `packages/mcp/src/transports/stdio.ts:9-60`                                                    | partial: falls back to default baseline when the API is unreachable or no PAT, hardcoded `cli_desktop_user`, `queryTransactions` returns `[]` | fine for local dev; document             |

### Mobile companion (`apps/mobile-companion`)

| Feature                                                                              | Location                                                                                                             | State                                                                                                             | Action                                    |
| ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| Auth                                                                                 | `LoginScreen.tsx:15-41, 66-75`                                                                                       | mock: "Sign In with Mock Auth" navigates to Main; biometric is only an optional gate                              | ship-blocking if shipped to stores (G-11) |
| API client                                                                           | `api/client.ts:21, 303-330`                                                                                          | mock-first: fixed `mock-session-token`, `localhost:4000`, silent mock fallback                                    | ship-blocking (G-11)                      |
| Sign out                                                                             | none found in any screen                                                                                             | stub                                                                                                              | ship-blocking (G-11)                      |
| Dashboard, Accounts, AccountDetail, Budget, Forecast, Mortgage, Tax, Profile screens | `src/screens/*`                                                                                                      | partial: real endpoints where they exist, mock fallback otherwise. No `SavingsScreen` file although docs list one | hide-behind-flag (G-11)                   |
| Connect bank (mobile)                                                                | `api/client.ts:365-440`                                                                                              | mock: any failure creates a fake connection with a random balance                                                 | delete the fallback (G-11)                |
| Receipt capture                                                                      | docs claim it; `TaxScreen.tsx:187-189` only copies existing fields; no picker or camera dependency in `package.json` | stub                                                                                                              | fix docs or build                         |
| Account history edit                                                                 | `api/client.ts:529` POSTs `accounts/:id/details`; backend has GET only                                               | broken, then silently flips to mock                                                                               | see G-04                                  |

### Backend

| Feature                                     | Location                                                                                       | State                                                                                                                                                             | Action                |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| Auth guard                                  | `auth/auth.guard.ts`                                                                           | mock bypasses live (Track D owns the fix)                                                                                                                         | ship-blocking (G-03)  |
| First-load seeding of accounts, tax, budget | `account-intake.service.ts:93-136`, `tax.controller.ts:40-720`, `budget.controller.ts:210-220` | mock data written to real users                                                                                                                                   | ship-blocking (G-01)  |
| Identity adapter                            | `identity/identity.adapter.ts`                                                                 | real, but `updatePassword` and `sendPasswordReset` silently return when `WORKOS_API_KEY` is unset (`identity.adapter.ts:43-60`), so the caller may report success | check in Track D      |
| Scheduled sync, "daily auto-categorisation" | no scheduler, no categoriser anywhere in `apps/backend/src`                                    | stub (promised by Pricing)                                                                                                                                        | hide the claim (G-08) |

### Marketing

| Feature                       | Location                                                         | State                                                                      | Action                                      |
| ----------------------------- | ---------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------- |
| Security enquiry form         | `SecurityPage.tsx:72-79, 462-468`                                | mock: submit shows "Enquiry sent ... within 1 business day", sends nothing | ship-blocking (G-12)                        |
| Pro plan and 14-day trial     | `PricingPage.tsx:409-415`; `?plan=` never read in web or backend | stub: no billing, no entitlement                                           | ship-blocking or relabel as waitlist (G-08) |
| Calculators, guides, MCP page | `apps/marketing/src/pages/*`                                     | real                                                                       | fine                                        |

## Findings

### [G-01] New real users are seeded with fake accounts, a fake pension and the developer's personal rental ledger

- Severity: P0
- Location: `apps/backend/src/account-intake.service.ts:93-136`; `apps/backend/src/tax.controller.ts:40-720`; `apps/backend/src/budget.controller.ts:210-220`
- Evidence: `getAccounts` creates "Main Checking" £2,450.75, "High Yield Savings" £15,800, "Cash ISA - Trading 212" £42,100.50 and "Workplace Pension - Nest" £18,500 whenever a user has zero accounts and `hasResetFinancialData` is false. The comment reads "Auto-seed mock data for development". `getTaxRecords` does the same with "Poplar Rent" records from 2020/21 onward plus invented dividend and ISA income. No environment check guards either. The only escape is the opt-in "reset financial data" button (`UserProfilePanel.tsx:970`). The entity defaults also seed pension 5% and salary sacrifice on (`user-profile.entity.ts:141-156`), and `user-profile.service.ts:93-111` keeps those defaults until a reset.
- Impact: Every new production user sees a fabricated net worth, fabricated tax and Section 24 results, and (via `McpService.getContextPack`) fabricated data handed to AI assistants. This is a wrong financial result on first load, and it exposes a real property ledger in source and in every user's account.
- Recommendation: Remove all three seeders from read endpoints. Seed only in a dev-only script or behind `NODE_ENV !== "production"` and an explicit flag. Create real users with empty state and let onboarding or the demo routes show example data. Strip the Poplar records from the repository history if they are the owner's real data. Migrate existing seeded users (flag by exact seed names).
- Effort: M

### [G-02] Bank OAuth connect has no callback handler, and the web fallback sends users to a fake client id

- Severity: P1
- Location: `apps/backend/src/finance.service.ts:160-172`; `apps/backend/src/auth/auth.guard.ts:11-13`; `apps/web/app/routes/app.accounts._index.tsx:78-125`; `packages/banking/src/server/orchestrator.ts:145-180`
- Evidence: `connectBank` returns `redirectUrl` with `redirect_uri = ${BACKEND_URL}/bank-connections/callback` and `state = ${institutionId}:${userId}` (unsigned). `grep callback apps/backend/src` finds no controller route for that path, only the guard bypass. So the bank redirects to a 404 and no tokens are stored. When the server has no client credentials, the web action ignores the 400 for OAuth and builds `BankSyncOrchestrator.getOAuthUrl(...)` with `client_id=flump-client` and a redirect to the web `/auth/callback`, which is the WorkOS callback. Separately, `syncBankConnection` (`finance.service.ts:219-236`) refreshes tokens by calling `provider.exchangeCode` with the refresh token as `code` and `grant_type=authorization_code`, which would fail against real providers. The wizard still offers the OAuth option for Monzo and Starling (`ConnectBankWizard.tsx:34-50`, `:134`).
- Impact: A user who picks OAuth cannot connect, and may be sent to a bank page with a placeholder client id. The unauthenticated callback route is a latent hole if someone adds a handler without validating `state` (CSRF and account-linking attack, since `state` carries the user id in clear).
- Recommendation: Either hide the OAuth option in both dialogs until it works (PAT only for now, the PAT path is real), or implement the callback with a signed, expiring, single-use `state` bound to the session and a real refresh-token grant. Delete `getOAuthUrl` and the web fallback in both cases.
- Effort: M (hide) / L (implement)

### [G-03] Mock and dev sessions are live in production code paths and can attach real users to shared mock identities

- Severity: P0 (cross-reference Track D; included here because it is mock leaking into signed-in flows)
- Location: `apps/web/app/utils/utils.ts:99-104`; `apps/backend/src/auth/auth.guard.ts:25-27, 46-49`; `apps/web/app/**` (about 28 occurrences of `accessToken || "mock-session-token"`, for example `root.tsx:35`, `backend-client.server.ts:71`, `app.tax.tsx:16,106,119`); `packages/mcp/src/auth/token-verifier.ts:80-88`
- Evidence: `getAuthSession` catches any non-Response error from `authkitLoader` (for example missing WorkOS env or a network failure) and returns `user: dev_user_123` with `accessToken: "mock-session-token"`, so protected routes render as signed in. The backend maps that literal token to `user_mock` with no environment check, and also authenticates as `dev_user_123` when `WORKOS_API_KEY` is unset. Every route also falls back to the same literal when `accessToken` is null. The MCP verifier accepts `mock-session-token` and any `mock_mcp_*` token.
- Impact: A WorkOS misconfiguration or outage turns every visitor into the same shared `user_mock` account (with the G-01 seed data), able to read and write each other's data. Anyone who knows the literal can call the API directly.
- Recommendation: Delete the web catch-all and the `|| "mock-session-token"` fallbacks (fail closed with a 401/redirect). Gate backend and MCP mock identities behind `NODE_ENV === "development"` and an explicit `ALLOW_DEV_AUTH=true`, or remove them and use real test tokens in tests. Track D owns the unsigned-JWT fix.
- Effort: M

### [G-04] Account history editing on web and mobile calls endpoints that do not exist

- Severity: P1
- Location: `apps/web/app/routes/app.accounts.$account.tsx:16-55`; `apps/web/app/containers/accounts/accountDetailContainer/AccountDetailContainer.tsx:95-130`; `apps/mobile-companion/src/api/client.ts:527-533`; `apps/backend/src/finance.controller.ts:105-118`
- Evidence: Web sends `DELETE /accounts/:id/details/:year`, `POST /accounts/:id/details/year` and `PUT /accounts/:id/details`. Mobile sends `POST /accounts/:id/details`. The backend controller defines only `GET accounts/:id/details` and `GET account-details`; a grep for `details/year` in `apps/backend/src` returns nothing.
- Impact: "Add year", "Delete year" and "Save monthly values" on the account detail page fail with a 404 ("Failed to add year"). This is the historical net-worth editing journey promised in `pages_and_features.md` section 3.2. On mobile the 404 flips the whole app into mock mode (G-11) and the edit is saved only in memory.
- Recommendation: Implement the three endpoints (with ownership checks and a transaction around bulk upserts), or remove the edit UI. Add a contract test between web action URLs and Nest routes.
- Effort: M

### [G-05] Open-banking-standard providers are registered but unproven, and copy claims "all UK banks"

- Severity: P2
- Location: `apps/backend/src/providers/open-banking-standard.provider.ts:19-70, 74-230`; `provider.registry.ts:27-30`; `apps/marketing/src/pages/PricingPage.tsx:357-358`; `apps/marketing/src/components/SecurityPrivacySection.tsx:120`
- Evidence: Seven institutions are configured with plain `response_type=code` OAuth against guessed endpoint URLs. There is no PKCE (`code_verifier` grep returns nothing in app code), no consent id or account-access-consent step, no client authentication beyond a secret, and unverified URLs. The Pricing page says "Regulated FCA Open Banking sync (all UK banks)" and the security diagram says "OAuth 2.0 PKCE handshake". Orchestrator `getOAuthUrl` also lists different URLs for the same banks (for example Santander, Chase).
- Impact: Claims exceed what exists. No live bank in this list can currently connect through the app (UI marks them coming soon; OAuth is G-02). The FCA AISP wording implies Flump or a partner holds a registration, which this repo does not show.
- Recommendation: Hide these providers behind a flag until one is proven against a sandbox, and correct marketing to "Monzo, Starling, Trading 212 (API key)". Consolidate bank metadata into one source.
- Effort: S (copy and flag) / L (real OB integration)

### [G-06] MCP "AI connections" card is a client-side fake

- Severity: P1
- Location: `apps/web/app/features/ai-connections/components/McpConnectionCard/McpConnectionCard.tsx:126-136, 165-170, 176-190`; `apps/web/app/components/budget/UserProfilePanel.tsx:987`; `packages/mcp/package.json` (`"private": true`)
- Evidence: `<McpConnectionCard />` is rendered with no props. With no `onGenerateToken` the component builds `flump_pat_<Math.random()...>` locally ("Fallback generator for mockup/testing") and displays it as a real token. `onRevokeToken` is absent so revoke only changes local state. `onFetchContextPack` is absent so "export context pack" returns a two-line stub markdown. The web has zero calls to `/mcp-tokens` (grep), even though the backend endpoints exist and work. The Claude Desktop snippet uses `npx -y @flump/mcp`, which cannot resolve because the package is private. Token list always starts empty after reload.
- Impact: Users copy a token that the backend has never seen, and the setup fails with "Invalid Personal Access Token". Revoking in the UI does nothing server-side, which is worse for a security control. The context pack export silently produces an empty document. The marketing `/mcp` page advertises all of this.
- Recommendation: Wire the three callbacks to `/mcp-tokens` (loader for the list, actions for create and revoke, `/mcp-tokens/context-pack` for export), remove the mock fallbacks from the component, and either publish `@flump/mcp` or change the snippet to the remote URL. Until then hide the card.
- Effort: M

### [G-07] Dead mock code in the banking package looks like a live integration

- Severity: P2
- Location: `packages/banking/src/server/adapters/plaid.ts:109-260`; `adapters/sandbox.ts:253-330`; `orchestrator.ts:205-310`
- Evidence: `PlaidAdapter` returns two hardcoded accounts and two hardcoded transactions for any token and labels them "Plaid Connected Bank"; `exchangePublicToken` fabricates `access-sandbox-...`. Nothing calls `BankSyncOrchestrator.registerAdapter` or `getAdapter` outside tests. The orchestrator mock generators have no callers. The `BankingProviderName` union still lists `plaid`, `csv` and `sandbox`.
- Impact: Low today (unreachable). It is a trap: wiring "Plaid" or "sandbox" in the future would show fabricated balances as real, and it inflates the apparent provider support and the 117-line mock sweep.
- Recommendation: Delete the Plaid adapter and orchestrator mock generators. Move sandbox data to a test-only fixtures path or keep it behind a clearly named dev export.
- Effort: S

### [G-08] Marketing promises Pro features and CSV import with no implementation

- Severity: P1
- Location: `apps/marketing/src/pages/PricingPage.tsx:233, 253, 357, 404, 409-415`; `apps/web/app/**` (no `plan` handling); `apps/backend/src` (no scheduler)
- Evidence: Free tier lists "CSV transaction and balance imports". The CSV parser exists in `packages/banking` but no web route, UI or backend endpoint uses it (the only file inputs in web are the profile avatar and tax receipts). Pro lists "Daily transaction auto-categorisation": there is no cron or scheduler in the backend and sync is manual refresh only. "Start 14-day free Pro trial" links to `/signUp?plan=pro`, but `plan` is never read in web or backend and there is no billing or entitlement check anywhere (grep for stripe or subscription finds only calculator copy).
- Impact: Users are promised features and a trial that do not exist. Everything is effectively free and the "Pro" gate is cosmetic. Possible consumer-protection exposure for claims on a paid-plan page.
- Recommendation: Either build the CSV import (parser is ready), a scheduled sync, and plan handling, or relabel the page ("Coming soon", waitlist) and drop the trial CTA. Treat as ship-blocking for any paid launch.
- Effort: S (relabel) / L (build)

### [G-09] Synced transactions are stored but never shown on web

- Severity: P2
- Location: `apps/backend/src/finance.service.ts:372-415`; `apps/web/app` (no `/transactions` fetch); `docs/app_functionality.md` section 1.2
- Evidence: `syncProviderAccounts` saves transactions and the backend exposes `GET /transactions`, but the web has no consumer (grep for `transactions` in `apps/web/app` finds copy text and the tax bulk intent only). Docs promise "Interactive display of recent transactions filtered by category". Only mobile calls `getTransactions`.
- Impact: Bank sync value is limited to balances; users cannot see or trust imported transactions. Storage cost and privacy surface with no user benefit.
- Recommendation: Add a transactions list to account detail, or stop persisting them and fix the docs.
- Effort: M

### [G-10] Demo and sandbox are isolated from signed-in data, with two smaller leak paths

- Severity: P3
- Location: `apps/web/app/routes/_index.tsx:23-25`; `apps/web/app/routes/sandbox.tsx:86-139`; `apps/web/app/state/baseline.store.ts:21-24, 84, 89-130`
- Evidence: `?demo=true` returns static demo data before any backend call and is only read in `_index.tsx` and `app._index.tsx`, so demo data is never merged into real loaders; the banner offers "Exit Demo" and sign-up. The sandbox writes persona values into the in-memory `financialBaselineAtom` (not persisted) and, on "Save My Changes", writes the onboarding seed cookie then goes to `/signUp`. Leaks: (a) a signed-in user who opens `/sandbox` overwrites the in-memory baseline atom with persona salary and stage until reload; (b) a persona seed cookie can prefill a real onboarding with a demo salary (for example £115,000) that the user may save by clicking through; (c) the baseline localStorage key `flump_financial_baseline_v1` is not scoped to a user id, so a shared browser can show another user's baseline. Two parallel demo systems also exist (`/?demo=true` and `/sandbox`; docs only describe the sandbox).
- Impact: Minor; no cross-user server data exposure from demo. Confusing duplicated demo code (`demoData.ts` is 989 lines).
- Recommendation: Keep `/sandbox`, delete `?demo=true` and `DemoModeBanner` (or fold them together), clear the seed and baseline on sign-out, scope the localStorage key by user id, and make onboarding show that prefilled values come from a demo seed.
- Effort: S-M

### [G-11] Mobile companion is a demo app with mock auth and silent mock fallback

- Severity: P1 (P0 if distributed to users; no store config beyond bundle ids found)
- Location: `apps/mobile-companion/src/screens/LoginScreen.tsx:15-41, 66-75, 80-84`; `src/api/client.ts:17-24, 295-330, 365-440, 527-560`; `src/screens/DashboardScreen.tsx:276`
- Evidence: Login navigates to Main with no credential check ("Sign In with Mock Auth" or "Sign In with WorkOS (Mock)"); the biometric button is an optional gate that the mock button bypasses; the footer says "Protected by enterprise-grade SSO". Every request sends the fixed `mock-session-token` (accepted by the backend as `user_mock`, so every mobile user would share one account if the API is reachable) to a hardcoded `localhost:4000` or `10.0.2.2:4000`. `apiFetch` sets `useMockFallback = true` on any failure (offline, 401, 404, 500) and never resets it, after which all reads return in-memory demo data and writes appear to succeed but vanish on restart. Only the dashboard shows a "Demo Mode" badge, evaluated at render. Mobile `connectBank` fabricates a connection with `Math.random()` balance on failure. No sign-out exists in any screen. No tests and no accessibility labels (Phase 1).
- Impact: A real user could believe they are viewing and editing their finances while looking at fake data, or share a single backend identity. Docs describe "mobile parity" and "mobile security" that are not delivered.
- Recommendation: Do not distribute. To ship: real WorkOS auth with secure token storage (`expo-secure-store` is already a dependency), configurable API URL, remove mock fallback from production builds (keep behind a dev flag with an unmissable banner on every screen), add sign-out, remove the fake bank connection, and update docs. Otherwise hide the app from docs and CI release lists.
- Effort: L

### [G-12] Security enquiry form discards the message and reports it as sent

- Severity: P1
- Location: `apps/marketing/src/pages/SecurityPage.tsx:72-79, 462-468`; `apps/marketing/server.ts` (no form endpoint)
- Evidence: `handleSubmitInquiry` calls `preventDefault`, sets `submitted`, and closes the modal after 2.5 s; there is no fetch and no route in the marketing server. The success text reads "Enquiry sent. Our compliance team will respond within 1 business day."
- Impact: Users asking security or compliance questions (for example about data deletion rights under UK GDPR) get a false confirmation and no reply. A response-time promise is made that nothing backs.
- Recommendation: Replace with a `mailto:` link or post to a real inbox or form service; until then remove the form and the promise.
- Effort: S

### [G-13] Backend failures on web are swallowed and render as empty data

- Severity: P2
- Location: `apps/web/app/services/backend-client.server.ts:73-82`; `apps/web/app/root.tsx:32-41`; `apps/web/app/routes/app._index.tsx:19-26`
- Evidence: `fetchJson` returns the fallback (`[]` or `null`) for any non-OK response or exception, so a 401 or 500 looks identical to "no accounts". `app._index.tsx` has an empty `catch {}` around the onboarding redirect. There is no error banner.
- Impact: A backend outage presents as a blank or "get started" dashboard, which can push users to re-enter data or run reset. Hides the G-03 and G-04 failure modes from users and from monitoring.
- Recommendation: Throw a route error for non-2xx on core loaders, show a visible "could not load" state, and log the failure.
- Effort: M

### [G-14] Docs drift from what is delivered

- Severity: P3
- Location: `docs/pages_and_features.md` (sections 3.1, 5 and the mobile list); `docs/app_functionality.md` sections 1.2, 3.1 and the mermaid diagram
- Evidence: The catalog says every listed route is "Usable" and the file states it must be updated with each change. It lists `/mcp` under marketing and `SavingsScreen` on mobile (no such file), "Fast mobile receipt image uploads" (no picker), "Biometric Authentication" as security (optional, bypassable), "Transaction Logs" on web (G-09), and "Poplar CSV" seeding (G-01) as a feature. It omits `/auth/callback`, web `/tools`, and the `?demo=true` mode.
- Impact: The spec the team and agents rely on overstates delivery.
- Recommendation: Add a "state" column using this track's vocabulary (real, partial, mock, stub) and correct the rows above.
- Effort: S

### [G-15] Smaller leftovers

- Severity: P3
- Location: `apps/backend/src/main.ts:35-53`; `apps/backend/src/app.module.ts:54, 75`; `apps/web/app/routes/logout._index.tsx` and 17 other places with `VITE_API_URL || "http://localhost:4000"`
- Evidence: The backend opens a raw TCP proxy on port 3000 "to support existing frontend sessions" whenever `PORT` is 4000; TypeORM runs `synchronize: true` in both configurations with no migrations; localhost fallbacks for the API URL are repeated across web.
- Impact: Dev conveniences in the production entry point; schema changes can alter or drop columns at deploy without review.
- Recommendation: Remove the port-3000 proxy, move to migrations and `synchronize: false` in production, and centralise the API URL in one validated config (Track N and B carry the detail).
- Effort: M

## Quick wins

1. Delete the three read-time seeders (G-01), or guard them with a non-production check today. One-hour change with the largest user impact.
2. Delete `getAuthSession`'s mock-session catch and the `|| "mock-session-token"` fallbacks (G-03); gate backend `mock-session-token` and `dev_user_123` behind an explicit dev flag.
3. Hide the OAuth option in `ConnectBankWizard` and `AddEditAccountsDialog` and delete `getBankOAuthUrl` (G-02).
4. Hide `<McpConnectionCard />` in `UserProfilePanel.tsx:987` until the three callbacks are wired (G-06).
5. Replace the security enquiry form with a `mailto:` link (G-12).
6. Relabel the Pro trial CTA and the CSV and daily categorisation bullets as "coming soon" (G-08).
7. Delete `plaid.ts`, the sandbox adapter and the orchestrator mock generators (G-07).
8. Add a contract test that every `fetch` path in `apps/web` and `apps/mobile-companion` maps to a real Nest route (would have caught G-04).
9. Delete the duplicate `auth.callback.tsx` after confirming the WorkOS redirect URI.

## Limits

- Code reading only; no runtime pass, no deployed environment checked. Whether the backend is internet-reachable (which decides the real exposure of G-03) and which env vars are set in production could not be verified.
- Did not verify against live bank sandboxes (Monzo, Starling, Trading 212, Open Banking) or third-party API documentation, so provider "real" means the HTTP code looks complete, not that it was exercised. Trading 212 OAuth availability was not checked.
- `packages/finance-engine` and `packages/common` were not audited for stubs beyond what the sweeps flagged; the 8 MCP tools were counted but their calculations were not reviewed (Track C).
- Did not run the Storybook, web or mobile apps, so button behaviour was judged from handlers, not clicked. A small number of web dialogs were read only in the sections relevant to bank connection.
- Line numbers are from the working tree at audit time and may drift.
