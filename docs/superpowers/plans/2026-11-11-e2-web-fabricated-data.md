# E2 web track: remove fabricated data Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps use checkbox syntax.

**Goal:** No signed-in web screen shows or writes invented figures; demo is public-only at /sandbox.
**Architecture:** Pure helpers (debtInputs, debtAccountMapping, buildDebtSummary) feed loaders; widgets drop `||` fallbacks and show EmptyState/prompts; debts persist via /accounts actions using ConfirmDialog and apiFetch/backendFetch conventions from E5.
**Tech Stack:** React Router 7, Panda CSS (@repo/ui), Vitest, @flump/finance-engine.
**Spec:** /Users/marcgallagher/personal/flump/docs/audit/plans/E2-plan-draft.md (+ DECISIONS.md, SEQUENCE.md). Decisions: D1=A, D2=A, D5=A, D7=A (+E4 D2-A liability sign: liabilities stored as minus the amount owed), D6 no history rewrite.

## Global Constraints

- AGENTS.md laws: colocated dirs, semantic tokens only, tabular-nums, en-GB sentence-case copy, no exclamation marks; stories light+dark and tests for new UI.
- Subagents sonnet only. rtk prefix. Four gates before every push.
- Failures stay honest (route error boundary, apiFetch); destructive actions use ConfirmDialog.
- Already delivered (skip): backend T1-T5, T7 EmptyState. T6 not in scope. Mobile dropped.

## Review Focus

- Signed-in `?demo=true` lands on the real dashboard with no / <-> /sandbox loop; signed-out /app?demo=true reaches /sandbox.
- 0% APR/0% pension stays 0 (never 19.9/5).
- Mortgage-only user sees no debt widget; missing mortgage rate/term/balance is prompted, not assumed.
- Empty fields in onboarding create no accounts/budget rows.
- Liability sign: debts created via the debt page are stored negative; displays stay positive.

## Batches (sequential; each = implementer + independent reviewer)

- A debt: T8 (EmptyState, no defaultDebts), T9 (debtInputs, real surplus), T11 (toDebtItems aprKnown, no 19.9), T10 (persist add/edit/delete via /accounts, ConfirmDialog, sign rule).
- B dashboard/widgets: T12 (buildDebtSummary + isHighInterestDebt), T13 (DebtWidget/HomeDashboard no fallbacks), T14 (Budget MTD actuals hidden), T15 (home loader pension `??`, mortgage from account), MortgageContainer 150000/25/4.5 literals, T20 (pension: no 45000 salary, 'Assumed: auto-enrolment minimum' label).
- C demo/onboarding/copy: T17 (retire ?demo=true + DemoModeBanner, links to /sandbox), T18 (/sandbox signed-out only, no salary in seed, relative persona dates), T19 (onboarding starts empty), T16 (Poplar copy/fixtures/docs, web only).

Each task: failing test first (names/assertions per spec sections T8-T20), minimal implementation, commit on branch.
