# Backend audit, November 2026

Audited commit: `42acb397` (`origin/main` on 2026-11-14). Scope: `apps/backend`, `packages/api-contract`, `packages/banking`, `packages/mcp`, the server side of `apps/web` (Express server, `/api` proxy, loaders' backend client), migrations, Dockerfiles, CI workflows and deploy config.

Method: eleven read-only reviewers, one per dimension (security split in two), each verifying against the code rather than the older audit documents. The performance reviewer ran the real migrations on a throwaway Postgres 16, seeded 2,000 users, 20k accounts, 200k transactions and 480k monthly snapshot rows, and ran `EXPLAIN (ANALYZE, BUFFERS)` on the hot query shapes. The highest-impact findings were then re-checked by hand. No product code was changed.

The fix sequence is in [PLAN.md](./PLAN.md).

## Summary

No critical vulnerability was found. Nothing lets an anonymous caller in, lets one user read another's data, bypasses auth, exposes a secret or turns the proxy into an open relay. All 50 routes were checked; every `:id` lookup is filtered by the signed-in user.

The backend is in better shape than the older audit suggests on security, testing and deploy safety. It falls short of "highest standard" in four places:

1. **Privacy.** A user cannot delete their account or export their data. This is the one finding rated critical, because it blocks a UK consumer beta.
2. **The bank-connection path.** It is behind `BANK_CONNECTIONS_ENABLED` (off by default), and it is not safe to turn on: a failed balance call is saved as £0, token refresh cannot work, sync can create duplicate accounts, there are no timeouts, and consent is never revoked at the bank.
3. **Database basics.** The six core tables have no index on `user_id`, there are no pool or statement timeouts, almost no foreign keys, and backups are manual and untested.
4. **Structure and type safety.** The backend compiles with `strict: false`, controllers hold business logic, and the web and MCP clients cast responses instead of parsing them with the contract.

## Scorecard

| # | Dimension | Score | One-line reason |
|---|---|---|---|
| 1 | Architecture | 5.5 | No cycles and a clean MCP direction, but one flat module, logic in controllers, two bank-provider interfaces |
| 2 | Code quality | 6 | Few escape hatches, but `strict: false`, about 52 `any` in services, no error taxonomy for providers |
| 3 | Security | 7.5 | Backend routes 8, MCP 8, web server 8, banking 6, supply chain 7. No critical or high vulnerability |
| 4 | Data integrity | 6.5 | Money is `numeric(12,2)` and migrations are drift-tested, but sign rule gaps, no foreign keys, duplicate-account race |
| 5 | Performance | 6 | No N+1 on reads, but core tables are sequentially scanned and the pool has no limits |
| 6 | Reliability | 6 | Health, shutdown and web client are solid; the bank path has no timeouts, retries or working refresh |
| 7 | Observability and operations | 6 | Sentry scrubbing and JSON logs are strong; backups, alerting, metrics and audit trails are not in place |
| 8 | Testing and CI | 7.5 | Real Postgres, automatic authz matrix, contract coverage; branch protection does not require half the gates |
| 9 | API design | 6.5 | One tested manifest and generated OpenAPI; no pagination, several error shapes, versioning on paper only |
| 10 | Privacy and compliance | 4 | Good scrubbing and token handling; no erasure, no export, no retention, no consent records |
| 11 | Bank-connection launch gate (added) | 3 | See below |

**Why an eleventh gate.** Most of the high findings sit in one feature that a single environment variable switches on. A dimension score hides that. The bank path needs its own pass/fail gate, enforced in code (a boot check that refuses `BANK_CONNECTIONS_ENABLED=true` until the gate conditions are met), so it cannot be enabled by accident.

### Evidence per dimension

**1. Architecture (5.5).** Good: no `forwardRef`, no import cycles, about 10.2k non-test lines, calculations live in `@flump/finance-engine`, identity sits behind an adapter, `@flump/mcp` owns the protocol and the backend supplies adapters. Weak: everything is registered in one `AppModule` (`apps/backend/src/app.module.ts:36-82`); budget and tax have no service layer; controllers build their own services when a test passes a mock; `packages/banking` and `apps/backend/src/providers` define two different provider interfaces; the web app has its own HTTP client and `packages/api-client` is unused.

**2. Code quality (6).** Good: 0 `@ts-ignore`, 2 `as unknown as`, 7 justified `biome-ignore`, 1 TODO, almost no `console.*`, Nest exceptions used consistently (80 BadRequest, 27 NotFound, 6 Conflict), a global exception filter. Weak: `apps/backend/tsconfig.json` sets `strict: false` and `noUncheckedIndexedAccess: false`; Biome disables `noExplicitAny` and `noUnusedVariables` (`biome.json:91,96`); 37 raw `throw new Error` in non-test source; no dead-code tool.

**3. Security (7.5).** Good: JWT issuer, algorithm (RS256) and `client_id` pinned (`auth/workos-jwt.verifier.ts:73-87`); dev bypass refuses to boot outside development; allow-list field copying everywhere; all raw SQL parameterised; bank tokens AES-256-GCM with a random IV; helmet with HSTS; exact-origin CORS; MCP tokens stored as SHA-256 hashes with forced expiry and read-only scopes; the `/api` proxy is an exact allow-list with CSRF header and origin checks; `bun audit` clean. Weak: no global auth guard (each controller must remember `@UseGuards`, though a test catches omissions); CSP is report-only; bank OAuth state is predictable; rate limits are in memory.

**4. Data integrity (6.5).** Good: `numeric(12,2)` with a shared transformer and no `parseFloat`; `synchronize` cannot run in production; migrations run before listen under an advisory lock and are tested for drift against entities; snapshots have a unique `(account_id, year, month)` index, CHECK constraints and Europe/London month logic; imports have an idempotency key and a per-user lock. Weak: one foreign key in the whole schema; `account_id` columns are `varchar` while `accounts.id` is `uuid`; multi-step deletes are not transactional; timestamps have no time zone.

**5. Performance (6).** EXPLAIN results at the seeded size:

| Query shape | Plan today | Today | With index | Index |
|---|---|---|---|---|
| Transactions by user, newest first | Parallel Seq Scan | 84.6 ms | 1.8 ms | `transactions(user_id, "timestamp" DESC)` |
| Transactions by account | Seq Scan | 27.1 ms | 0.18 ms | `transactions(account_id)` |
| Accounts by user (every page) | Seq Scan | 5.8 ms | 0.16 ms | `accounts(user_id, created_at)` |
| Monthly details for a user's accounts | Seq Scan on accounts | 16.4 ms | 3.9 ms | same |
| Tax records by user, newest first | Seq Scan | 33.6 ms | 0.44 ms | `tax_records(user_id, date DESC)` |
| Budget entries by user | Seq Scan | 17.9 ms | 0.15 ms | `budget_entries(user_id, created_at)` |
| Import revert `NOT EXISTS` on transactions | Seq Scan, 200k rows | 63.0 ms | 0.12 ms | `transactions(account_id)` |
| Delete one account's transactions | Seq Scan | 38.3 ms | 0.56 ms | `transactions(account_id)` |
| Stale import batches | Index Scan | 0.07 ms | n/a | already fine |

Sequential-scan cost grows with the total number of users, not with one user's data, so these numbers get worse after launch. Good: no lazy relations, accounts and details load in two queries, imports are capped at 5,000 rows, receipts are `select: false`, loaders fan out in parallel with an 8 s timeout.

**6. Reliability (6).** Good: `/health/ready` checks the database and pending migrations and Railway gates on it (`health/health.controller.ts:41-69`, `apps/backend/railway.json`); shutdown hooks on both tiers, with the web server draining inside Railway's 15 s window (`apps/web/server/shutdown.ts:28-66`); no in-process cron, so nothing double-runs across replicas; snapshot writes are idempotent upserts. Weak: every bank provider call lacks a timeout, retry and 429 handling; the pool has no limits.

**7. Observability and operations (6).** Good: Sentry starts first, collects no request or body data, scrubs in `beforeSend`, drops 4xx noise; production logs are one scrubbed JSON line; access logs on both tiers; boot guards for DB config, the banking key, `AUTH_DEV_BYPASS` and `DB_SYNCHRONIZE`; multi-stage Docker with a pinned base and non-root user; staging and runbooks exist. Weak: the request id is not forwarded from web to backend and is not on service log lines; tracing is off and there are no metrics; alerting and backups are documented but not set up or drilled.

**8. Testing and CI (7.5).** Good: 76 backend spec files (about 703 tests), coverage floors enforced in CI (backend 90/74/84/91), a Postgres 18 service container with `REQUIRE_DB_TESTS=1`, migrations tested from empty including `down()`, an authz matrix generated from Nest's route metadata that fails when a route has no row, cross-user tests over real HTTP, manifest-to-route and web-call-to-route checks, 202 hand-derived UK tax vectors. Weak: branch protection, GitHub secret scanning, report-only Semgrep, unsigned tax vectors, no provider failure-mode tests, no load test.

**9. API design (6.5).** Good: one manifest for 50 routes with tests; request validation on by default and a typo in `CONTRACT_MODE` still enforces; response mismatches log and never 500; other users' rows return 404; OpenAPI generated from zod with a drift snapshot. Weak: listed under M-API below.

**10. Privacy (4).** Good: no analytics SDKs, no `setUser`, no account numbers, sort codes, IP addresses or emails stored; bank-connection responses go through an allow-list; MCP is anonymised by default; the financial reset is transactional and audited. Weak: listed under C1, H9, H10 and M-PRIV below.

**11. Bank-connection launch gate (3).** Findings H2 to H5, H10 and M4 all apply the moment the flag is on. Positive: outbound hosts are hard-coded (no SSRF), tokens are encrypted, the feature is off by default.

## Findings

Severity: **critical** blocks the beta; **high** means user-visible wrong money, data loss, a legal gap or a hole in the safety net; **medium** should be fixed before general availability; **low** is hygiene. "Flagged" means it only applies when `BANK_CONNECTIONS_ENABLED` is on.

### Critical

**C1. A user cannot delete their account.**
Where: only per-item deletes exist (`finance.controller.ts:162,210`, `mcp.controller.ts:80`, `budget.controller.ts:338`, `tax.controller.ts:302`). Nothing deletes `user_profiles`, `mcp_tokens`, `agent_audit_events`, `import_batches` or the WorkOS user.
Impact: UK GDPR gives every user the right to erasure. Today the only way to honour it is hand-written SQL, and the WorkOS login would survive.
Fix: `DELETE /user-profile` with a typed confirmation phrase and a recent-login check. Revoke bank consent at the provider, delete every table that carries `user_id` in one transaction, delete the WorkOS user, write a tombstone (hashed user id and timestamp). Add a table-coverage test that fails when a new entity with `userId` is not handled.

### High

**H1. Backups are manual and no restore has ever been tested.**
Where: `docs/runbooks/backup-restore.md:18-40`, `docs/runbooks/drill-log.md:25` (empty), `docs/runbooks/uptime-and-alerts.md:21`.
Impact: the only backup is one the owner runs by hand. If the database is lost or a bad migration corrupts it, users' financial history could be gone for good.
Fix: confirm Railway point-in-time recovery is on; add a scheduled encrypted `pg_dump` to object storage with a dead-man ping; run one restore drill and log it.

**H2. A failed bank balance call is saved as £0 (flagged).**
Where: `providers/monzo.provider.ts:75-89`, `starling.provider.ts:89-104`, `open-banking-standard.provider.ts:161-176`; then `finance.service.ts:464-471` writes it to this month's snapshot. Same silent pattern returns empty lists at `trading212.provider.ts:140` and `open-banking-standard.provider.ts:226`.
Impact: when the bank's API hiccups, the user's balance becomes a real-looking £0, the month's history is overwritten and net worth drops, with no error shown or logged.
Fix: never default to 0. Throw a typed provider error or return `balance: null`; skip the snapshot write for that account; report a partial sync ("2 of 3 accounts updated").

**H3. Bank token refresh cannot work (flagged).**
Where: `finance.service.ts:305-326` calls `provider.exchangeCode(...)` with the refresh token; each provider's `exchangeCode` sends `grant_type=authorization_code` (for example `monzo.provider.ts:28`). The redirect URI falls back to `http://localhost:5173/auth/callback` (`finance.service.ts:318`).
Impact: once a bank access token expires, every sync fails until the user reconnects.
Fix: add `refreshToken()` to the provider interface using `grant_type=refresh_token`; take a row lock around refresh-and-save so two syncs cannot spend the same rotating token; make the redirect URI required config.

**H4. Bank sync can create duplicate accounts (flagged).**
Where: `finance.service.ts:422-461` looks up then inserts, with no transaction and no unique constraint.
Impact: a double click or a retried request inserts the same bank account twice, so net worth counts it twice.
Fix: partial unique index on `(user_id, connection_id, external_account_id)`, `INSERT ... ON CONFLICT`, one transaction per sync, 409 if a sync is already running.

**H5. No timeout, retry or rate-limit handling on any bank call (flagged).**
Where: every `fetch(` in `apps/backend/src/providers/*.provider.ts` (for example `monzo.provider.ts:35,58,78,105,137`).
Impact: a slow bank holds a request and a database connection open long after the web tier has given up at 10 s; accounts are fetched one after another, so the delay multiplies.
Fix: one shared `providerFetch` with an 8 s `AbortSignal`, one jittered retry on GET for 5xx and network errors, `Retry-After` honoured on 429, typed errors (`AuthExpired`, `RateLimited`, `Unavailable`).

**H6. Creating a liability stores the balance with the wrong sign.**
Where: `account-intake.service.ts:340-358` (`createAccount`) and `snapshots/first-snapshot.ts:33` do not call `storedBalance` (`snapshots/stored-balance.ts:8`); `updateAccount` skips it when only `type` changes; "Student Loan" is not in the liability list (`packages/banking/src/server/orchestrator.ts:188-201`).
Impact: a credit card created with 500 is stored as +500 in the account and its history. The dashboard hides this because the engine takes the absolute value of liabilities, but anything else that reads the raw number (API responses, a future export, MCP tools, SQL sums) sees a debt as an asset. This is live today, not flagged.
Fix: apply `storedBalance` on create and whenever `type` or `balance` changes; decide Student Loan; one data migration that sets liability balances and history to minus their absolute value; a property test that every write path produces the same sign.

**H7. The core tables have no index on the columns every query filters by.**
Where: `migrations/Baseline1794355200000.ts:20-26` creates only primary keys on `accounts`, `transactions`, `tax_records`, `budget_entries`, `bank_connections` and `mcp_tokens`; no later migration adds any.
Impact: every page load reads every user's rows to find one user's. See the EXPLAIN table: 5 to 85 ms today at 2,000 users, growing linearly with sign-ups.
Fix: one migration adding the indexes in the table above plus `bank_connections(user_id)` and `mcp_tokens(user_id)`, with matching `@Index` decorators.

**H8. The database pool has no size, wait or statement limits.**
Where: `config/typeorm.options.ts:65-74` sets no `extra`.
Impact: one slow query or lock wait (imports use `FOR UPDATE`) can occupy the default 10 connections; every other request then waits forever instead of failing fast, and the readiness check starts failing.
Fix: `extra: { max, connectionTimeoutMillis: 5000, idleTimeoutMillis: 30000, statement_timeout: 10000, lock_timeout: 5000, idle_in_transaction_session_timeout: 30000 }`, sized against the Railway plan.

**H9. There is no data export.**
Where: no export route; `docs/legal/data-map.md:34` says so.
Impact: UK GDPR gives users the right to a copy of their data. There is no way to produce one.
Fix: `GET /user-profile/export` returning one JSON document covering every table in the data map, with a coverage test shared with C1.

**H10. Disconnecting a bank does not revoke consent at the bank (flagged).**
Where: `revokeConnection` is declared (`packages/banking/src/server/interface.ts:28`) but only the CSV adapter implements it and nothing calls it; `finance.service.ts:381-403` and `user-profile.service.ts:508` delete rows only, and the first is not in a transaction.
Impact: the user believes they have disconnected, but the bank still shows Flump as having access until consent expires.
Fix: revoke at the provider (best effort, logged, retried) before deleting; wrap the delete in a transaction.

**H11. The merge gate is weaker than the CI design assumes.**
Where (GitHub settings, read with `gh api`): required checks are Vitest, Build, Lint & Type Check and the two Storybook a11y jobs; `strict` is false; admins are exempt. Not required: E2E smoke, Docker images, dependency audit, gitleaks, ops script tests. The a11y jobs have `continue-on-error: true` (`ci-pipeline.yml:264`). GitHub secret scanning and push protection are off; Semgrep is report-only (`security-scan.yml:92-99`).
Impact: a PR that breaks login in E2E, breaks the production image or adds a leaked token can merge green. A PR behind `main` merges without being re-tested, which `AGENTS.md` section 5 says cannot happen.
Fix: require those checks, turn on `strict` and admin enforcement, enable secret scanning with push protection, make Semgrep or CodeQL blocking with a baseline.

**H12. Sensitive actions leave no audit record, and the audit retention job never runs.**
Where: `agent/agent-audit.service.ts:96` (`purgeOlderThan13Months` has no caller; there is no scheduler); no record for token mint or revoke (`mcp.controller.ts:58,80`), bank connect or disconnect (`finance.controller.ts:189,210`) or account delete (`finance.controller.ts:162`); per-call MCP audit is not wired (`agent-audit.service.ts`, comment near line 60).
Impact: if a token leaks or a user disputes an action there is no trail to check, and the stated 13-month retention is not being applied.
Fix: one append-only `audit_events` table written by a small `AuditService`; wire the MCP tool wrapper (`packages/mcp/src/define-tool.ts`); a daily retention job run as a Railway cron service, not in-process.

### Medium

Data and correctness

- **M1. Tax records dated 1 to 5 April land in the wrong tax year.** `packages/finance-engine/src/tax-calculator.ts:184-195` treats any April date as the new year (documented there as known issue (f)); `getUkTaxYearForDate` (`uk-tax-year.ts:99`) is correct. A receipt dated 3 April 2026 is filed under 2026/27. Fix: build on `getUkTaxYearForDate` and backfill `end_date`.
- **M2. Almost no foreign keys.** Only `account_details.import_batch_id` has one; `account_details.account_id` and `transactions.account_id` are `varchar` against a `uuid` key; `deleteAccount` (`account-intake.service.ts:444-455`) is not transactional. A failure part-way leaves orphan history. Fix: convert to `uuid`, add FKs with `ON DELETE CASCADE`, wrap deletes.
- **M3. The tax bulk endpoint writes without a transaction.** `tax.controller.ts:258-262`. A failure half-way leaves some records written. Fix: move to a `TaxService` and wrap in `dataSource.transaction`.
- **M4. Bank OAuth state is predictable (flagged, not yet reachable).** `finance.service.ts:239` builds `institutionId:userId`. No callback route exists today; if one is added as-is, an attacker could link their bank to a victim's account. Fix: random, single-use, server-stored state plus PKCE.
- **M5. Timestamps have no time zone.** Every timestamp column is `timestamp`; correctness depends on both Node and Postgres running in UTC, which nothing pins. Fix: pin `TZ=UTC` and the connection time zone now; migrate to `timestamptz` later.
- **M6. Money inputs rely on the contract alone.** Budget, tax and transaction handlers pass `amount` through untyped (`budget.controller.ts:289,329`, `tax.controller.ts:42-60`). In enforce mode the contract rejects bad values; with `CONTRACT_MODE=shadow` or `off` a string or a third decimal reaches Postgres. Fix: handlers consume the parsed contract output (see M-API3) and production refuses non-enforce modes.
- **M7. No protection against double submits or concurrent edits.** Only imports take an idempotency key; there is no `If-Match`. A double click creates two accounts; two tabs overwrite each other. Fix: `Idempotency-Key` on create POSTs, `updatedAt` precondition on PATCH.

Security

- **M8. The full Content Security Policy only reports.** `apps/web/app/security/csp.server.ts:13`, `headers.server.ts:11`. If an XSS bug ships, the browser still runs the injected script. Fix: enforce once reports are clean.
- **M9. All web users share one per-IP rate-limit bucket at the backend.** `security/rate-limit.decorator.ts:28`, `config/security.config.ts:31`: the ceiling is 300 a minute per IP and the web server is one IP, while a single user may make 600. One busy user can lock everyone out (depends on network path; not confirmed in production). Fix: exempt the authenticated web server or key on a signed client-IP header.
- **M10. Rate limits live in process memory.** `security/rate-limit.store.ts:20-26`, `api-proxy.server.ts:52`, `packages/mcp/src/auth/*-limiter.ts`. They reset on every deploy and multiply by replica count. Fix: Postgres-backed store for the credential, token-mint and destructive buckets.
- **M11. The bank-token key cannot be rotated.** `packages/banking/src/server/crypto.ts:18-66`: one key, no version prefix, no associated data. A leaked key means every user must reconnect. Fix: `v1:` prefix, key list, `connectionId` as AAD, rotation runbook.
- **M12. Open beta when the allow-list is unset.** `auth/beta-access.ts:32`. Fix: refuse to boot in production with neither list set unless `BETA_OPEN=true`.

API

- **M-API1. List endpoints are unbounded.** `GET /transactions` (`finance.service.ts:98-107`), `/tax-records` (`tax.controller.ts:146`), `/budget-entries` (`budget.controller.ts:218`), `/account-details`. Impact is low today because synced transactions are not stored and the web app does not call `/transactions`. Fix: `?cursor=&limit=` with a server maximum and a `{items, nextCursor}` envelope.
- **M-API2. Several error shapes, none in the contract.** Nest default, `rate_limited` (`rate-limit.http.ts:17`), `not_found` (`imports-access.guard.ts:20`), validation `issues`. The frontend has to parse message strings. Fix: one `{code, message, issues?, requestId}` envelope from the global filter, with an `ErrorResponse` schema in the contract and OpenAPI.
- **M-API3. The contract validates requests but handlers do not use the result.** `contract/contract-shadow.interceptor.ts:127` passes the raw body on; unknown keys are neither stripped nor rejected; hand-written DTOs duplicate the schemas. Fix: replace `req.body`, `query` and `params` with the parsed output and type handlers with `z.infer`.
- **M-API4. Clients cast responses.** `apps/web/app/services/backend-client.server.ts:73` (`JSON.parse(text) as T`), `packages/mcp/src/transports/stdio.ts:19,60`. A backend shape change shows up as `undefined` deep in the UI. Fix: one contract-typed client that `safeParse`s responses, used by web and MCP.
- **M-API5. Status codes and versioning.** No `@HttpCode` anywhere, so every POST returns 201 and OpenAPI documents only 200 (`openapi.ts:48`); `/v1` exists as an alias but clients call unversioned paths and nothing in CI flags a breaking change. Fix: correct codes, move clients to `/v1`, add an OpenAPI breaking-change check.

Reliability and operations

- **M13. Provider failures surface as 500s.** 37 raw `throw new Error` (for example `monzo.provider.ts:45,65`); expired consent is indistinguishable from an outage (`finance.service.ts:355-366`). Fix: the typed errors from H5, mapped in the global filter to a `needs_reconnect` state.
- **M14. A request cannot be followed across tiers.** The web server does not send `x-request-id` (`backend-client.server.ts:49`); the backend has no `AsyncLocalStorage` context, so service log lines carry no id. Fix: forward the id and attach it to every log line.
- **M15. No metrics, tracing or slow-query log.** `sentry.ts:72` (`tracesSampleRate: 0`), no `maxQueryExecutionTime`. Slow pages are invisible until users complain. Fix: slow-query logging, structured outcome events, a low scrubbed trace sample.
- **M16. Alerting exists only as a runbook.** `docs/runbooks/uptime-and-alerts.md:5-42`. Fix: set up, test each alert, record it.
- **M17. Runtime images carry dev dependencies and source.** `apps/backend/Dockerfile:21,32-35`, `apps/web/Dockerfile:41-43`; base image pinned by tag, not digest. Fix: production-only install stage, digest pin.
- **M18. Config is validated in pieces.** 30 `process.env` reads across 19 files; missing `CORS_ALLOWED_ORIGINS` or `MCP_AUDIT_HMAC_KEY` only shows at runtime (`cors.config.ts:40-44`, `agent-audit.service.ts:69`). Fix: one zod env schema per service that fails at boot.

Privacy

- **M-PRIV1. "Reset all financial data" leaves data behind.** `user-profile.service.ts:517-541` keeps housing costs, student loan plans, birth year, tax region and employment type; MCP tokens survive. Fix: clear them and revoke tokens.
- **M-PRIV2. Nothing is ever purged.** Import batches expire only when read (`imports.service.ts:543`); revoked tokens stay. Fix: the retention job from H12.
- **M-PRIV3. No consent records.** No terms version, acceptance time, bank-consent or AI-access record. Fix: a `consents` table written at sign-up, bank connect and token mint.
- **M-PRIV4. Free-text names reach the LLM in anonymised mode.** `packages/mcp/src/tools/read/getBudgetSummary.ts:86-88` passes budget entry names ("Rent to J Smith") after only a bank-name scrub (`packages/finance-engine/src/anonymise.ts:118`). Fix: category plus ordinal, as income already does.

Structure and quality

- **M19. Controllers hold business logic and build their own services.** `budget.controller.ts:194-345`, `tax.controller.ts:137-311`; `finance.controller.ts:67-103` and `user-profile.controller.ts:33-60` duck-type their first constructor argument to suit test mocks. A missing provider becomes a runtime `undefined` instead of a boot error. Fix: `BudgetService`, `TaxService`, normal injection, `Test.createTestingModule` in specs.
- **M20. Two bank-provider interfaces.** `packages/banking/src/server/interface.ts:7` (only CSV implements it) and `providers/provider.interface.ts:24` (the real providers). Fix: one interface in `packages/banking`, an injectable orchestrator, mock seeds moved to fixtures.
- **M21. Type safety is switched down.** Backend `strict: false`; `req: any` and `Promise<any>` through `user-profile.*` and `finance.*`. Measured cost of fixing: `strict` with `strictPropertyInitialization: false` gives 0 errors today; `noUncheckedIndexedAccess` gives 97. Fix: turn on strict now, the rest behind a ratchet.
- **M22. One flat module.** `app.module.ts:36-82` registers 9 controllers and 14 providers. Fix: one Nest module per domain.
- **M23. Testing gaps.** No tax vector is signed off (`signedOffBy: null` 198 times); fast-check is used in 3 files and not on `uk-tax`; no provider test for 429, timeout or revoked consent; no load test.
- **M24. Duplicate fetches on every page.** `backend-client.server.ts:258-260` fetches `/account-details` although `/accounts` already nests it, and `/user-profile` although `root.tsx:54` has it; `/portfolio-snapshot` runs 4 queries where 2 do (`account-intake.service.ts:457-459`).

### Low

- **L1.** No re-authentication on the destructive reset (`user-profile.controller.ts:84`).
- **L2.** `customBudgetCategories` grows without a cap (`budget.controller.ts:255`).
- **L3.** Account responses include `userId` and `externalAccountId` (`finance.controller.ts:106`).
- **L4.** Receipts are base64 in Postgres with no column encryption (`tax-record.entity.ts:56`).
- **L5.** `BackendError` exists twice (`apps/web/app/services/backend-error.ts`, `packages/api-client/src/backend-error.ts`).
- **L6.** MCP package logs with `console.error` (`packages/mcp/src/transports/http.ts:127,204,293`).
- **L7.** No `bootstrap().catch` or explicit crash policy (`main.ts:1-31`).
- **L8.** GitHub Actions pinned by tag in places, and CI installs with scripts enabled (`.github/actions/bun-setup/action.yml:20-36`, `ci-pipeline.yml:40,170`).
- **L9.** Dependency audit only warns on `main` (`ci-pipeline.yml:554-581`).
- **L10.** Docker job runs only on manifest or Dockerfile changes (`ci-pipeline.yml:439`); E2E retries once (`apps/e2e/playwright.config.ts:30`).
- **L11.** Route naming oddities: `GET /account-details`, `PUT /accounts/:id` alias, `/bank-connections/:id/refresh` alias, verbs under `/user-profile`, `/budget-entries/categories`, `/mcp-tokens/context-pack`.
- **L12.** Money is a JSON number on the wire and the liability-sign comments disagree (`primitives.ts:14` against `accounts.ts:128`).
- **L13.** Per-item query loops on write paths (`finance.service.ts:394-398,421-471`, `imports.service.ts:492-498`).
- **L14.** Browser source maps are not uploaded to Sentry.
- **L15.** No optimistic locking column on any entity.
- **L16.** Rollback runbook has steps marked unverified (`docs/runbooks/first-deploy-pr368.md:347-378`); no incident runbook.
- **L17.** No dead-code tool (knip); files over 650 lines: `imports.service.ts` (712), `user-profile.service.ts` (677).

## Status of the known open items

| Item | Status |
|---|---|
| Rate limiters in memory per process | Confirmed (M10) |
| Bank connections deleted without revoking consent | Confirmed (H10) |
| `GET /transactions` has no row limit | Confirmed, low impact today (M-API1) |
| Account creation skips the stored-balance sign rule | Confirmed, wider than stated (H6) |
| `CONTRACT_MODE` defaults to enforce | Confirmed and correct; the gap is that production still accepts `shadow` and `off` (M6) |

## Not verified

- Whether Railway point-in-time recovery is enabled, and the plan's `max_connections`.
- Whether the web server reaches the backend over the private network (affects M9 and `trust proxy`).
- Whether `BETA_ALLOWED_*` is set in production (M12).
- How GitHub reports a failed job that has `continue-on-error` when it is a required check (H11).
- Whether the WorkOS SDK applies its own request timeout.
