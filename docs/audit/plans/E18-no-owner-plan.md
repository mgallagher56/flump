# E18 no-owner plan: code, config and docs that need no accounts or spend

> **Round 4 overrides** (see [DECISIONS.md round 4](DECISIONS.md)). Where these conflict with the text below, these win:
> - OD-1 A (`tracesSampleRate: 0`), OD-2 A (omit `user`), OD-3 A (new EU West DB, restore, repoint).
> - OD-4 A (Fable): accept the morgan access log for the beta. Add an 'Access logs' section to `docs/security/logging-policy.md` plus a guard test that lists the allowed `searchParams.get` keys in web routes. A custom `@react-router/express` server comes at the domain cutover, or earlier if logs leave Railway or a query string starts carrying secrets.
> - N7 creates the NEW `.github/workflows/security-scan.yml` (gitleaks only) and does not edit `ci-pipeline.yml`. E20-N27 appends ZAP and Semgrep later.
> - N3 lands after E20-N3, which removes Emotion and makes line 84 `safeErrorSummary`. N3 then replaces line 84 with `reportServerError`. E20-N11 follows.
> - N1 `@flump/observability` is the one canonical scrubber, and E20 logging reuses it.

Status: **plan only, nothing implemented.** Written 2026-11-12 by a read-only planner against `origin/main` `c3297f26`. It turns the agent-doable parts of `docs/audit/plans/E18-plan-draft.md` (sections 3 to 6, 9, 10, 13) into tickets. It follows DECISIONS.md round 2 (E18 D2-A, D3-A, D4-A, D6-A, D7-A, D8-A, D9-A, D10-A) and round 3 (item 7 Sentry, item 8 EU West move, item 16 money). Labels: **V** means verified in code, **I** means inference.

## Landed (evidence)

| What | Evidence |
|---|---|
| Backend `/health` (liveness, no DB) and `/health/ready` (`SELECT 1`, 2 s timeout, `{status,version,commit}` or 503 `{status:"unavailable"}`) | `ab4dad9b`; `apps/backend/src/health/health.controller.ts:27-53` (V) |
| Graceful shutdown hooks | `apps/backend/src/main.ts:18`, `apps/backend/src/shutdown.spec.ts` (V) |
| Web `/healthz`, `/robots.txt`, `X-Robots-Tag` unless `ALLOW_INDEXING=true` | `529bcab1`; `apps/web/app/routes/healthz.ts`, `apps/web/app/entry.server.tsx:67`; marketing `apps/marketing/server/ops.ts` (V) |
| Ops scripts and runbooks | `scripts/ops/{prod-counts.sql,seed-cleanup-preview.ts,restore-drill.sh,smoke.sh}` plus tests; `docs/runbooks/{first-deploy-pr368,drill-log,deploy-log}.md`. `restore-drill.sh:84-118` only allows a local Docker target (V) |
| TCP proxy removed; helmet, CORS, body limits, trust proxy | `330e6caa`; `apps/backend/src/config/security.config.ts:39-67` (V) |
| Dockerfiles collect workspace manifests by glob; CI `docker-build` job (PR-only, change-filtered) with an Expo guard | `e9455f8b`, `c3297f26`; `.github/workflows/ci-pipeline.yml:257-298` (V) |
| Renovate has OSV alerts on | `renovate.json:13` (V) |
| PR 368 merged | DECISIONS.md:91 (V) |

## Not landed (V, by grep)

- No Sentry anywhere in `apps/` or `packages/`.
- No request ids and no JSON logger.
- Readiness does not check migrations.
- Dockerfiles:
  - run as root with no `HEALTHCHECK`;
  - use the floating `oven/bun:1-slim` tag;
  - web and marketing start with `bun run start` (`apps/web/Dockerfile:43`, `apps/marketing/Dockerfile:42`);
  - the root `.dockerignore` (10 lines) does not exclude `.env*`, `.claude` (local worktrees sit in-repo) or `docs`.
- No gitleaks.
- No `railway.json` anywhere.
- No staging, backup-to-staging, seed or uptime/alert docs.

## New findings

1. **`@react-router/serve` 7.18.5 depends on `morgan` (V, `bun.lock:908`).** Its default access log (I: `morgan("tiny")`) writes the raw URL including the query string, so `/callback?code=…&state=…` lands in Railway logs. It has no option to turn this off. See open decision OD-4.
2. **The web app also runs on Bun (I).** The image has no `node`, and `bun run start` runs `react-router-serve`, whose `node` shebang Bun shims to itself. So the Sentry-on-Bun risk applies to both backend and web servers, and a "node fallback" means a node runner image, not a script change.
3. **Routes are listed in the contract manifest (V).** `packages/api-contract/src/manifest.ts:434-450` lists the health routes. Any new backend route must be added there, so this plan adds **no** backend routes (no debug-error endpoint).

## Shared bootstrap files: who touches what, and the order

| File | This plan | Other epics | Order |
|---|---|---|---|
| `apps/backend/src/main.ts` | N2 adds one import at line 1; N4 changes the options at `:9` and adds one `app.use` before `:12` | E21 had none since `0cd1e138`; E20 rate limiting is not planned here (I) | N2, then N4 |
| `apps/backend/src/app.module.ts` | N2 adds `ObservabilityModule` to `imports` (`:28-38`) | E21 (`APP_INTERCEPTOR` at `:58`); E20 throttler `APP_GUARD` | Any order; one-line rebase |
| `apps/backend/src/health/health.controller.ts` | N5 | E20 may add `@SkipThrottle` | N5 first (small) |
| `apps/web/app/entry.server.tsx` | N3: import plus `export function handleError`, and replaces `console.error(error)` at `:84` | E20 headers and nonce (`handleRequest`); E20 L2 targets the same `:84` | Serialize. N3 takes `:84`; E20 drops it from L2 |
| `apps/web/app/entry.client.tsx` | N3 (`:41-64`) | none known | — |
| `apps/web/app/root.tsx` | N3 adds keys to `ENV` at `:55-57` only | E15 shell; E20 removes `window.ENV` (`:83-87`) and adds root middleware | Serialize with E15/E20. E20 must keep the Sentry keys when it removes `window.ENV` |
| `.github/workflows/ci-pipeline.yml` | N7, N6, N13 | E4/E8 history; E20 T1/T2 (ZAP, Semgrep) | N7, then N6, then N13; E20 jobs after |
| `apps/*/Dockerfile`, `.dockerignore` | N6 | E12 (`e9455f8b` landed; no open E12 Dockerfile work known) | After E12 confirms nothing in flight |

**For the E20 planner (dedupe):**
- E18 owns:
  - error-tracking scrubbing (E20 L3) through N1 to N3;
  - the `entry.server.tsx:84` raw-log fix (part of E20 L2);
  - gitleaks (E20 T4) through N7.
- E20 L1's redaction helper should import `redactString` and `redactDeep` from `@flump/observability` (N1) instead of writing a second one.
- E20's web CSP `connect-src` must allow the Sentry EU ingest origin (`https://<org>.ingest.de.sentry.io`, the host from the DSN).
- E20's backend throttler should exempt `/health*`.
- Expected E20 files: `apps/web/react-router.config.ts` (middleware future flag), `root.tsx` middleware export, `entry.server.tsx` headers and nonce, `apps/backend/src/app.module.ts` `APP_GUARD`, `apps/backend/package.json` (`@nestjs/throttler`), and new throttler files. None of these are N-ticket files apart from those in the table above.

---

## Tickets (one PR each)

Every ticket:
- runs the AGENTS.md section 5 pre-flight: `rtk bun run lint`, `rtk bun run check-types`, `rtk bun run test`, `rtk bun run build`;
- uses model `sonnet` (section 6) unless noted;
- creates no UI components, so the section 1 to 4 UI laws do not apply, unless stated.

### E18-N1. `@flump/observability`: a pure PII scrubber package
- **Goal:** one tested deny-list shared by backend, web and later mobile (E12 D7). No Sentry dependency: it uses structural types only.
- **Files (all NEW):**
  - `packages/observability/{package.json,tsconfig.json,vitest.config.ts,src/index.ts}`. Copy `packages/api-contract/package.json` exactly: ESM, `exports.import` set to `dist`, `tsc` build. The CJS backend already consumes that package this way.
  - `src/redact.ts`: `redactString` and `redactDeep`.
    - Key regex: `/token|secret|password|passwd|authori[sz]ation|cookie|session|dsn|api.?key|balance|amount|salary|income|value|price|payment|contribution|iban|sort.?code|account.?number|receipt|email|name|phone|address|dob|birth|code|state/i`. Replace matches with `"[redacted]"`.
    - String patterns: emails; `Bearer\s+\S+`; JWT `eyJ[\w-]+\.[\w-]+\.[\w-]*`; `sk_(test|live)_\w+`; any `[A-Za-z0-9+/_-]{32,}`; `£\s?[\d,]+(\.\d+)?`; `\b\d+\.\d{2}\b`; sort codes `\d{2}-\d{2}-\d{2}`; digit runs of 6 or more; query strings (`?…` to the end of a URL).
  - `src/scrub-event.ts`: `scrubEvent(event)` and `scrubBreadcrumb(crumb)`. They:
    - delete `request.data`, `request.cookies`, `request.query_string` and `request.headers`, keeping only `user-agent`;
    - strip query and hash from `request.url`;
    - delete `user` entirely (see OD-2);
    - delete `server_name`, `frame.vars` and `extra`;
    - run `redactDeep` over `contexts` and `tags`, and `redactString` over `message`, `exception.values[].value` and `logentry`.
  - Breadcrumbs: drop categories `console`, `ui.*` and `sentry.*`; for `http`, `fetch`, `xhr` and `navigation`, keep only `method`, `status_code` and the URL path without query; return `null` if anything else is unrecognised.
  - `src/sentry-options.ts`: `assertSafeOptions(opts)`, used by N2 and N3 tests. It fails on `sendDefaultPii !== false`, any replay sample rate, `tracesSampleRate > 0`, or `includeLocalVariables`.
  - `src/*.test.ts`: one fixture event per forbidden item. The items are WorkOS access and refresh tokens, a `wos-session` cookie, OAuth `?code=`, a bank token, an MCP PAT and its hash, `BANKING_TOKEN_ENCRYPTION_KEY`, an email, a name, `£1,234.56`, a sort code, an account number, a request body and an `Authorization` header. Each test asserts that the serialized output contains no sentinel.
  - **Build token-like fixtures by concatenation at runtime** (`"sk_" + "test_" + "x".repeat(24)`) so neither gitleaks (N7) nor `check:auth` matches a literal.
- **Dependencies:** none. **Parallel-safe with everything.** It adds a workspace, so `bun.lock` changes and the `docker-build` CI job runs (the glob handles it, `e9455f8b`).
- **Verify:** `rtk bun run --cwd packages/observability test`; aim for 100% coverage of `src/`; the four commands.
- **Risks:** over-redaction, for example error messages losing line numbers. That is acceptable, because stack frames are not redacted, only `frame.vars`. The key regex matching `name` also hits `exception.type`: test that `exception.type` and stack frames survive.

### E18-N2. Backend Sentry (inert without a DSN)
- **Goal:** report 5xx errors and uncaught exceptions to Sentry EU with the N1 scrubber. With no `SENTRY_DSN` there is no `require`, no init and no network.
- **Files:**
  - `apps/backend/src/instrument.ts` (NEW): `if (process.env.SENTRY_DSN?.trim() && process.env.NODE_ENV !== "test") require("./observability/sentry").initSentry(process.env)`.
  - `apps/backend/src/observability/sentry.ts` (NEW): `initSentry(env): boolean` with `@sentry/node` (exact pin) and these options:
    - `dsn`;
    - `environment`: `SENTRY_ENVIRONMENT ?? RAILWAY_ENVIRONMENT_NAME ?? "unknown"`;
    - `release`: `RAILWAY_GIT_COMMIT_SHA` first 7 characters;
    - `sendDefaultPii:false`, `tracesSampleRate:0`, `beforeSendTransaction:()=>null`;
    - `includeLocalVariables:false`, `attachStacktrace:false`, `maxBreadcrumbs:30`;
    - `serverName:"backend"`, `skipOpenTelemetrySetup:true`;
    - `integrations`: an allow-list filter over the defaults (InboundFilters, FunctionToString, LinkedErrors, Dedupe, OnUncaughtException, OnUnhandledRejection, ContextLines). Http, NodeFetch, Console, RequestData and LocalVariables are dropped;
    - `beforeSend: scrubEvent`, `beforeBreadcrumb: scrubBreadcrumb`.
  - Optional `SENTRY_SELFTEST_ON_BOOT=1`: sends one fixed message, "sentry self-test", so the owner can check staging without a debug route.
  - `apps/backend/src/observability/sentry-exception.filter.ts` (NEW): `@Catch()` extends `BaseExceptionFilter`. It calls `captureException(err, { tags: { request_id } })` only for non-`HttpException` errors or status 500 and above, then delegates. Passing the request id explicitly avoids relying on async scope isolation, which needs OTel.
  - `apps/backend/src/observability/observability.module.ts` (NEW): provides `APP_FILTER`, and calls `Sentry.close(2000)` in `onApplicationShutdown`.
  - `apps/backend/src/main.ts:1`: add `import "./instrument";` above `reflect-metadata`.
  - `apps/backend/src/app.module.ts:28-38`: add `ObservabilityModule` to `imports`.
  - `apps/backend/package.json`: add `@sentry/node` and `@flump/observability: workspace:*`.
  - `apps/backend/vitest.config.ts` coverage `exclude` (about `:16-23`): add `src/instrument.ts`.
  - Specs (NEW, `src/observability/*.spec.ts`):
    - no DSN: `vi.mock("@sentry/node")` shows `init` is never called and the module is not required;
    - `assertSafeOptions(capturedInitArgs)`;
    - the filter captures 500 and not 400/401/404;
    - **envelope test:** a local `http.createServer` sink, DSN `http://public@127.0.0.1:<port>/1`, throw an error containing sentinels through a Nest test app, `flush()`, then assert the envelope arrived with none of the sentinels, no body, no headers and no query.
  - `scripts/ops/sentry-bun.test.ts` (NEW): the same envelope test, but run by `bun test ./scripts`, so CI proves the SDK transport **under Bun**. CI already runs it at `ci-pipeline.yml:89-90` and `:168-169`.
- **Ticket condition (Bun fallback, DECISIONS round 3 item 7):** the PR description must record the result of `sentry-bun.test.ts` and one manual run of `bun dist/main.js` against the local sink. If either fails, the SDK throws at boot under Bun, or captured events lack exceptions, the same PR (or a follow-up before any production DSN) switches the backend runner to Node:
  - `apps/backend/Dockerfile:30` becomes `FROM node:26-slim AS runner`, matching `.node-version`;
  - `:42` becomes `CMD ["node","dist/main.js"]`, matching `package.json` `start`;
  - re-run `docker-build` and the N13 boot smoke.
- **Dependencies:** N1. **Conflicts:** `main.ts` with N4 (merge N2 first); `app.module.ts` with E21 and E20 (one-line rebase).
- **Verify:** specs; `rtk bun run test`; `bun test ./scripts/ops/sentry-bun.test.ts`; the four commands. Manual: `SENTRY_DSN=http://public@127.0.0.1:9999/1 bun apps/backend/dist/main.js` with a sink (`nc -l 9999` is enough) shows nothing sent without the self-test flag, and one envelope with it.
- **Risks:**
  - The SDK major's Node 26 and Bun 1.4 support is unverified. Check the changelog before pinning.
  - If E21 later adds its own catch-all filter it will shadow this one. That filter must call `reportException()`, exported from `observability/sentry.ts`.
  - No source-map upload (it needs an owner auth token), so frames point at `dist/*.js`. Acceptable.

### E18-N3. Web Sentry, server and client (inert without a DSN, no replay)
- **Files:**
  - `apps/web/app/observability/sentry.server.ts` (NEW): `@sentry/node`, the same options as N2, `serverName:"web"`. Exports `reportServerError(error, request)`, which:
    - does nothing for aborted requests (`request.signal.aborted`) and `Response` throws below 500;
    - logs only `safeErrorSummary`-style text (copy the shape of `apps/backend/src/log-safe.ts`);
    - captures when initialised.
  - `apps/web/app/observability/sentry.client.ts` (NEW): `@sentry/react` with:
    - `sendDefaultPii:false`, `tracesSampleRate:0`;
    - no `browserTracingIntegration` and no `replayIntegration`;
    - `breadcrumbsIntegration({console:false, dom:false, sentry:false, fetch:true, xhr:true, history:true})`;
    - `denyUrls` for browser extensions;
    - `beforeSend` and `beforeBreadcrumb` from N1.
  - Tests (NEW, `*.test.ts`):
    - inert without a DSN (`@sentry/*` mocked; `init` not called; the client module not imported);
    - `assertSafeOptions`;
    - no `replay*` symbol imported (a source grep test);
    - a `/callback?code=X&state=Y` navigation breadcrumb comes out as `/callback`.
  - `apps/web/app/entry.server.tsx`:
    - top: `import "./observability/sentry.server"`, which inits only if `process.env.SENTRY_DSN`;
    - add `export function handleError(error, { request }) { reportServerError(error, request) }`;
    - replace `:84` `console.error(error)` with `reportServerError(error, request)`.
  - `apps/web/app/entry.client.tsx:41-52`: before `hydrateRoot`, `const dsn = window.ENV?.SENTRY_DSN; if (dsn) void import("./observability/sentry.client").then(m => m.init(window.ENV))`. A dynamic import keeps the SDK out of the bundle when there is no DSN.
  - Client capture of route errors: verify whether RR 7.18.5 `HydratedRouter` has an `onError` / `unstable_onError` prop (I). If yes, wire it in `entry.client.tsx`. If not, capture through React 19 `hydrateRoot` `onUncaughtError` / `onCaughtError`, and do **not** edit `features/feedback/components/RouteErrorBoundary`.
  - `apps/web/app/root.tsx:55-57`: add `SENTRY_DSN`, `SENTRY_ENVIRONMENT` and `SENTRY_RELEASE` to `ENV`, read from `process.env`, empty when unset. The DSN is public by design.
  - `apps/web/package.json`: add `@sentry/node`, `@sentry/react` and `@flump/observability`.
- **Dependencies:** N1. **Conflicts:** `entry.server.tsx`, `entry.client.tsx` and `root.tsx` with E20 (headers, CSP, removing `window.ENV`) and E15 (shell in `root.tsx`). **Serialize:** land after E20's web-headers PR if that PR is already open, otherwise first, and tell E20 about the CSP `connect-src` and the `ENV` keys. Not parallel with E15 PRs touching `root.tsx`.
- **Verify:** `rtk bun run --cwd apps/web test`; the four commands. Manual: `SENTRY_DSN=http://public@127.0.0.1:9999/1 bun run --cwd apps/web start` with a sink; a thrown loader error yields one envelope with no cookies, query or body. With the DSN unset, DevTools shows no request to `sentry`/`ingest` and no Sentry chunk loaded.
- **Risks:**
  - The web server also runs on Bun (finding 2). Same condition as N2, using the web runner image `node:26-slim` with `CMD ["node","node_modules/.bin/react-router-serve","./build/server/index.js"]`.
  - The root `ErrorBoundary` (`root.tsx:136-164`) renders no `window.ENV`, so a client after a server-rendered error has no DSN. Acceptable, because the server already captured it.
  - AGENTS.md sections 1 to 4: only if the error UI changes, which it must not.

### E18-N4. Backend structured JSON logs and request ids
- **Files:**
  - `apps/backend/src/observability/logger.ts` (NEW): `createAppLogger(env)` returns `new ConsoleLogger({ json: true, colors: false })` when `NODE_ENV==="production"` or `LOG_FORMAT==="json"`, otherwise the default. Verify that the Nest 12.4 `ConsoleLogger` has a `json` option (I). If not, write a 30-line `LoggerService` that emits `{ts,level,context,msg}`.
  - `apps/backend/src/observability/request-context.middleware.ts` (NEW):
    - accepts `x-request-id` only if it is a UUID, otherwise `randomUUID()`;
    - sets the response header;
    - stores the id on `req`, where N2's filter reads it;
    - on `res.on("finish")` logs one line: `{requestId, method, route: req.route?.path ?? "unmatched", status, durationMs}`;
    - never logs the URL, query, headers or body.
  - `apps/backend/src/main.ts:9`: `NestFactory.create(AppModule, { bodyParser: false, logger: createAppLogger(process.env) })`; add `app.use(requestContextMiddleware)` before `applySecurity` (`:12`), so it runs before the v1 alias (`security.config.ts:51`).
  - Spec (NEW): uses supertest. A request with `Authorization: Bearer <sentinel>`, `Cookie: <sentinel>` and `?token=<sentinel>` produces an access line with none of them; `route` is the template (`accounts/:id`) under both `/v1/...` and bare paths; a bad `x-request-id` is replaced.
- **Out of scope (E20 L2):** the raw `console.error` calls at `finance.service.ts:192,270,328`, `user-profile.service.ts:332,495,502` and `identity.adapter.ts:41`. They stay as plain lines, which Railway still shows.
- **Dependencies:** after N2 (`main.ts`). **Conflicts:** `main.ts` with N2. Parallel-safe with N3, N5 to N12.
- **Verify:** spec; the four commands. On staging (owner): Railway log lines show JSON attributes.
- **Risk:** `req.route` is undefined for 404s and middleware rejections. Handled as `"unmatched"`.

### E18-N5. Readiness includes migrations
- **Files:**
  - `apps/backend/src/health/health.controller.ts:37-53`: inside the same timeout race, also run `SELECT count(*)::int AS n FROM migrations` and compare with `this.dataSource.migrations.length`. Executed count below loaded count gives 503 `{status:"unavailable"}`, the same body as today. The table name is TypeORM's default `migrations`, since `typeorm.options.ts:60-69` sets no `migrationsTableName` (V). Do not use `showMigrations()`, which may log (I).
  - `apps/backend/src/health/health.controller.spec.ts`: extend `makeController` (`:12-15`) with `migrations: [...]` and cover pending gives 503, equal gives 200, and a missing table (query throws) gives 503.
- **Dependencies:** none. **Conflicts:** E20 `@SkipThrottle` on the same file (trivial). No manifest change: the route already exists (`manifest.ts:442-449`).
- **Verify:** spec; the four commands; `curl localhost:4000/health/ready` against a local DB.
- **Risk:** low. `/health` liveness stays DB-free.

### E18-N6. Docker hardening plus CI image assertions
- **Files:**
  - `apps/{backend,web,marketing}/Dockerfile`:
    - `:2` becomes `FROM oven/bun:1.4.4-slim` (matching `packageManager`; Renovate `docker:pinDigests` comes later, A-09);
    - in the runner stage, `COPY --chown=bun:bun …` and `USER bun` (I: the image ships a `bun` user, so verify with `docker run --rm --entrypoint id`);
    - `HEALTHCHECK --interval=30s --timeout=3s CMD ["bun","-e","fetch('http://127.0.0.1:'+(process.env.PORT||<4000|3000|3001>)+'/<health|healthz|healthz>').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]`;
    - exec-form CMD: web `["bun","node_modules/.bin/react-router-serve","./build/server/index.js"]` (verify the `.bin` location under bun's isolated layout in the image), marketing `["bun","server.ts"]` (`NODE_ENV=production` is already set at `:31`).
  - `.dockerignore`: add `**/.env`, `**/.env.*`, `!**/.env.example`, `**/coverage`, `**/storybook-static`, `docs`, `.github`, `.husky`, `.claude`, `.agents`, `apps/mobile-companion/**` and `!apps/mobile-companion/package.json`. The manifests stage needs every workspace `package.json` (`Dockerfile:9-14`).
  - Delete `apps/web/.dockerignore`, which is unused because the context is the repo root.
  - `.github/workflows/ci-pipeline.yml:291-298`: after the Expo guard, add per image:
    - `id -u` is not 0;
    - `docker inspect -f '{{.Config.Healthcheck}}'` is non-empty;
    - `find /app -name '.env*' ! -name '.env.example'` is empty.
- **Dependencies:** check with E12 that no Dockerfile work is open. **Conflicts:** `ci-pipeline.yml` with N7 and N13 (merge N7 first).
- **Verify:** `docker build` all three locally; `docker run` each and check `docker inspect --format '{{.State.Health.Status}}'` becomes `healthy`; `docker stop -t 15` exits promptly (signals now reach the server); CI `docker-build` green; the four commands. Owner: a staging deploy is green before production.
- **Risks:**
  - Non-root breaks a runtime write. Unlikely (I): marketing reads `dist/`, web reads `public/locales` (`entry.server.tsx:41`).
  - Excluding `docs` breaks a build that reads docs. Check with `grep -r "docs/" apps/*/vite.config*` first.
  - Railway ignores Docker `HEALTHCHECK` (I); it is for local use and CI.

### E18-N7. gitleaks in CI
- **Files:**
  - `.github/workflows/ci-pipeline.yml`: new job `secret-scan`, `permissions: contents: read`, `fetch-depth: 0`. It runs `docker run --rm -v "$PWD:/repo" zricethezav/gitleaks:v8.<x>@sha256:<digest> git /repo --log-opts="$RANGE" --redact --exit-code 1`. `RANGE` is `origin/$BASE_REF..HEAD` on PRs and `$BEFORE..$GITHUB_SHA` on push (all history if `BEFORE` is all zeros), passed via `env` as `c3297f26` does. Skip on `schedule`.
  - `.gitleaks.toml` (NEW): `[extend] useDefault = true`, plus a path allowlist for `scripts/ops/__fixtures__/**` if one is needed.
  - `.gitleaksignore` (NEW, empty, with a comment): the owner adds D-12 fingerprints after rotating them.
  - `docs/runbooks/secret-scan.md` (NEW, short): the local full-history scan command and triage.
- **Dependencies:** none (N1's fixtures avoid literals). **Conflicts:** `ci-pipeline.yml` (merge first). It replaces E20 T4. Model `haiku` is fine.
- **Verify:** on a throwaway branch, commit a fake `sk_test_` string built to match, confirm the job goes red, then drop the commit. Clean PR is green. actionlint is clean.
- **Risk:** this is advisory only: there are no required checks (DECISIONS E11 D7), but Railway Wait-for-CI makes a red push to `main` skip deploys. Intended.

### E18-N8. Railway config as code (inert until the owner sets each config path)
- **Files (all NEW):**
  - `apps/backend/railway.json`:
    - `build`: builder `DOCKERFILE`, `dockerfilePath` `apps/backend/Dockerfile`, `watchPatterns` `["apps/backend/CHANGELOG.md"]` (today's production value; A-11 changes it to the root `CHANGELOG.md` under D3-A);
    - `deploy`: `healthcheckPath` `/health/ready`, `healthcheckTimeout` 300, `restartPolicyType` `ON_FAILURE`, `restartPolicyMaxRetries` 10, `drainingSeconds` 15;
    - `environments.staging.build.watchPatterns: ["**"]`, so staging deploys every green `main` commit.
  - `apps/web/railway.json`: `/healthz`, drain 15.
  - `apps/marketing/railway.json`: `/healthz`, drain 0, matching runbook G6.
  - `scripts/ops/railway-config.test.ts`: parses all three and checks:
    - `dockerfilePath` exists;
    - the healthcheck path is served (backend path is in `manifest.ts`; web route file `apps/web/app/routes/healthz.ts` exists; marketing `ops.ts` has `"/healthz"`);
    - no `variables` key and nothing that looks like a secret.
- **Dependencies:** none. **Parallel-safe** (new files only). Coordinate with A-11 (D3-A watch patterns).
- **Verify:** `bun test ./scripts/ops/railway-config.test.ts`; the four commands. Owner: set the config path on **staging services first** and confirm the dashboard shows "managed by config file".
- **Risks:**
  - Once the path is set, the file overrides the dashboard for every environment. A wrong value redeploys `main` HEAD (E18 draft finding 0.1); the owner commits with Alt+Deploy.
  - Unverified: the `environments.<name>` override syntax, `drainingSeconds`, and whether `restartPolicyMaxRetries` is honoured on Hobby.

### E18-N9. Staging runbook and environment-variable matrix
- **Files:**
  - `docs/runbooks/staging.md` (NEW), covering:
    - shape: EU West region, duplicate of production, its own Postgres;
    - owner first-time setup: steps 1 to 6 of draft section 3, in EU West;
    - the trigger (`watchPatterns ["**"]`) and promotion (release-PR merge);
    - WorkOS: same environment as production, staging `/callback` added;
    - the DB marker (`COMMENT ON DATABASE … IS 'flump-staging'`, used by N10 and N11);
    - known gaps;
    - cost (about $3 a month, DECISIONS item 16).
  - The **variable matrix** goes in that file: one table per service with columns *name | production | staging | source (reference / generate fresh / copy / unset) | secret?*. Rows come from the code (V by grep):
    - **backend:**
      - `NODE_ENV`, `PORT`, `DATABASE_URL` (the `${{Postgres.DATABASE_URL}}` reference), `DB_SSL`, `DB_SSL_CA`;
      - `BANKING_TOKEN_ENCRYPTION_KEY` (new for staging), `WORKOS_API_KEY`, `WORKOS_CLIENT_ID`, `WORKOS_ISSUER`;
      - `CORS_ALLOWED_ORIGINS` (the staging web origin), `TRUST_PROXY_HOPS`;
      - `CONTRACT_MODE`, `CONTRACT_ENFORCE_GROUPS`;
      - `BANK_CONNECTIONS_ENABLED`, `BANK_CONNECTIONS_ALLOWED_USER_IDS`, `BETA_ALLOWED_EMAILS`, `BETA_ALLOWED_USER_IDS`;
      - `RAILWAY_DEPLOYMENT_DRAINING_SECONDS`, `SENTRY_DSN`, `SENTRY_ENVIRONMENT`, `LOG_FORMAT`;
      - **must be unset:** `AUTH_DEV_BYPASS`, `DB_SYNCHRONIZE`, `ALLOW_DESTRUCTIVE_DB_TESTS`;
      - **delete:** `JWT_SECRET`, `FRONTEND_URL`, `WORKOS_REDIRECT_URI`.
    - **web:** `VITE_API_URL`, `VITE_MARKETING_URL`, `WORKOS_API_KEY`, `WORKOS_CLIENT_ID`, `WORKOS_COOKIE_PASSWORD` (new), `WORKOS_REDIRECT_URI` and `VITE_WORKOS_REDIRECT_URI` (staging `/callback`), `ALLOW_INDEXING` (unset), `SENTRY_DSN`, `SENTRY_ENVIRONMENT`, drain.
    - **marketing:** `VITE_APP_URL`, `SECURITY_CONTACT`, `ALLOW_INDEXING`.
  - `scripts/ops/env-matrix.test.ts` (NEW): greps `process.env.X` and `env.X` in `apps/{backend,web,marketing}` (excluding tests) and fails if a name is missing from `staging.md`. There is an ignore list for test-only names (`TEST_DATABASE_URL`, `REQUIRE_DB_TESTS`).
- **Dependencies:** none. The `SENTRY_*` and `LOG_FORMAT` rows are documented as "after N2/N3/N4". **Parallel-safe.**
- **Verify:** the test; the four commands; owner review.
- **Risk:** the matrix goes stale. The test guards this.

### E18-N10. Backup, restore-to-staging drill and region-move runbooks and scripts
- **Files (all NEW):**
  - `scripts/ops/backup-dump.sh` (owner runs it with `PGURL` from `railway connect Postgres --tunnel-only`):
    - `pg_dump --format=custom --no-owner`, a schema-only dump, a `pg_restore --list` count of `TABLE DATA`;
    - `sha256` sums; `umask 077` into `~/flump-backups`;
    - optional `--age-recipient <pubkey>` to encrypt before any upload;
    - never prints `PGURL`.
  - `scripts/ops/restore-to-staging.sh`. It refuses unless:
    - `STAGING_PGURL` is set and differs from `PGURL` by host, port and database;
    - the target's `shobj_description` DB comment equals `flump-staging`;
    - the target public schema is empty, unless `--replace`, which drops and recreates `public` only after the operator types `restore-into-staging`.
    - It then runs `pg_restore --no-owner --exit-on-error --single-transaction` and prints `restore_seconds`.
    - It runs `prod-counts.sql` and `verify-restore.sql` into files and diffs them against the pre-dump counts.
    - Guard style is copied from `restore-drill.sh:84-118`.
  - `scripts/ops/verify-restore.sql`, read-only, counts only:
    - expected tables present;
    - `migrations` rows equal the migration files (`apps/backend/src/migrations/*1794*.ts`, 5 today);
    - each `serial` sequence `last_value >= max(id)`;
    - FK constraint and index counts;
    - `to_regclass` checks.
  - Tests: `scripts/ops/restore-to-staging.test.ts` (guard refusals with no DB; plus a DB-backed restore into a second CI test database under `REQUIRE_DB_TESTS`, using `db-test-support.ts`) and `scripts/ops/backup-dump.test.ts` (it refuses without `PGURL` and never echoes it).
  - `docs/runbooks/backup-restore.md`:
    - RPO and RTO targets (draft section 6);
    - the dump procedure with timing;
    - the restore-to-staging drill as **the** drill (round 3 item 8), with pass criteria: counts diff clean, `verify-restore` clean, `smoke.sh staging` passes, owner sign-in works;
    - the `drill-log.md` entry;
    - rollback (the staging restore is non-destructive to production; re-run with `--replace`);
    - cadence;
    - after the switch to synthetic data, the drill becomes dump, then local `restore-drill.sh`, then N11 re-seed.
  - `docs/runbooks/region-move.md`: the item 8 sequence as a checklist:
    - limit to $25;
    - dump;
    - staging in EU West with the restore drill, then smoke test;
    - quiet window: stop backend writes (remove the active backend deployment), take a final dump;
    - new EU West Postgres, restore with `verify-restore`, repoint the backend `DATABASE_URL` reference, move backend, web and marketing regions, re-run smoke and counts;
    - keep the old Postgres stopped for 7 days and the dump for 30;
    - rollback: repoint to the old service;
    - a privacy-notice line about the WorkOS (US) transfer for E19.
- **Dependencies:** none (N9 for cross-links). **Parallel-safe** (new files; CI already runs `bun test ./scripts/ops`, `ci-pipeline.yml:168-169`).
- **Verify:** `bun test ./scripts/ops`; `shellcheck scripts/ops/*.sh`; the four commands.
- **Risks:**
  - The DB marker depends on the owner setting it. The script refuses without it, so it fails safe.
  - pg 18 client tools are required on the owner's machine (`brew install libpq`, runbook G0).

### E18-N11. Synthetic staging data ("switch before friends", D4-A, round 2 conflict 8)
- **Files (all NEW):**
  - `scripts/ops/synthetic-personas.ts`: deterministic, made-up personas. Reuse shapes from `apps/backend/test/contract/web-payloads.ts` and the `docs/audit/plans/E16-journeys.md` personas P1 to P3 and P5. Values carry a clear marker (names like `Synthetic P1`).
  - `scripts/ops/seed-synthetic.ts --persona P1=<workos user id> ...`:
    - refuses unless the DB comment is `flump-staging` (shared helper with N10);
    - in one transaction, deletes all user-data rows in FK order (keeping `migrations`), then inserts the personas through parameterised SQL;
    - prints counts only.
  - `scripts/ops/seed-synthetic.test.ts`: DB-backed, run after all migrations on the CI test DB (so schema drift fails CI, not the owner). It asserts:
    - the result is idempotent;
    - no rows remain for ids that are not personas;
    - it refuses without the marker.
  - `docs/runbooks/staging.md`: add a "Switch to synthetic data" section (append if N9 has merged, otherwise include it in N9).
- **Dependencies:** N10 (marker helper). **Conflicts:** `staging.md` with N9 (merge N9 first).
- **Verify:** `bun test ./scripts/ops`; the four commands.
- **Risk:** it must use the current entity columns (`term_months` and others from `86067127`). The CI test catches drift.

### E18-N12. Uptime-check and alert-routing docs
- **Files (all NEW):** `docs/runbooks/uptime-and-alerts.md`, covering:
  - **Monitors:** backend `/health/ready`, web `/healthz`, marketing `/healthz`, at 3 to 5 minute intervals, expecting 200 and keyword `"ok"`; staging monitors are optional.
  - A healthchecks.io heartbeat for the future backup cron (A-16).
  - **Routing table:**

    | Source | Event | Channel | Who |
    |---|---|---|---|
    | Railway project webhook | `Deployment.failed`, crashed | Discord/Slack channel | Owner |
    | Sentry alert rule | New issue, or more than 10 events in 1 h | Email plus the same channel | Owner |
    | Uptime | Down for 2 checks | Email plus phone push | Owner |
    | Railway | Crash email | Members | — |

  - The procedure to test each alert, the noise budget (fewer than 2 no-action alerts a week, draft section 19), and a triage table: what to check first, rollback link to `first-deploy-pr368.md#rollback`, and Hobby's 72-hour image window.
  - `scripts/ops/smoke.sh:22-35`: add staging URL documentation only if needed (staging has no defaults by design).
- **Dependencies:** none. **Parallel-safe.** Model `sonnet` (docs).
- **Verify:** owner review; the four commands (docs-only, but still required).

### E18-N13 (optional). CI backend container boot smoke
- **Files:** `.github/workflows/ci-pipeline.yml` `docker-build` job:
  - add a `postgres:18-alpine` service;
  - run `flump-backend-ci` with `--network host`, `NODE_ENV=production`, `DATABASE_URL` set to the service, `DB_SSL=false`, a generated `BANKING_TOKEN_ENCRYPTION_KEY`, a dummy `WORKOS_CLIENT_ID` and `CORS_ALLOWED_ORIGINS=https://example.invalid`;
  - poll `/health/ready` for 200 within 60 s, which proves production-mode boot plus migrations.
- **Dependencies:** N5, N6. **Conflicts:** `ci-pipeline.yml` (merge last).
- **Verify:** green; a scratch branch with a broken migration goes red.
- **Risk:** the boot config may require more variables. Read `apps/backend/src/config/config.module.ts` to get the full set.

### Deferred: marketing Sentry
Not now. Marketing holds no user data. When it is added, it needs:
- a CSP `connect-src` change in `apps/marketing/server/security.ts` `buildCsp` (E20 file);
- a nonce-aware loader (`server.ts:79-80`).

Revisit at launch.

---

## OWNER STEPS (agents never do these), in order

1. **Raise the Railway hard usage limit to $25** (round 3 items 8 and 16).
2. **Offsite dump:** `bash scripts/ops/backup-dump.sh` (N10; or runbook G2 until N10 merges). Store an encrypted second copy and keep it for at least 30 days. Set `COMMENT ON DATABASE <prod db> IS 'flump-production'`.
3. **Create staging in EU West:** `railway environment new staging --duplicate production`, then review the staged changes. Set variables per the `staging.md` matrix, generating fresh secrets. Set `COMMENT ON DATABASE … IS 'flump-staging'`. Generate domains. Add the staging `/callback` in WorkOS. After N8 merges, set the config-file path on **staging** services only and commit with **Alt+Deploy**.
4. **Restore drill into staging:** `restore-to-staging.sh`, then `smoke.sh staging`, then sign in. Append to `drill-log.md`.
5. **Sentry, only after N1, N2 and N3 are merged** (the scrubber tests must be merged before any production DSN):
   - create the org in the **EU** region on the free tier and accept the DPA;
   - create `backend` and `web` projects; turn on server-side data scrubbing and IP-address scrubbing; keep replay off;
   - add Sentry to the E19 processor list;
   - set `SENTRY_DSN` on **staging** only, with `SENTRY_SELFTEST_ON_BOOT=1` once; check the event payload by hand for PII, then remove the flag;
   - if the backend on Bun drops events, apply the N2 node fallback first;
   - then set the production DSNs with `--skip-deploys`.
6. **Region move of production** (quiet window) per `region-move.md`; re-run smoke and counts; keep the dump 30 days.
7. **Alert channel:** create the Discord or Slack channel; add the Railway project webhook; set a Sentry alert rule to the channel; create the uptime account and the three monitors; test each alert.
8. **Turn off Dependabot security updates** (keep the alerts).
9. **After N8, on production:** set the config-file paths with Alt+Deploy, then check `railway deployment list` shows no unintended deploy. Make sure `RAILWAY_DEPLOYMENT_DRAINING_SECONDS` / `drainingSeconds` is in effect.
10. **Before any friend is invited:**
    - create WorkOS test users for the personas and run `seed-synthetic.ts` on staging;
    - delete staging volume backups that contain the restored production dump;
    - confirm on staging that `prod-counts.sql` shows 0 rows for the owner id.
11. **Local full-history gitleaks scan;** rotate the D-12 secrets (E20 owner list); add their fingerprints to `.gitleaksignore`.

---

## OPEN DECISIONS (not settled in DECISIONS.md)

| # | Question | Options | Recommendation | Type |
|---|---|---|---|---|
| OD-1 | Sentry trace sampling during the beta | A: `0`, errors only. B: 0.05 with spans scrubbed | **A.** Spans carry URLs and timings; no performance need yet; free-tier quota | Straightforward |
| OD-2 | User identity on Sentry events | A: omit `user`. B: an HMAC-hashed WorkOS id | **A** for the beta; B later if support needs per-user grouping | Straightforward |
| OD-3 | How to move production Postgres to EU West | A: new EU West Postgres, restore the final dump, repoint `DATABASE_URL`. B: in-place region change of the existing service | **A.** It is exactly what the staging drill rehearses, and the old service stays as rollback | Straightforward |
| OD-4 | `react-router-serve` morgan logs raw URLs including the OAuth `?code=` (finding 1) | A: accept for the beta (the code is single-use and short-lived; logs are owner-only, 7 days); revisit at the custom-domain cutover. B: a small custom server (`@react-router/express`, already in the lockfile) with an allow-listed access log; this reopens E20 D4-A | **A**, recorded in `docs/security/logging-policy.md`. Escalate to `fable` / E20 if the owner wants web request ids sooner | Complicated (it reopens an adopted E20 decision) |

---

## Lane summary (concurrency)

- **Lane A, backend bootstrap, serial:** N1, then N2, then N4. N5 can go any time, before E20's throttler touches `health.controller.ts`. Rebase on E21 and E20 for `app.module.ts`.
- **Lane B, web bootstrap, serial:** N3 after N1. Serialize with E20 web headers and CSP, and with E15 PRs touching `root.tsx`.
- **Lane C, CI and Docker, serial on `ci-pipeline.yml`:** N7, then N6, then N13. N6 also needs E12's confirmation.
- **Lane D, ops scripts and docs, parallel with everything:** N8, N9, then N10, then N11 (N11 appends to `staging.md`); N12 any time.
- **Owner lane:** steps 1 to 4 can start now (they need N10 and N9 for the scripts and the matrix, or the existing runbook). Step 5 waits for N1 to N3. Steps 6 to 11 follow in order.
- **Outside this plan (remaining E18 draft items, also no-owner):**
  - A-09: Renovate digest pins and the RR8 group;
  - A-10: pin actions by SHA (`ci-pipeline.yml` again, so serialize with Lane C);
  - A-11: D3-A root release component (updates N8's `watchPatterns`);
  - A-17: migration policy and destructive-SQL check;
  - A-18: `preDeployCommand`;
  - A-19: remaining runbooks;
  - A-21: GitHub App token.

Key files:
- /Users/marcgallagher/personal/flump/.claude/worktrees/nifty-bun-defc71/apps/backend/src/main.ts
- /Users/marcgallagher/personal/flump/.claude/worktrees/nifty-bun-defc71/apps/backend/src/app.module.ts
- /Users/marcgallagher/personal/flump/.claude/worktrees/nifty-bun-defc71/apps/backend/src/health/health.controller.ts
- /Users/marcgallagher/personal/flump/.claude/worktrees/nifty-bun-defc71/apps/backend/src/config/security.config.ts
- /Users/marcgallagher/personal/flump/.claude/worktrees/nifty-bun-defc71/apps/backend/src/config/typeorm.options.ts
- /Users/marcgallagher/personal/flump/.claude/worktrees/nifty-bun-defc71/packages/api-contract/src/manifest.ts
- /Users/marcgallagher/personal/flump/.claude/worktrees/nifty-bun-defc71/apps/web/app/entry.server.tsx
- /Users/marcgallagher/personal/flump/.claude/worktrees/nifty-bun-defc71/apps/web/app/entry.client.tsx
- /Users/marcgallagher/personal/flump/.claude/worktrees/nifty-bun-defc71/apps/web/app/root.tsx
- /Users/marcgallagher/personal/flump/.claude/worktrees/nifty-bun-defc71/apps/{backend,web,marketing}/Dockerfile
- /Users/marcgallagher/personal/flump/.claude/worktrees/nifty-bun-defc71/.dockerignore
- /Users/marcgallagher/personal/flump/.claude/worktrees/nifty-bun-defc71/.github/workflows/ci-pipeline.yml
- /Users/marcgallagher/personal/flump/.claude/worktrees/nifty-bun-defc71/scripts/ops/restore-drill.sh
- /Users/marcgallagher/personal/flump/.claude/worktrees/nifty-bun-defc71/docs/runbooks/first-deploy-pr368.md

