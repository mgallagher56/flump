# E17 PR C (import backend): choices where the spec is silent

Spec: [E17-mcp-replan-2026-11.md](E17-mcp-replan-2026-11.md) sections 5 to 7 and 9; DECISIONS round 9; E17-N17 in [E17-next-phases-plan.md](E17-next-phases-plan.md). Each item below is the simpler option.

## Schema

- `user_id` on `import_batches` and `agent_audit_events` is a plain `varchar`, like every other table. There is no users table to point a foreign key at.
- Revert data is one `jsonb` column on the batch (`revert_data`), not a child table.
- Counts are one `jsonb` column: `{rows, staged, new, overwrite, unchanged, skipped, errors}`. new, overwrite, unchanged and skipped are null until commit.
- `validation_errors` (jsonb) keeps each stage call's refused rows by idempotency key, so a replay returns them.
- `account_details.import_batch_id` uses `ON DELETE SET NULL`. The entity declares the column but not the relation, so the FK lives in the migration only. The drift test does not compare FKs.
- The FK and the new source CHECK are added `NOT VALID`, then validated.
- On `down()`, rows with `source = 'agent'` become `manual` so the old CHECK can come back. Their values stay.

## Stage

- A row is one account or one balance. The 5,000 cap counts both, across chunks. A batch holds at most 200 accounts.
- Each balance row is checked on its own. A future month, a month before 2000, a bad value or an unknown account ref goes into `validationErrors` (ref, month and code only) and the row is dropped. The other rows are still staged. A malformed shape (bad ref, bad month format, more than 2 decimals) fails the whole request with 400 at the contract.
- A balance must name an account staged in the same chunk or an earlier one.
- Inside a batch the latest write wins, for an account ref and for a ref plus month.
- Each chunk has its own idempotency key. Replaying any of them returns the batch unchanged, with that call's validation errors. The first key is in `idempotency_key`; later keys are in `payload.chunkKeys`. A key sent again with a different `batchId` is 409.
- Account details are range-checked on the server too (rate 0 to 100 with 2 decimals, term 1 to 600, real dates); a bad value is 400, so shadow contract mode cannot cause a 500 at commit.
- Stage, commit and revert all take a per-user `pg_advisory_xact_lock` and lock the batch row, so an append can never land on a committed batch and the caps cannot be raced.
- Nothing is mapped to an existing account until review, so stage returns `staged` and leaves new, overwrite, unchanged and skipped as null. Commit (and GET after it) returns the real numbers. PR E can add a preview endpoint if the review page needs them before commit.
- Status codes: 400 when the row cap is exceeded, 409 for a 4th open batch, 409 for appending to or committing a batch that is not open or has expired, 429 from the rate limiter.

## Commit

- `accountMap: {ref: accountId | null}`. A missing or null entry creates a new account (GBP, `isCurrent`, with any staged details). Its balance is the latest staged value, signed by type. Each existing account can be mapped from one ref only. A mapped id the caller does not own is the same 404 as on snapshots.
- `overwriteManual` is a list of row keys (`ref:YYYY-MM`), not a boolean, so the review page can tick rows one at a time. Any existing value whose source is not `agent` is protected: manual, onboarding, connected and backfill rows are all skipped unless ticked. So is the current month of a bank-connected account, even with no row yet. An earlier batch's `agent` row is overwritten without a tick.
- The protection is enforced in the upsert itself (`ON CONFLICT ... DO UPDATE ... WHERE source = 'agent' OR the row is ticked`), so a manual or synced value inserted after commit read the table is kept. Such rows are reported in `skippedManual` and left out of the revert data.
- Staged names and values are cleared from the payload at commit and at expiry; counts and chunk keys stay. `revert_data` keeps only what revert needs and is emptied after a revert.
- A row whose value matches the stored one is counted `unchanged` and not written, so its provenance stays as it was.
- A current-month write moves the account balance (the E30 rule). The old balance is kept for revert.

## Revert

- A row is still owned by the batch when `import_batch_id` is the batch, `source` is `agent` and the value is the one the commit wrote. Every non-import write path (snapshot PUT, balance edit or check-in, bank sync) clears `import_batch_id`.
- An owned row with a prior value gets that value back, including its old source and batch id. An owned row the batch created is deleted. This is the batch undoing its own rows, which the plan's batch-level undo allows. The "no deletes" rule is read as "an import never deletes data it did not write".
- An account the batch created is deleted only if no `account_details` or `transactions` row refers to it any more and it has no bank connection. If the user has edited one of its months, the account stays.
- A current-month balance is restored only when its row was restored or removed by this revert, and only if it still equals the value the commit set.

## Expiry and caps

- Expiry is lazy, because the app has no scheduler: on stage (for all the user's batches), on GET and on commit.
- The 30 stage calls an hour use a new `importStage` class in the existing per-user `RateLimitStore`. Replays count too.
- The import routes sit behind `ImportsAccessGuard`, which reuses the MCP allowlist settings (`MCP_ALLOWED_USER_IDS`, `MCP_OPEN_ACCESS`) with a neutral 404, so they are owner-only during rollout without tying the future CSV import to AI wording. Commit and revert also need a web session, because they take a WorkOS JWT, not a PAT.
- Reset financial data deletes the user's import batches.

## Audit table (E17-N17)

- `AgentAuditService.record()` and `purgeOlderThan13Months()` exist and are tested on Postgres. They are not wired into `packages/mcp` and there is no `GET /mcp-tokens/:id/activity` route; both are PR D. Nothing schedules the daily purge yet, because there is no scheduler; PR D should add one.
- `args_fingerprint` is an HMAC of canonical JSON (keys sorted at every level), and null when `MCP_AUDIT_HMAC_KEY` is unset. The owner sets that key.
- Self-reported client names are cut down to `[A-Za-z0-9 ._/-]` and at most 64 characters. Invalid tool names become `unknown`, and invalid scopes and error codes are dropped.

## Not done here

- `packages/mcp` `SNAPSHOT_SOURCES` does not list `agent` yet, so `get_balance_history` and `get_data_coverage` report agent rows as `other` until PR D adds it.
- E19 account deletion (when it lands) must also delete `import_batches` and `agent_audit_events`.
