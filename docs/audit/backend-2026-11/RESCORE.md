# Backend re-score, 14 November 2026

Re-audited commit: `bc10b6e3` (`origin/main` on 2026-11-14), after BE-01 to BE-14, #696 (proxy allow-list), #717 (PAT input route for MCP stdio, client-policy route) and #697 merged. Baseline: [AUDIT.md](./AUDIT.md) at `42acb397`.

Method: two independent read-only reviewers that wrote none of the code. A security reviewer scored dimension 3; a second reviewer scored the other ten. Each checked every original finding against the code and tests as they are now, not against PR descriptions, and looked for new findings the fixes introduced. The claims that move a score most were then re-checked by hand. No product code was changed.

Rule for a 10: no open finding above low, and a CI gate, test or law that stops the finding coming back.

Limits of this re-score:

- No tests or CI checks were run; statuses come from reading code and tests.
- GitHub branch protection and secret-scanning settings, and every Railway setting, were not read (no settings APIs). They are marked "not verified, owner-side".
- PR #709 (accounts and check-in) is open and adds two values to the snapshot `source` CHECK. It is in flight and not scored.
- The owner has deferred backups, off-site storage, encryption-key setup and the restore drill while Flump is in pre-production testing, and bank sync until there is revenue. The "Now" column scores those as they really are. The last column is the score once every agent-fixable PR below is merged and only owner-side items remain.

Paths: `be/` means `apps/backend/src/`.

## Scorecard

| # | Dimension | Before | Now | Owner items only left | Reason |
|---|---|---|---|---|---|
| 1 | Architecture | 5.5 | 9 | 10 | One Nest module per domain with a boundary law, one provider interface, one HTTP client. Low residue only |
| 2 | Code quality | 6 | 9 | 10 | `strict` and `noUncheckedIndexedAccess` on, 0 backend `any`, knip as a law. A few casts and raw throws left |
| 3 | Security | 7.5 | 8.4 | 8.9 | No new finding above low. M9 depends on a key production is not made to set; receipts unencrypted; GitHub settings not verified |
| 4 | Data integrity | 6.5 | 8.5 | 9.5 | Sign rule backed by the database, foreign keys, transactions, `timestamptz`. Web callers rarely send `If-Match` |
| 5 | Performance | 6 | 9 | 9.5 | Indexes proven by a query-plan test, pool limits set. No load test |
| 6 | Reliability | 6 | 8.5 | 9 | Provider timeouts, retries, typed errors, crash policy. Token refresh holds a database lock across an HTTP call; cron services not provisioned |
| 7 | Observability and operations | 6 | 6.5 | 7 | Request id, traces and slow-query log done. Backups and alerts still open; the drill law is advisory |
| 8 | Testing and CI | 7.5 | 8 | 8.5 | Many new laws and gates. Branch protection not verified, 294 tax vectors unsigned, no load test |
| 9 | API design | 6.5 | 8.5 | 10 | One error envelope, pagination law, parsed requests, OpenAPI breaking-change law, `/v1`. Conditional writes barely used |
| 10 | Privacy and compliance | 4 | 7.5 | 8.5 | Deletion, export and retention exist. Tombstone key not required at boot, retention cron not running, no terms consent |
| 11 | Bank-connection launch gate | 3 | 8 | 9 | H2 to H5 and H10 closed in code; the gate constant is still `false`, which is correct |

No dimension is at 10 today. Three (architecture, code quality, API design) reach 10 with agent work alone. The rest also need the owner items in [Owner-only items](#owner-only-items).

Security sub-scores (before, now, owner items only left): backend routes 8, 8.5, 9; MCP 8, 9, 9; web server 8, 9, 9; banking 6, 8, 8.5; supply chain 7, 7.5, 9.

## Evidence per dimension

**1. Architecture (9).**
- Domain modules wired in `be/app.module.ts:48-54`; the domain graph is kept a DAG by `scripts/backend-laws/check-module-boundaries.ts`; boot wiring tested in `be/modules/module-boot.spec.ts`.
- No controller builds its own service. Largest controller: `be/modules/finance/finance.controller.ts`, 252 lines.
- One provider interface, re-exported from `@flump/banking` (`be/modules/banking/providers/provider.interface.ts:8-18`).
- Web and MCP share `packages/api-client` (`apps/web/app/services/backend-client.server.ts:111-117`, `packages/mcp/src/transports/stdio.ts:81`).
- Residue (low): 11 non-test files still read `process.env` directly, for example `be/app.controller.ts:25`.

**2. Code quality (9).**
- `apps/backend/tsconfig.json` sets `strict` and `noUncheckedIndexedAccess`.
- `biome.json:39-69` makes `noExplicitAny` and the unused rules errors for the backend and server packages; `scripts/backend-laws/explicit-any-baseline.json` has no backend entries; `check-dead-code.ts` runs knip.
- Residue (low): 36 raw `throw new Error`, almost all boot config (`be/config/db.config.ts` has 10); 4 `as unknown as` in the backend, 2 in `packages/mcp`.

**3. Security (8.4).**
- Still true: every route has an explicit guard or is on `UNGUARDED_ALLOWLIST` (`apps/backend/test/authz/matrix.ts:110-119`, enforced by `test/authz/route-coverage.spec.ts`); every `:id` lookup is filtered by the signed-in user; JWT issuer, RS256 and `client_id` pinned (`be/auth/workos-jwt.verifier.ts:69-80`); raw SQL parameterised, cursors are bound parameters and every paged query stays user-filtered (`be/contract/pagination.ts:146-184`); proxy is an exact allow-list with CSRF, `Sec-Fetch-Site` and Origin checks (`apps/web/app/services/api-proxy.server.ts:50-80,216-229`).
- CSP is enforced unless `CSP_REPORT_ONLY=true` (`apps/web/app/security/csp.server.ts:22-24,98-120`).
- Sensitive rate-limit buckets are Postgres-backed and fail closed (`be/security/rate-limit.decorator.ts:56-73`, `be/security/pg-rate-limit.store.ts`).
- Bank-token keys are versioned with AAD (`packages/banking/src/server/crypto.ts`); OAuth state is random, hashed, single use, with PKCE (`be/modules/banking/bank-connection-oauth.ts:24-99`).
- Actions are SHA-pinned, installs use `--ignore-scripts`, base images are digest-pinned (`scripts/ci-config.test.ts:212-248`).
- There is still no global auth guard (`be/security/security.module.ts:12` carries only `IpRateLimitGuard`); the route-coverage test is the control.
- Held down by: M9 (key optional, `be/config/env.schema.ts:110`), L4 (`be/entities/tax-record.entity.ts:58`), S1 to S11 below, and unverified GitHub settings.

**4. Data integrity (8.5).**
- One sign rule (`be/modules/snapshots/stored-balance.ts:17`), applied on create and edit (`be/modules/finance/account-intake.service.ts:460,534,571`), backed by a CHECK and trigger (`LiabilitySignRule1794358050000`).
- `account_id` columns are `uuid` with `ON DELETE CASCADE` foreign keys (`AccountIdForeignKeys1794358200000.ts:87`).
- Transactions around tax bulk (`be/modules/tax/tax.service.ts:198,299`), account delete (`account-intake.service.ts:591`) and bank sync (`be/modules/banking/bank-connection-sync.ts:201`).
- All timestamps `timestamptz`; process pinned to UTC (`be/config/timezone.ts:4`).
- Idempotency keys and ETags exist server-side, but of the web callers checked only `BudgetContainer.tsx:229` sends `If-Match` (M7).

**5. Performance (9).**
- Indexes added `CONCURRENTLY` (`AddUserIdIndexes1794358100000.ts:54-83`); `be/migrations/query-plans.integration.spec.ts:77` fails on a Seq Scan on the hot queries.
- Pool and statement limits (`be/config/typeorm.options.ts:93-99`, bounds in `be/config/db.config.ts:42-70`).
- Duplicate page fetches removed (`backend-client.server.ts:95,423`).
- Gaps: no load test; `bank-connection-sync.ts:315-323` compares `"account_id"::text`, which defeats the index.

**6. Reliability (8.5).**
- All bank calls go through `providerFetch` with timeout, one retry and `Retry-After` (`packages/banking/src/server/provider-fetch.ts`); failure modes tested per provider (`provider-failure-modes.spec.ts:78`).
- `bootstrap().catch(crash)` (`be/main.ts:40`); lock and statement timeouts return 503 with `Retry-After` (`be/contract/api-exception.filter.ts:165-171`).
- Token refresh holds a row lock and a pooled connection while waiting on the bank (`bank-connection-sync.ts:128-170`).

**7. Observability and operations (6.5).**
- Request id in `AsyncLocalStorage` (`be/observability/request-context.ts:12`), forwarded by the web server (`backend-client.server.ts:113`).
- Traces sampled (`be/observability/sentry.ts:140`); slow queries logged (`be/observability/slow-query.logger.ts:41`).
- `docs/runbooks/drill-log.md:25-27` has no entries; the drill law cannot fail (`ENFORCED = false`, `scripts/backend-laws/check-restore-drill.ts:25`).
- Alert table in `OWNER-SETUP.md:78-87` is blank.
- Rollback steps still marked unverified (`docs/runbooks/first-deploy-pr368.md:210`).

**8. Testing and CI (8).**
- `.github/required-checks.json` lists 12 required checks with `strict` and admin enforcement; `scripts/ci-config.test.ts:129-191` keeps it in step with the workflows.
- Semgrep fails a PR on new findings (`security-scan.yml:96-120`); gitleaks blocks (`security-scan.yml:45-66`).
- Docker job boots the image and proves boot refuses the bank flag (`ci-pipeline.yml:500-533`).
- Gaps: 294 vectors with `signedOffBy: null` (198 in `uk-tax.vectors.ts`, 96 in `uk-whatif.vectors.ts`); E2E retries once (`apps/e2e/playwright.config.ts:14`); whether the settings in `required-checks.json` are applied on GitHub is not verified.

**9. API design (8.5).**
- One error envelope (`be/contract/api-exception.filter.ts:204-245`, tested in `test/contract/write-conventions.integration.spec.ts:76-105`).
- Pagination law (`packages/api-contract/src/write-conventions.test.ts:21-31`); handlers receive parsed contract output (`be/contract/contract-shadow.interceptor.ts:174-178`).
- Status codes tested (`test/contract/http-status.spec.ts`); breaking OpenAPI changes caught against the merge base (`scripts/backend-laws/check-openapi-breaking.ts`).
- Inconsistency: `mcp-tokens/:id/activity` pages with `before`/`nextBefore` in the body while every other list uses `X-Next-Cursor` (`be/modules/agent/mcp.controller.ts:128-160`).

**10. Privacy and compliance (7.5).**
- Deletion runs in one transaction, sweeps again after commit, then deletes the WorkOS user (`be/modules/privacy/account-deletion.service.ts:98-174`); table coverage enforced both ways (`user-data-registry.spec.ts:35-74`, `user-data.integration.spec.ts:254-322`).
- Export and reset tested (`user-data.integration.spec.ts:451-553`).
- Retention policies in `be/jobs/retention.ts:28-84`, tested in `retention.integration.spec.ts:147-213`.
- `DELETION_TOMBSTONE_KEY` is not in `PRODUCTION_REQUIRED` (`be/config/env.schema.ts:174-180`); unset, erasure answers 503 (`account-deletion.service.ts:52,100`).
- No terms-acceptance record (`OWNER-SETUP.md:264`).

**11. Bank-connection launch gate (8).**
- `BANK_LAUNCH_GATE_PASSED = false` (`be/config/launch-gate.ts:7`) and the Docker smoke proves boot refuses the flag.
- Unique index plus `ON CONFLICT`, one sync at a time (`BankSyncIntegrity1794358400000.ts:56`, `bank-connection-sync.ts:15,250`).
- A failed balance call skips the account and reports a partial sync, never 0 (`bank-connection-sync.ts:211-223`).
- Consent revoked at the bank with one inline retry (`be/modules/banking/bank-connection-consent.ts:96-107`).
- Not at 10: N7/S11, S3, S4, no durable revoke retry, no test against a real bank sandbox.

## Original findings

Closed, with a regression gate: C1 (in code; see N1), H2, H3, H4, H5, H6, H7, H8, H9, M1, M2, M3, M4, M5, M6, M8, M11, M12, M13, M14, M15, M18, M19, M20, M21, M22, M24, M-API1, M-API2, M-API3, M-API4, M-API5, M-PRIV1, L1, L2, L3, L5, L7, L8, L13, L15 (server side), L17.

Closed, no specific gate found: H10 (`bank-connection-consent.ts:96-107`), L6 (`packages/mcp/src/logger.ts:14-17`), L12 (`packages/api-contract/src/primitives.ts:25`), L14 (`apps/web/vite.config.mts:88`; upload needs the owner's token).

Still open or partly closed:

| ID | Severity | Status | Evidence | What is left |
|---|---|---|---|---|
| H1 | high | Open (owner, deferred) | `docs/runbooks/drill-log.md:25-27`; `check-restore-drill.ts:25` | Scripts and runbook exist; PITR, off-site storage, keys and the first drill are the owner's |
| H11 | high | Partly closed | `.github/required-checks.json`; `security-scan.yml:96-120`; `scripts/ci-config.test.ts:129-191` | Repository side done. Branch protection and secret scanning not verified (owner) |
| H12 | high | Partly closed | `be/entities/audit-event.entity.ts:8-16`; `packages/mcp/src/define-tool.ts:140`; `be/jobs/retention.ts` | Code done; the retention cron service is not provisioned (owner) |
| M7 | medium | Partly closed | `be/contract/idempotency.interceptor.ts:106`; `BudgetContainer.tsx:229` | Web PATCH and PUT callers do not send `If-Match` |
| M9 | medium | Partly closed | `be/security/signed-client-ip.ts`; `be/config/env.schema.ts:110` | `WEB_CLIENT_IP_HMAC_KEY` is optional; unset, all web users share one bucket |
| M10 | medium | Closed for sensitive buckets | `be/security/rate-limit.decorator.ts:56-73` | Read, write and per-IP buckets stay in memory by design |
| M16 | medium | Open (owner) | `OWNER-SETUP.md:78-87` | Set up and test each alert |
| M17 | medium | Partly closed | `apps/backend/Dockerfile:3,32`; `apps/web/Dockerfile:62` | Web runner still copies `apps/web` source |
| M23 | medium | Partly closed | `uk-tax.property.test.ts`; `check-tax-signoff.ts` | 294 unsigned vectors (owner); no load test |
| M-PRIV2 | medium | Partly closed | `be/jobs/retention.ts:28-84` | Cron not provisioned; inactive accounts are counted, not purged |
| M-PRIV3 | medium | Partly closed | `be/audit/consents.ts` | No terms-acceptance record |
| M-PRIV4 | medium | Partly closed | `packages/mcp/src/tools/read/getBudgetSummary.ts:80-89`; `tools/read/common.ts:270` | Custom category names still reach the model after only a bank-name scrub |
| L4 | low | Open | `be/entities/tax-record.entity.ts:58` | Receipts are plain base64 |
| L9 | low | Partly closed (accepted) | `ci-pipeline.yml:600-622` | Audit fails PRs, warns on `main` |
| L10 | low | Partly closed | `ci-pipeline.yml:435-450`; `apps/e2e/playwright.config.ts:14` | E2E still retries once |
| L11 | low | Partly closed | `finance.controller.ts:127-128,230` | Deprecated aliases still served |
| L16 | low | Partly closed | `docs/runbooks/incident.md`; `first-deploy-pr368.md:210` | Rollback steps unverified |

## New findings

None is critical or high.

| ID | Severity | Where | Impact | Fix |
|---|---|---|---|---|
| N1 (S5) | medium | `be/config/env.schema.ts:107,110,174-180`; `account-deletion.service.ts:52,100` | Production boots without `DELETION_TOMBSTONE_KEY` or `WEB_CLIENT_IP_HMAC_KEY`; erasure then returns 503 and M9 comes back, with only a log line. OWNER-SETUP has no BE-04 section | Add both to `PRODUCTION_REQUIRED` after the owner sets them; add the owner section |
| N2 | low | `be/identity/identity.adapter.ts:39-41,78` | Without `WORKOS_API_KEY` an erasure stays `identity_pending` for good | Require it in production |
| N3 | low | `be/modules/profile/user-profile.controller.ts:141` | Data export leaves no audit record | Add a `user.exported` action |
| N4 | low | `be/security/client-key.ts:8-12`; `user-rate-limit.interceptor.ts:68` | `rate_limit_buckets` keys hold raw IPs and user ids; erasure does not remove them | HMAC the keys |
| N5 | low | `AddLivingWithFamilyHousingStatus1794700000000.ts`, `AuditEventsAndConsents1794700000000.ts`; `migration-files.spec.ts:6` | Two migrations share a timestamp; order depends on file name | Assert timestamps are unique |
| N6 | low, flagged | `bank-connection-sync.ts:315-323` | `::text IN` cannot use the index and repeats the cascade | Compare `uuid`, or rely on the cascade |
| N7 (S11) | low, flagged | `bank-connection-sync.ts:128-171` | Refresh holds a row lock and a pooled connection during the bank call | Lease or compare-and-swap, HTTP outside the transaction |
| N8 | low | `apps/backend/retention.railway.json` | The retention entry point never runs in CI; its heartbeat is optional | Run `dist/jobs/retention-purge.js` in the Docker job |
| N9 | low | `scripts/backend-laws/check-restore-drill.ts:25` | The drill law cannot fail (follows the owner's deferral) | `ENFORCED = true` after the first drill |
| N10 | low | `be/modules/agent/mcp.controller.ts:128-160` | Activity paging differs from every other list | Move to `X-Next-Cursor` or name the exception in the law |
| N11 | low | `be/app.controller.ts:25` | Reads `process.env` per request, outside the env schema | Use the validated config |
| N12 | low, owner decision | `be/modules/privacy/user-data-registry.ts:321` | Erasure deletes the user's audit history | Decide whether to keep a pseudonymised copy |
| S1 | low | `be/modules/agent/mcp-token.service.ts:32-44`; `be/auth/auth.guard.ts:57` | A user removed from the beta keeps MCP access until the token expires | Apply the allow-list in `findTokenByHash` |
| S2 | low | `packages/mcp/src/auth/token-verifier.ts:134` | A token with NULL `expires_at` never expires | Refuse NULL expiry |
| S3 | low | `packages/banking/src/server/crypto.ts:7,19-22` | A Railway service with `NODE_ENV=development` would use the committed dev key | Treat `RAILWAY_ENVIRONMENT` as strict |
| S4 | low | `packages/banking/src/server/crypto.ts:211-213` | Unprefixed legacy tokens decrypt without AAD | Re-encrypt or clear, then remove the legacy path |
| S6 | low | `be/security/rate-limit.http.ts:15`; `mcp-token.service.ts:41`; `user-profile.service.ts:407` | WorkOS user ids in logs | Log a keyed hash |
| S7 | low | `ci-pipeline.yml:139,206,333,416`; `a11y-gate.yml:47,52`; `backup.yml:37`; `security-scan.yml:107-108` | CI service images pinned by tag; Semgrep rule packs unpinned | Pin by digest, vendor rules, extend `ci-config.test.ts` |
| S8 | low | `ci-pipeline.yml:40,158,244,283,352,431,588` | `actions/checkout` keeps its token in `.git/config` | `persist-credentials: false`, asserted in the test |
| S9 | low | `apps/backend/Dockerfile:41-47`; `apps/web/Dockerfile:60-63` | The runtime user can rewrite its own code | Copy as root, keep `USER bun` |
| S10 | low | `AuditEventsAndConsents1794700000000.ts:48-60` | The append-only trigger blocks UPDATE only | TRUNCATE trigger; DELETE only through retention and erasure |

Also noted, no finding raised: the backend's public `*.up.railway.app` hostname appears in `docs/audit/plans/E18-plan-draft.md:121` in a public repository; the CSP keeps `style-src 'unsafe-inline'` and `img-src https:`.

## Extra PRs to reach 10

None of these has been started.

| PR | Covers | Main files | Accepted when | Size | Who |
|---|---|---|---|---|---|
| BE-15 Privacy and config completeness | N1 docs, N2, N3, N4, N8, N11, S6, M-PRIV3, M-PRIV4 | `be/config/env.schema.ts`, `be/entities/audit-event.entity.ts`, profile controller, `be/security/client-key.ts`, `getBudgetSummary.ts`, `ci-pipeline.yml`, `OWNER-SETUP.md` | An export writes one audit row; bucket keys and logs carry no raw user id or IP; anonymised output has no custom category text; a terms acceptance is recorded; the retention command runs in the Docker job | M | Agent (terms version from the owner) |
| BE-16 Conditional writes and API tidy | M7, N10, L11 | web PATCH and PUT callers (`useUserProfile.ts`, `app.pension.tsx`, `MortgageContainer.tsx`, `app.debt.tsx`, `app.self-assessment.tsx`), `mcp.controller.ts`, `finance.controller.ts` | Every web PATCH and PUT sends `If-Match` and handles 412; a law fails a PATCH route with no ETag or no caller sending it; activity uses `X-Next-Cursor`; aliases removed after sunset | M | Agent |
| BE-17 Performance and test hardening | N5, N6, M23 load test, L10, M17 | `migration-files.spec.ts`, `bank-connection-sync.ts`, `apps/e2e/playwright.config.ts`, `apps/web/Dockerfile`, new load smoke | A scheduled load smoke records p95 against a budget; migration timestamps unique; no `::text` comparisons; E2E retries 0 with a quarantine list; web image holds built output only | M | Agent |
| BE-18 Bank launch readiness | N7/S11, S4, H10 durable retry, M4 unit test | `bank-connection-sync.ts`, `crypto.ts`, `bank-connection-consent.ts`, new migration | Refresh makes no HTTP call inside a transaction; legacy token format refused; failed revokes retried by the cron command; OAuth state has a database-free test | M | Agent (sandbox contract tests need the owner's credentials) |
| SEC-B MCP token tightening | S1, S2 | `mcp-token.service.ts`, `token-verifier.ts` | Tests: a NULL-expiry token and a de-listed user's token both get 401 | S | Agent |
| SEC-D Receipt encryption | L4 | `tax-record.entity.ts`, tax service, backfill migration | `receipt_data` stored encrypted with the record id as AAD; round-trip test | M | Agent, after BE-18 (both change `crypto.ts`); key from the owner |
| SEC-E CI and image residuals | S7, S8, S9 | workflows, both Dockerfiles, `scripts/ci-config.test.ts` | The test fails on a tag-pinned image, persisted checkout credentials or app files owned by the runtime user | S | Agent |
| SEC-F Audit-trail integrity | S10, N12 | new migration, `be/jobs/retention.ts` | TRUNCATE and UPDATE refused; DELETE only through retention and erasure | M | Agent writes it; owner creates the database role and rules on N12 |
| SEC-A Production env hardening | N1, S3, M9 | `be/config/env.schema.ts`, `crypto.ts` | Production boot fails without the client-IP, tombstone or WorkOS API key; a Railway service never uses the dev key | S | Agent, merged only after the owner sets the variables, or the deploy fails |
| Drill law on | N9 | `check-restore-drill.ts` | `ENFORCED = true` | S | Agent, after the owner's first drill |

Parallel groups: BE-15, BE-16, BE-17, BE-18, SEC-B, SEC-E and SEC-F touch separate files and can run together, except that BE-17 and SEC-E both edit `apps/web/Dockerfile` (give the Dockerfile work to one of them) and BE-15 and SEC-B both edit `mcp-token.service.ts` (merge SEC-B into BE-15 if run by one session). SEC-D follows BE-18. SEC-A and the drill-law PR wait for the owner.

## Owner-only items

1. **Backups (H1, deferred).** Railway point-in-time recovery, off-site bucket, age keys, the backup cron service, one restore drill logged in `docs/runbooks/drill-log.md`.
2. **Alerts (M16).** Set up and test each alert in `OWNER-SETUP.md:78-87`.
3. **GitHub settings (H11).** Apply `.github/required-checks.json` to `main` (12 checks, `strict`, admins included); turn on secret scanning and push protection.
4. **Railway variables.** `DELETION_TOMBSTONE_KEY`, `WEB_CLIENT_IP_HMAC_KEY` on both services, `WORKOS_API_KEY`; confirm `CSP_REPORT_ONLY` is unset and `NODE_ENV=production`. Until the tombstone key is set, account deletion returns 503 in production.
5. **Retention cron service (H12, M-PRIV2)** running `dist/jobs/retention-purge.js`, with its heartbeat.
6. **Tax vector sign-off (M23):** 294 vectors.
7. **Decisions:** terms version for consent (M-PRIV3); whether erasure keeps a pseudonymised audit copy (N12); a receipt encryption key (L4); the bank launch decision D11 and sandbox credentials.

## Not verified

- Branch protection, admin enforcement, secret scanning and push protection on GitHub.
- Railway: point-in-time recovery, `max_connections`, which cron services exist, which variables are set, whether the edge overwrites `X-Forwarded-For` (per-IP limits depend on it).
- Whether CI is green on `bc10b6e3`; no tests were run for this re-score.
- Whether the WorkOS SDK applies its own request timeout.
- How the bank providers behave against real banks, and whether `ClearBankTokens` removed every legacy token in production.
- Whether every web PATCH caller lacks `If-Match`; only the files listed under BE-16 were checked.
