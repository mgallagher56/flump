# E5 draft plan (planning workflow output)

Status: **draft, not reviewed, nothing implemented.** Produced by a read-only planner and fact-checked by a second agent; both can be wrong. Facts cite file:line in the code at the time of the run.

**Epic:** E5 - Honest failure states and one API client (C-20, B-06, I-04, I-06)

**Goal:** When the backend is down, slow, or rejects the token, the user sees an honest error state with a way to recover. They never see an empty account, a £0 net worth, DEFAULT_PROFILE values or the onboarding flow again. One validated API base URL and one server-side backend client replace the 21 repeated fallbacks. Every destructive action goes through one shared ConfirmDialog that names the thing and states the consequence.

**Classification:** architectural

## Design

1. One config value. New apps/web/app/config.server.ts with `loadApiConfig(env): { apiBaseUrl: string }`, which is pure and testable, plus a module-level `export const apiConfig = loadApiConfig(process.env)` so a bad config fails at server start (same pattern as auth.server.ts:13-22).
   - Rules: trim VITE_API_URL. If it is set, it must parse with `new URL` as http or https, and the trailing slash is stripped.
   - If it is unset and NODE_ENV=production, throw 'VITE_API_URL must be set in production'. Otherwise default to http://localhost:4000, which matches main.ts:32.
   - No zod. That avoids a new dependency and bun.lock churn under --frozen-lockfile; the logic is about 15 lines.
   - Keep the env name VITE_API_URL so no deploy variable changes. The browser gets the value only through the root loader's ENV (window.ENV). Client code stops reading import.meta.env.

2. One server-side client. backend-client.server.ts becomes the only server code that calls fetch against the backend.
   - New shared, isomorphic file apps/web/app/services/backend-error.ts: `type BackendErrorKind = 'unauthorised'|'forbidden'|'not-found'|'client'|'server'|'unavailable'|'bad-response'`, `class BackendError extends Error { kind; status?: number; endpoint: string }`, and `interface RouteErrorPayload { kind: BackendErrorKind; endpoint?: string }`.
   - `backendFetch<T>(endpoint, opts: { accessToken: string; method?: 'GET'|'POST'|'PATCH'|'PUT'|'DELETE'; body?: unknown; signal?: AbortSignal; timeoutMs?: number /*8000*/; retries?: number /*GET 1, others 0*/ }): Promise<T>` adds Authorization and Content-Type and combines `AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)])`.
   - Status mapping: 401 unauthorised, 403 forbidden, 404 not-found, other 4xx client, 5xx server, network error or timeout unavailable, JSON parse failure bad-response. A 204 or empty body returns undefined.
   - Retries happen only for GET, once, after 250ms, on unavailable/502/503/504. Mutations are never retried.
   - Loaders pass args.request.signal so navigating away cancels the request.
   - `throwRouteError(err): never` turns a BackendError into `throw data<RouteErrorPayload>({ kind, endpoint }, { status })` with 401→401, 403→403, 404→404, server and bad-response→502, unavailable→503, client→400. Anything else is rethrown unchanged.
   - We throw data(), not Error instances, because RR7 sanitises Error messages in production and the boundary needs a reliable `kind`.
   - loadWorkspaceSnapshot is rebuilt on backendFetch. Its failure policy is decision D2.

3. Error boundaries.
   - New feature directory apps/web/app/features/feedback/components/ holding RouteErrorState (presentational), RouteErrorBoundary (uses useRouteError, isRouteErrorResponse, useRevalidator) and ConfirmDialog. Each follows the colocated 5-file law and is registered in architecture.laws.test.ts.
   - Each data route re-exports `export { RouteErrorBoundary as ErrorBoundary } from '~/features/feedback/components/RouteErrorBoundary'`. Because the route boundary renders inside root's Outlet, the header and bottom bar stay visible. There is no app.tsx layout, and adding one would re-parent every app.* route and still miss '/' (_index.tsx), so we use one-line exports instead.
   - The root ErrorBoundary is restyled to use RouteErrorState with tokens and no inline styles, as the last-resort fallback.
   - The root loader keeps degrading (userProfile null) on any profile error, but uses backendFetch. Throwing there would remove the whole shell, and every child data loader reports the failure honestly anyway.

4. What each error class shows. Draft copy, en-GB, sentence case, no exclamation marks or ellipses; needs product-owner sign-off.
   - unavailable/server/bad-response: title "We couldn't load your data", body "Flump can't reach its servers right now. Nothing on this page has been changed. Try again in a moment.", buttons "Try again" (revalidator.revalidate) and "Go to dashboard".
   - not-found: title "We couldn't find that", body "It may have been deleted.", button "Back to accounts" (on $account).
   - forbidden: the same as not-found, so we don't reveal whether the item exists.
   - unauthorised: behaviour depends on D1. Default proposal: title "Your session has ended", body "Sign in again to see your accounts.", button "Sign in again" posting to /logout so the WorkOS session is cleared and no /login loop can happen.
   - unknown: "Something went wrong" with a "Try again" button.
   - While a retry is running, the button reads "Trying again..." (the copy guide allows a trailing ellipsis for pending actions) and is disabled.

5. Hand-rolled loaders switch to backendFetch and throwRouteError: app.profile, app.onboarding (no more DEFAULT_PROFILE), app._index (throw instead of redirecting to '/' on failure; only a successful profile response decides between onboarding and '/') and app.accounts.$account (404 shows not-found). The _index.tsx catch at :248-270 only wraps pure computation, so it is removed; a computation bug then reaches the boundary instead of showing zeros.

6. Actions move to backendFetch but keep their current return shape `data({ success:false, error }, { status })`, so components don't change. The onboarding action stops swallowing a failed PATCH (it returns an error and no redirect). Client-side calls are decision D3.

7. ConfirmDialog. It lives at apps/web/app/features/feedback/components/ConfirmDialog on the Radix Dialog that apps/web already depends on; putting it in packages/ui would add a dependency and lockfile churn, and the only consumer is web (mobile is React Native).
   - API: `{ open; onOpenChange(open); title: string; description: ReactNode; confirmLabel: string; cancelLabel?: string /*'Cancel'*/; tone?: 'danger'|'default'; onConfirm(): void|Promise<void>; pending?: boolean; requireText?: string }`. Content has role="alertdialog" and initial focus goes to Cancel.
   - With requireText, the confirm button stays disabled until the input matches, case-insensitive.
   - Copy pattern: title "Delete <thing name>?", description says what is lost, confirm button "Delete <thing>". Example: "Delete 2024?" / "This removes all 12 monthly balances for 2024 from Current account. This can't be undone." / "Delete year".
   - Adopt it at every site in facts I-06 except the debt simulator (local state only) and 'Delete category' (only shown when empty).
   - Undo is decision D4.

8. A test-only guard fails if 'localhost:4000' appears in apps/web/app outside config.server.ts, or if any file other than backend-client.server.ts and the client api module calls fetch on the API base URL.

AGENTS.md laws touched: colocated component law and token law (RouteErrorState, RouteErrorBoundary, ConfirmDialog, and the root ErrorBoundary restyle removing inline styles); copy guide (all new strings); Definition of Done (stories in light and dark with no a11y violations, play() tests); CI pre-flight (the four bun run checks at the end of each task). No KpiStrip, SimulatorSplitLayout or SliderField changes. No tabular-nums impact unless error copy shows numbers; confirm descriptions that show counts or years must use tabular-nums and Intl en-GB.

## Decisions needed from the product owner

1. **D1. What happens when the backend returns 401 while the user still has a WorkOS session (token expired or revoked, or issuer misconfiguration from the open E1 question)?**
   - A. Redirect to /login straight away. Simplest, but if AuthKit signs the user straight back in with a token the backend still rejects, it loops.
   - B. Show the route error state 'Your session has ended' with a 'Sign in again' button that posts to /logout (clears the WorkOS session). No loop is possible; costs one click. Note /logout currently returns to the marketing site (logout._index.tsx:6-12), so the user lands there, not on /login.
   - C. Redirect to /logout?returnTo=/login automatically (needs a small change to logout to allow a safe returnTo). No click, no loop, but the user is silently signed out.
   - Recommendation: B now. It is honest and cannot loop, and it is the only option needing no change to the auth routes. Revisit C once the WorkOS issuer is confirmed against a live token.
   - Blocks: T7

2. **D2. When only some workspace endpoints fail (for example /tax-records is down but /accounts works), does the page show an error, or partial data with a banner?**
   - A. Any requested endpoint failing throws to the route error state (one 'Try again' screen). Simplest and fully honest, but one flaky optional endpoint blocks the whole page.
   - B. Core endpoints (/accounts, /account-details, /user-profile) throw. Optional ones (budget, tax, connections, portfolio-snapshot) return { failed: string[] } and the page shows a 'We couldn't load <section>. Try again' banner. Every consumer must also stop showing empty-state copy for failed sections: a much bigger change across HomeDashboard and the containers.
   - C. Like B, but with no section-level suppression (banner only). Cheap, but the page still shows misleading empty states under the banner.
   - Recommendation: A for E5. It meets 'an outage never looks like an empty account' with the least surface. B can follow as an enhancement once there is a banner component and per-section empty-state handling. Note that I-04's text suggests B and B-06's suggests A; the product owner should confirm.
   - Blocks: T4

3. **D3. How should browser-side backend calls (useUserProfile x6, BudgetContainer CRUD and seed-defaults, onboarding seeding) be unified?**
   - A. One client module apps/web/app/services/api-client.ts (apiFetch) that reads window.ENV and throws BackendError. Small, and keeps sending accessToken to the browser (root.tsx:52).
   - B. Move every client mutation into route actions (useFetcher) as B-06's acceptance says, then stop returning accessToken from the root and onboarding loaders. Better security (no bearer token in the browser) and one code path, but touches budget, profile and onboarding flows heavily; roughly 3-5 extra days.
   - C. A now, B as a separate follow-up epic.
   - Recommendation: C. Do A inside E5 so the URL and error handling are unified. Open a follow-up ticket for B, because removing the token from the browser is a security change that deserves its own review.
   - Blocks: T11

4. **D4. Should single-row deletes offer undo (soft delete plus an undo toast), as I-06 recommends?**
   - A. Confirmation only in E5; no undo.
   - B. Undo for single-row deletes. Needs backend soft-delete columns, a purge policy, a restore endpoint and a toast system (none exists today). It is a separate epic-sized piece and sets data-retention policy.
   - C. Undo only for client-local deletes (none persist today), which in practice is the same as A.
   - Recommendation: A. Undo implies a retention policy (how long deleted financial data is kept) that only the product owner can set; plan it separately if wanted.

## Tasks

### 1. T1. config.server.ts: one validated API base URL, and the docs fixed to port 4000 (effort S)

- Files: `apps/web/app/config.server.ts (new)`, `apps/web/app/config.server.test.ts (new)`, `apps/web/app/config.server.boot.test.ts (new)`, `apps/web/.env.example`, `README.md`
- Interfaces: export function loadApiConfig(env: Record<string, string | undefined>): { apiBaseUrl: string }; export const apiConfig: { apiBaseUrl: string } (computed at import)
- Tests:
  - loadApiConfig returns 'http://localhost:4000' when VITE_API_URL is unset and NODE_ENV=development
  - loadApiConfig strips a trailing slash: 'https://api.example.test/' -> 'https://api.example.test'
  - loadApiConfig throws /VITE_API_URL must be set in production/ when unset and NODE_ENV=production
  - loadApiConfig throws /VITE_API_URL/ for 'not a url' and for 'ftp://x'
  - boot: import('./config.server') rejects with NODE_ENV=production and no VITE_API_URL (pattern from auth.server.boot.test.ts:16-20)
  - boot: import resolves with a clean dev env

### 2. T2. BackendError and backendFetch with a timeout and GET-only retry (effort M)

- Files: `apps/web/app/services/backend-error.ts (new)`, `apps/web/app/services/backend-error.test.ts (new)`, `apps/web/app/services/backend-client.server.ts`, `apps/web/app/services/backend-client.server.test.ts`
- Interfaces: export class BackendError extends Error { kind: BackendErrorKind; status?: number; endpoint: string }; export async function backendFetch<T>(endpoint: string, opts: { accessToken: string; method?: HttpMethod; body?: unknown; signal?: AbortSignal; timeoutMs?: number; retries?: number }): Promise<T>
- Tests:
  - sends Authorization 'Bearer <token>' to `${apiConfig.apiBaseUrl}${endpoint}`
  - 401 -> rejects BackendError kind 'unauthorised' status 401; 403 'forbidden'; 404 'not-found'; 422 'client'; 500 'server'
  - fetch rejecting TypeError -> kind 'unavailable' (no status)
  - timeout: a fetch that never resolves with timeoutMs 20 -> kind 'unavailable' (fake timers)
  - GET retries once on 503 then succeeds: fetch called twice, resolves the body
  - GET does not retry on 401 or 404 (fetch called once)
  - POST/PATCH/DELETE never retry on 503 (fetch called once)
  - invalid JSON on 200 -> kind 'bad-response'; 204 -> resolves undefined
  - caller signal abort propagates (rejects, fetch received an aborted signal)

### 3. T3. throwRouteError: turn a BackendError into a thrown route response (effort S)

- Files: `apps/web/app/services/backend-client.server.ts`, `apps/web/app/services/route-error.server.test.ts (new)`
- Interfaces: export function throwRouteError(err: unknown): never  // throws data<RouteErrorPayload>({ kind, endpoint }, { status })
- Tests:
  - unavailable -> thrown value has init.status 503 and data.kind 'unavailable'
  - server and bad-response -> 502; not-found -> 404; forbidden -> 403; client -> 400; unauthorised -> 401 (the D1 branch is finalised in T7)
  - a non-BackendError (for example a Response redirect from authkit) is rethrown by identity
  - data.endpoint does not include the base URL or the token

### 4. T4. loadWorkspaceSnapshot reports failures instead of returning empty data (effort M, needs decision)

- Files: `apps/web/app/services/backend-client.server.ts:42-119`, `apps/web/app/services/backend-client.server.test.ts:93-106 (replace)`
- Interfaces: loadWorkspaceSnapshot(args, options): Promise<WorkspaceSnapshot>. Same shape, but failures throw via throwRouteError (D2 option A). Passes args.request.signal.
- Tests:
  - REPLACES 'falls back gracefully': fetch rejects -> loadWorkspaceSnapshot rejects with init.status 503
  - /accounts 401 -> rejects with status 401
  - includeTax with /tax-records 500 -> rejects 502 (D2 option A); with D2 option B, resolves with failed: ['/tax-records'] instead
  - the existing happy-path tests still pass (lines 65-91)
  - not-signed-in path unchanged: user null returns the empty snapshot without fetching (fetch not called)

### 5. T5. RouteErrorState presentational component (effort S)

- Files: `apps/web/app/features/feedback/components/RouteErrorState/RouteErrorState.tsx`, `apps/web/app/features/feedback/components/RouteErrorState/RouteErrorState.styles.ts`, `apps/web/app/features/feedback/components/RouteErrorState/RouteErrorState.stories.tsx`, `apps/web/app/features/feedback/components/RouteErrorState/RouteErrorState.test.tsx`, `apps/web/app/features/feedback/components/RouteErrorState/index.ts`, `packages/ui/src/tokens/architecture.laws.test.ts:12-20 (register features/feedback/components)`
- Interfaces: export interface RouteErrorStateProps { kind: BackendErrorKind | 'unknown'; onRetry?: () => void; retrying?: boolean; primaryHref?: string; primaryLabel?: string; signInAction?: string /* '/logout' */ }
- Tests:
  - kind 'unavailable' renders the heading "We couldn't load your data" and a 'Try again' button that calls onRetry
  - retrying=true renders 'Trying again...' with the button disabled
  - kind 'not-found' renders "We couldn't find that" and a link to primaryHref
  - kind 'unauthorised' renders 'Your session has ended' and a form with method post action '/logout'
  - no rendered text contains '!' (copy rule)
  - stories: Unavailable, NotFound, Unauthorised, Unknown in light and dark; play() clicks 'Try again' and asserts fn() was called; a11y addon reports no violations
  - styles use only status.danger.*, surface.*, text.*, border.* tokens (laws test passes)

### 6. T6. RouteErrorBoundary, wired into every data route, and a restyled root boundary (effort M)

- Files: `apps/web/app/features/feedback/components/RouteErrorBoundary/ (5 colocated files)`, `apps/web/app/routes/_index.tsx`, `apps/web/app/routes/app.accounts._index.tsx`, `apps/web/app/routes/app.accounts.$account.tsx`, `apps/web/app/routes/app.budget.tsx`, `apps/web/app/routes/app.debt.tsx`, `apps/web/app/routes/app.forecast.tsx`, `apps/web/app/routes/app.mortgage.tsx`, `apps/web/app/routes/app.pension.tsx`, `apps/web/app/routes/app.profile.tsx`, `apps/web/app/routes/app.savings.tsx`, `apps/web/app/routes/app.tax.tsx`, `apps/web/app/routes/app.onboarding.tsx`, `apps/web/app/root.tsx:139-163`
- Interfaces: export function RouteErrorBoundary(): ReactElement  // reads useRouteError(); isRouteErrorResponse -> data.kind; otherwise 'unknown'; onRetry = useRevalidator().revalidate
- Tests:
  - createRoutesStub: a route whose loader throws data({kind:'unavailable'},{status:503}) renders "We couldn't load your data"
  - clicking 'Try again' re-runs the loader; when the second call succeeds the route component renders
  - a thrown plain Error renders the 'unknown' state and does not show error.message
  - a 404 payload on /app/accounts/:id renders 'Back to accounts' linking to /app/accounts
  - route-module test: each of the 12 data routes exports ErrorBoundary (import each module and expect typeof ErrorBoundary === 'function')
  - root ErrorBoundary renders RouteErrorState and contains no 'Uh oh' and no inline style attribute

### 7. T7. Backend 401 handling (per D1) (effort S, needs decision)

- Files: `apps/web/app/services/backend-client.server.ts (throwRouteError unauthorised branch)`, `apps/web/app/features/feedback/components/RouteErrorState/RouteErrorState.tsx (unauthorised variant)`, `apps/web/app/routes/logout._index.tsx (only if D1 option C)`
- Interfaces: D1 option B: unauthorised -> data({kind:'unauthorised'},{status:401}), rendered with the 'Sign in again' form posting to /logout. Option A: throw redirect('/login'). Option C: throw redirect('/logout?returnTo=/login') plus a returnTo allow-list in logout.
- Tests:
  - loader whose backend returns 401 -> (B) boundary shows 'Your session has ended' and no redirect is issued
  - (A/C) thrown value is a 302 Response whose Location is the expected path
  - (C) logout ignores a returnTo that is not same-origin
  - never redirects to /login from the /login or /callback routes (loop guard)

### 8. T8. Hand-rolled loaders throw instead of using DEFAULT_PROFILE: profile, onboarding, /app (effort M)

- Files: `apps/web/app/routes/app.profile.tsx:10-25`, `apps/web/app/routes/app.onboarding.tsx:38-53`, `apps/web/app/routes/app._index.tsx:6-27`, `apps/web/app/routes/app.profile.test.tsx (new)`, `apps/web/app/routes/app.onboarding.test.tsx`, `apps/web/app/routes/app._index.test.tsx (new)`
- Interfaces: Each loader calls backendFetch<UserProfile>('/user-profile', { accessToken, signal: args.request.signal }) inside try/catch(throwRouteError). DEFAULT_PROFILE is no longer used by loaders.
- Tests:
  - app.profile loader: backend 500 -> rejects with status 502; the result never contains DEFAULT_PROFILE
  - app.onboarding loader: fetch rejects -> rejects 503 (previously returned DEFAULT_PROFILE and accessToken null)
  - app._index loader: profile 500 -> rejects 502, not redirect('/')
  - app._index loader: onboardingCompleted false -> redirect '/app/onboarding'; true -> redirect '/'
  - app._index: authHeader/requireAccessToken is evaluated after the !user check (no user -> redirect '/login')

### 9. T9. Account detail 404 and root loader on the shared client; remove the home loader swallow (effort M)

- Files: `apps/web/app/routes/app.accounts.$account.tsx:55-87`, `apps/web/app/root.tsx:26-57`, `apps/web/app/routes/_index.tsx:65-270`, `apps/web/app/routes/_index.test.tsx`, `apps/web/app/routes/app.accounts.$account.test.tsx (new)`, `apps/web/app/root.test.tsx (new or existing)`
- Interfaces: The root loader uses backendFetch and keeps userProfile null on a BackendError (logged with kind and endpoint only). ENV.VITE_API_URL = apiConfig.apiBaseUrl.
- Tests:
  - $account loader: 404 -> rejects with status 404 and kind 'not-found'
  - $account loader: 500 -> rejects 502 (previously account null)
  - root loader: profile 503 -> resolves with userProfile null and ENV.VITE_API_URL equal to apiConfig.apiBaseUrl
  - root loader: does not throw for backend errors (the shell stays up)
  - _index loader: when loadWorkspaceSnapshot rejects, the loader rejects (the zeroed-data catch is gone)

### 10. T10. Route actions on backendFetch; onboarding action stops swallowing errors (effort M)

- Files: `apps/web/app/routes/app.accounts._index.tsx:13-136`, `apps/web/app/routes/app.accounts.$account.tsx:7-53`, `apps/web/app/routes/app.pension.tsx:14-193`, `apps/web/app/routes/app.savings.tsx:14-114`, `apps/web/app/routes/app.tax.tsx:8-145`, `apps/web/app/routes/app.onboarding.tsx:55-87`, `apps/web/app/routes/actions.test.ts (new, table-driven)`
- Interfaces: Actions keep returning data({ success:false, error }, { status }), now with status taken from BackendError. The onboarding action returns data({ success:false, error }, { status }) on failure instead of redirect('/'). It may be split into two PRs: accounts plus onboarding, then pension, savings and tax.
- Tests:
  - each intent: a backend 503 returns success:false with status 503 (no retry: fetch called once)
  - each intent calls the URL under apiConfig.apiBaseUrl with the expected method
  - onboarding action: PATCH 500 -> no redirect, returns success:false
  - onboarding action: PATCH 200 -> redirect '/'

### 11. T11. Client apiFetch for browser calls (per D3) (effort M, needs decision)

- Files: `apps/web/app/services/api-client.ts (new)`, `apps/web/app/services/api-client.test.ts (new)`, `apps/web/app/hooks/useUserProfile.ts:284-439`, `apps/web/app/containers/budget/BudgetContainer.tsx:146-210`, `apps/web/app/routes/app.onboarding.tsx:284-320`
- Interfaces: export function apiFetch<T>(endpoint: string, opts: { accessToken: string | null | undefined; method?; body? }): Promise<T>  // base URL from window.ENV.VITE_API_URL only; throws BackendError; throws kind 'unauthorised' when no token
- Tests:
  - apiFetch uses window.ENV.VITE_API_URL and ignores import.meta.env
  - apiFetch with a null token rejects 'unauthorised' without calling fetch
  - BudgetContainer deleteEntry: a DELETE 500 keeps the row and surfaces an error (previously removed locally, :178-184)
  - useUserProfile.updateProfile 503 rejects BackendError kind 'unavailable'
  - HttpProfileAdapter.getBaseline non-OK rejects instead of returning null (:422)

### 12. T12. Guard test: one base URL and one fetch path (effort S)

- Files: `apps/web/app/services/single-api-client.guard.test.ts (new)`
- Interfaces: A Vitest test that walks apps/web/app/**/*.{ts,tsx}, skipping tests and stories
- Tests:
  - no file except config.server.ts contains 'localhost:4000'
  - no file except config.server.ts reads process.env.VITE_API_URL
  - no file reads import.meta.env.VITE_API_URL
  - the guard fails on a fixture string (self-test), so it cannot pass vacuously

### 13. T13. ConfirmDialog component (effort S)

- Files: `apps/web/app/features/feedback/components/ConfirmDialog/ConfirmDialog.tsx`, `apps/web/app/features/feedback/components/ConfirmDialog/ConfirmDialog.styles.ts`, `apps/web/app/features/feedback/components/ConfirmDialog/ConfirmDialog.stories.tsx`, `apps/web/app/features/feedback/components/ConfirmDialog/ConfirmDialog.test.tsx`, `apps/web/app/features/feedback/components/ConfirmDialog/index.ts`
- Interfaces: export interface ConfirmDialogProps { open: boolean; onOpenChange: (open: boolean) => void; title: string; description: ReactNode; confirmLabel: string; cancelLabel?: string; tone?: 'danger' | 'default'; onConfirm: () => void | Promise<void>; pending?: boolean; requireText?: string }
- Tests:
  - renders role 'alertdialog' with an accessible name equal to the title
  - initial focus is on the Cancel button
  - Cancel and Escape call onOpenChange(false) and not onConfirm
  - the confirm button calls onConfirm once; pending=true disables both buttons
  - requireText 'RESET': confirm is disabled until the input equals 'reset' (case-insensitive)
  - tone 'danger' applies the status.danger.solid recipe variant
  - stories: Default, Danger, Pending, RequireText in light and dark; play() opens, cancels, then confirms; a11y addon reports no violations
  - mounted through Dialog.Portal (component-guidelines.md:63)

### 14. T14. Adopt ConfirmDialog for accounts and bank connections (effort M)

- Files: `apps/web/app/components/accounts/AccountDetails.tsx:37-48,284-293`, `apps/web/app/components/dialogs/addEditAccountsDialog/AddEditAccountsDialog.tsx:279-291,345-350`, `apps/web/app/components/accounts/BankConnectionsList.tsx:61-69`, `matching existing or new .test.tsx files`
- Interfaces: Copy: 'Delete 2024?' / 'This removes all monthly balances for 2024 from <account>. This can't be undone.' / 'Delete year'; 'Delete <account>?' / 'This deletes the account and its full balance history.' / 'Delete account'; 'Disconnect <bank>?' / 'Synced accounts and transactions from this bank will be removed.' / 'Disconnect'
- Tests:
  - clicking 'Delete 2024' opens the dialog and submits nothing; confirming submits intent 'deleteYear' with year '2024'
  - AddEditAccountsDialog Delete opens the confirm; Cancel leaves the edit modal open and submits nothing
  - BankConnectionsList no longer calls window.confirm (spy not called); confirming submits 'disconnectConnection'

### 15. T15. Adopt ConfirmDialog for savings, pension and budget (effort M)

- Files: `apps/web/app/components/savings/SavingsAccountsList.tsx:184-199,412-419,641-703`, `apps/web/app/components/pension/PensionAccountsList.tsx:185-195,616-637`, `apps/web/app/components/budget/BudgetSetupWizard.tsx:180,258-272`, `apps/web/app/components/budget/BudgetCategoryTable.tsx:208-211`
- Interfaces: Replaces the inline confirm state (savings), the FLPModal confirm (pension) and native confirm (budget table); adds confirmation to the savings card layout and the budget wizard row.
- Tests:
  - savings card-layout trash opens the confirm (previously deleted immediately at :416)
  - savings table layout uses the same dialog (no inline confirmDeleteId UI)
  - pension delete uses ConfirmDialog, title 'Delete <pot name>?'
  - the budget wizard row delete asks for confirmation before onDeleteEntry runs
  - BudgetCategoryTable no longer calls window.confirm

### 16. T16. Adopt ConfirmDialog for tax and the profile reset (effort M)

- Files: `apps/web/app/containers/tax/TaxContainer.tsx:309-341`, `apps/web/app/components/budget/UserProfilePanel.tsx:308-313,409-440 and the reset modal markup (~1179-1345)`
- Interfaces: Tax year: 'Delete all 14 records for 2024/25?' (count with tabular-nums). The empty-year alert() becomes inline text or a disabled button. Reset: ConfirmDialog with requireText 'RESET'.
- Tests:
  - TaxContainer: neither window.confirm nor window.alert is called; confirming submits 'delete-tax-year' with the record ids
  - delete transaction confirm submits 'delete-transaction'
  - UserProfilePanel reset: confirm is disabled until 'RESET' is typed; a resetFinancialData rejection shows resetError in the dialog

### 17. T17. Mobile: confirm and handle errors on 'Disconnect all' (effort S)

- Files: `apps/mobile-companion/src/screens/DashboardScreen.tsx:546-559`, `apps/mobile-companion/src/screens/DashboardScreen.test.tsx (existing or new)`
- Interfaces: Alert.alert('Disconnect all banks?', 'All synced accounts and transactions will be removed.', [Cancel, { text: 'Disconnect all', style: 'destructive' }]); the loop collects failures and shows an Alert listing how many failed
- Tests:
  - pressing the button shows Alert.alert and does not call deleteBankConnection
  - the destructive choice calls deleteBankConnection for each connection, then fetchData
  - one rejection still attempts the rest and shows the failure alert

### 18. T18. Global pending indicator (I-04 recommendation) (effort S)

- Files: `apps/web/app/features/feedback/components/NavigationProgress/ (5 colocated files)`, `apps/web/app/root.tsx (render inside body)`
- Interfaces: export function NavigationProgress(): ReactElement | null  // useNavigation().state !== 'idle' -> role='progressbar' aria-label='Loading'
- Tests:
  - renders nothing when idle
  - renders a progressbar while state is 'loading' (createRoutesStub with a deferred loader)
  - respects prefers-reduced-motion (no animation class)
  - stories in light and dark with no a11y violations

## Can start without any decision

- T1
- T2
- T3
- T5
- T6
- T8
- T9
- T10
- T12
- T13
- T14
- T15
- T16
- T17
- T18

## Review focus

- Redirects and auth responses must pass through every catch. backendFetch's try/catch and the throwRouteError call sites must rethrow Response objects thrown by getAuthSession or authkitLoader and redirect('/login') from requireAccessToken. Swallowing them would break sign-in.
- Thrown data() payloads must never contain the access token, the full backend URL, or backend error bodies. Only kind and the endpoint path.
- The retry button must actually clear the boundary. Check that useRevalidator().revalidate() re-runs the failing loader on the client and replaces the boundary on success; if not, use navigate('.', { replace: true }).
- AbortSignal.any and AbortSignal.timeout must be supported in the web runtime (bun, Dockerfile:2) and in the Vitest environment (happy-dom or jsdom). Add a fallback if not.
- The retry must not double the latency budget: 8s timeout plus 1 retry gives a worst case of about 16s per endpoint, run in parallel with Promise.all. Agree this is acceptable or lower timeoutMs.
- The root loader must stay non-throwing. Check that no BackendError escapes it, or the whole shell including the header disappears.
- An empty array from the backend is a valid empty account; only a failed request is an error. Tests must cover a 200 with [] still rendering the onboarding and empty states.
- After honest loaders, an action failure triggers revalidation, so a failed delete leaves the row in place. But most components ignore fetcher.data, so the user gets no message. Decide whether that is acceptable for E5 or open a follow-up for action error feedback (no toast system exists).
- The onboarding redirect loop: onboarding action failure -> '/' -> _index sees onboardingCompleted false -> back to onboarding. T10 must break this.
- The ConfirmDialog inside AddEditAccountsDialog nests one Radix Dialog in another. Check focus return, that Escape only closes the inner one, and that pointer-events and scroll lock are restored.
- Copy: every new string needs product-owner sign-off and must follow docs/copy-style-guide.md (sentence case, en-GB, no '!', spaced en-dash, ellipsis only for pending states). Avoid unverifiable reassurance such as 'your data is safe'.
- The forbidden and not-found states must look the same so the UI does not reveal whether another user's resource exists.
- Route tests that mock 'react-router' wholesale (_index.test.tsx:6-25) will not exercise data() or ErrorBoundary. Use createRoutesStub for boundary tests and keep mocks for pure component tests.
- Production deploy: VITE_API_URL must be set as a runtime env var on the web service, not only at build time, or the new boot check stops the server (intended, but must be in the rollout checklist).

## Risks

- Turning on the boot check (T1) takes down a production web deploy that currently relies on the localhost fallback. That is intended fail-closed behaviour, but the env var must be set before deploying.
- Honest errors may surface many latent backend failures that were previously hidden (for example the auto-seeding endpoints from E2, or the unconfirmed WorkOS issuer from E1). Users may suddenly see error pages where they saw empty dashboards. Coordinate with the E1 issuer check before rollout.
- With D2 option A, one flaky optional endpoint (tax-records or portfolio-snapshot on the home page) blocks the whole dashboard. Monitor and be ready to move to option B.
- With D1 option A, a backend that consistently rejects valid WorkOS tokens produces an endless sign-in loop.
- Changing action internals in T10 across five long route files risks behaviour regressions in payload construction; the table-driven tests must assert request bodies, not only URLs.
- T11 keeps the bearer token in the browser (root.tsx:52). It is not made worse, but it is still a security debt until the D3 follow-up.
- Replacing FLPModal and the inline confirms changes visual behaviour that existing snapshot tests (apps/web/app/routes/__snapshots__) may pin; update the snapshots deliberately, not blindly.
- The main CI state reported in the E3 ledger (zod 4 breakage in packages/mcp, stale bun.lock) can make the turbo-wide bun run gates fail for reasons unrelated to E5; report honestly and run the web package gates directly where needed.

## Rollout

Order: T1 -> T2 -> T3 -> T5 -> T6, then T4 (after D2), T8, T9 and T10 in parallel. T7 follows D1, T11 follows D3, then T12 (the guard goes last, once all fallbacks are gone). T13 -> T14/T15/T16 can run in parallel with the error work from the start. T17 is independent (mobile, and depends on whether E12 keeps the companion). T18 is independent.

Every task is test-first: write the failing test from the task list, implement, then run bunx biome check on the changed files, the architecture-laws test (packages/ui) for new components, and the four gates bun run lint, check-types, test and build before any PR (AGENTS.md section 5). Use sonnet implementers and reviewers (AGENTS.md section 6).

Deploy: (1) confirm that VITE_API_URL is set as a runtime variable on the production web service and points at the backend (port 4000 or the public URL). (2) Deploy the web app. There is no backend change and no migration. (3) Smoke test: stop the backend in staging and check that /, /app/accounts and /app/profile show \"We couldn't load your data\" with 'Try again', not £0 or the onboarding flow; restart the backend and check that 'Try again' recovers; send a revoked token and check the D1 behaviour; delete a balance year and check that the confirm appears. Rollback is a plain web redeploy. Follow-up tickets: D2 option B (partial banners), D3 option B (client mutations into actions and no token in the browser), action failure feedback (toast), and D4 undo if the product owner wants it.

## Facts (as cited by the planner)

- C-20/B-06/I-04 still hold after E1. fetchJson returns the fallback on !res.ok and when fetch throws, so a backend 401 or 5xx becomes [] or null with no error flag. (`apps/web/app/services/backend-client.server.ts:73-81`)
- The existing unit test asserts the swallowing behaviour ('falls back gracefully when backend fetch fails' expects [] and null) and must be replaced test-first. (`apps/web/app/services/backend-client.server.test.ts:93-106`)
- E1 made the backend return 401 for bad tokens, and the web only redirects when there is no token at all (requireAccessToken). A backend 401 with a present token goes into fetchJson and comes out as an empty workspace. Confirmed: E1 wired no web handling for backend 401, and the E1 ledger lists 'BudgetContainer/onboarding silent degrade (E5)' as a follow-up. (`apps/web/app/utils/auth.server.ts:24-33; /Users/marcgallagher/personal/flump/docs/audit/plans/E1-auth-ledger.md:64,75`)
- The base URL fallback appears on exactly 21 lines in 14 files, as B-06 says (line numbers have moved). root.tsx:36,54; backend-client.server.ts:70; routes app._index.tsx:15, app.profile.tsx:13, app.pension.tsx:20, app.tax.tsx:14, app.savings.tsx:20, app.onboarding.tsx:41,58,288, app.accounts.$account.tsx:15,62, app.accounts._index.tsx:28; hooks/useUserProfile.ts:289,310,331,354,376,412; containers/budget/BudgetContainer.tsx:149. (`apps/web/app (grep 'localhost:4000')`)
- Client code reads the URL from three sources in two different orders. useUserProfile goes window.ENV, then import.meta.env, then the literal. BudgetContainer goes import.meta.env, then window.ENV, then the literal. The root loader puts ENV.VITE_API_URL into window.ENV. (`apps/web/app/hooks/useUserProfile.ts:286-289; apps/web/app/containers/budget/BudgetContainer.tsx:146-149; apps/web/app/root.tsx:53-55,78-82`)
- The documented default port is wrong. .env.example and README say VITE_API_URL=http://localhost:3000, but the code falls back to 4000 and the backend listens on PORT ?? 4000, keeping a 3000 proxy only for 'existing frontend sessions'. (`apps/web/.env.example:3; README.md:189; apps/backend/src/main.ts:32-47`)
- zod is not a dependency of apps/web; only packages/mcp has it. The Docker build runs bun install --frozen-lockfile, and the E3 ledger warns against running bun install because bun.lock is stale on main. (`packages/mcp/package.json:38; apps/web/Dockerfile:17; /Users/marcgallagher/personal/flump/docs/audit/plans/E3-config-db-ledger.md:4`)
- The only error boundary is the root one. It replaces the whole document (no header), uses inline style={{}} with var(--colors-*) (forbidden by the token law), and its copy 'Uh oh... Something went wrong' breaks the ellipsis rule. No route exports an ErrorBoundary and there is no app.tsx layout route. (`apps/web/app/root.tsx:139-163; apps/web/app/routes (no ErrorBoundary exports, no app.tsx); docs/copy-style-guide.md:105-106`)
- Routes use remix-flat-routes through remixRoutesOptionAdapter, SSR is on, and react-router is 7.18.5, so route-level ErrorBoundary exports and createRoutesStub are available. (`apps/web/app/routes.ts:1-14; apps/web/react-router.config.ts; apps/web/package.json:34`)
- 9 routes use loadWorkspaceSnapshot: _index, app.accounts._index, app.budget, app.debt, app.forecast, app.mortgage, app.pension, app.savings, app.tax. (`apps/web/app/routes/_index.tsx:35; app.accounts._index.tsx:139; app.budget.tsx:9; app.debt.tsx:9; app.forecast.tsx:8; app.mortgage.tsx:8; app.pension.tsx:196; app.savings.tsx:118; app.tax.tsx:148`)
- The home loader has a second swallow. Its catch returns the user with all data zeroed. The component then substitutes netWorth 0 and 'Debt Free'. (`apps/web/app/routes/_index.tsx:248-270,296-326`)
- app.profile and app.onboarding fall back to DEFAULT_PROFILE on non-OK and on throw. onboarding also returns accessToken: null in that case, so its client seeding silently does nothing. The backend GET /user-profile auto-creates the profile, so a non-OK response is never a legitimate 'no profile' case. (`apps/web/app/routes/app.profile.tsx:15-24; apps/web/app/routes/app.onboarding.tsx:43-52,289-302; apps/backend/src/user-profile.service.ts:148-152`)
- /app swallows profile failures (catch {}) and redirects to '/', which I-04 says not to do on profile failure. It also calls authHeader before the !user check. (`apps/web/app/routes/app._index.tsx:11-26`)
- The account detail loader turns any failure, including 404, into account: null with an empty accountDetails. (`apps/web/app/routes/app.accounts.$account.tsx:64-86`)
- The root loader swallows profile errors on purpose and sends accessToken to the browser so client hooks can call the backend directly. (`apps/web/app/root.tsx:34-52; apps/web/app/hooks/useUserProfile.ts:262-269`)
- Client-side mutations call the backend directly. BudgetContainer.deleteEntry ignores the response status and removes the row locally even when the DELETE fails. The onboarding action swallows a failed PATCH and redirects to '/', which sends the user back to onboarding. (`apps/web/app/containers/budget/BudgetContainer.tsx:178-184; apps/web/app/routes/app.onboarding.tsx:68-86; apps/web/app/routes/_index.tsx:66-68`)
- /login always goes to the WorkOS hosted sign-in. If the WorkOS session is valid but the backend rejects the token (the E1 issuer question is still open), redirecting a backend 401 to /login can loop. (`apps/web/app/routes/login._index.tsx:5-17; /Users/marcgallagher/personal/flump/docs/audit/plans/E1-auth-ledger.md:28`)
- No toast or notification library exists, and only two components read fetcher.data, so most action failures are already silent. (`apps/web/package.json; apps/web/app/components/dialogs/addEditAccountsDialog/AddEditAccountsDialog.tsx:136; apps/web/app/components/dialogs/connectBankWizard/ConnectBankWizard.tsx:145`)
- @radix-ui/react-dialog is a dependency of apps/web only; packages/ui depends only on react-slot and react-tabs. FLPModal wraps Radix Dialog with inline css() and the generic 'Close' plus confirm buttons. packages/ui has no dialog primitive. (`apps/web/package.json:16; packages/ui/package.json:50-51; apps/web/app/components/core/dialogs/FLPModal.tsx:1-196; packages/ui/src/index.tsx:22-30`)
- These destructive actions have no confirmation at all: AccountDetails 'Delete <year>' (submits deleteYear), AddEditAccountsDialog 'Delete' (submits delete and closes), the SavingsAccountsList card-layout trash button (calls handleConfirmDelete directly; the audit missed this one), and the BudgetSetupWizard entry delete. (`apps/web/app/components/accounts/AccountDetails.tsx:37-48,284-293; apps/web/app/components/dialogs/addEditAccountsDialog/AddEditAccountsDialog.tsx:279-291,345-350; apps/web/app/components/savings/SavingsAccountsList.tsx:412-419; apps/web/app/components/budget/BudgetSetupWizard.tsx:180,258-272`)
- The existing confirmation styles: native confirm() in BudgetCategoryTable, TaxContainer (transaction; tax year also uses alert()) and BankConnectionsList; an inline confirm in the SavingsAccountsList table layout; a custom FLPModal in PensionAccountsList; and type-to-confirm 'RESET' in UserProfilePanel. (`apps/web/app/components/budget/BudgetCategoryTable.tsx:208-211; apps/web/app/containers/tax/TaxContainer.tsx:309-341; apps/web/app/components/accounts/BankConnectionsList.tsx:61-69; apps/web/app/components/savings/SavingsAccountsList.tsx:641-703; apps/web/app/components/pension/PensionAccountsList.tsx:616-637; apps/web/app/components/budget/UserProfilePanel.tsx:308-313,409-440`)
- I-06 overstates the debt case. Deleting a debt only removes it from the simulator's local React state, which is seeded from accounts and never persisted, so it is not a data-destroying action. 'Delete category' only appears when the category has no entries. (`apps/web/app/containers/debt/DebtContainer.tsx:99-103,147-149; apps/web/app/components/budget/BudgetCategoryTable.tsx:270-276`)
- Mobile 'Disconnect All Bank Connections' loops deleteBankConnection with no confirmation and no error handling. (`apps/mobile-companion/src/screens/DashboardScreen.tsx:546-559`)
- Patterns to follow: the boot-time env check uses a pure function plus a module-level call (isDevBypass), tested with vi.resetModules, vi.stubEnv and a dynamic import. Feature component directories are registered in the architecture-laws test. The web Vitest uses testIdAttribute 'id'. (`apps/web/app/utils/auth.server.ts:13-22; apps/web/app/utils/auth.server.boot.test.ts:1-31; packages/ui/src/tokens/architecture.laws.test.ts:12-20,85-120; docs/agents/component-guidelines.md:26,84-88`)
- Existing route tests mock 'react-router' wholesale (redirect, useLoaderData) and getAuthSession. No test uses createRoutesStub yet. (`apps/web/app/routes/_index.test.tsx:6-29; apps/web/app/routes/app.onboarding.test.tsx:10-23`)

## Fact-check

25 claims checked; 1 not confirmed.

- **false**: Base URL fallback on exactly 21 lines in 14 files — 21 lines is right, but they are in 12 distinct files (root.tsx 2, backend-client 1, useUserProfile 6, BudgetContainer 1, app._index 1, profile 1, pension 1, tax 1, savings 1, onboarding 3, $account 2, accounts._index 1). The planner's own file list also has 12. Line numbers listed match the current code.

Issues the checker says were missed:

- apps/web/app/routes/app.pension.tsx:20, app.tax.tsx:14, app.savings.tsx:20 and app.accounts._index.tsx:28 each hand-roll fetch calls in actions as well as loaders (these are separate from loadWorkspaceSnapshot); the plan's step 5 and 6 list only profile/onboarding/_index/$account as hand-rolled, so these four action fetches must be moved to backendFetch or the step-8 'only backend-client.server.ts calls fetch' guard will fail.
- apps/web/app/routes/app.onboarding.tsx:289-300: client-side seeding (createAccountSafe, createBudgetEntrySafe) uses window.ENV/import.meta.env and wraps every call in try/catch with 'Ignore network errors in test environment' and ignores res.ok; this is a further silent-failure path inside the onboarding flow that D3 must cover, and it falls under the 'client api module' exception in step 8.
- apps/web/app/routes/_index.tsx:66-68: the home loader redirects to /app/onboarding when userProfile.onboardingCompleted === false, and the profile comes from loadWorkspaceSnapshot's swallowed fetchJson (null on 401/5xx). With the planned throw policy for the snapshot (D2), a profile failure must not fall through as 'userProfile null' and skip the onboarding check; the plan should state how _index treats a null profile.
- apps/web/app/routes/login._index.tsx:7-15 and E1-auth-ledger.md issuer note: WorkOS issuer is still unconfirmed, so a 'Sign in again' button that posts to /logout (plan item 4) must be verified against logout._index.tsx behaviour (not read here); if logout requires a loader GET or a signed-in session, the POST proposal may not work.
- apps/web/app/containers/budget/BudgetContainer.tsx:177-181 and :170-173: updateEntry throws on !res.ok but deleteEntry and likely add/other mutations differ; the client mutation error handling is inconsistent, so a single client api module (D3) must define a common failure surface (the plan has no toast library, only ConfirmDialog/fetcher.data), otherwise client mutation errors remain invisible.
