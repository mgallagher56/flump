# E17 PR C (import backend): choices where the spec is silent

Spec: [E17-mcp-replan-2026-11.md](E17-mcp-replan-2026-11.md) sections 5 to 7 and 9; DECISIONS round 9; E17-N17 in [E17-next-phases-plan.md](E17-next-phases-plan.md). Each item below is the simpler option.

## Schema

- `user_id` on `import_batches` and `agent_audit_events` is a plain `varchar`, like every other table. There is no users table to point a foreign key at.
- Revert data is one `jsonb` column on the batch (`revert_data`), not a child table.
- Counts are one `jsonb` column: `{new, overwrite, unchanged, errors}`.
- `account_details.import_batch_id` uses `ON DELETE SET NULL`. The entity declares the column but not the relation, so the FK lives in the migration only. The drift test does not compare FKs.
- On `down()`, rows with `source = 'agent'` become `manual` so the old CHECK can come back. Their values stay.

## Stage

- A row is one account or one balance. The 5,000 cap counts both, across chunks.
- Each balance row is checked on its own. A future month, a month before 2000, a bad value or an unknown account ref goes into `validationErrors` (ref, month and code only) and the row is dropped. The other rows are still staged. A malformed shape (bad ref, bad month format, more than 2 decimals) fails the whole request with 400 at the contract.
- A balance must name an account staged in the same chunk or an earlier one.
- Inside a batch the latest write wins, for an account ref and for a ref plus month.
- Each chunk has its own idempotency key. Replaying any of them returns the batch unchanged. The first key is in `idempotency_key`; later keys are in `payload.chunkKeys`.
- Stage calls are serialised per user with `pg_advisory_xact_lock`, so the caps cannot be raced.
- Nothing is mapped to an existing account until review, so the stage counts show every balance as `new`. Real new, overwrite and unchanged counts come back from commit. PR E can add a preview endpoint if the review page needs counts before commit.
- Status codes: 400 when the row cap is exceeded, 409 for a 4th open batch, 409 for appending to or committing a batch that is not open or has expired, 429 from the rate limiter.

## Commit

- `accountMap: {ref: accountId | null}`. A missing or null entry creates a new account (GBP, `isCurrent`, with any staged details). Its balance is the latest staged value, signed by type. Each existing account can be mapped from one ref only. A mapped id the caller does not own is the same 404 as on snapshots.
- `overwriteManual` is a list of row keys (`ref:YYYY-MM`), not a boolean, so the review page can tick rows one at a time. Any existing value whose source is not `agent` is protected: manual, onboarding, connected and backfill rows are all skipped unless ticked. An earlier batch's `agent` row is overwritten without a tick.
- A row whose value matches the stored one is counted `unchanged` and not written, so its provenance stays as it was.
- A current-month write moves the account balance (the E30 rule). The old balance is kept for revert.

## Revert

- A row is still owned by the batch when `import_batch_id` is the batch, `source` is `agent` and the value is the one the commit wrote. Every non-import write path (snapshot PUT, balance edit or check-in, bank sync) clears `import_batch_id`.
- An owned row with a prior value gets that value back, including its old source and batch id. An owned row the batch created is deleted. This is the batch undoing its own rows, which the plan's batch-level undo allows. The "no deletes" rule is read as "an import never deletes data it did not write".
- An account the batch created is deleted only if no `account_details` or `transactions` row refers to it any more and it has no bank connection. If the user has edited one of its months, the account stays.
- A current-month balance is restored only if it still equals the value the commit set.

## Expiry and caps

- Expiry is lazy, because the app has no scheduler: on stage (for all the user's batches), on GET and on commit. Expired payloads are not scrubbed yet. Follow-up: clear `payload.accounts` and `payload.balances` on expiry to minimise stored data.
- The 30 stage calls an hour use a new `importStage` class in the existing per-user `RateLimitStore`. Replays count too.
- The import routes sit behind `McpAllowlistGuard` (`MCP_ALLOWED_USER_IDS`), so they are owner-only during rollout. Commit and revert also need a web session, because they take a WorkOS JWT, not a PAT.
- Reset financial data deletes the user's import batches.

## Audit table (E17-N17)

- `AgentAuditService.record()` and `purgeOlderThan13Months()` exist and are tested on Postgres. They are not wired into `packages/mcp` and there is no `GET /mcp-tokens/:id/activity` route; both are PR D. Nothing schedules the daily purge yet, because there is no scheduler; PR D should add one.
- `args_fingerprint` is null when `MCP_AUDIT_HMAC_KEY` is unset. The owner sets that key.
- Self-reported client names are cut down to `[A-Za-z0-9 ._/-]` and at most 64 characters. Invalid tool names become `unknown`, and invalid scopes and error codes are dropped.

## Not done here

- `packages/mcp` `SNAPSHOT_SOURCES` does not list `agent` yet, so `get_balance_history` and `get_data_coverage` report agent rows as `other` until PR D adds it.
- E19 account deletion (when it lands) must also delete `import_batches` and `agent_audit_events`.
