# E30 plan: monthly snapshots and the check-in habit

> **Binding inputs.** Advice policy R1 (deltas are worded the same whether up or down, [`docs/compliance/advice-boundary-policy.md`](../../compliance/advice-boundary-policy.md)); E29a copy gate for any shipped wording; E19 data map and retention (`docs/legal/data-map.md`); DECISIONS round 1 (owner signs off copy) and the owner preference for fewer, larger PRs with no stacking (memory `larger-prs`).

**Status:** plan. PR1 (backend and engine) is delivered in the same PR as this document. PR2 to PR4 are not started. **No figure from the owner's own sheet appears here; the sheet is described by structure only.**

## 1. What the epic is

The owner tracks their finances in a spreadsheet with one column per month and one row per account. Flump should replace that habit: the first onboarding data becomes the first snapshot, the user picks a reminder day, connected accounts auto-fill, and manual updates are first-class. Each month the user opens a prefilled check-in, confirms or edits balances, and sees net worth over time.

The aim is a reason to come back once a month. It is **not** engagement mechanics (no streaks, no badges, no "you are behind" copy).

## 2. What exists (evidence, at `091e0da9`)

- **History table.** `account_details` is `(id, account_id varchar, year, month, value)`. It has no `user_id`, no `source`, no timestamps and **no unique constraint** (`apps/backend/src/entities/account-detail.entity.ts`, Baseline migration). Erasure reaches it only through account ids (`user-profile.service.ts` `resetFinancialData`; `docs/legal/data-map.md:19`).
- **Writers today.**
  - Bank sync upserts the current month's row (`finance.service.ts:431-456`), using the server's local month, not Europe/London.
  - Nothing else writes history. `updateAccount` does not (E23 section 6 plans a same-transaction upsert; see section 7).
- **Engine.** `PortfolioSnapshot` already ignores history for the current figure (`account.balance` wins; E23 D22) and `getMonthlyHistory` already carries values forward and keeps real signs (`portfolio.ts:158-230`, `:422-490`). The two defects named in the E30 brief (latest row overrides balance; `abs` on assets) are therefore **already fixed on main by E23**. PR1 adds regression tests rather than changing that behaviour, and adds the missing selectors (deltas, carry-forward flags).
- **Contract.** Routes are declared in `packages/api-contract/src/manifest.ts`; the authz harness matrix (`apps/backend/test/authz/matrix.ts`) fails on any route without a row (E20-N22).

## 3. Decisions

Recorded here as decided (opus/fable subagent recommendations, not the owner). Items still needing the owner are in section 6.

| # | Decision | Reason |
|---|---|---|
| D1 | **Evolve `account_details`; no new history table.** | One history source; every reader (portfolio, charts, MCP) already reads it. A second table would need reconciling forever. |
| D2 | **Columns added:** `user_id` (NOT NULL after backfill), `as_of_date date`, `source` (`onboarding\|manual\|connected\|backfill`), `updated_at`. `UNIQUE (account_id, year, month)`. | `user_id` makes erasure and export direct and enables the IDOR check. The unique key makes "one value per account per month" a database fact. |
| D3 | **Month key is derived from `as_of_date` in Europe/London**, enforced by a CHECK that `year`/`month` equal the date's parts. Europe/London only; no per-user time zone. | UK-only product; a bank sync at 00:30 BST on the 1st must land in the new month, not the old one. |
| D4 | **Latest write wins.** `PUT` overwrites the month's value; there is no edit history in v1. Back-dating and editing past months are allowed; future months are rejected. | Matches how a spreadsheet is edited. History of edits is v2 at most. |
| D5 | **Carry-forward is computed at read time and never stored.** A month with no row shows the account's last known value, flagged as carried. | Storing carried values would fabricate "recorded" data and break the actual-vs-forecast views later. |
| D6 | **Delta sign is current minus previous**, in one engine selector. Copy is identical for up and down (R1): "Net worth changed by £N since <month>". | One sign convention; no value-laden wording. |
| D7 | **A manual override on a connected account sticks for that month**: sync skips a row whose `source` is `manual`; it overwrites `connected` rows (and creates missing ones). | The user corrected the bank figure; the next sync must not silently undo it. |
| D8 | **Onboarding writes the first snapshot** (`source=onboarding`, insert-if-absent) when the profile first becomes `onboardingCompleted`. | The first data is the first column of the sheet. |
| D9 | **`snapshot_checkins (user_id, month, completed_at)`** records that the user completed a check-in for a month. Reminders (PR3) key off it. | Separates "values exist" (connected sync fills them) from "the user looked and confirmed". |
| D10 | **Never auto-recalibrate assumptions** (growth, contribution, interest) from the history. Snapshots feed actual-vs-forecast views (v2); they never rewrite a plan. | Advice-boundary: no silent changes to the user's model. |
| D11 | **No streaks, no badges, no "overdue" language.** | Product rule; also avoids behavioural-nudge risk under E29. |
| D12 | **Email carries no figures, requires opt-in consent, and has a one-click unsubscribe.** Reminders to the beta wait for the PECR opinion. | PECR/UK GDPR; E19. |
| D13 | **Scheduler is a Railway cron one-shot** (a command that runs, sends due reminders, exits), in PR3. | No always-on worker to run or monitor. |
| D14 | **Orphan history rows (no matching account) are deleted by the migration.** | They cannot be attributed to a user, so they could never be exported or erased. |
| D15 | **Existing rows are backfilled as `source=backfill`**, `as_of_date` = last day of the month. Duplicates keep the highest `id` (the latest write). | Provenance of old rows is unknown; "latest write wins" is the only consistent rule. |
| D16 | **A check-in for the current London month also sets each listed account's current `balance`; past months never do.** A manual value for the month stops sync overwriting the account balance as well as the snapshot row. | `accounts.balance` is "now"; leaving it behind a check-in would show two figures for one account (E23 D10 class of bug). |
| D17 | **`PUT /snapshots/:month` is a new controller (`SnapshotsController`), not part of `FinanceController`.** It carries its own authz spec (`authz.snapshots.spec.ts`) and matrix row. | The finance controller has a legacy positional constructor; a separate controller avoids touching it (and E23's files). |

## 4. MVP and v2 cut

**v1 (PR1 to PR3):**
- Check-in prefilled from last month; partial saves allowed.
- Net worth over time, with month-on-month deltas and carry-forward markers.
- The real recorded mortgage balance (not a modelled one) wherever a snapshot exists.
- Runway as the empty-state filler before the first month is recorded.
- Reminders: a user-chosen day, email only, consent-gated.
- First onboarding snapshot; manual back-fill of earlier months.

**v2 (PR4):** actual vs forecast; mortgage reconciliation and equity; savings vs mortgage crossover; allocation over time; debt paydown; an MCP history tool; CSV export. CSV **import** of sheet history is proposed for v2 (open question O5).

**Out of scope:** push notifications (later, after email), per-user time zones, edit history, goals or targets tied to the check-in, any recalibration of assumptions.

## 5. PR breakdown (four PRs, no stacking)

| PR | Content | Blocked by |
|---|---|---|
| **PR1 backend and engine** (with this plan) | Migration (columns, dedupe, unique, CHECK, down); `snapshot_checkins`; `PUT /snapshots/:month` (batch, partial, authz-checked, contract route, authz matrix cases); engine selectors (carry-forward flags, deltas, series) and regression tests for the E23 history fixes; onboarding first snapshot; connected sync tagging and the manual-sticks rule; erasure and the E19 data map and retention docs. | none (owner runs the E18 backup drill before the migration reaches staging) |
| **PR2 web** | `features/snapshot` check-in flow, history page, empty states, back-fill UI. Copy gated by E29a and owner approval. | PR1; E15 components |
| **PR3 mailer, reminders, compliance** | Provider integration, reminder-day setting, consent record, one-click unsubscribe, Railway cron one-shot, PECR notes. | Owner email provider and budget (O1); PECR opinion (O2) |
| **PR4 v2 views** | The v2 list in section 4. | PR1 to PR2; at least one real month of data |

## 6. Owner-only actions

1. **Run the E18 backup drill** (`docs/runbooks/backup-restore.md`) before the PR1 migration deploys to staging. The migration deletes duplicate and orphan rows and adds constraints.
2. **Choose the email provider and set a budget** (PR3).
3. **Obtain the PECR opinion** on reminder emails (consent wording, soft opt-in does not apply to a new feature for existing users without care) and decide whether the beta receives reminders before it.
4. **Approve all user-facing copy** (check-in, deltas, reminder email) through the E29a gate.
5. **Add the Railway cron service and its secrets** when PR3 lands.

## 7. Overlaps with other epics

- **E23 section 6** (`E23-plan-draft.md`, History and check-in correctness). The two `portfolio.ts` fixes are already on main from E23. E30 PR1 delivers the **history selectors, the unique key and the snapshot upsert**; E23's "`updateAccount` upserts the current month's detail row" ticket should call the PR1 upsert helper rather than write rows itself. The E23 plan records this.
- **E19** data map and retention: `account_details` now has `user_id`; `snapshot_checkins` is a new table. Updated in PR1.
- **E25 to E28:** priority against E30 is an owner question (O3).

## 8. Open questions (OPEN, not decided)

- **O1. Email provider and budget.** Open; blocks PR3.
- **O2. Reminders to the beta before the PECR view.** Open. Default: no reminders until the opinion lands.
- **O3. Priority against E25 to E28.** Open.
- **O4. Property value and co-owner share in v1.** Open. Default: property is a normal account value; no ownership-share logic in v1.
- **O5. CSV import of sheet history.** Proposed for v2; owner to confirm.

## 9. Verification (PR1)

- Migration: integration test on real Postgres (dedupe keeps latest, orphans removed, unique and CHECK enforced, down reverses columns and constraint).
- Endpoint: authz matrix rows (user B gets 404 identical to not-found; no row changes; no token 401), partial batch, back-dating, future-month rejection, latest-write-wins.
- Engine: unit and property-style tests for carry-forward, delta sign, series ordering.
- Sync: connected overwrites `connected`, never overwrites `manual`.
- The four AGENTS.md section 5 checks.
