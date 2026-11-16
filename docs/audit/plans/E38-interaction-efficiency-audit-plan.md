# E38. User Action Friction & Interaction-Efficiency Audit

> **Status: plan for owner approval. No code.** Written 2026-11-16 against `origin/main` at `19968856`. Companion to `docs/audit/EPICS.md` (left untouched here to avoid conflicting with E37; add the `E38` summary row after merge).

**Summary.** Flump's core workflows work, and `apps/e2e` covers smoke, visual, accessibility, and new-user journeys, but no suite measures how much physical effort each task costs a user. Adding a budget line, completing a monthly check-in, updating an account balance, or logging a Self Assessment record often requires multiple modal round-trips, extra clicks to open edit forms, and manual focus resets. This epic establishes a repeatable Playwright interaction-cost harness (`S0`) across desktop (`1280px`) and phone (`375px`) viewports, then ships targeted friction reductions in three slices (`S1`–`S3`) while preserving WCAG 2.2 AA accessibility and Flump's advice-boundary rules.

## 1. Why this matters

- **Repeat-use retention:** Monthly check-ins (`CheckInSheet`), budget adjustments, and Self Assessment record entry are recurring habits, not one-off setup. Every unnecessary modal open/close or tab hop compounds across 12+ sessions a year.
- **Phone parity:** A flow that feels tolerable with a mouse at `1280px` often requires extra scroll, sheet-open, and tap-target hops at `375px` (`useBelowMd`).
- **Measurable regressions:** Without automated interaction-cost budgets in `apps/e2e`, future UI refactors can quietly re-introduce extra confirmation dialogs or modal round-trips.

## 2. What exists today

| Area | Current routes & components | Observed friction / measurement gap |
| --- | --- | --- |
| E2E harness | `apps/e2e/playwright.config.ts`, `apps/e2e/support/page.ts`, `apps/e2e/tests/new-user-journey.spec.ts` | Verifies functional completion and axe a11y (`playwright.a11y.config.ts`), but records zero interaction-cost metrics |
| Budget | `apps/web/app/routes/app.budget.tsx`, `features/budget/components/{BudgetEditor,BudgetEntryDialog,AddCategoryModal,BudgetSetupWizard}` | Adding/editing entries routes through `BudgetEntryDialog` / `AddCategoryModal` instead of inline quick-add and `Enter`-to-save |
| Monthly check-in | `apps/web/app/features/snapshot/components/{CheckInSheet,CheckInStep,CheckInCard,CheckInList,MonthlyCheckInCard}` | Multi-step sheet/list flow; desktop vs phone (`useBelowMd`) step transitions not budgeted |
| Accounts | `apps/web/app/routes/app.accounts._index.tsx`, `app.accounts.$account.tsx`, `features/accounts/components/AccountsGroupList` | Balance update, edit, and delete require navigating or opening dialogs per account |
| Debt | `apps/web/app/routes/app.debt.tsx`, `features/debt/components/{AddDebtDialog,DebtAccountsList,PayExtraTool}` | Adding/editing debts uses `AddDebtDialog`; payoff modelling via `PayExtraTool` not measured for round-trips |
| Self Assessment | `apps/web/app/routes/app.self-assessment.tsx`, `apps/web/app/containers/tax/TaxContainer.tsx`, `features/tax/components` | Adding, editing, and filtering income/expense records lacks quick-add and keyboard-first table/row actions |
| Profile & modelling | `apps/web/app/routes/app.profile.tsx`, `app.pension.tsx`, `app.mortgage.tsx`, `features/settings/components`, `features/pension/components`, `features/mortgage/components` | Updating salary/pension/housing and switching to scenario modelling spans separate routes |
| Onboarding | `apps/web/app/routes/app.onboarding.tsx`, `features/onboarding/components`, `apps/e2e/tests/new-user-journey.spec.ts` | Multi-step setup to first real dashboard figure (`app._index.tsx`); step count and keystrokes unmeasured |

## 3. Audit Metrics & Core Flows

Every core flow is measured in both **desktop (`1280×800`)** and **phone (`375×812`)** viewports from a deterministic seeded persona state (or clean state for onboarding).

### 3.1 Metrics recorded per flow

| Metric | Definition | How captured in Playwright |
| --- | --- | --- |
| **Clicks / taps** | Pointer `click()` / `tap()` actions required to complete the happy path | Instrumented helper wrapping `page.click` / `locator.click` / `tap` |
| **Keystrokes** | Character presses + functional keys (`Enter`, `Escape`, `Arrow*`, `Space`) excluding text content length variance where noted, plus raw key count | Instrumented helper wrapping `fill` / `press` / `keyboard.type` |
| **Focus / tab hops** | `Tab` / `Shift+Tab` presses (or manual focus shifts) needed to reach each interactive control in keyboard-only mode | Keyboard-only run of each journey counting `Tab` dispatches |
| **Page / modal transitions** | Full route navigations (`page.goto` / router transitions) + modal/dialog/sheet open-close cycles | Listener on `framenavigated` + `[role="dialog"]` mount/unmount counter |

### 3.2 The 7 Core Flows

1. **Create & edit a budget:** Add an income row and an expense row, toggle `essential`, and adjust housing cost (`app.budget.tsx`, `BudgetEditor`).
2. **Complete a monthly check-in:** Open check-in, update account balances, confirm carry-forward/unchanged items, and save (`CheckInSheet` / phone flow via `useBelowMd`).
3. **Add, edit, update balance, and remove an account:** Full CRUD + quick balance update (`app.accounts._index.tsx`, `AccountsGroupList`, `app.accounts.$account.tsx`).
4. **Add/edit a debt & model payoff:** Create or edit a debt (`AddDebtDialog`, `DebtAccountsList`) and adjust extra payment in `PayExtraTool` (`app.debt.tsx`).
5. **Add/edit/filter Self Assessment income & expense records:** Add one income record, add one expense record, edit an amount, and filter by tax year/category (`app.self-assessment.tsx`, `TaxContainer`).
6. **Update profile/salary/pension & model retirement/mortgage scenarios:** Update salary or pension contribution in profile/settings (`app.profile.tsx`), then model a scenario on `app.pension.tsx` (or `app.retirement.tsx` once E33 S3 lands) and `app.mortgage.tsx`.
7. **New-user onboarding to first real dashboard figure:** Clean user from `/login` through `app.onboarding.tsx` until the dashboard (`app._index.tsx`) displays the first real calculated figure (extending `new-user-journey.spec.ts`).

## 4. Improvement Catalogue

Concrete, reusable patterns to apply in `S1`–`S3` (using `@repo/ui` primitives and Panda CSS recipes per `AGENTS.md` Section 1):

| Pattern | Mechanism | Target flows | Guardrails |
| --- | --- | --- | --- |
| **Inline quick-add** | Single-row inline composer at the top/bottom of lists instead of opening a modal dialog for common entries | Budget lines, Self Assessment records, Accounts | Keep full dialog available for advanced/optional fields; maintain `border.input` contrast |
| **`Enter`-to-save / advance** | `Enter` submits an inline row and optionally focuses the next empty field or new row; `Cmd/Ctrl+Enter` submits multi-field forms | Budget, Self Assessment, Check-In, Onboarding | Never hijack `Enter` inside `<textarea>`, `<select>` menus, or custom comboboxes |
| **Smart defaults & auto-prefill** | Prefill tax year, today's/current check-in month, last-used category, or unchanged balances from the previous snapshot | Check-In, Self Assessment, Budget | Never auto-fill financial targets or advice-sensitive figures (advice-boundary rule R4) |
| **Single-click cards / rows** | Inline-editable balance cell on account cards and budget rows; one-click essential/status toggle without entering an edit mode | Accounts, Budget, Debt | Maintain 44×44px minimum touch target on `375px` phone viewport |
| **Keyboard shortcuts** | Discoverable, non-conflicting shortcuts (e.g., `n` or `/` to focus quick-add/filter when not in an input, `?` for shortcut help, `Escape` to cancel inline edit) | All core pages | Must pass WCAG 2.1.4 Character Key Shortcuts (only active when no text input is focused, or modifier-gated / remappable / disableable) |
| **Bulk edit / import shortcuts** | Batch-confirm unchanged balances in Check-In ("All unchanged" / per-group confirm) and multi-row paste/quick-entry for Self Assessment | Check-In, Self Assessment | Server-side validation and optimistic-concurrency (`ifMatch`) preserved on batch saves |

## 5. Slices (`S0`–`S3`)

| Slice | Contents | Depends on | Done when |
| --- | --- | --- | --- |
| **S0** | **Automated Playwright interaction-cost harness** in `apps/e2e`: action-counting fixtures (`clicks`, `keystrokes`, `tabHops`, `transitions`), specs for all 7 core flows at `1280px` and `375px`, JSON/Markdown baseline report committed under `docs/audit/`, and a CI threshold gate (fail if a flow's cost regresses above baseline + tolerance) | None | Baseline report generated for all 7 flows on desktop & phone; CI job runs the harness and enforces budgets |
| **S1** | **High-frequency flow reductions (Budget & Monthly Check-In):** Inline quick-add row in `BudgetEditor`, single-click essential toggle, `Enter`-to-save & add-another; `CheckInSheet` one-tap "unchanged" confirmation and streamlined phone step progression | S0 | S0 budgets for Flows 1 & 2 drop by ≥30% in clicks/transitions on both `1280px` and `375px`; existing unit & a11y tests pass |
| **S2** | **Accounts, Debt & Self Assessment quick-actions:** Inline balance update on `AccountsGroupList` without full-page/modal round-trip; quick-edit and payoff slider focus flow on `app.debt.tsx`; inline quick-add and instant filter chips on `app.self-assessment.tsx` | S0 | S0 budgets for Flows 3, 4 & 5 drop measurably; `apps/e2e` and `packages/ui` tests pass |
| **S3** | **Keyboard navigation, submit conventions & accessible shortcuts:** Consistent `Enter` / `Cmd+Enter` submit conventions across forms, `Escape` cancel/restore focus, skip-to-primary-action / `/` filter focus, and WCAG 2.1.4 compliance tests in Vitest + Playwright | S1, S2 | Keyboard-only tab-hop budgets recorded and reduced across all 7 flows; zero `@axe-core/playwright` or Storybook a11y violations |

`S1` and `S2` can run in parallel once `S0` lands.

## 6. Strongest argument against

Interaction-cost counters can encourage gaming the metric—cramming dense inline inputs into every card, hiding confirmation steps before destructive deletes, or adding single-key shortcuts that clash with screen readers and browser defaults. Keeping `Escape` undo/confirm-on-delete intact, enforcing WCAG 2.1.4 and `@axe-core/playwright` on every slice, and measuring both mouse/touch and keyboard-only runs prevents efficiency gains from degrading clarity or accessibility.

## 7. Decisions for the owner

| # | Decision | Options | Recommendation |
| --- | --- | --- | --- |
| **ED1** | CI threshold strictness in `S0` | **(a)** Warn-only on PRs until `S1`–`S2` land, then hard-fail on regression. **(b)** Hard-fail from `S0` at baseline + 10% | **(a)** until `S1`–`S2` set the target baselines, then **(b)** |
| **ED2** | Destructive action confirmation (account/debt/record delete) | **(a)** Keep explicit confirmation dialog or undo toast; never optimise away safety. **(b)** Single-click delete | **(a)** |
| **ED3** | Single-character shortcuts (`n`, `/`) | **(a)** Active only when focus is outside form controls, with a settings toggle to disable (WCAG 2.1.4). **(b)** Modifier-only (`Cmd/Ctrl+...`) | **(a)** with `Cmd/Ctrl+K` / `Cmd/Ctrl+Enter` as primary modifier shortcuts |
