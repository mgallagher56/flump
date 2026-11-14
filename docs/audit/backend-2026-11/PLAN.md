# Backend fix plan, November 2026

Source: [AUDIT.md](./AUDIT.md) at commit `42acb397`. Fourteen PRs in six waves. Each PR is one fix session, branched from `main`, never stacked on an open PR.

Path shorthand: `be/` means `apps/backend/src/`.

## Rules for every fix session

- **Ownership.** A session edits only the files its PR owns. If it needs another file, it stops and reports.
- **Migrations.** Each PR adds its own new file in `be/migrations/`. Take the timestamp when the PR is opened, not when work starts. After every rebase, re-run `be/migrations/migrations.integration.spec.ts` (drift and `down()`), and bump the timestamp if a newer migration has landed on `main`.
- **Single-owner files per wave.** `be/app.module.ts`, `be/config/typeorm.options.ts` (the explicit `ENTITIES` list), `packages/api-contract/src/manifest.ts`, `.github/workflows/ci-pipeline.yml` and `apps/web/app/services/backend-client.server.ts` have exactly one owner in each wave, named below.
- **New gates do not edit the workflow.** BE-01 adds a runner that executes every file in `scripts/backend-laws/`. Later PRs add a law file there, so only BE-01 touches `ci-pipeline.yml`.
- **Pre-flight.** AGENTS.md section 5: lint, check-types, `check:laws`, tests for the changed package. Ready only when CI is green.
- **Model tier.** `opus` for every fix session (all involve new logic). `sonnet` only for rebases and baseline regeneration.

## Sessions in flight

| Session | Touches | Planned PRs that must wait for it to merge |
|---|---|---|
| MCP write tools | `be/mcp.*`, `be/agent/`, `packages/mcp` | BE-06, BE-09, BE-10, BE-11, BE-13, BE-14 |
| Import preview | `be/imports/`, imports part of `packages/api-contract` | BE-09, BE-10, BE-13, BE-14 |

BE-04 appends two routes to `manifest.ts` and does not wait. If import preview is still open, whichever merges second rebases; both edits are additive.

## Wave 0: foundations (parallel group A)

Small, disjoint, merged first. BE-04 may start as soon as BE-02 is merged.

### BE-01 Merge gate and CI hardening
- **Findings:** H11, M17, L8, L9, L10; gate scaffolding for M21.
- **Changes:** stable job names and a required-check list; remove `continue-on-error` from a11y; Semgrep blocking with a baseline; Docker build and boot smoke on any backend, web or lockfile change; production-only install stage and digest-pinned base images; actions pinned by SHA, installs with scripts off; dependency audit blocking; `scripts/check-backend-laws.ts` runner added to `check:laws`; backend `strict: true` with `strictPropertyInitialization: false` (0 errors today); `noExplicitAny` ratchet that fails only on an increase.
- **Owns:** `.github/`, `apps/*/Dockerfile`, `apps/backend/tsconfig.json`, `scripts/check-backend-laws.ts`, `scripts/backend-laws/` (runner and any-ratchet only), `scripts/ci-config.test.ts`, root `package.json`.
- **Acceptance:** a PR behind `main` cannot merge; a failing E2E, Docker, gitleaks, audit or ops-script job blocks merge; a new `any` in `apps/backend` fails `check:laws`.
- **Tests:** `ci-config.test.ts` asserts the required-check list matches workflow job names; Docker boot smoke hits `/health/ready`.
- **Owner action:** GitHub branch protection (required checks, `strict`, admin enforcement), secret scanning and push protection.

### BE-02 Database foundations
- **Findings:** H7, H8, M5 (pin only).
- **Changes:** one migration with the indexes in the audit table plus `bank_connections(user_id)` and `mcp_tokens(user_id)`; matching `@Index` decorators; pool `extra` limits; `TZ=UTC` and connection time zone pinned; index and foreign-key law.
- **Owns:** `be/config/typeorm.options.ts`, `be/config/db.config.ts`, `be/entities/*` (decorators only), one migration, `scripts/backend-laws/check-table-laws.ts`.
- **Acceptance:** `EXPLAIN` shows index scans for the audit's query shapes; a held lock fails a second request within 5 s; a new entity with `userId` and no index fails the law.
- **Tests:** real-Postgres integration asserting plan node types and the lock timeout; migration `down()` test.
- **Migration:** create indexes `CONCURRENTLY` (non-transactional migration). Rollback: `down()` drops them; pool limits revert by env.
- **Owner action:** confirm Railway `max_connections` to size `max`.

### BE-03 Backups, restore drill and alerting
- **Findings:** H1, M16, L16.
- **Changes:** scheduled encrypted `pg_dump` to offsite storage with a dead-man ping; restore script; first drill logged; alerts set up and each one tested; rollback runbook verified; incident runbook; drill-freshness law.
- **Owns:** `scripts/ops/`, `docs/runbooks/`, `.github/workflows/backup.yml` (new), `scripts/backend-laws/check-restore-drill.ts`.
- **Acceptance:** a dump restores into an empty Postgres and passes the migrations check; `drill-log.md` has a dated entry; the law fails when the last drill is older than 90 days.
- **Tests:** ops script tests for dump, restore and the freshness parser.
- **Owner action:** Railway PITR confirmation, storage bucket and encryption key, Sentry and uptime alerts. Blocked by decision D12.

## Wave 1: live privacy and money correctness (parallel group B)

### BE-04 Account deletion, export and full reset
- **Findings:** C1, H9, M-PRIV1, L1.
- **Changes:** `DELETE /user-profile` with typed phrase and recent-login check, one transaction over every `user_id` table, WorkOS user deleted, tombstone written; `GET /user-profile/export` as one JSON document; reset clears the leftover profile fields and revokes MCP tokens; a bank-revoke seam that logs until BE-12 fills it; settings actions in the web app (AGENTS.md sections 1 and 2 apply to any new component).
- **Owns:** `be/user-profile.*`, `be/privacy/` (new), `be/app.module.ts`, `be/config/typeorm.options.ts`, `manifest.ts` (two routes), `packages/api-contract/src/profile*`, `docs/legal/data-map.md`, the web settings feature folder and proxy allow-list entry.
- **Acceptance:** after deletion no table holds the user's id and the WorkOS login is gone; export covers every table in the data map; a new entity with `userId` fails CI until deletion and export handle it.
- **Tests:** user-data coverage test (shared by delete and export); real-Postgres integration for the transaction and its rollback; authz matrix rows; contract tests; component test for the confirmation.
- **Migration:** tombstone table. Rollback: revert; no user data is altered by the migration.
- **Blocked by:** D1 (tombstone), D2 (export format).

### BE-05 Liability sign rule
- **Findings:** H6; L12 (comments only).
- **Changes:** `storedBalance` applied on create, first snapshot and any `type` or `balance` change; Student Loan added to the liability list; data migration setting liability balances and history to minus their absolute value; contract comments aligned.
- **Owns:** `be/account-intake.service.ts`, `be/snapshots/`, `packages/banking/src/server/orchestrator.ts`, `packages/api-contract/src/domains/accounts*`, one migration.
- **Acceptance:** every write path stores a liability as negative; dashboard totals are unchanged before and after the migration.
- **Tests:** property test over all write paths; real-Postgres migration test with mixed-sign fixtures; contract test.
- **Migration:** idempotent backfill. `down()` cannot restore the old signs; the rollback is the pre-deploy dump, so BE-03 merges first.
- **Blocked by:** D3 (Student Loan).

## Wave 2: audit, hardening, integrity (parallel group C)

BE-07 and BE-08 run in parallel. BE-06 starts after BE-07 and the MCP session merge, because all three touch `typeorm.options.ts` or MCP code.

### BE-06 Audit trail, retention and consents
- **Findings:** H12, M-PRIV2, M-PRIV3, M-PRIV4, L6.
- **Changes:** append-only `audit_events` and `AuditService`; records for token mint and revoke, bank connect and disconnect, account delete; MCP per-call audit wired in `define-tool.ts` (skip whatever the MCP write-tools session has already wired); daily retention job (audit events, stale import batches, revoked tokens); `consents` table; budget names replaced by category plus ordinal in anonymised mode; MCP logging through the logger.
- **Owns:** `be/audit/`, `be/jobs/`, `be/agent/`, `be/mcp.*`, `be/finance.controller.ts`, `be/app.module.ts`, `be/config/typeorm.options.ts`, `packages/mcp/`, `packages/finance-engine/src/anonymise.ts`, one migration.
- **Acceptance:** each listed action writes one event; the job deletes rows past retention and is safe to run twice; the coverage test from BE-04 passes with the new tables.
- **Tests:** real-Postgres integration for the job; authz matrix rows; MCP tool test for the anonymised output.
- **Owner action:** Railway cron service. Blocked by D4 (retention) and D5 (where jobs run).

### BE-07 Security, config and observability hardening
- **Findings:** M8, M9, M10, M12, M14, M15, M18, L7, L14; M6 (production refuses non-enforce); launch-gate boot check.
- **Changes:** one zod env schema validated at boot; boot refuses an open beta without `BETA_OPEN=true`, refuses `CONTRACT_MODE` other than enforce in production, and refuses `BANK_CONNECTIONS_ENABLED=true` until a gate constant is true; Postgres rate-limit store for credential, mint and destructive buckets; web server exempted or keyed by signed client IP; request id forwarded and held in `AsyncLocalStorage`; slow-query log; low trace sample; CSP enforced; browser source maps uploaded.
- **Owns:** `be/config/` (not `typeorm.options.ts` beyond one entity line, hence the BE-06 ordering), `be/security/`, `be/observability/`, `be/instrument.ts`, `be/main.ts`, `be/auth/beta-access.ts`, `apps/web/app/security/`, `apps/web/server/`, `backend-client.server.ts`, one migration.
- **Acceptance:** boot fails with a named error for each missing variable; limits survive a restart; one request id appears on web and backend log lines; setting the bank flag fails boot.
- **Tests:** config unit tests per guard; real-Postgres rate-limit integration; request-id integration over HTTP.
- **Owner action:** Railway variables, Sentry source-map token. Decisions D6, D7 and D8 apply.

### BE-08 Data integrity II
- **Findings:** M1, M2, M3, M24 (backend half), M23 (tax vectors and properties), L2.
- **Changes:** tax year built on `getUkTaxYearForDate` with an `end_date` backfill; `account_id` columns converted to `uuid` with cascading foreign keys; `deleteAccount` and the tax bulk write wrapped in transactions; `/portfolio-snapshot` cut to two queries; cap on `customBudgetCategories`; fast-check on `uk-tax`; unsigned-vector ratchet.
- **Owns:** `be/account-intake.service.ts`, `be/tax.controller.ts`, `be/budget.controller.ts`, `be/entities/account-detail.entity.ts`, `be/entities/transaction.entity.ts`, `packages/finance-engine/src/` tax files, `scripts/tax-signoff.*`, one migration.
- **Acceptance:** a record dated 3 April 2026 files under 2025/26; a failed bulk write leaves no rows; deleting an account leaves no orphans.
- **Tests:** property tests; real-Postgres integration for both transactions; migration test with orphan fixtures.
- **Migration:** delete or report orphans before adding foreign keys; the session reports counts first. Rollback: `down()` drops the keys and restores `varchar`.
- **Owner action:** sign off tax vectors.

## Wave 3: API server and bank providers (parallel group D)

Starts after wave 2 and both in-flight sessions merge.

### BE-09 API contract, server side
- **Findings:** M-API1, M-API2, M-API3, M-API5 (status codes, breaking-change check), M6, M7, L3, L11, L15.
- **Changes:** handlers consume the parsed contract output and unknown keys are rejected; one error envelope from the global filter; cursor pagination with a server maximum; correct `@HttpCode`; `Idempotency-Key` on create POSTs and an `updatedAt` precondition on PATCH; `userId` and `externalAccountId` removed from responses; route aliases tidied.
- **Owns:** `be/contract/`, all controllers, `be/finance.service.ts` (list queries only), `packages/api-contract/` including `manifest.ts`, `be/config/typeorm.options.ts`, `scripts/backend-laws/check-openapi-breaking.ts`, one migration.
- **Acceptance:** every error has `{code, message, requestId}`; every list has a limit; a repeated key returns the first response; removing a response field fails the OpenAPI check.
- **Tests:** contract tests per route; authz matrix rows; real-Postgres idempotency integration.
- **Blocked by:** D9 (money on the wire).

### BE-11 Bank provider safety (flagged)
- **Findings:** H2 (provider side), H5, M13 (typed errors), M20, M23 (provider fixtures).
- **Changes:** shared `providerFetch` with an 8 s abort, one jittered GET retry and `Retry-After`; typed errors; no default to 0 or empty list; one provider interface in `packages/banking` with `refreshToken` and `revokeConnection`; mock seeds moved to fixtures.
- **Owns:** `be/providers/`, `packages/banking/src/` except `crypto.ts` and `orchestrator.ts`.
- **Acceptance:** no provider returns a balance when the call failed; every provider passes the failure-mode suite.
- **Tests:** provider fixture tests for 429, timeout, 5xx, revoked consent and malformed body, per provider.

## Wave 4: clients and bank sync (parallel group E)

### BE-10 Contract-typed clients
- **Findings:** M-API4, M-API5 (`/v1`), M24 (web half), L5.
- **Changes:** one client in `packages/api-client` that `safeParse`s responses; web and MCP use it; clients call `/v1`; duplicate page fetches removed; one `BackendError`.
- **Owns:** `packages/api-client/`, `backend-client.server.ts`, `apps/web/app/services/backend-error.ts`, `packages/mcp/src/transports/`.
- **Acceptance:** no `as T` on a response; a shape mismatch raises a typed error with the request id.
- **Tests:** contract tests against recorded responses; web-call-to-route check on `/v1`.
- **Blocked by:** BE-09 merged; D10.

### BE-12 Bank sync, tokens and consent (flagged)
- **Findings:** H2 (sync side), H3, H4, H10, M4, M11, M13 (`needs_reconnect`), L13 (finance part).
- **Changes:** refresh under a row lock with required redirect URI; partial unique index and `ON CONFLICT`, one transaction per sync, 409 when one is running; failed accounts skipped and reported as partial; revoke at the provider on disconnect and on account deletion; random single-use state with PKCE; versioned key with `connectionId` as AAD and a rotation runbook; launch gate flipped last.
- **Owns:** `be/finance.service.ts`, `be/finance.controller.ts`, `be/bank-connection*`, `be/entities/bank-connection.entity.ts`, `packages/banking/src/server/crypto.ts`, `manifest.ts` (bank routes), `be/config/typeorm.options.ts`, one migration.
- **Acceptance:** two concurrent syncs create one account; an expired token refreshes; a failed balance never writes a snapshot; the boot check passes only with all gate conditions met.
- **Tests:** real-Postgres concurrency integration; provider fixture tests for refresh and revoke; authz matrix rows.
- **Migration:** deduplicate before the unique index; re-encrypt tokens to `v1:` lazily on read. Rollback: old ciphertext stays readable.
- **Blocked by:** BE-09 and BE-11 merged; D11.

## Wave 5: structure (one at a time, nothing else open)

These move or retype most backend files, so they run alone after all behaviour fixes. Running them earlier would force every other PR to rebase across moved files.

### BE-13 Domain modules and service extraction
- **Findings:** M19, M22, L13 (imports part), L17 (file size).
- **Changes:** one Nest module per domain; `BudgetService` and `TaxService`; normal injection and `Test.createTestingModule`; oversized services split. No behaviour change.
- **Owns:** all of `be/`.
- **Acceptance:** no controller builds a service; a missing provider fails at boot; OpenAPI snapshot unchanged.
- **Tests:** existing suites pass unmodified apart from test wiring; module boot test.

### BE-14 Strict types and dead code
- **Findings:** M21, L17 (knip).
- **Changes:** `noUncheckedIndexedAccess` on (97 errors); `any` baseline driven down and the ratchet tightened to fail on a stale baseline; `noUnusedVariables` on; knip added.
- **Owns:** `apps/backend/tsconfig.json`, `biome.json`, baselines, type-only edits across `be/`.
- **Acceptance:** zero type errors; baseline at or near zero.
- **Blocked by:** BE-13 merged.

**Deferred, not planned here:** L4 (receipt encryption, revisit after M11), the `timestamptz` migration in M5, and the load test in M23.

## New CI gates so the standard holds

| Gate | Catches | PR | Required |
|---|---|---|---|
| Required-check list, `strict`, admin enforcement | Untested or stale merges | BE-01 | Yes (settings) |
| Secret scanning push protection | Leaked tokens | BE-01 | Yes (settings) |
| Blocking SAST with baseline | New Semgrep findings | BE-01 | Yes |
| Docker boot smoke on every backend change | Broken production image | BE-01 | Yes |
| Backend `strict` and `noExplicitAny` ratchet | Type-safety regressions | BE-01, tightened in BE-14 | Yes, via `check:laws` |
| Index and foreign-key law for new tables | Unindexed `user_id`, missing keys | BE-02 | Yes, via `check:laws` |
| Restore-drill freshness | Untested backups | BE-03 | Yes, via `check:laws` |
| User-data coverage test | Entity missed by deletion or export | BE-04 | Yes, via Vitest |
| Bank launch gate boot check | Flag enabled early | BE-07, flipped in BE-12 | Yes, via Docker smoke |
| Unsigned tax vector ratchet | Vectors added without sign-off | BE-08 | Yes, via `check:laws` |
| OpenAPI breaking-change check | Removed or retyped fields | BE-09 | Yes, via `check:laws` |
| Provider failure-mode fixture suite | A provider without failure handling | BE-11 | Yes, via Vitest |

Ratchets follow the existing pattern: `bun scripts/backend-laws/<name>.ts --write-baseline`, baseline committed.

## Owner decisions

| # | Decision | Options | Recommendation | Blocks, or default |
|---|---|---|---|---|
| D1 | Deletion tombstone | None; keyed hash of user id and time | Keyed hash, kept 24 months. Proves the erasure happened without holding identity. | Blocks BE-04 |
| D2 | Export format | JSON; JSON plus CSV | One JSON document. Complete, and cheap to cover by test. | Default JSON |
| D3 | Student Loan as stored-negative liability | Yes; no | Yes. It is a debt and the engine already treats it as one. | Blocks BE-05 |
| D4 | Retention | Various | Inactive accounts 24 months with notice; audit events 13 months; stale import batches 30 days. Matches the stated 13 months. | Blocks BE-06 |
| D5 | Where jobs run | Railway cron service; in-process | Railway cron. Nothing double-runs across replicas. | Default cron |
| D6 | Rate-limit store | Postgres; Redis | Postgres. No new service to run. | Default Postgres |
| D7 | Tracing | Off; low sample | 2% scrubbed sample. Slow pages become visible at little cost. | Default 2% |
| D8 | Open beta | Allow-list; `BETA_OPEN=true` | Keep the allow-list. | Default allow-list |
| D9 | Money on the wire | Number; string decimal | Keep number, documented in the contract. Values up to `numeric(12,2)` round-trip through a JSON number without loss at 2 decimal places, and changing it breaks every client. | Default number |
| D10 | API versioning | `/v1` now; later | Now, in BE-10, while there are two clients. | Default now |
| D11 | Bank connections in the beta | Ship; stay off | Stay off until BE-11 and BE-12 merge and the boot gate passes. | Does not block the beta |
| D12 | Backups target | PITR only; PITR plus offsite dump | Both. One provider failure must not lose everything. | Blocks BE-03 |
| D13 | Branch protection | Admin exempt; enforced, zero reviews | Enforce for admins, zero required reviews, `strict` on. A solo owner cannot self-review, and CI is the gate. | Blocks BE-01 settings step only |

## Definition of done for the backend

- **Architecture:** one module per domain, one bank-provider interface, no logic in controllers.
- **Code quality:** `strict` and `noUncheckedIndexedAccess` on, `any` baseline near zero, knip clean.
- **Security:** CSP enforced, durable rate limits, key rotation, boot-time config schema, blocking SAST.
- **Data integrity:** one sign rule on every path, foreign keys, transactional multi-step writes, idempotent creates.
- **Performance:** index scans on every hot query, pool and statement limits, no duplicate fetches.
- **Reliability:** every outbound call has a timeout, retry and typed error.
- **Observability and operations:** request id end to end, slow-query log, tested alerts, a restore drill inside 90 days.
- **Testing and CI:** every gate above is a required check.
- **API:** one error envelope, paginated lists, parsed requests and responses, clients on `/v1`.
- **Privacy:** deletion, export, retention job and consent records, all under the coverage test.
- **Bank launch gate:** boot check passes with H2 to H5, H10 and M4 closed.

## Summary

| PR | Title | Wave | Group | Findings | Blocked by |
|---|---|---|---|---|---|
| BE-01 | Merge gate and CI hardening | 0 | A | H11, M17, L8, L9, L10 | D13 (settings) |
| BE-02 | Database foundations | 0 | A | H7, H8, M5 | none |
| BE-03 | Backups, drill, alerting | 0 | A | H1, M16, L16 | D12 |
| BE-04 | Deletion, export, reset | 1 | B | C1, H9, M-PRIV1, L1 | BE-02, D1 |
| BE-05 | Liability sign rule | 1 | B | H6, L12 | BE-03, D3 |
| BE-06 | Audit, retention, consents | 2 | C (after BE-07) | H12, M-PRIV2, M-PRIV3, M-PRIV4, L6 | MCP session, BE-07, D4 |
| BE-07 | Security, config, observability | 2 | C | M6, M8, M9, M10, M12, M14, M15, M18, L7, L14 | wave 1 |
| BE-08 | Data integrity II | 2 | C | M1, M2, M3, M23, M24, L2 | wave 1 |
| BE-09 | API contract, server side | 3 | D | M-API1, M-API2, M-API3, M-API5, M6, M7, L3, L11, L15 | both sessions, wave 2 |
| BE-11 | Bank provider safety | 3 | D | H2, H5, M13, M20, M23 | MCP session |
| BE-10 | Contract-typed clients | 4 | E | M-API4, M-API5, M24, L5 | BE-09 |
| BE-12 | Bank sync, tokens, consent | 4 | E | H2, H3, H4, H10, M4, M11, M13, L13 | BE-09, BE-11 |
| BE-13 | Domain modules | 5 | alone | M19, M22, L13, L17 | all above |
| BE-14 | Strict types, dead code | 5 | alone | M21, L17 | BE-13 |

The beta needs waves 0 to 2. Waves 3 to 5 are for general availability. BE-11 and BE-12 must merge before `BANK_CONNECTIONS_ENABLED` is ever set.
