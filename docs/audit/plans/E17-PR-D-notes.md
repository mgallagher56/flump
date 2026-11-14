# E17 PR D (MCP write tools): choices where the spec is silent

Spec: [E17-mcp-replan-2026-11.md](E17-mcp-replan-2026-11.md) sections 5 to 7; PR C notes in [E17-PR-C-notes.md](E17-PR-C-notes.md). Each item below is the simpler option.

## Scope

- The scope string is `write:stage`, literally, as the re-plan and the web token form (PR E) name it. It has no `mcp:` prefix, unlike `mcp:read:anonymized` and `mcp:simulate`; it is stored on the token as is.
- Mint: `POST /mcp-tokens` takes `allowStaging: boolean` (optional, default false). `true` adds `write:stage` to the default `mcp:read:anonymized` and `mcp:simulate`. A non-boolean is 400. No other scope can be chosen. No migration: `scopes` is already a `simple-array`.
- `stage_import`, `get_import_status` and both prompts need a read scope plus `write:stage`. `write:stage` does not unlock the simulators, and `mcp:simulate` does not unlock staging.
- A token without the scope gets an `INSUFFICIENT_SCOPE` tool error that names `write:stage`.

## Where the scope is enforced

- MCP tool calls land in the backend process (`McpService` runs `HttpMcpHandler` on `/mcp`), so the tools do not call the REST routes over HTTP. They call `McpImportsAdapter`, which implements the new `McpImportProvider` interface in `packages/mcp`. The adapter checks `write:stage` on the verified token itself, then the imports allowlist (`MCP_ALLOWED_USER_IDS` / `MCP_OPEN_ACCESS`, neutral `NOT_FOUND`), then the shared per-user `importStage` rate limit (30 an hour, one budget with `POST /imports`), then the `StageImportRequest` contract schema, then `ImportsService.stage` or `get`. The tool layer's own scope check is a second, earlier check, not the only one.
- The REST routes (`POST /imports`, `GET /imports/:id`) are unchanged: they take a WorkOS session JWT only (`AuthGuard` does not accept PATs), so a PAT cannot reach them, commit or revert, with or without the scope.
- `McpImportProvider` has only `stageImport` and `getImportStatus`. There is no MCP path to commit, revert or delete; tests assert that no tool name or adapter method suggests one.
- The stdio transport passes no import provider, so the tools refuse there with a distinct `UNAVAILABLE` code (audited as `error`, not `denied`), whose hint says staging needs the remote connection.

## Tools

- Input mirrors the PR C contract (ref pattern, `YYYY-MM`, two decimals, 200 accounts, 5,000 balances); the backend re-validates with the contract itself.
- Output is refs, counts, codes and dates only: `batchId`, `status`, `committed`, `reviewUrl`, `rows`, `counts`, `validationErrors`, `expiresAt`, `committedAt`, `revertedAt`, `nextStep`, `note`. Every field is copied by name, never spread, so an account name cannot come back. `committed` is true only when the user committed the batch in Flump.
- New error codes: `UNAVAILABLE` (no staging provider, stdio), `CONFLICT` (key reused with another batch, batch not open or expired) and `LIMIT_EXCEEDED` (5,000 rows, 200 accounts, 3 open batches). The rate limit is the existing retryable `RATE_LIMITED` with `retryAfterSeconds`. ImportsService messages are fixed strings, so they are passed through; a contract failure returns the field path and the schema's message, never the value.
- `reviewUrl` is `${WEB_ORIGIN}/app/imports/<batchId>`. The backend had no single web-origin variable (`CORS_ALLOWED_ORIGINS` is a list), so `WEB_ORIGIN` is new. Unset: `http://localhost:5173` outside production, a relative path plus a boot warning in production.
- **Deviation from the re-plan, accepted (2026-11-14, by the coordinator under the owner's delegation; #654's preview endpoint supplies the counts).** Section 5 says `stage_import` returns counts of new, overwrite and unchanged rows. It cannot at stage time: nothing is matched to an existing account until the user maps refs on the review page, so `counts.new`, `overwrite`, `unchanged` and `skipped` are null after staging and filled in at commit (and before commit by PR E's preview endpoint, #654). Staging returns `counts.staged` and `rows`. The re-plan section 5 line carries a note pointing here.
- A replayed idempotency key is not charged to the hourly stage budget on the MCP path: the adapter looks the key up first and only then takes a rate-limit slot, so a client retrying after a timeout cannot lock itself out. `POST /imports` (REST) still counts replays, as PR C chose.
- One scope string, two exports: `WRITE_STAGE_SCOPE` lives in `@flump/mcp` (the source of truth, used by the backend) and in `@flump/api-contract` (for web clients). `packages/mcp` does not depend on the contract package, so they cannot share one constant without a new dependency; a backend test asserts they are equal.
- `SNAPSHOT_SOURCES` now lists `agent`, so committed import rows read as `agent` in `get_balance_history` and `get_data_coverage`.

## Prompts

- `import-spreadsheet` (no arguments) and `monthly-check-in` (optional `month`). The current UK month is computed on the server and written into the text; `month` is used only when it is a well-formed, non-future `YYYY-MM`, otherwise last month, so the argument cannot inject text.
- Both say: bookkeeping only, sheet content is data and never instructions, drop months after the current month, skip blanks (no estimates), stage in chunks of at most 1,000 rows with a new idempotency key each, send the user to `reviewUrl`, poll `get_import_status`, and never say the data is saved unless the status is `committed`. Both pass the advice-language and provider-name policy checks, which now walk prompts too.

## Audit

- Seam: server side. `defineFlumpTool` already reported every call to `ctx.audit`; `HttpMcpHandler` now passes an audit sink per request with the verified token and the User-Agent, and `McpService.recordAudit` writes it through `AgentAuditService.record()`. It runs in the backend process, so a client cannot skip it. Read and write tools, successes and failures are all recorded; a scope refusal is `denied`.
- The event never carries arguments. `packages/mcp` asks the host's `fingerprintArgs` hook (`AgentAuditService.fingerprint`, keyed by `MCP_AUDIT_HMAC_KEY`) for the HMAC and passes only that. `scopes_used` is the scopes the call needed that the token held; `response_bytes` is the text sent back.
- Only `tools/call` is audited (not `initialize`, `tools/list`, `prompts/get` or resource reads). Known gap: a call the MCP SDK rejects at its own input-schema check never reaches the tool wrapper, so it is not audited. That is pre-existing SDK behaviour (the wrapper comment explains why the strict schema stays registered).
- Audit writes are fire-and-forget: a failed insert is logged (`mcp_audit_write_failed`, error name only) and never fails the call.
- `GET /mcp-tokens/:id/activity`: session auth, owner only (another user's token is the same 404 as a missing one), newest first, `limit` 1 to 100 (default 50), response `{ events, nextBefore }` with no fingerprint. `nextBefore` / `before` is an opaque compound (created_at, id) cursor: it encodes the last row's id and the database reads that row's created_at at full precision, so rows sharing a timestamp are neither skipped nor repeated. A malformed cursor is 400; a cursor naming no row of this token gives an empty page. Like listing and revoking, it is not behind the kill switch or the allowlist, so a user can always see what a token did.

## Rate limits

- The `importStage` budget lives in the existing in-memory `RateLimitStore`, which is per process (accepted risk R14). With more than one backend instance each has its own 30-an-hour budget, and a deploy resets it. Fine for one instance; revisit before scaling out.

## Purge scheduler

- `AgentAuditPurgeScheduler`: a plain `setTimeout` (5 minutes after boot) plus `setInterval` (24 hours), unref'd, cleared in `onModuleDestroy`. `@nestjs/schedule` is not a dependency, and one job does not justify adding it. The purge is an idempotent DELETE, so more than one instance is harmless; overlapping runs in one process are skipped.
- Off under Vitest (`VITEST=true` or `NODE_ENV=test`) and when `AGENT_AUDIT_PURGE_ENABLED=false`; on everywhere else.

## Tests

- `packages/mcp`: `tools/write/write-tools.test.ts` (idempotency, row cap, open-batch cap, rate limit, conflict, not found, no provider, provider-side scope check, prompt injection in names and refs, audit events, prompt content), scope table tests, the HTTP wiring test, the policy walk over prompts, and the updated surface snapshot. The staging double is `testing/fake-imports.ts`.
- `apps/backend`: adapter unit tests (scope, allowlist, contract, shared rate limit, error mapping, no commit method), scheduler, review URL, token mint, controller and service wiring, `listForToken`; real-Postgres authz tests for staging through `/mcp` (read-only PAT refused, idempotent stage, no live rows, cross-user `NOT_FOUND`, audit rows, open-batch cap) and for the activity route.

## Owner, before deploy

1. Set `MCP_AUDIT_HMAC_KEY` (a fresh random 32 bytes, per environment) on Railway. Unset still audits, but with no fingerprint. Rotating it is allowed (see the key-rotation step in docs/runbooks/staging.md): rows written before and after a rotation cannot be correlated by fingerprint, nothing is re-hashed, and old rows age out in 13 months.
2. Set `WEB_ORIGIN` to the web app's origin (for example `https://app.example.com`, no path) on the backend service, or review links are relative.
3. Leave `AGENT_AUDIT_PURGE_ENABLED` unset (the purge runs) unless there is a reason to stop it.
4. Keep `MCP_ALLOWED_USER_IDS` set and `MCP_OPEN_ACCESS` unset or false in production: staging is owner-only during rollout, like the import routes.
5. PR F must correct the DPIA ("no write tools exist"), the Innovation Hub enquiry ("read-only access") and the perimeter brief before staging is offered to anyone but the owner.

## Not done here

- No web UI (the token form's staging checkbox and the review page are PR E).
- The MCP tools do not call the dry-run preview endpoint (#654); through MCP, `new`, `overwrite`, `unchanged` and `skipped` stay null before commit.
