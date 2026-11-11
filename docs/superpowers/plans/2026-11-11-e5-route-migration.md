# E5 Route Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Every web data route reports backend failures honestly through one route error boundary, all backend calls go through `backendFetch` (server) or `apiFetch` (browser), and every destructive action uses `ConfirmDialog`.

**Architecture:** Builds on PR 376 (`config.server.ts`, `services/backend-client.server.ts` `backendFetch`, `services/backend-error.ts`, `services/route-error.server.ts` `throwRouteError`, `RouteErrorState`, `ConfirmDialog`, `single-api-client.guard.test.ts` ratchet allow-list). Loaders call `backendFetch` and `throwRouteError`; routes re-export a shared `ErrorBoundary`.

**Tech Stack:** React Router 7 (SSR, remix-flat-routes), Vitest (`createRoutesStub`), Panda CSS, Radix Dialog, Bun/Turbo.

**Spec:** `/Users/marcgallagher/personal/flump/docs/audit/plans/E5-plan-draft.md`, `DECISIONS.md`. Owner decisions: D1=B (401 shows "Your session has ended" with a form posting to /logout, never redirect), D2=A (any workspace endpoint failing throws), D3=C (add browser `apiFetch` that throws `BackendError`; token-out-of-browser is a follow-up), D4=A (confirm only, no undo). T17 (mobile) dropped.

## Global Constraints

- AGENTS.md: colocated 5-file component dirs, semantic tokens only, `tabular-nums` on numbers, en-GB copy (sentence case, no `!`, ellipsis only for pending states), stories light+dark, tests for new UI.
- Prefix commands with `rtk`. Subagents are `sonnet` or `haiku` only.
- Thrown payloads carry only `kind` and `endpoint` (never token, base URL, body). Redirect `Response`s must pass through every catch (`throwRouteError` rethrows non-BackendErrors).
- Root loader never throws for backend errors (shell stays up).
- Empty array from backend is a valid empty account; only failures are errors.
- Each task ends by deleting its migrated files' entries from the guard `ALLOW_LIST` (ratchet), then `rtk bunx biome check` on changed files and the web package tests.

## Review Focus

- Retry button clears the boundary (`useRevalidator`); test with `createRoutesStub`.
- Onboarding failure must not loop (action failure -> no redirect to `/`).
- `_index` loader: profile null/failure must not skip onboarding check silently.
- Failed client deletes (BudgetContainer) keep the row and surface an error.
- Nested Radix dialog (ConfirmDialog in AddEditAccountsDialog): Escape closes only the inner one, scroll lock restored.
- forbidden and not-found look identical.

---

### Task A: RouteErrorBoundary and root boundary (T6)

**Files:** Create `apps/web/app/features/feedback/components/RouteErrorBoundary/{RouteErrorBoundary.tsx,.styles.ts (if needed),.stories.tsx,.test.tsx,index.ts}`; modify the 12 data routes (`_index`, `app.accounts._index`, `app.accounts.$account`, `app.budget`, `app.debt`, `app.forecast`, `app.mortgage`, `app.pension`, `app.profile`, `app.savings`, `app.tax`, `app.onboarding`) to add `export { RouteErrorBoundary as ErrorBoundary } from "~/features/feedback/components/RouteErrorBoundary"`; restyle `root.tsx` ErrorBoundary using `RouteErrorState` (no inline styles, no "Uh oh"); register `features/feedback/components` in `packages/ui/src/tokens/architecture.laws.test.ts` if not yet.

**Interfaces:** Produces `RouteErrorBoundary(): ReactElement` reading `useRouteError`; `isRouteErrorResponse` -> `data.kind` (validated against known kinds), else `'unknown'`; `onRetry = useRevalidator().revalidate`, `retrying = revalidator.state !== 'idle'`; for not-found passes `primaryHref="/app/accounts" primaryLabel="Back to accounts"` when the route is accounts detail, else `"/"` / "Go to dashboard". Plain `Error` never shows its message.

- [ ] Write failing tests (`createRoutesStub`): loader throws `data({kind:'unavailable'},{status:503})` renders "We couldn't load your data"; Try again re-runs loader and renders route on success; plain Error renders unknown state without the message; 404 payload shows not-found copy; 403 renders same copy as not-found? (Note: RouteErrorState currently has distinct forbidden copy; make the boundary map `forbidden` to `not-found` kind so they look the same); 401 renders form to `/logout`; route-module test that each of the 12 routes exports `ErrorBoundary`; root ErrorBoundary has no inline `style` attribute.
- [ ] Implement, add stories (light/dark) and run tests; commit.

### Task B: Honest loaders (T4, T8, T9)

**Files:** `services/backend-client.server.ts` (rebuild `loadWorkspaceSnapshot` on `backendFetch` + `throwRouteError`, pass `args.request.signal`, remove silent fetchJson and the `localhost:4000` fallback, keep not-signed-in early return without fetching), `routes/app.profile.tsx`, `routes/app.onboarding.tsx` (loader only), `routes/app._index.tsx`, `routes/app.accounts.$account.tsx` (loader), `routes/_index.tsx` (remove the zeroed-data catch around snapshot; computation errors reach the boundary), `root.tsx` (loader uses `backendFetch`, `userProfile` null on BackendError, logs kind+endpoint only, `ENV.VITE_API_URL = apiConfig.apiBaseUrl`), matching tests (`backend-client.server.test.ts` replace "falls back gracefully", new `app.profile.test.tsx`, `app._index.test.tsx`, `app.accounts.$account.test.tsx`, `root.test.tsx`, update `_index.test.tsx`, `app.onboarding.test.tsx`).

**Interfaces:** Consumes `backendFetch<T>(endpoint, {accessToken, signal})`, `throwRouteError(err): never`. Loaders: `try { ... } catch (e) { throwRouteError(e) }`. `/app` index: `getAuthSession` ensureSignedIn false, `!user` -> `redirect('/login')` BEFORE `authHeader`; profile failure throws; `onboardingCompleted === false` -> `redirect('/app/onboarding')` else `redirect('/')`. `$account` 404 -> thrown not-found; 500 -> 502. Onboarding loader no longer returns DEFAULT_PROFILE/`accessToken: null` on failure.

- [ ] Write failing tests per draft T4/T8/T9 (503/401/502/404 statuses via `rejects` with `init.status`/`data.kind`; 200 with `[]` still resolves).
- [ ] Implement; run web tests; update guard allow-list; commit.

### Task C: Route actions on backendFetch (T10)

**Files:** actions in `app.accounts._index.tsx`, `app.accounts.$account.tsx`, `app.pension.tsx`, `app.savings.tsx`, `app.tax.tsx`, `app.onboarding.tsx`; new table-driven `routes/actions.test.ts`.

**Interfaces:** Actions keep `data({ success:false, error }, { status })` with status from the BackendError (use a small shared helper `actionErrorResponse(err)` in `services/route-error.server.ts` that returns `data({success:false,error:<generic en-GB message>},{status})` and rethrows non-BackendErrors). Onboarding action: failed PATCH returns the error and does NOT redirect to `/`; success redirects `/`. Mutations never retry (backendFetch default).

- [ ] Failing tests: each intent with backend 503 -> `success:false`, status 503, fetch called once; each intent hits expected method and URL under `apiConfig.apiBaseUrl` and asserts the request **body**; onboarding PATCH 500 -> no redirect; PATCH 200 -> redirect `/`.
- [ ] Implement; shrink allow-list; commit (may be two commits: accounts+onboarding, then pension/savings/tax).

### Task D: Browser apiFetch (T11, D3=C)

**Files:** Create `services/api-client.ts` + `api-client.test.ts`; modify `hooks/useUserProfile.ts`, `containers/budget/BudgetContainer.tsx`, `routes/app.onboarding.tsx` (client seeding, `createAccountSafe`/`createBudgetEntrySafe`).

**Interfaces:** `apiFetch<T>(endpoint: string, opts: { accessToken: string | null | undefined; method?: HttpMethod; body?: unknown }): Promise<T>`; base URL from `window.ENV.VITE_API_URL` only (never `import.meta.env`); null token -> rejects `BackendError('unauthorised')` without fetching; maps status via `kindFromStatus`, network failure -> `unavailable`, 204/empty -> undefined.

- [ ] Failing tests: uses window.ENV; null token; 503 -> `unavailable`/`server` kind; BudgetContainer `deleteEntry` DELETE 500 keeps row and surfaces error; `HttpProfileAdapter.getBaseline` non-OK rejects; onboarding seeding no longer swallows errors silently (surface failure).
- [ ] Implement; allow-list now empty (delete `ALLOW_LIST` entries; keep ratchet); commit.

### Task E: ConfirmDialog adoption (T14, T15, T16)

**Files:** per draft: `AccountDetails.tsx`, `AddEditAccountsDialog.tsx`, `BankConnectionsList.tsx`, `SavingsAccountsList.tsx`, `PensionAccountsList.tsx`, `BudgetSetupWizard.tsx`, `BudgetCategoryTable.tsx`, `TaxContainer.tsx`, `UserProfilePanel.tsx` and their tests (update snapshots deliberately).

**Interfaces:** Consumes `ConfirmDialog` props from PR 376 (`open,onOpenChange,title,description,confirmLabel,cancelLabel?,tone?,onConfirm,pending?,requireText?`). Copy per draft T14/T15/T16 (e.g. "Delete 2024?" / "This removes all monthly balances for 2024 from <account>. This can't be undone." / "Delete year"; "Delete all N records for 2024/25?" with N `tabular-nums`; reset uses `requireText="RESET"`). Tax empty-year `alert()` becomes a disabled control or inline text. No `window.confirm`/`alert` remains in these files.

- [ ] Failing tests per draft (spies on `window.confirm`/`alert` not called; dialog opens without submitting; confirm submits intent; Cancel leaves parent dialog open; reset disabled until "RESET"; `resetError` shows in dialog).
- [ ] Implement in three commits (accounts+connections, savings+pension+budget, tax+profile).

### Task F: Final guard, ledger, preflight

- [ ] Confirm guard allow-list is empty and a final grep for `localhost:4000`, `window.confirm`, `alert(` in `apps/web/app` is clean outside config and tests.
- [ ] Update ledger `/Users/marcgallagher/personal/flump/docs/audit/plans/E5-routes-ledger.md`.
- [ ] Run `rtk bun run lint`, `check-types`, `test`, `build`; whole-branch Sonnet review; push; draft PR.
