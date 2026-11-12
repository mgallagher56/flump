# E23 P0 Core-Journey Correctness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Ship E23 P0-1..P0-5 (before PR 368): remove invented or contradictory figures on web, and add backend route-inventory and Postgres contract guards.
**Architecture:** Two independent PRs. PR-W (web, logic-only): P0-1, P0-4, P0-5. PR-B (backend tests): P0-2, P0-3. No migrations. Nothing beyond P0.
**Spec:** `docs/audit/plans/E23-plan-draft.md` (shared repo path `/Users/marcgallagher/personal/flump/docs/audit/plans/`), section 11 Phase 0.

## Global Constraints

- AGENTS.md laws: colocation, semantic tokens only, `tabular-nums` on figures, en-GB, stories light and dark for touched UI, `rtk` prefix, subagents sonnet/haiku only.
- Do not touch apps/web root loader/headers or backend main.ts (E20 session).
- Preflight per PR: `bun run lint`, `check-types`, `test`, `build`, `check:laws`, `check:auth`, web `test:coverage`.

## Re-verification (origin/main 841a8a1)

- Fixed by PR 387: D01, D02, D02b, D03, D04 (both stacked-decorator routes now separate handlers).
- Live: D15 (`_index.tsx:152` `netProfit*0.29`), D13 residuals (`UKTaxCalculator.tsx:35` `?? 45000`; `baseline.store.ts` `DEFAULT_FINANCIAL_BASELINE` fallback, check `useUserProfile`), D09 (`calculateNetTakeHome` returns gross as take-home for unknown employment), D11 (60%/62% hard-coded copy in `PensionContainer.tsx`, `TaxTrapAlertBanner.tsx`).
- Not present: `apps/backend/test/`, `supertest`, `@nestjs/testing`.

## Review Focus

- Unknown value renders "Not set", never £0 or gross. - Annual 2019 record never leaks into current figure.
- Route inventory must not false-pass on dynamic paths. - Contract test must refuse non-local DB.

### Task W1 (P0-1): hide tax due

Files: `apps/web/app/routes/_index.tsx`, `components/dashboard/widgets/TaxWidget.tsx` (+ story/test), `HomeDashboard.test.tsx`.

- [ ] Failing test: TaxWidget with `estimatedTaxDue: null` shows "Not calculated yet" (tabular-nums); loader returns `estimatedTaxDue: null`.
- [ ] Type `estimatedTaxDue: number | null`; remove 0.29; `grep -rn '0\.29' apps/web/app` empty.
### Task W2 (P0-4): no gross-as-take-home, no £45k

Files per plan P0-4. Null/other employment type => take-home unknown ("Not set"); missing salary => "Not set" on Home, Tax, calculator; SSR never 45,000 (store default must not carry a salary). Skip sub-items already fixed. Depends on W1 (`_index.tsx`).

### Task W3 (P0-5): trap copy

Copy driven by engine fields (`incomeTaxRatePct`, `effectiveRatePct`): "60% income tax, 62% including NI"; no literal 60%/62% in JSX; stories light+dark.

### Task B1 (P0-2): route inventory

Create `apps/backend/test/contract/route-inventory.spec.ts`: extract (method, path) from `backendFetch`/`apiFetch` calls in `apps/web/app`, assert each matches a registered Nest route; dated allow-list for G-04 paths (`/accounts/:id/details...`) until E16 T-CUT-4; known-dynamic allow-list.

### Task B2 (P0-3): Postgres contract test

Add `@nestjs/testing`, `supertest` devDeps; `web-mutations.contract.spec.ts` + `web-payloads.ts` boot AppModule on `TEST_DATABASE_URL` (guard `assertSafeTestDatabase`), dev bypass, POST/PATCH onboarding payloads (accounts, budget entries, profile), assert 2xx + GET round-trip. Web twin test asserts onboarding sends the same shapes.
