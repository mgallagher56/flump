# Track B - Architecture

Audited 2026-11-11 on `main`. Read-only: code reading and grep, no runtime pass. Vocabulary follows `codebase-design` (module, interface, depth, seam, adapter, locality). Findings are numbered B-01 onward and ordered by severity.

## Summary

The package graph is cleaner than the app code that sits on top of it. Apps only import packages through public entry points, `@flump/mcp` is a proper ports-and-adapters module, and `finance-engine` holds most of the tax and debt maths. The structural problems are elsewhere:

- **No single boundary owns authentication, validation, config or money types.** Each of them is implemented ad hoc at every call site, and the ad hoc versions fail open.
- **Financial logic is forked.** Mobile and several web components re-implement tax and mortgage maths that already exist in `finance-engine`, with their own hardcoded constants.
- **Banking has two parallel abstractions.** The `packages/banking` adapter seam is not used in production. The backend has its own `IBankProvider` seam, and the two overlap.
- **The backend is shallow and flat.** One `AppModule`, controllers that hold repositories and business logic, no DTO validation, `synchronize: true`, and `decimal` columns with no transformer.
- **Web has three data-flow styles** and giant single-component files (`TaxContainer` is one 2,146-line function).

Checked and found fine (no finding):

- **Deep imports:** none. The only subpath imports from packages are `@repo/ui/styled-system/{css,patterns}`, `@repo/ui/calculators`, `@repo/ui/preset` (all declared in `packages/ui/package.json` exports) and `@flump/banking/server`.
- **MCP package boundary:** `McpUserDataProvider` and `McpTokenStoreAdapter` are injected by the backend, so the package has no database dependency.
- **`finance-engine` I/O:** the calculation modules do no network or file I/O.

## Findings

### [B-01] Authentication fails open at every layer of the web-to-backend path

- Severity: P0 (cross-reference Track D, which owns the full security analysis)
- Location: `apps/web/app/utils/utils.ts:99-104`; `apps/web/app/services/backend-client.server.ts:71`; `apps/web/app/routes/app.profile.tsx:16`; `apps/backend/src/auth/auth.guard.ts:12,25,33-49` (from Phase 1 sweep section 0, not re-read here)
- Evidence: `getAuthSession` catches any non-`Response` error from `authkitLoader` and returns `{ user: { id: "dev_user_123" }, accessToken: "mock-session-token" }`, with only a `console.warn`. Loaders then send `Bearer ${accessToken || "mock-session-token"}`. The backend guard accepts that literal token and trusts unsigned JWT payloads (Phase 1).
- Impact: a WorkOS misconfiguration, SDK error or outage turns every visitor into the same shared dev user, on a path that is also accepted by the backend. This is an architecture defect as much as a bug: there is no single module that owns "who is this request", so each layer invented its own dev shortcut and none of them is gated on environment.
- Recommendation: one `AuthContext` module per side. Web: `getAuthSession` rethrows (or redirects to sign-in) on any failure. Backend: verify the JWT against the WorkOS JWKS, remove the literal token, and gate any dev identity on `NODE_ENV === "development"` plus an explicit opt-in flag. Delete the `|| "mock-session-token"` fallbacks (at least 3 call sites).
- Effort: M

### [B-02] Backend has no validation or DTO layer; PATCH handlers mass-assign request bodies

- Severity: P1
- Location: `apps/backend/src/tax.controller.ts:774,785,794`; `apps/backend/src/account-intake.service.ts:246`; `apps/backend/src/main.ts` (no `ValidationPipe`); `apps/backend/package.json` (no `class-validator` or zod)
- Evidence: `grep ValidationPipe|class-validator|zod` over `apps/backend/src` and `package.json` returns nothing. Controllers declare `@Body() body: any` (38 `req: any` / `@Body()` occurrences across 6 files). `updateTaxRecord` does `Object.assign(record, body)` then `save`; `updateAccount` does the same. The `CreateAccountDto` that exists (`account-intake.service.ts:32`) is a plain interface, so nothing enforces it at runtime.
- Impact: a client can send `userId`, `id` or `createdAt` in a PATCH body and re-parent or overwrite a row (Track D to confirm exploitability). Money fields accept strings, negatives and NaN. Every service that follows has to defend itself.
- Recommendation: add zod (already a dependency of `@flump/mcp`) or class-validator DTOs per route, a global `ValidationPipe` with `whitelist: true, forbidNonWhitelisted: true`, and an explicit allow-list when updating entities. Put the DTO schemas next to each module (see B-12).
- Effort: L

### [B-03] Tax records controller seeds a real-looking personal rental P&L into every new user on a GET

- Severity: P1
- Location: `apps/backend/src/tax.controller.ts:29-728`; similar seeding in `apps/backend/src/account-intake.service.ts:93-134` and `apps/backend/src/budget.controller.ts:34,197-227`
- Evidence: `GET /tax-records` returns early only if the user has records or `hasResetFinancialData`. Otherwise it saves roughly 680 lines of literal records ("Poplar Rent (2020/21)", "Curo Service Charge & Ground Rent", self-employed and ISA income, 2020/21 to 2025/26) with a comment calling part of it "mock". It runs in every environment, inside a GET handler, and the result feeds the web tax calculation (`TaxContainer` calls `calculateUKTax` on `initialRecords`).
- Impact: a new production user's tax position is computed from someone else's data until they discover a reset button. A read endpoint writes. The controller is 808 lines, of which about 85% is a data literal. Seeding is also spread over three modules with the same `hasResetFinancialData` opt-out.
- Recommendation: move all demo seeding behind one `DemoSeedService` that is only reachable when an explicit `demo` flag is set on the profile (opt-in, not opt-out), never from a GET. Move the fixture data to `apps/backend/src/demo/*.fixtures.ts`. Real users get empty states.
- Effort: M

### [B-04] Schema is managed by `synchronize: true` with no migrations, no indexes, no foreign keys

- Severity: P1
- Location: `apps/backend/src/app.module.ts:54,75` (both branches), `:55` (`ssl: { rejectUnauthorized: false }`); `apps/backend/src/entities/*.ts`
- Evidence: both TypeORM configs set `synchronize: true` unconditionally. No migrations directory and no migration script in `apps/backend/package.json`. `grep @Index|@Unique|ManyToOne|OneToMany` over entities returns nothing: `user_id` (on 6 entities), `account_id` (on `account_details` and `transactions`) and `connection_id` have no index or FK. `rejectUnauthorized: false` disables certificate checking for non-local database URLs. The entity list is repeated three times in the same file.
- Impact: any entity edit can alter or drop production columns on next boot. No referential integrity: deleting an account leaves orphan `account_details` and `transactions`. Every query filters by `userId` with a full scan. TLS to the database is unverified.
- Recommendation: set `synchronize` from config (false by default), adopt TypeORM migrations with a baseline migration generated from the current schema, add `@Index(["userId"])` and composite indexes, add `@ManyToOne` with `onDelete: "CASCADE"` for `account_id`, define the entity list once (`autoLoadEntities: true`), and verify the DB certificate. Needs an ADR (see below).
- Effort: L

### [B-05] `decimal` columns have no transformer, so money arrives as strings while types say `number`

- Severity: P1
- Location: `apps/backend/src/entities/account.entity.ts:21-25`, `transaction.entity.ts:14`, `tax-record.entity.ts:29`, `account-detail.entity.ts:14` (20 `decimal` columns; only `budget-entry.entity.ts:27` has a transformer); compensating code at `packages/finance-engine/src/tax-calculator.ts:192-193,275`, `apps/backend/src/mcp.service.ts:115,156`, `apps/backend/src/account-intake.service.ts:157-193`
- Evidence: the `pg` driver returns `numeric` as a string unless a transformer is provided. The entities declare `balance: number` and so on. The rest of the system works around it case by case: the engine sniffs `typeof record.amount === "string"`, MCP wraps in `Number(...)`, intake coerces some fields. Other paths (for example `finance.service.ts:368-377` passes `savedAcc.balance` into `AccountDetail.value`; `syncProviderAccounts`) rely on whatever the type is at that moment.
- Impact: a `+` on two such values concatenates. Whether a route is correct depends on remembering to coerce. This is the classic source of wrong financial results (Track C should test the account list totals path). The type lie also defeats the TypeScript checks CI relies on.
- Recommendation: one shared `numericTransformer` (`to: v => v`, `from: v => (v == null ? v : Number(v))`) applied to all 20 columns, or move to integer pence with a `Money` type. Then delete the `typeof === "string"` defences in the engine.
- Effort: M

### [B-06] Web swallows backend failures as empty data and repeats the API base URL in 21 places

- Severity: P1
- Location: `apps/web/app/services/backend-client.server.ts:73-80`; `process.env.VITE_API_URL || "http://localhost:4000"` at `root.tsx:33,51`, `routes/app._index.tsx:14`, `app.pension.tsx:20`, `app.profile.tsx:12`, `app.tax.tsx:13`, `app.accounts.$account.tsx:14,60`, `app.onboarding.tsx:40,56,286`, `app.accounts._index.tsx:27`, `app.savings.tsx:20`, `hooks/useUserProfile.ts:285,306,327,350,372,408`, `containers/budget/BudgetContainer.tsx:149`, `services/backend-client.server.ts:70` (21 lines in 14 files; Phase 1 said 17)
- Evidence: `fetchJson` returns the fallback (`[]` or `null`) on both `!res.ok` and thrown errors. A backend 500 or 401 is therefore rendered as "no accounts, no tax records". A centralised helper (`loadWorkspaceSnapshot`) exists and is used by 9 routes, but 8 routes and 2 client modules still hand-roll their own fetch and base URL. The localhost fallback also ships in production builds if `VITE_API_URL` is unset, and `useUserProfile.ts` reads three different sources for the URL (`window.ENV`, `import.meta.env`, literal).
- Impact: outages and auth failures look like empty accounts, which invites users to "reset" or re-enter data (and, combined with B-03, triggers re-seeding). A misconfigured deploy silently talks to localhost. Config is untestable because there is no seam.
- Recommendation: one `config.server.ts` (zod-validated env, fails at boot in production if `VITE_API_URL` is missing) and one `backendClient` with typed endpoints that throws a typed `BackendError`; loaders let errors reach the route `ErrorBoundary`. Client-side mutations go through React Router actions (or a single `apiFetch`), reading the URL from the root loader's `ENV`.
- Effort: M

### [B-07] Financial calculations are re-implemented in mobile and web instead of imported from `finance-engine`

- Severity: P1
- Location: `apps/mobile-companion/src/screens/ForecastScreen.tsx:11-60` (own UK tax: hardcoded 12570, 37700, 125140, NI 8%/2%, student loan thresholds); `ProfileScreen.tsx:90-140` (own UK and Irish take-home); `MortgageScreen.tsx:111-190` (own amortisation); `apps/web/app/components/mortgage/RemortgageShockSim.tsx:57-62` and `MortgageTracker.tsx:61-70` (own monthly payment formula); `apps/web/app/components/savings/SavingsAccountsList.tsx:30`; `apps/web/app/components/forecast/UKTaxCalculator.tsx:704-740` (wrapper, fine) and `utils/runwayStorage.ts:78`
- Evidence: `finance-engine` exports `calculateMonthlyMortgagePayment`, `calculateMortgageAmortization` (`mortgage.ts:12,70`) and year-keyed take-home (`calculateUKEWNITakeHome`, `tax-rules.ts:1054`). Mobile declares the dependency but imports it only in `TaxScreen.tsx` and `api/client.ts` (type only). Web has 3 hand-written copies of the repayment formula, only `InteractiveFinancialTeaser` uses the engine function. The mobile comment says "Re-implement the exact UK Tax math", and the copy has no tax-year parameter at all.
- Impact: when the rules change (the thresholds are explicitly year-keyed in `tax-rules.ts`), the engine is updated and the copies silently go stale, so the same salary shows different take-home on mobile and web. The copies also lack the engine's edge cases (zero rate, interest-only, Scottish bands). Each copy has its own tests or none (mobile has no tests).
- Recommendation: delete every local copy and call the engine; add `calculateMonthlyMortgagePayment` to `RemortgageShockSim` and `MortgageTracker`, add an engine function for the overpayment comparison that `MortgageScreen` hand-rolls, and move the Irish take-home calculation into the engine (it currently lives in a mobile screen). Add a Biome `noRestrictedSyntax`-style grep check in CI for `** (1 + ` in app code.
- Effort: M

### [B-08] Banking has two parallel provider abstractions, and the packaged one is unused in production

- Severity: P1
- Location: `packages/banking/src/server/interface.ts:7-29`, `orchestrator.ts:49-62,148-190`, `adapters/{plaid,sandbox,csv}.ts`; `apps/backend/src/providers/provider.interface.ts:23-38`, `provider.registry.ts`, `{monzo,starling,trading212,open-banking-standard}.provider.ts`; `apps/backend/src/finance.service.ts:98-204,299-410`; `apps/web/app/routes/app.accounts._index.tsx:1,9-11`
- Evidence:
  - `BankingProviderAdapter` (package) exposes `createLinkSession/exchangePublicToken/getAccounts/syncTransactions/revokeConnection`; `IBankProvider` (backend) exposes `getAuthUrl/exchangeCode/fetchAccounts/fetchTransactions`. Same job, different shapes, different normalised types (`NormalizedAccount` vs `ProviderAccount`), with `toNormalizedAccount` as a bridge nobody calls in `finance.service.ts`.
  - `BankSyncOrchestrator.registerAdapter` has no caller outside tests (`grep registerAdapter`), so `getAdapter` always returns `undefined` in production and the Plaid, sandbox and CSV adapters are dead in the running system. The Plaid adapter fabricates `access-sandbox-...` tokens (`plaid.ts:139`).
  - OAuth authorisation URLs are written twice: 10 hard-coded institution cases in `orchestrator.getOAuthUrl` (default client id literal `"flump-client"`) and per-provider `getAuthUrl` in the backend. The web route calls the orchestrator version; the backend calls the provider version (`finance.service.ts:169`), so the two can disagree.
  - `BankSyncOrchestrator` is a static-only class (the `noStaticOnlyClass` and `noThisInStatic` warnings from Phase 0) mixing four unrelated jobs: adapter registry, token crypto, token refresh and sign normalisation. `GLOSSARY.md` also claims it does account identity resolution and transaction deduplication, which the code does not do.
  - Two sign-convention implementations: `normalizeAccountBalance` (orchestrator) and `enforceSignConvention` / `toNormalizedAccount` (core).
- Impact: new providers have to be built twice or in the wrong place, bug fixes in one path do not reach the other, and the package's 87% coverage is mostly testing code that production never calls.
- Recommendation: pick one seam (the backend one is the live one). Move `IBankProvider` and its implementations into `packages/banking` as the adapter interface, keep `toNormalizedAccount` as the only sign-normalisation path, make `BankProviderRegistry` the registry (injectable, not static), and move OAuth URL construction onto each provider only. Delete the unused adapters or move them behind a `sandbox` entry point. Needs an ADR.
- Effort: L

### [B-09] Backend is flat with one `AppModule`; controllers hold repositories and business logic

- Severity: P2
- Location: `apps/backend/src/` (all controllers and services at the top level), `app.module.ts:26-115`, `tax.controller.ts:21-28`, `budget.controller.ts`, `finance.service.ts:19-41`
- Evidence: 6 controllers, 4 services and 8 entities in one module. `TaxController` and `BudgetController` inject `Repository<T>` directly (no service layer), so the "tax" and "budget" modules consist of a controller with persistence and seeding inside it. `FinanceService` takes an `@Optional()` `AccountIntakeService` and, if absent, does `new AccountIntakeService(...)` itself (`finance.service.ts:37-41`); it also guards `this.providerRegistry?.getProvider ? ... : null` (`:304`) and `this.accountRepository.create ? ... :`. These are test accommodations written into production code. `McpService` takes 7 repositories plus two services. `FinanceService` is 417 lines covering accounts, transactions, bank connection OAuth flow, sync and snapshots.
- Impact: low locality: a change to bank sync touches the same file as account CRUD. Test-shaped production code is a smell that the module seams are in the wrong place. Cross-module access to entities is unrestricted, so nothing stops `McpService` reaching into everything (and it does).
- Recommendation: split into Nest feature modules, each owning its entities: `AccountsModule` (Account, AccountDetail, Transaction, intake, snapshot), `BankingModule` (BankConnection, providers, sync; B-08), `TaxModule` (TaxRecord with a real service), `BudgetModule`, `ProfileModule` (UserProfile, identity adapter), `McpModule` (McpToken, reads other modules via exported query services, not repositories), plus `AuthModule` (guard, B-01) and `DatabaseModule` (B-04). Controllers get thin: validate, call one service method.
- Effort: L

### [B-10] `finance-engine` has overlapping tax entry points, two constant tables, and a hardcoded default tax year

- Severity: P2
- Location: `packages/finance-engine/src/uk-tax.ts:12-24,287-300,329-346,472-491`; `tax-rules.ts:147-170,956-970,1054`; `tax-calculator.ts:355`
- Evidence: four tax entry points with near-identical names: `calculateUkTax` (`uk-tax.ts:345`), `calculateUKTakeHome` (`uk-tax.ts:472`), `calculateUKEWNITakeHome` (`tax-rules.ts:1054`) and `calculateUKTax` (`tax-calculator.ts:355`, which is a different function: a ledger-based self-assessment calculation). Two sources of truth for thresholds: the year-keyed tables in `tax-rules.ts` and the single-year `UK_TAX_CONSTANTS` in `uk-tax.ts` (NI rates 8% and 2% with no year dimension, `calculateNationalInsurance` at `:287`). `calculateUkTax` defaults `taxYear ?? "2025/26"` (`uk-tax.ts:346`) while `getCurrentUKTaxYear()` exists and today is in the 2026/27 year. Callers omit `taxYear` in `app.onboarding.tsx:173`, `InteractiveFinancialTeaser.tsx:262` (web and marketing). `getTaxYearRemainingDays` defaults to 2025/26 and treats any other year as ending in 2027 (`uk-tax.ts:331`).
- Impact: today the 2025/26 and 2026/27 thresholds are identical so output matches; when they differ (or when NI changes), onboarding and the public teaser will quote last year's rules while the tax page quotes this year's. Callers cannot tell which function to use. `tax-rules.ts` is 1,139 lines mixing data tables, helper functions and calculation.
- Recommendation: one public tax API (`calculateTakeHome(input)` with a required or defaulted-from-clock `taxYear`), thresholds only in year-keyed rule tables (split data from logic into `tax-rules/data.ts` and `tax-rules/calc.ts`), rename the ledger function (`calculateSelfAssessment`), and keep `UK_TAX_CONSTANTS` only for truly year-less values. Add a test that fails if "today's" tax year has no rules entry.
- Effort: M

### [B-11] `finance-engine` is not purely computational: browser persistence and clock reads live in it

- Severity: P2
- Location: `packages/finance-engine/src/persistence.ts:53-135,243-262` (`window`, `localStorage`, `document.cookie`); `index.ts:6` (re-exports `persistence`); `ai-context-pack.ts:269`, `mortgage.ts:35,72`, `debt-payoff.ts:204`, `uk-tax.ts:328,429`, `tax-rules.ts:956,970` (`new Date()` defaults); `apps/web/app/state/baseline.store.ts:30-60` (a second adapter)
- Evidence: the package is documented (GLOSSARY) as pure with no transport or presentation leakage, but its root export includes cookie and storage drivers. The result is two adapters for the same port: web defines `CookieSeedAdapter` (real localStorage) and the engine defines `BrowserCookieSeedAdapter` (keeps the baseline only in an in-memory field, `persistence.ts:243-250`), which is easy to pick by mistake. The cookie is set without `Secure` (Phase 1). Date defaults make results time-dependent, but all of them accept an injectable `referenceDate`; `uk-tax.ts:429` ignores the option (`new Date()` used directly).
- Impact: a server import of `@flump/finance-engine` (backend, MCP) drags in browser code; mobile bundles it too. Tests that depend on the clock are brittle. Two adapters invite a wrong choice.
- Recommendation: move persistence to `@flump/finance-engine/browser` (or into `apps/web`) and keep the root export pure. Make `referenceDate`/`now` an explicit input everywhere, defaulting at the app edge. Delete the duplicate adapter.
- Effort: S

### [B-12] Three data-flow styles in web and overlapping state, context and hook layers

- Severity: P2
- Location: `apps/web/app/routes/*.tsx` (loaders); `services/backend-client.server.ts`; `hooks/useUserProfile.ts:270-446`; `state/baseline.store.ts`, `state/scenario.store.ts`; `context/ResponsiveContext.tsx`, `ThemeContext.tsx`, `hooks/useTheme.ts`, `context.tsx` (Emotion); `utils/runwayStorage.ts`
- Evidence:
  - Server loaders and actions are the dominant pattern, but 8 routes hand-roll fetches instead of using `loadWorkspaceSnapshot` (B-06), and 2 client modules call the API directly with `authHeader` (`useUserProfile.ts` PATCHes at `:285-372`, `BudgetContainer.tsx:149`).
  - The same financial baseline lives in at least four places: server `UserProfile`, loader data, the Jotai atom (`baseline.store.ts`), and `localStorage`/cookie (`FINANCIAL_BASELINE_STORAGE_KEY`, onboarding seed). `useUserProfile` writes into the atom (`rawSetBaseline(userProfileToFinancialBaseline(...))`) and into local state, with silent `catch { // Continue }`.
  - `state/` (Jotai), `context/` plus `ThemeContext.tsx` (React context), and `hooks/` (a hook that owns theme state and a context that re-exposes it) split one concern across layers: `ThemeContext.tsx` imports its type from `hooks/useTheme`. `app/context.tsx` is Emotion SSR plumbing in a folder-less file next to `context/`. `useUserProfile` at 446 lines is simultaneously a data hook, a mutation layer, a persistence adapter and a state sync.
- Impact: stale or contradictory baselines (server profile says one thing, localStorage another); hard to know which layer to extend; auth header handling is duplicated on the client.
- Recommendation: a single rule written down in an ADR: server state comes from loaders/actions, UI-only state lives in Jotai, context only for static environment (responsive, theme). Replace `useUserProfile`'s fetches with a `profile` route action (`useFetcher`), keep only the atom sync in a small `useBaselineSync`. Merge `ThemeContext.tsx` into `hooks/useTheme.ts` (or the reverse) and rename `app/context.tsx` to `emotion.context.ts`. Retire Emotion if Panda covers styling (Phase 0 note).
- Effort: M

### [B-13] Giant single-component files and routes hold state machines, forms and calculations

- Severity: P2
- Location: `apps/web/app/containers/tax/TaxContainer.tsx:52-2198`; `components/budget/UserProfilePanel.tsx` (1,348 lines); `routes/app.onboarding.tsx` (1,226); `containers/mortgage/MortgageContainer.tsx` (1,225); `components/forecast/RunwayCalculator.tsx`; `PensionForecasterCard.tsx`; mobile `TaxScreen.tsx`, `MortgageScreen.tsx`, `ProfileScreen.tsx`
- Evidence: `TaxContainer` is one function component from line 52 to the end: 26 `useState`, 8 `useMemo`/`useCallback`, modal forms, filters, record CRUD with `fetcher.submit`, receipt handling, tax-year tables and calculation, all in one scope. Counts of `useState`: `app.onboarding.tsx` 21, `UserProfilePanel.tsx` 20, `MortgageContainer.tsx` 15. These are shallow modules in the `codebase-design` sense: the exported interface (no props) is trivial but the implementation carries every decision, so nothing inside can be tested or reused alone. `UserProfilePanel.tsx` also exports `calculateNetTakeHome` (`:184`), a calculation living in a component file (B-07).
- Impact: review and change cost is high, every edit risks unrelated tabs, tests cover only the whole screen (`TaxContainer.test.tsx`), and AGENTS.md Law 1 cannot be met because there is nothing small to colocate.
- Recommendation: deep-module split, one exported hook per concern, thin presentational pieces:
  - `useTaxLedger()` (records, filters, CRUD via fetcher), `useTaxYearSummary()` (calls engine, pure), `TaxRecordForm` (form state in a reducer), `TaxYearTabs`, `TaxLedgerTable` (inside `CollapsibleDrawer`).
  - Same pattern for onboarding (a `useOnboardingWizard` reducer with one step component per step) and `UserProfilePanel`.
    Start with `TaxContainer` as the pilot because it is the biggest and the engine already exposes the maths.
- Effort: L

### [B-14] `InteractiveFinancialTeaser` is duplicated across web and marketing

- Severity: P2
- Location: `apps/web/app/components/home/InteractiveFinancialTeaser.tsx` (593 lines); `apps/marketing/src/components/InteractiveFinancialTeaser.tsx` (620 lines)
- Evidence: two copies of the same component. A whitespace-insensitive diff still shows about 300 changed lines, so they have already drifted. Both call `calculateUkTax({ grossSalary })` with no tax year (B-10). `packages/ui` already has a `calculators` entry point that web and marketing both import (`@repo/ui/calculators`, 8 imports).
- Impact: copy drift (already visible), double maintenance, and divergent tax outputs on the marketing page versus the app.
- Recommendation: move the teaser into `packages/ui/src/calculators/InteractiveFinancialTeaser/` as a colocated component that takes the engine functions and a link target as props; both apps import it.
- Effort: M

### [B-15] Package boundaries are conventions only; nothing enforces them and `packages/common` is an orphan

- Severity: P2
- Location: `packages/ui/package.json:9-21` (`"./*": "./src/*.tsx"` wildcard and raw-source main); `packages/common/` (contains only a committed `coverage/` directory, no `package.json`); `biome.json`; `.github/workflows/ci-pipeline.yml`
- Evidence: no `noRestrictedImports`, dependency-cruiser, knip or `exports`-only check in lint or CI. The `./*` wildcard export in `@repo/ui` exposes every source file in the package as public API, which makes the "no deep imports" result above a matter of discipline, not structure. `@flump/finance-engine` has a conditional export `default: ./src/index.ts` that bypasses `dist`, and `@repo/ui` exports TypeScript source. `packages/common` is matched by the `packages/*` workspace glob but holds nothing but generated output (Phase 0 listed it as "no tests").
- Impact: the clean graph found in this audit will erode silently. The orphan directory is noise and the committed coverage output is already a Track N item.
- Recommendation: remove `packages/common` (or give it a purpose); replace the `./*` wildcard with named subpaths; add Biome `noRestrictedImports` for `@flump/*/src`, `@repo/ui/src` and cross-app imports; consider the structure proposal below.
- Effort: S

### [B-16] `@flump/mcp` data access is clean, but `McpService` is a wide adapter and the surface is largely untested

- Severity: P2
- Location: `apps/backend/src/mcp.service.ts:25-264`; `apps/backend/src/mcp.controller.ts:32-41` (`req: any, res: any`); `packages/mcp/src/auth/token-verifier.ts:81` (Phase 1); `packages/mcp/package.json:35-39` (`zod ^3`); coverage 26% (Phase 0)
- Evidence: the package defines `McpUserDataProvider` and `McpTokenStoreAdapter`; `McpService` implements both and also creates tokens, lists tokens, builds context packs and constructs the HTTP handler in its constructor. It receives 7 repositories and two services. This split is the right shape (the package is DB-free and reusable over stdio), the issue is that the one adapter does too much. The REST token endpoints and the protocol endpoint share a controller. There is no versioning of tool schemas beyond a hard-coded `version: "1.0.0"` (`server.ts:28`).
- Impact: moderate. Adding a tool that needs a new data source means editing `McpService` and its 7 injected repositories; auth, scopes and anonymisation rules live in the package and the backend.
- Recommendation: split `McpService` into `McpTokenService` (store port), `McpDataService` (data port, reads through the Accounts, Tax and Budget module services after B-09) and keep the controller to routing. Add a contract test that every registered tool's zod schema is snapshotted, and bump `version` from `package.json`.
- Effort: M

### [B-17] `main.ts` carries a port-forwarding hack and development CORS origins as production defaults

- Severity: P3
- Location: `apps/backend/src/main.ts:12-50`
- Evidence: when the port is 4000 the process also opens a raw TCP proxy on 3000 "to support existing frontend sessions", and CORS defaults to ten localhost origins if `CORS_ALLOWED_ORIGINS` is unset, with `credentials: true`. Config values are read ad hoc with `configService.get`, with no env schema (Phase 1 section 3).
- Impact: an extra open port in the container, and a misconfigured production deploy falls back to dev CORS silently.
- Recommendation: remove the proxy, require `CORS_ALLOWED_ORIGINS` when `NODE_ENV=production`, and validate env through `ConfigModule.forRoot({ validate })` with the same zod schema used elsewhere (B-06).
- Effort: S

### [B-18] `GLOSSARY.md` has drifted from the code

- Severity: P3
- Location: `GLOSSARY.md` (41 lines)
- Evidence, checked against usage:
  - `BankSyncOrchestrator` is described as handling "account identity resolution ... and transaction deduplication"; neither exists in `orchestrator.ts`.
  - `BankingProviderAdapter` is said to include "Monzo, Starling" adapters; those implement the backend `IBankProvider`, not this interface (B-08).
  - `BrowserCookieSeedAdapter` is listed as the browser implementation of `ProfilePersistenceAdapter`, but it does not touch browser storage for the baseline (B-11); the real one is `CookieSeedAdapter` in web.
  - `ProfileLifecycle` and `AccountIntake` do match code (`user-profile.service.ts:13`, `account-intake.service.ts`).
  - Missing terms that the code uses constantly: `Account` and `AccountDetail` (monthly balance history), `TaxRecord`, `Tax year`, `McpToken` / personal access token, `effectiveBaseline` (scenario overlay), the sign convention ("Flump Sign Convention Law", used in `sign-enforcement.ts`), `Seed` (onboarding), `hasResetFinancialData`.
- Impact: new contributors and agents are told the architecture is deeper than it is.
- Recommendation: correct the three inaccurate entries now; add the missing terms; update again after B-08 settles the banking seam.
- Effort: S

## Deep-module consolidation proposals

Applying the "interface is much smaller than implementation" test (`improve-codebase-architecture`):

| Candidate            | Today (shallow)                                     | Proposed deep module                                      | Interface                                                     | Hides                                                    |
| -------------------- | --------------------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------- | -------------------------------------------------------- |
| Take-home and tax    | 4 tax functions, 2 constant tables, 4 forks in apps | `finance-engine/tax`: `calculateTakeHome(input)`          | one input object, one result with breakdown and trap analysis | tax-year rules, NI, student loan, regions, taper         |
| Mortgage             | formula copied 4 times                              | `finance-engine/mortgage`                                 | `payment()`, `amortise()`, `compareOverpayment()`             | repayment type, rounding, edge cases                     |
| Auth                 | per-layer dev shortcuts                             | `AuthModule` (backend) and `session.server.ts` (web)      | `requireUser(request)`                                        | token verification, dev identity gating                  |
| Backend client (web) | 21 raw fetches                                      | `backendClient` + `config.server.ts`                      | typed endpoint methods, throws `BackendError`                 | base URL, headers, retries, error mapping                |
| Banking providers    | two seams and static orchestrator                   | `packages/banking` with injectable `BankProviderRegistry` | `IBankProvider`, `registry.get(id)`                           | OAuth URLs, token crypto and refresh, sign normalisation |
| Money columns        | 20 columns, ad hoc coercion                         | `numericTransformer` or `Money`                           | one transformer                                               | pg string handling                                       |
| Tax ledger (web)     | 2,146-line component                                | `useTaxLedger` + `useTaxYearSummary`                      | two hooks                                                     | records CRUD, filters, engine calls                      |
| Demo data            | seeding in 3 controllers                            | `DemoSeedService`                                         | `seed(userId)` behind an opt-in flag                          | fixtures                                                 |

### Proposal for `setup-ts-deep-modules` (propose only, nothing applied)

- Give `@flump/finance-engine` subpath exports (`./tax`, `./mortgage`, `./debt`, `./portfolio`, `./browser`) and stop re-exporting everything from the root. Each folder gets an `index.ts` that is the only importable file; internals marked by a `_internal` folder or by not being listed in `exports`.
- Add Biome `noRestrictedImports` (or dependency-cruiser) rules: no `@flump/*/src/*` or `@repo/ui/src/*` imports from apps, no `apps/*` importing other apps, `finance-engine` may not import `window`, `document` or Node modules outside `./browser`.
- Replace `@repo/ui`'s `./*` wildcard with named subpaths.
- Use TypeScript project references (the repo already builds each package with `tsc`) so a type error in an internal file surfaces at the package boundary.
- Backend: one folder per Nest module with an `index.ts` that exports only the module and the service interfaces other modules may inject.

## Decisions that need an ADR

`docs/adr/` does not exist yet. Draft titles with context, decision and consequence:

1. **ADR-001 Authentication boundary and development identity.** Context: auth shortcuts exist in web (`utils.ts:99`), the backend guard and MCP verifier, with no environment gating (B-01). Decision: verify WorkOS-signed JWTs in one backend `AuthModule`, make web `getAuthSession` fail closed, and allow a development identity only when `NODE_ENV=development` and an explicit flag is set. Consequence: local development needs the flag or WorkOS dev keys, and every `mock-session-token` use must be removed or confined to tests.
2. **ADR-002 Database schema management: migrations over `synchronize`.** Context: both TypeORM configs use `synchronize: true`, with no migrations, indexes or FKs (B-04). Decision: `synchronize` is off by default, migrations are generated and reviewed in PRs, and CI runs them against an ephemeral Postgres. Consequence: slower schema iteration and a one-off baseline migration, in exchange for safe deploys and rollback.
3. **ADR-003 Money representation.** Context: `decimal` columns come back as strings and are coerced case by case (B-05). Decision: either a shared numeric transformer with JS `number` (cheap, with documented rounding rules) or integer pence with a `Money` type through the engine. Consequence: the transformer path is a day of work and removes string defences; pence is cleaner but changes every API contract and the engine types.
4. **ADR-004 Single banking provider seam.** Context: `BankingProviderAdapter` (package) and `IBankProvider` (backend) overlap and the former is unused in production (B-08). Decision: adopt the live backend shape as the one interface, move it and the providers into `packages/banking`, inject the registry, and delete or isolate the unused adapters. Consequence: a migration of Monzo, Starling, Trading 212 and open-banking providers, and clearer ownership of OAuth URLs and sign normalisation.
5. **ADR-005 Backend module structure.** Context: one `AppModule`, flat `src/`, controllers owning repositories (B-09). Decision: feature modules (Accounts, Banking, Tax, Budget, Profile, Mcp, Auth, Database) that own their entities and expose service interfaces; cross-module access goes through services, never repositories. Consequence: a mechanical but wide file move, plus an import-boundary lint rule.
6. **ADR-006 Financial logic lives only in `@flump/finance-engine`.** Context: mobile and web copy tax and mortgage formulas (B-07, B-10). Decision: apps may not implement tax, mortgage, debt or forecast maths; they call the engine, which has year-keyed rules, no browser code and injectable clocks. Consequence: the engine's coverage (76% lines) becomes release-critical and needs to be raised, and mobile must depend on the engine properly.
7. **ADR-007 Web data flow and state ownership.** Context: loaders, hand-rolled fetches, a client mutation hook, Jotai, context and localStorage all hold overlapping state (B-06, B-12). Decision: server state through loaders and actions via one `backendClient`; Jotai for ephemeral UI and scenario state; context only for static environment; configuration through one validated module. Consequence: `useUserProfile` is rewritten as a route action plus a small atom sync.
8. **ADR-008 Component structure and size limits (ratify or relax Law 1 for web).** Context: 111 web components are not colocated and 12 files exceed 1,000 lines (Phase 1; B-13). Decision: either migrate web to `Name/Name.tsx` incrementally starting with the files above a 500-line limit, or relax Law 1 for `apps/web` and keep it for `packages/ui`. Consequence: whichever is chosen must be enforced by a lint script, otherwise it will drift again.
9. **ADR-009 Styling stack: Panda only.** Context: Emotion remains for SSR style extraction beside Panda (Phase 0 section 5). Decision: remove Emotion and `createEmotionCache` once no component depends on it. Consequence: simpler SSR entry files; check for any `@emotion` use in third-party components first.
10. **ADR-010 Demo and seed data policy.** Context: seeding occurs in three backend controllers, in every environment, from GET handlers (B-03). Decision: demo data is opt-in, created by one service, never from a read, and confined to fixtures. Consequence: new users see empty states, so onboarding and empty-state design (Track I) have to carry the first-run experience.

## Limits

- Code reading only: no runtime pass, no running the backend, no database inspection. The exploitability of B-01 and B-02 is for Track D.
- I did not re-read `auth.guard.ts` or `token-verifier.ts`; the references to them come from the Phase 1 sweep.
- The effect of the string-typed `decimal` values (B-05) was inferred from the pg driver's behaviour and the defensive code, not observed in a response.
- Duplicate-code estimates (B-07, B-14) are from a whitespace-insensitive diff and grep, not a clone-detection tool; `knip`/`jscpd` are not installed.
- Web `components/` to `packages/ui` adoption (Phase 1 section 5) is left to Track H. Mobile app architecture was sampled (calculation duplication, mock client), not reviewed in full.
- `finance-engine` internal correctness of the tax maths is Track C's.

## Quick wins

1. Delete the `|| "mock-session-token"` fallbacks and make `getAuthSession` rethrow (B-01), about an hour.
2. Add one `numericTransformer` and apply it to the 20 decimal columns (B-05).
3. Create `apps/web/app/config.server.ts` and replace the 21 `localhost:4000` literals with it (B-06).
4. Make `backend-client.server.ts` throw on non-OK responses instead of returning empty fallbacks.
5. Change `calculateUkTax` and `getTaxYearRemainingDays` defaults to `getCurrentUKTaxYear()` (B-10).
6. Replace the mortgage formula copies in `RemortgageShockSim` and `MortgageTracker` with `calculateMonthlyMortgagePayment` (B-07).
7. Gate demo seeding behind an opt-in flag and stop it running on GET (B-03).
8. Set `synchronize` from an env flag defaulting to false, and `autoLoadEntities` to remove the triple entity list (B-04).
9. Remove the port 3000 proxy and require `CORS_ALLOWED_ORIGINS` in production (B-17).
10. Delete `packages/common` and add Biome `noRestrictedImports` rules for package internals (B-15).
11. Fix the three inaccurate `GLOSSARY.md` entries (B-18).
