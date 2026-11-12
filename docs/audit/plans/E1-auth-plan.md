# E1 Real Authentication, Fail Closed: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make identity impossible to forge across backend, MCP and web, and make cross-user access impossible by construction.

**Architecture:** The backend `AuthGuard` delegates to a `TokenVerifier` strategy chosen once at boot: `WorkOsJwtVerifier` (default, JWKS signature check) or `DevBypassVerifier` (only with `AUTH_DEV_BYPASS=true`, refused in production). The MCP verifier loses its mock and unsigned-OAuth paths and accepts PATs only. The web app loses every `mock-session-token` fallback in favour of one `requireAccessToken` helper.

**Tech Stack:** NestJS 12 (backend), `@workos-inc/node` 12.2.0 (already installed), `jose` (new, backend only), React Router 7 + `@workos-inc/authkit-react-router` (web), Vitest 5.

**Spec:** [E1-auth-design.md](E1-auth-design.md). Findings covered: D-01, D-02, D-03, D-04, G-03, B-01, F-01, F-03 (partly), D-06, D-07.

## Global Constraints

- Dev flag is exactly `AUTH_DEV_BYPASS=true`. The backend and the web server both refuse to start when it is set together with `NODE_ENV=production`.
- Backend refuses to start when neither `WORKOS_CLIENT_ID` nor `AUTH_DEV_BYPASS=true` is set, and when the dev flag is on while `WORKOS_API_KEY` holds a real value.
- Dev bypass user id is the fixed `dev_user_123`.
- Only PATs are accepted by the MCP verifier; the OAuth JWT path throws "OAuth tokens are not enabled".
- Auth failures return 401 with a generic message. Never log token values or print env values.
- No `mock-session-token` literal in `apps/web` or `packages/mcp`; in the backend it appears only in `dev-bypass.verifier.ts`.
- Tests first for each behaviour (project `tdd` skill). Before any PR: `bun run lint`, `bun run check-types`, `bun run test`, `bun run build` all pass (AGENTS.md section 5).
- Commits only when the user asks; the commit steps below are for that moment. Commit messages end with the attribution line given in the session.

## Review Focus

The spec is silent on these; each has a test in the named task.

1. **Algorithm confusion:** a token signed HS256 using the public key material, or `alg: none`, must be rejected (Task 1).
2. **Token missing `sub`, or with a future `nbf`:** rejected, not defaulted to an id or email (Task 1).
3. **JWKS fetch fails or the key is unknown:** the request fails closed with 401 and never falls back to a dev user (Task 1, Task 2).
4. **Malformed `Authorization` header:** `bearer` in lower case with extra spaces, an empty token, `Bearer ` alone, a 10 KB header: 401, never a 500 (Task 2).
5. **Update or create body carrying another user's `userId` or `id`:** ignored; the row stays the caller's (Task 4).
6. **MCP invalid PAT returns 400 today:** every authentication failure must be 401 (Task 5).

---

## File structure

| File                                                                        | Responsibility                                                                        |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `apps/backend/src/auth/token-verifier.ts` (create)                          | `TokenVerifier` interface, `AuthenticatedUser` type, `TOKEN_VERIFIER` injection token |
| `apps/backend/src/auth/workos-jwt.verifier.ts` (create)                     | JWKS verification of WorkOS access tokens                                             |
| `apps/backend/src/auth/dev-bypass.verifier.ts` (create)                     | The only place the dev token and dev user exist                                       |
| `apps/backend/src/auth/auth.config.ts` (create)                             | `resolveAuthMode(env)`: pure boot validation, returns `"workos" \| "dev"` or throws   |
| `apps/backend/src/auth/auth.module.ts` (create)                             | Provides `TOKEN_VERIFIER` from the resolved mode; exports it                          |
| `apps/backend/src/auth/testing/test-jwks.ts` (create)                       | Test helper: key pair, local JWKS, `signToken(claims, opts)`                          |
| `apps/backend/src/auth/auth.guard.ts` (modify)                              | Thin guard using the injected verifier                                                |
| `apps/backend/src/finance.service.ts`, `account-intake.service.ts` (modify) | D-06, D-07                                                                            |
| `packages/mcp/src/auth/token-verifier.ts`, `transports/http.ts` (modify)    | PAT-only, 401 mapping                                                                 |
| `apps/backend/src/mcp.controller.ts` (modify)                               | Remove OAuth metadata route while OAuth is off                                        |
| `apps/web/app/utils/auth.server.ts` (create)                                | `requireAccessToken`, dev-session helper, web boot check                              |
| `apps/web/app/utils/utils.ts` and about 15 call sites (modify)              | Remove every fallback                                                                 |

---

### Task 1: Token verifier strategies and boot validation (backend)

**Files:**

- Create: `apps/backend/src/auth/token-verifier.ts`, `workos-jwt.verifier.ts`, `dev-bypass.verifier.ts`, `auth.config.ts`, `testing/test-jwks.ts`
- Test: `apps/backend/src/auth/workos-jwt.verifier.spec.ts`, `dev-bypass.verifier.spec.ts`, `auth.config.spec.ts`
- Modify: `apps/backend/package.json` (add `jose`)

**Interfaces:**

- Produces:
  - `interface AuthenticatedUser { id: string; email?: string }`
  - `interface TokenVerifier { verify(token: string): Promise<AuthenticatedUser> }` (throws on any failure)
  - `const TOKEN_VERIFIER = "TOKEN_VERIFIER"`
  - `class WorkOsJwtVerifier implements TokenVerifier` with `constructor(opts: { jwks: JWTVerifyGetKey; issuer: string; allowedAlgs?: string[] })`, default `allowedAlgs = ["RS256"]`
  - `function workosIssuer(clientId: string): string`
  - `function workosJwksFromUrl(clientId: string): JWTVerifyGetKey` (wraps `createRemoteJWKSet`)
  - `class DevBypassVerifier implements TokenVerifier`, `const DEV_BYPASS_TOKEN`, `const DEV_USER: AuthenticatedUser`
  - `function resolveAuthMode(env: Record<string, string | undefined>): "workos" | "dev"`
  - Test helper: `createTestJwks(): Promise<{ jwks: JWTVerifyGetKey; issuer: string; sign(claims: object, opts?: { alg?: string; expiresIn?: string; notBefore?: string; issuer?: string; noSub?: boolean }): Promise<string>; foreignSign(claims: object): Promise<string> }>`

- [ ] **Step 1: Confirm the WorkOS values.** Using the project `research` skill, read the WorkOS docs for AuthKit access tokens and record the exact issuer string and JWKS URL in the spec's open question 1. Define `workosIssuer` and the JWKS URL builder from that answer. Expected: spec updated with a cited doc URL.
- [ ] **Step 2: Add `jose` to the backend.** Run `bun add jose --cwd apps/backend`; expected: only `apps/backend/package.json` and `bun.lock` change.
- [ ] **Step 3: Write failing tests for `resolveAuthMode`** in `auth.config.spec.ts`:
  - returns `"workos"` for `{ WORKOS_CLIENT_ID: "client_x" }`
  - returns `"dev"` for `{ AUTH_DEV_BYPASS: "true", NODE_ENV: "development" }`
  - throws for `{}` (message names `WORKOS_CLIENT_ID` and `AUTH_DEV_BYPASS`, contains no values)
  - throws for `{ AUTH_DEV_BYPASS: "true", NODE_ENV: "production" }`
  - throws for `{ AUTH_DEV_BYPASS: "true", NODE_ENV: "development", WORKOS_API_KEY: "sk_live_x" }`
  - `{ AUTH_DEV_BYPASS: "false", WORKOS_CLIENT_ID: "client_x" }` returns `"workos"`
- [ ] **Step 4: Write failing tests for `WorkOsJwtVerifier`** in `workos-jwt.verifier.spec.ts` using `createTestJwks()`:
  - valid token with `sub: "user_1"`, `email: "a@b.co"` resolves `{ id: "user_1", email: "a@b.co" }`
  - rejects: signed by a different key (`foreignSign`); wrong issuer; expired (`expiresIn: "-1h"`); future `nbf`; missing `sub` (`noSub`); `alg: none` (hand-built unsigned token); HS256 token signed with the public JWK material as the secret (algorithm confusion, Review Focus 1 and 2)
  - a verifier whose JWKS getter throws (simulated network failure) rejects (Review Focus 3)
  - email is `undefined` when the claim is absent; never defaulted
- [ ] **Step 5: Write failing tests for `DevBypassVerifier`:** `verify(DEV_BYPASS_TOKEN)` resolves `DEV_USER` (`id: "dev_user_123"`); any other string rejects.
- [ ] **Step 6: Run** `cd apps/backend && bunx vitest run src/auth`. Expected: the new specs FAIL (modules not found).
- [ ] **Step 7: Implement the files above.** `WorkOsJwtVerifier.verify` uses `jwtVerify(token, jwks, { issuer, algorithms })`, requires a non-empty string `sub`, and wraps every failure in one generic `Error("invalid token")` while logging the reason class (not the token) at debug level. `resolveAuthMode` is pure; it takes env as a parameter so tests need no globals.
- [ ] **Step 8: Run the same command.** Expected: PASS, all new specs.
- [ ] **Step 9: Commit** `feat(backend): add WorkOS JWT and dev-bypass token verifiers with boot validation`.

---

### Task 2: Thin `AuthGuard`, module wiring, and the callback bypass removal

**Files:**

- Create: `apps/backend/src/auth/auth.module.ts`
- Modify: `apps/backend/src/auth/auth.guard.ts`, `apps/backend/src/app.module.ts`, `apps/backend/src/main.ts`
- Test: replace `apps/backend/src/auth/auth.guard.spec.ts`

**Interfaces:**

- Consumes: `TokenVerifier`, `TOKEN_VERIFIER`, `resolveAuthMode`, `WorkOsJwtVerifier`, `workosJwksFromUrl`, `workosIssuer`, `DevBypassVerifier`.
- Produces: `class AuthGuard` with `constructor(@Inject(TOKEN_VERIFIER) verifier: TokenVerifier)`; sets `request.user: AuthenticatedUser`. `class AuthModule` (`@Global()`), providing `TOKEN_VERIFIER` via a factory that calls `resolveAuthMode(process.env-derived config)`.

- [ ] **Step 1: Write the replacement `auth.guard.spec.ts`** (delete the old cases that assert bypasses). Use `createTestJwks()` and a real `WorkOsJwtVerifier`:
  - valid token sets `request.user.id` to `sub` and returns true
  - no header, `Basic x`, `Bearer ` (empty), `bearer   ` with spaces only, and a 10 KB header string each throw `UnauthorizedException` (Review Focus 4)
  - `Bearer mock-session-token` throws `UnauthorizedException` under the workos verifier
  - a verifier that throws a non-HTTP `Error` surfaces as `UnauthorizedException`, never the raw error
  - JWKS failure (verifier throws) throws `UnauthorizedException` and `request.user` stays undefined (Review Focus 3)
  - with `DevBypassVerifier`, the dev token authenticates as `dev_user_123`
  - a request to `/bank-connections/callback` with no header throws `UnauthorizedException` (the bypass is gone)
  - header scheme match is case-insensitive: `bearer <valid>` authenticates
- [ ] **Step 2: Run** `cd apps/backend && bunx vitest run src/auth/auth.guard.spec.ts`. Expected: FAIL.
- [ ] **Step 3: Rewrite `auth.guard.ts`** to the interface above: parse the header with a case-insensitive scheme match and a single token part, call `verifier.verify`, map any failure to `UnauthorizedException("Authentication failed")`.
- [ ] **Step 4: Create `auth.module.ts`** and import it in `app.module.ts`. The provider factory calls `resolveAuthMode` and returns the matching verifier; when mode is `"dev"`, log one warning line naming the flag. Boot validation runs when the module initialises, so the process fails before listening.
- [ ] **Step 5: Add a boot test** in `auth.module.spec.ts`: compiling a Nest testing module with an invalid environment rejects; with a valid one it provides a verifier of the expected class.
- [ ] **Step 6: Run** `cd apps/backend && bunx vitest run src/auth`. Expected: PASS.
- [ ] **Step 7: Run** `cd apps/backend && bunx vitest run`. Expected: other specs that construct `AuthGuard` directly fail to compile; fix each by injecting a stub `TokenVerifier` returning a fixed user, then re-run until PASS.
- [ ] **Step 8: Update `apps/backend/.env.example`:** document `WORKOS_CLIENT_ID` as required and `AUTH_DEV_BYPASS` as dev-only, with a comment that production refuses to start with it.
- [ ] **Step 9: Commit** `fix(backend): verify WorkOS tokens and fail closed, drop mock auth and callback bypass`.

---

### Task 3: `deleteAccount` ownership (D-06)

**Files:**

- Modify: `apps/backend/src/finance.service.ts` (`deleteAccount`, around line 67)
- Test: `apps/backend/src/finance.service.spec.ts` (create if absent; follow the mocking style in `finance.controller.spec.ts`)

**Interfaces:**

- Consumes: `AccountIntakeService.getAccount(userId, id)` (throws `NotFoundException` when not owned).
- Produces: `FinanceService.deleteAccount(userId: string, id: string): Promise<DeleteAccountResponse>` unchanged signature.

- [ ] **Step 1: Write the failing test** `deleteAccount does not delete transactions for an account the caller does not own`: user B calls `deleteAccount("userB", accountIdOfUserA)`; assert it rejects with `NotFoundException` and `transactionRepository.delete` was never called.
- [ ] **Step 2: Write the passing-path test:** owner deletes; `transactionRepository.delete` called once with `{ accountId: id }` after the ownership check (assert call order).
- [ ] **Step 3: Run** `cd apps/backend && bunx vitest run src/finance.service.spec.ts`. Expected: first test FAILS.
- [ ] **Step 4: Fix** by loading the account scoped to `{ id, userId }` before any delete.
- [ ] **Step 5: Run the same command.** Expected: PASS.
- [ ] **Step 6: Commit** `fix(backend): check account ownership before deleting its transactions`.

---

### Task 4: Stop body-controlled ids and ownership (D-07)

**Files:**

- Modify: `apps/backend/src/account-intake.service.ts` (`createAccount` ~230, `updateAccount` ~238), `apps/backend/src/finance.service.ts` (`createTransaction` ~83)
- Test: `apps/backend/src/account-intake.service.spec.ts`, `finance.service.spec.ts`

**Interfaces:**

- Produces: private `pickAccountFields(body: CreateAccountDto | UpdateAccountDto)` returning only `name, type, balance, currency, interestRate, monthlyContribution, isCurrent, externalAccountId`. `connectionId` is excluded from update and only accepted on create when the connection belongs to the caller. A matching `pickTransactionFields` for transactions.

- [ ] **Step 1: Write failing tests** (Review Focus 5):
  - `createAccount("userA", { ...valid, id: "other-id", userId: "userB" })` saves with `userId: "userA"` and no `id` override
  - `updateAccount("userA", ownId, { userId: "userB", id: "x", balance: 5 })` leaves `userId` and `id` unchanged and sets `balance: 5`
  - `createTransaction("userA", { ..., userId: "userB" })` saves `userId: "userA"`
  - `createAccount` with a `connectionId` owned by another user rejects with `NotFoundException`
- [ ] **Step 2: Run** `cd apps/backend && bunx vitest run src/account-intake.service.spec.ts src/finance.service.spec.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the pick helpers and use them in place of the spread and `Object.assign`; verify the connection owner with a `{ id, userId }` lookup.
- [ ] **Step 4: Run the same command.** Expected: PASS.
- [ ] **Step 5: Add one cross-user controller test per resource family** in the existing `*.controller.spec.ts` files: user B gets 404 on `GET/PATCH/DELETE` of user A's account, transaction, bank connection, budget entry, tax record. Where a controller already scopes by `userId`, this test documents it; where it does not, fix the query to scope it and note the new finding in `docs/audit/D-security.md`.
- [ ] **Step 6: Run** `cd apps/backend && bunx vitest run`. Expected: PASS.
- [ ] **Step 7: Commit** `fix(backend): ignore client-supplied ids and ownership on account and transaction writes`.

---

### Task 5: MCP verifier is PAT-only; failures are 401

**Files:**

- Modify: `packages/mcp/src/auth/token-verifier.ts`, `packages/mcp/src/transports/http.ts`, `apps/backend/src/mcp.controller.ts`, `apps/backend/src/mcp.service.ts`
- Test: `packages/mcp/src/auth/token-verifier.test.ts` (create), `packages/mcp/src/transports/http.test.ts` (create or extend), `apps/backend/src/mcp.controller.spec.ts`

**Interfaces:**

- Produces: `class AuthenticationError extends Error` exported from the verifier module; `TokenVerifierOptions` gains `allowDevToken?: boolean` (default false). The `mock-session-token` and `mock_mcp_` branch applies only when `allowDevToken` is true. `verifyOAuthJwt` is replaced by a throw of `AuthenticationError("OAuth tokens are not enabled")`.

- [ ] **Step 1: Write failing verifier tests:**
  - `mock-session-token` and `mock_mcp_x` reject by default
  - with `allowDevToken: true` they resolve the dev identity
  - an unsigned JWT-shaped token rejects with "OAuth tokens are not enabled"
  - PAT with store: valid resolves `{ userId, tokenId, type: "pat" }`; revoked, expired and unknown reject; whitespace around the token still hashes the same
  - PAT with no store rejects (no `cli_user` fallback)
- [ ] **Step 2: Write failing transport test:** each of those rejections produces HTTP 401, not 400 (Review Focus 6). Missing `Authorization` also 401.
- [ ] **Step 3: Run** `cd packages/mcp && bunx vitest run`. Expected: FAIL.
- [ ] **Step 4: Implement.** Throw `AuthenticationError` for every authentication failure; in `http.ts` map `AuthenticationError` to 401 and leave other errors to the existing mapping.
- [ ] **Step 5: In the backend,** pass `allowDevToken` from the resolved auth mode (`true` only in dev), and remove the `.well-known/oauth-protected-resource` route and its test while OAuth is off; leave a one-line comment pointing at the ticket that re-enables it.
- [ ] **Step 6: Run** `cd packages/mcp && bunx vitest run` and `cd apps/backend && bunx vitest run src/mcp`. Expected: PASS.
- [ ] **Step 7: Commit** `fix(mcp): accept only personal access tokens and return 401 for every auth failure`.

---

### Task 6: Web stops inventing sessions

**Files:**

- Create: `apps/web/app/utils/auth.server.ts`
- Modify: `apps/web/app/utils/utils.ts` (`getAuthSession`), `apps/web/app/root.tsx`, `apps/web/app/hooks/useUserProfile.ts` (both occurrences, lines ~265 and ~413/423), `apps/web/app/containers/budget/BudgetContainer.tsx`, `apps/web/app/services/backend-client.server.ts`, and every route that contains `mock-session-token`: `app._index`, `app.accounts._index`, `app.accounts.$account`, `app.tax`, `app.onboarding`, `app.savings`, `app.profile`, `app.pension`
- Test: `apps/web/app/utils/utils.test.ts` (replace the mock-session cases), `apps/web/app/utils/auth.server.test.ts` (create)

**Interfaces:**

- Produces:
  - `function requireAccessToken(session: { accessToken: string | null }): string` (throws `redirect("/login")` when null)
  - `function authHeader(session): { Authorization: string }`
  - `function isDevBypass(env: Record<string, string | undefined>): boolean` (true only when `AUTH_DEV_BYPASS === "true"` and `NODE_ENV !== "production"`; throws when the flag is set in production)
  - `getAuthSession` keeps its signature `(args, options) => Promise<{ user; accessToken; headers }>` but never fabricates a session except when `isDevBypass(process.env)`.

- [ ] **Step 1: Write failing tests.**
  - `getAuthSession` rethrows a plain `Error` from `authkitLoader` instead of returning a session
  - it still rethrows `Response` objects unchanged (redirects keep working)
  - with `AUTH_DEV_BYPASS=true` and `NODE_ENV=development`, a thrown `authkitLoader` yields the dev user; with `NODE_ENV=production` it throws at call time
  - `requireAccessToken` throws a redirect to `/login` for `null`, returns the token otherwise
  - `isDevBypass` returns false by default, true only for the dev combination, and throws for the production combination
- [ ] **Step 2: Run** `cd apps/web && bunx vitest run app/utils`. Expected: FAIL.
- [ ] **Step 3: Implement** `auth.server.ts` and change `getAuthSession`'s `catch` to rethrow (dev session only via `isDevBypass`).
- [ ] **Step 4: Replace each `accessToken || "mock-session-token"`** with `authHeader(session)`, one file at a time, running that file's existing tests after each (`bunx vitest run app/routes/<name>`). `useUserProfile.ts` lines 413 and 423 use `this.getAuthToken?.()`; when it returns nothing, throw instead of defaulting.
- [ ] **Step 5: Verify no literal remains.** Run `grep -rn "mock-session-token" apps/web/app --include=*.ts --include=*.tsx | grep -v "\.test\."`. Expected: no output. (The dev session in `getAuthSession` uses the shared constant imported from `auth.server.ts`, which holds the single literal and is covered by the grep allow-list in Task 7.)
- [ ] **Step 6: Run** `cd apps/web && bunx vitest run`. Expected: PASS. Update tests that mock `getAuthSession` with `accessToken: "mock-token"` only if they asserted the fallback.
- [ ] **Step 7: Commit** `fix(web): remove mock session fallbacks and require a real access token`.

---

### Task 7: Guardrails, docs and full verification

**Files:**

- Create: `scripts/check-no-mock-auth.sh`
- Modify: `package.json` (`"check:auth"` script), `.github/workflows/ci-pipeline.yml` (run it in the lint job), `README.md` or `docs/` environment section
- Test: the script itself, run in both states

- [ ] **Step 1: Write the check script.** It fails if `mock-session-token`, `dev_user_123`, `user_mock` or `mock_mcp_` appears under `apps/` or `packages/` outside this allow-list: `apps/backend/src/auth/dev-bypass.verifier.ts`, `apps/web/app/utils/auth.server.ts`, `apps/mobile-companion/`, and any `*.test.*` or `*.spec.*` file. Expected on the finished tree: exit 0, and a deliberate stray literal makes it exit 1 (try one, then remove it).
- [ ] **Step 2: Wire it** as `bun run check:auth`, and add it to the CI lint step so the bypass cannot return silently.
- [ ] **Step 3: Document the environment contract:** `WORKOS_CLIENT_ID` required in production; `AUTH_DEV_BYPASS` for local only and refused in production; boot errors name the variable.
- [ ] **Step 4: Run the four gates:** `bun run lint`, `bun run check-types`, `bun run test`, `bun run build`. Expected: zero errors. (Pre-existing lint failures from the audit baseline are the four formatting errors in `CHANGELOG.md` files and the `--write` behaviour; note them, do not hide them.)
- [ ] **Step 5: Manual boot checks** in a terminal: start the backend with no auth variables, with `AUTH_DEV_BYPASS=true NODE_ENV=production`, and with `AUTH_DEV_BYPASS=true` plus `WORKOS_API_KEY=sk_live_x`; each must exit non-zero with a message naming the variable and no values. Then start with only the dev flag and confirm a request with the dev token succeeds and a request with a hand-made unsigned JWT returns 401.
- [ ] **Step 6: Update the audit record:** mark D-01 to D-04, D-06, D-07, G-03, B-01 and F-01 as fixed in `docs/audit/SUMMARY.md`, and note that F-03 (MCP tests) is only partly addressed.
- [ ] **Step 7: Commit** `chore: add mock-auth guard script, document auth environment, update audit record`.

---

## Not in this plan

- **D-08 / B-02:** the full DTO and `ValidationPipe` layer. Separate ticket and plan; it touches every controller.
- **Rollout:** setting `WORKOS_CLIENT_ID` in production, confirming whether real users exist, and rotating the secrets in git history (E3, D-12) are human tasks done around the deploy.
- **Mobile sign-in:** E12. It works in dev with the flag on.
- **Re-enabling MCP OAuth:** its own ticket once the remote MCP server is deployed and registered.
- **E5:** loaders that hide backend errors. After this plan, a 401 reaches the web loaders and will show as an empty workspace until E5 lands, so schedule E5 next.

## Self-review

- **Spec coverage:** verifier strategies and boot validation (Task 1, 2); callback bypass removal (Task 2); D-06 (Task 3); D-07 and cross-user tests (Task 4); MCP PAT-only, 401s, metadata route (Task 5); web fallbacks, dev session, web boot check (Task 6); env docs, guard against regression, audit record (Task 7). Dev bypass user fixed at `dev_user_123` (Global Constraints). Mobile unchanged (Not in this plan).
- **Gap found and fixed:** the spec says the web server refuses to boot with the flag in production; Task 6 implements this as `isDevBypass` throwing at call time rather than at process start. If a true boot-time refusal is wanted, add a check in the web entry server; flagged here for the reviewer.
- **Type consistency:** `TokenVerifier`, `AuthenticatedUser`, `TOKEN_VERIFIER`, `resolveAuthMode`, `createTestJwks` and `isDevBypass` are defined once and used with the same names later.
