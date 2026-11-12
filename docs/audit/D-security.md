# Track D: Security

Audited 2026-11-11 on `main`. Read-only code pass; no runtime testing, no exploit attempts, no dependency scan re-run.

## Summary

The backend has no effective authentication. `AuthGuard` never verifies a JWT signature, accepts a hardcoded bearer token, and fails open when `WORKOS_API_KEY` is unset. The MCP token verifier has the same two flaws. The web app also fails open: if WorkOS throws, `getAuthSession` returns a fake signed-in user. Per-user scoping on reads is generally correct, but several write paths are weak: `deleteAccount`, and four `create`/`update` handlers that spread raw request bodies into TypeORM `save()`. There is no input validation, no rate limiting and no security headers on the backend or the web server. Secrets handling has two problems: a silent default encryption key for bank tokens, and a real-looking WorkOS test key in git history.

Deployment exposure (confirmed): `apps/backend/Dockerfile` exposes port 4000. `apps/web/app/root.tsx:41-52` publishes `VITE_API_URL` to the browser as `window.ENV`, and web components call the backend directly from the browser with a bearer token. The backend therefore has to be internet-reachable. It is not an internal-only service, and CORS is the only network-level control.

Verdict on the lead auditor's starting leads:

| Lead                                                                             | Result                                                                                                                                                                                                |
| -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. AuthGuard: mock token, unsigned JWT, `dev_user_123` fallback, callback bypass | Confirmed (D-01, D-02). The callback route does not exist, so that bypass is dead code (D-05).                                                                                                        |
| 2. MCP verifier accepts mock tokens                                              | Confirmed, and worse: its JWT path is also unsigned (D-03).                                                                                                                                           |
| 3. `deleteAccount` deletes transactions before ownership check                   | Confirmed (D-06).                                                                                                                                                                                     |
| 4. OAuth state `institutionId:userId`                                            | Confirmed, but not currently exploitable because no callback handler exists (D-05).                                                                                                                   |
| 5. `synchronize: true`, `rejectUnauthorized: false`                              | Confirmed (D-10).                                                                                                                                                                                     |
| 6. No ValidationPipe, helmet, rate limit; `0.0.0.0`; TCP proxy on 3000           | Confirmed (D-08, D-09, D-14).                                                                                                                                                                         |
| 7. Tax and user-profile accept any bodies                                        | Tax confirmed (D-07). User-profile `PATCH` is refuted: `updateProfile` copies an explicit field whitelist (`user-profile.service.ts:217-260`). It still takes `body: any` with no type checks (D-08). |

## Findings

### [D-01] Backend accepts unsigned JWTs and trusts the `sub` claim

- Severity: P0
- Location: apps/backend/src/auth/auth.guard.ts:30-43
- Evidence: The guard splits the bearer token on `.`, base64-decodes `parts[1]`, runs `JSON.parse`, and sets `request.user.id = payload.sub || payload.id`. There is no signature check, no `exp`, `iss` or `aud` check, and no JWKS lookup. `@workos-inc/node` is a dependency (used only by the identity adapter) but the guard never calls it. `auth.guard.spec.ts:55-83` tests this behaviour as intended.
- Impact: Anyone who can reach the backend can mint a token for any user id and read, write or delete that user's accounts, budgets, tax records, bank connections and profile, and create MCP tokens for them. Combined with `POST /user-profile/change-password` (`user-profile.controller.ts:70-77` calls the WorkOS `updateUser` with `password`), a forged `sub` equal to a victim's WorkOS user id resets the victim's password. That is full account takeover, not just data access. WorkOS user ids (`user_01...`) are not secret: they appear in the web session and profile payloads.
- Recommendation: Verify the access token as a WorkOS JWT before use. Use `jose` `createRemoteJWKSet` against `https://api.workos.com/sso/jwks/<WORKOS_CLIENT_ID>` and check signature, `exp` and `iss`. Check `aud` if the token carries one. Alternatively use `authenticateWithSessionCookie` from the WorkOS SDK. Reject on any failure. Delete the base64 path and update `auth.guard.spec.ts` to use signed fixtures. Do not reuse `JWT_SECRET` from `.env.example`; it is unused and misleading.
- Effort: M

### [D-02] `mock-session-token` and a missing env var each disable authentication

- Severity: P0
- Location: apps/backend/src/auth/auth.guard.ts:25-29 and 46-50
- Evidence: Line 25: `if (token === "mock-session-token")` sets `user_mock` with no environment check. Lines 46-49: in the `catch`, `if (!this.configService.get("WORKOS_API_KEY"))` authenticates as `dev_user_123`. Any failed decode, including a missing or garbled token string with `Bearer ` prefix, reaches this branch. `WORKOS_API_KEY` is only needed for the identity adapter, so an operator can legitimately deploy without it and silently lose auth. The web app sends the mock token itself (see D-04).
- Impact: Anyone who knows the literal string (it is in the public client code and in `docs/audit`) is authenticated in production as one shared user. All such callers share one data set. Missing config turns off auth for every request, including unparseable tokens.
- Recommendation: Remove the literal. Gate any dev bypass on an explicit `AUTH_DEV_BYPASS=true` that the app refuses to honour when `NODE_ENV=production`. Validate required env vars at boot (`WORKOS_CLIENT_ID` for the JWKS URL) and fail to start without them. Fail closed in the guard.
- Effort: S

### [D-03] MCP token verifier: mock tokens, unsigned OAuth JWTs, optional `aud` and `exp`

- Severity: P0
- Location: packages/mcp/src/auth/token-verifier.ts:81-89 and 135-185; apps/backend/src/mcp.controller.ts:32-40
- Evidence: Lines 81-88 accept `mock-session-token` or any `mock_mcp_*` token and return `userId: "user_mock"` with `mcp:read:anonymized` and `mcp:simulate`. `verifyOAuthJwt` (line 135) base64-decodes the payload and trusts `sub`, `scope` and `scopes` with no signature check. `aud` is validated only `if (payload.aud)`, and `exp` only `if (payload.exp)`, so a token with neither passes. A caller can self-assign `mcp:read:full`, which sets `anonymizeInstitutions = false` (line 177). `McpController` has no `@UseGuards`, so `POST/GET /mcp` rely entirely on this verifier. Rate limiting is keyed on the forged `userId` (`transports/http.ts:42`), so it does not slow an attacker down.
- Impact: Any caller can read any user's full financial data over `/mcp`, including real institution names, by forging a JWT. This is the same class as D-01 on a second, AI-facing surface. The mock path additionally exposes the shared mock user's data.
- Recommendation: Share one JWT verification helper with the backend guard (JWKS, signature, `iss`, `aud` required, `exp` required). Delete the mock branch, or make it opt-in per D-02. Require `aud` to equal the configured `MCP_AUDIENCE`; the second hardcoded `https://mcp.flump.co.uk` allowance at line 163 defeats a custom audience. Enforce scopes (D-17).
- Effort: M

### [D-04] Web app fails open to a shared mock session, and sends `mock-session-token` to the backend

- Severity: P0
- Location: apps/web/app/utils/utils.ts:97-104; also `|| "mock-session-token"` at root.tsx:35, app.tax.tsx:16/106/119, app.pension.tsx:21, app.profile.tsx:16, app._index.tsx:17, app.onboarding.tsx:44/71/287, BudgetContainer.tsx:150, useUserProfile.ts:265 and others
- Evidence: `getAuthSession` wraps `authkitLoader` in `try`. If it throws anything that is not a `Response` (for example missing `WORKOS_API_KEY` or `WORKOS_COOKIE_PASSWORD`, or a network error to WorkOS), the `catch` logs a warning and returns `{ user: { id: "dev_user_123" }, accessToken: "mock-session-token" }`. This applies to `ensureSignedIn: true` routes too, so protected `/app/*` routes render for any visitor. Individual routes also substitute the mock token whenever `accessToken` is null.
- Impact: One misconfigured deploy or a WorkOS outage makes every visitor appear signed in as the same user, and the backend (D-02) accepts the token. Everyone then reads and writes one shared account. Real users can also be silently switched onto the mock user's data if `accessToken` is null.
- Recommendation: In the `catch`, rethrow (or redirect to `/login`) unless an explicit dev flag is set and `NODE_ENV !== "production"`. Remove every `|| "mock-session-token"` fallback; a missing token should be a redirect or 401. Centralise API calls in `backend-client.server.ts` so there is one place to attach the token. Check the same fallback in `apps/mobile-companion` (Track G) before any release.
- Effort: M

### [D-05] Bank OAuth: `/bank-connections/callback` auth bypass and predictable `state`, with no handler behind them

- Severity: P2
- Location: apps/backend/src/auth/auth.guard.ts:11-14; apps/backend/src/finance.service.ts:165-176
- Evidence: Phase 1 flagged the callback bypass as a live hole. It is not: `grep -rn "callback" apps/backend/src` (excluding specs) finds only the guard line and `finance.service.ts:167`, which builds the redirect URI. No controller defines `bank-connections/callback`. The OAuth path builds `state = "${institutionId}:${userId}"` (line 168), which is guessable and not bound to a session or nonce. The redirect leads to a route that returns 404, so the OAuth connection flow cannot complete today. Token-based connect (PAT paste) is the only working path. `syncBankConnection` (lines 221-237) also calls `provider.exchangeCode(..., plainRefreshToken)` with the refresh token as the authorization code, which is wrong for a refresh grant, and defaults the redirect URI to `http://localhost:5173/auth/callback`.
- Impact: No exploit today. When someone implements the callback they will inherit an unauthenticated route and a forgeable `state`, which is the classic login-CSRF / account-linking attack: an attacker can attach their own bank authorisation to a victim's `userId`, or the reverse.
- Recommendation: Delete the guard bypass now. When building the callback, generate `state` with `randomBytes(32)`, store it server-side with `userId`, `institutionId` and a short TTL, require it on callback, and take `userId` from the stored record, not from `state`. Add PKCE where the provider supports it. Fix the refresh grant.
- Effort: M

### [D-06] `deleteAccount` deletes another user's transactions before checking ownership

- Severity: P1
- Location: apps/backend/src/finance.service.ts:67-70
- Evidence: `await this.transactionRepository.delete({ accountId: id })` runs first, with no `userId`. Only then does `accountIntakeService.deleteAccount(userId, id)` check that the account belongs to the caller and throw `NotFoundException` (account-intake.service.ts:250-257). The 404 comes after the delete has committed.
- Impact: Any authenticated user can permanently delete all transactions on any account whose UUID they know and still receive a 404. UUIDs are not guessable, which keeps this at P1 rather than P0, but ids leak through shared screenshots, logs and bug reports, and combined with D-01 the barrier is weaker still.
- Recommendation: Reorder: call the ownership check first, or add `userId` to the delete (`delete({ accountId: id, userId })`). Prefer one transactional method in `AccountIntakeService` that checks ownership and deletes details and transactions together. Add a regression test with two users.
- Effort: S

### [D-07] Raw request bodies are spread into `save()`, enabling record takeover and cross-user writes

- Severity: P1
- Location: apps/backend/src/account-intake.service.ts:230-248 (create/update account); apps/backend/src/finance.service.ts:83-89 (create transaction); apps/backend/src/tax.controller.ts:741-795 (bulk create, create, patch)
- Evidence: `createAccount` does `create({ ...body, userId })`; `createTransaction` does `create({ ...body, userId })`; tax `POST`, `POST bulk` and `PATCH :id` do the same or `Object.assign(record, body)`. `userId` is overwritten on create, so direct impersonation on create is blocked. But the body can still contain `id`: TypeORM `save()` on an entity with a primary key that exists performs an UPDATE, so posting `{ id: <victim record uuid>, ... }` overwrites the victim's row and, because `userId` is then set to the caller, moves it to the attacker. On `updateAccount` and `PATCH tax-records/:id` the `Object.assign` lets the body set `userId`, which pushes a record into any other user's data (injection of fake accounts or tax records into a victim's net worth and MCP context). `createTransaction` never verifies `accountId` belongs to the caller. By contrast `budget.controller.ts:103-138` and `user-profile.service.ts:217-260` copy named fields only, so the pattern to follow already exists in the repo.
- Impact: Cross-tenant data tampering and takeover, bounded by needing a victim UUID (create paths) or a victim `userId` (update paths). Data integrity of the financial calculations is exposed: a user can inject records into someone else's profile.
- Recommendation: Introduce DTO classes with an explicit field whitelist (see D-08) and `whitelist: true, forbidNonWhitelisted: true`. In services, build the entity from named fields only, never spread. Verify `accountId` ownership in `createTransaction`. Strip `id`, `userId`, `createdAt` on every write path.
- Effort: M

### [D-08] No server-side input validation; most handlers take `body: any`

- Severity: P1
- Location: apps/backend/src/main.ts:8-12 (no `useGlobalPipes`); tax.controller.ts:774,786; user-profile.controller.ts:66; mcp.controller.ts:33,38,47,57; finance.service.ts:83
- Evidence: `main.ts` registers no `ValidationPipe`. `package.json` has neither `class-validator` nor `class-transformer` nor `zod`. DTOs such as `CreateAccountDto` (account-intake.service.ts:32) are TypeScript interfaces, which are erased at runtime, so they validate nothing. `balance`, `amount`, `interestRate` are accepted as whatever JSON type the caller sends. `McpController.createToken` accepts `expiryDays` as any value and `body.name` unbounded. `new Date(filters.startDate)` in `mcp.service.ts:140-145` can produce `Invalid Date` from tool input. Free-text fields (`avatarUrl`, names) have no length or scheme limits.
- Impact: Malformed or hostile payloads reach the database layer, causing 500s, NaN or string values in money columns, oversized rows, and unvalidated URLs in `avatarUrl` (a `javascript:` or tracking URL if it is ever rendered in a link rather than an `<img src>`). It also removes the safety net that would otherwise limit the damage of D-07.
- Recommendation: Add `class-validator` and `class-transformer` (or a zod pipe) and set a global `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })`. Convert the interfaces to classes with decorators, constrain numeric ranges and string lengths, and validate `avatarUrl` as `https:`. Replace `any` request typing with `AuthenticatedRequest`.
- Effort: L

### [D-09] No security headers, CSP, rate limiting or body-size policy on the backend or web server

- Severity: P2
- Location: apps/backend/src/main.ts; apps/web/app/entry.server.tsx; apps/web/package.json:79 (`react-router-serve`)
- Evidence: The backend has no `helmet`, no `@nestjs/throttler` and no custom limit (neither is in any `package.json`). The web app is served by `react-router-serve` and `entry.server.tsx` sets no `Content-Security-Policy`, `X-Frame-Options`, `Strict-Transport-Security`, `X-Content-Type-Options` or `Referrer-Policy` (grep for these strings in `apps/web/app` returns nothing). `fly.toml` has `force_https = true`, which redirects but does not emit HSTS. The marketing server does set a full header set (D-15).
- Impact: The authenticated app is frameable (clickjacking) and has no CSP, so any XSS can read the access token that `root.tsx` passes to client JS. The login-adjacent and password endpoints have no throttling; password changes and reset emails (D-13) can be hammered. No brute-force or scraping limit protects `/mcp`.
- Recommendation: Add `helmet` to the backend and a Throttler guard (global default, stricter on `/user-profile/*` and `/mcp-tokens`). In the web app, set headers in `entry.server.tsx` (nonce-based CSP, `frame-ancestors 'none'`, HSTS, `nosniff`, `Referrer-Policy`). The inline scripts in `root.tsx:76,82` will need the nonce.
- Effort: M

### [D-10] Database config: `synchronize: true` in all environments, TLS verification off, default credentials

- Severity: P1
- Location: apps/backend/src/app.module.ts:54-55, 75, 60-64
- Evidence: Both branches set `synchronize: true` with no `NODE_ENV` guard and the repo has no migrations. For any non-local `DATABASE_URL` the config uses `ssl: { rejectUnauthorized: false }`, which encrypts but accepts any certificate, so a network attacker can impersonate the database. The discrete-variable branch sets no `ssl` at all and defaults `DB_PASSWORD` to `postgres`. `isLocal` is a substring test (`url.includes("localhost")`). `docker-compose.yml` publishes Postgres on `5432` with `postgres/postgres`; fine for a local dev file but it binds all interfaces.
- Impact: A schema change in an entity can drop or alter production columns on deploy with no review, which is a data-loss risk for a finance app. The disabled certificate check allows MITM of database traffic (credentials and every financial row).
- Recommendation: Set `synchronize: false` outside development, adopt TypeORM migrations, and run them in the deploy step. Provide the CA via `ssl: { ca }` (or the managed provider's CA bundle) with `rejectUnauthorized: true`. Remove the default DB password so the process fails when it is unset in production. Bind the compose port to `127.0.0.1:5432:5432`.
- Effort: M

### [D-11] Bank token encryption silently falls back to a key committed in source; ciphertext is returned to clients

- Severity: P1
- Location: packages/banking/src/server/crypto.ts:7, 13; apps/backend/src/finance.service.ts:91-96, 141, 263; apps/backend/src/entities/bank-connection.entity.ts:25-29
- Evidence: `getDerivedKey` uses `keyOverride ?? process.env.BANKING_TOKEN_ENCRYPTION_KEY ?? DEFAULT_DEV_KEY`, where `DEFAULT_DEV_KEY` is a string literal in the repo. The mode itself is sound (AES-256-GCM, random 96-bit IV, auth tag), but the key is only a SHA-256 of a passphrase and there is no key id, so rotation is not possible. `safeDecryptBankingToken` (line 90) returns the input unchanged when decryption fails or the value is not in packed form, so a plaintext legacy token or a wrong key goes undetected. `getBankConnections` returns the whole `BankConnection` entity (no `select`), and `connectBank` and `syncBankConnection` return `savedConn`, so the encrypted `accessToken` and `refreshToken` are sent to the browser. `BANKING_TOKEN_ENCRYPTION_KEY` appears in no `.env.example`.
- Impact: If the env var is missing in production, every stored bank token is encrypted with a key anyone with repo access knows, and nothing warns. Encrypted tokens in API responses also hand attackers (via D-01 or XSS) the ciphertext to decrypt offline.
- Recommendation: Throw at startup if `BANKING_TOKEN_ENCRYPTION_KEY` is unset when `NODE_ENV=production`, and require at least 32 random bytes (base64). Add the variable to `.env.example`. Never return `accessToken` or `refreshToken`: map to a response DTO (`id`, `institutionName`, `status`, `lastSyncedAt`). Make `safeDecryptBankingToken` throw on a packed-looking value that fails to decrypt. Plan a key id prefix for rotation.
- Effort: M

### [D-12] A real-looking WorkOS API key was committed to git history

- Severity: P1
- Location: git history: commits `ba5e978` and `5d17dc9` (file `apps/backend/.env`)
- Evidence: `apps/backend/.env` was tracked until `5d17dc9` ("stop tracking environmental configurations"). Its deleted lines include `WORKOS_API_KEY` (83 characters, `sk_test_` prefix), `WORKOS_CLIENT_ID`, `DB_PASSWORD` and `JWT_SECRET`. The value is not reproduced here. The file is now gitignored (`.gitignore:21`, confirmed with `git check-ignore`). No `.env` files are tracked now; only the three `.env.example` files (which contain placeholders and `JWT_SECRET=supersecretdevkey`).
- Impact: Anyone who ever cloned or can read this repository's history can use the test key against that WorkOS environment (read users, reset passwords through the same `updateUser` API the backend uses). Impact is limited to the test environment if that key was a sandbox key, and unknown if the repo is or was public.
- Recommendation: Rotate the WorkOS API key and the dashboard client secret now, regardless of environment. Check the WorkOS dashboard audit log for use. Treat `JWT_SECRET` and `DB_PASSWORD` from that file as burned. If the repository is, or may become, public, rewrite history with `git filter-repo` after rotation. Add a secret scanner (gitleaks) to CI.
- Effort: S

### [D-13] Password endpoints: no re-authentication, and reset email can be sent to any address

- Severity: P2
- Location: apps/backend/src/user-profile.controller.ts:70-91; apps/backend/src/user-profile.service.ts:472-503
- Evidence: `POST /user-profile/change-password` calls WorkOS `updateUser({ userId, password })` with only the 8-character minimum check (`user-profile.service.ts:473`), no current-password check and no confirmation. `POST /user-profile/send-password-reset` takes `body.email` and calls `createPasswordReset({ email })` for whatever address is supplied; the caller's own email is only the default (line 89). There is also a duplicate alias route `update-password`. Neither is throttled (D-09).
- Impact: A stolen or forged session token can permanently take over the account by setting a new password without knowing the old one. Any authenticated user can trigger reset emails to arbitrary third parties (spam and harassment through Flump's sender reputation), and the WorkOS responses differ for unknown users, which allows account enumeration.
- Recommendation: Use the WorkOS AuthKit hosted flows for password change, or require the current password (verify via WorkOS `authenticateWithPassword`). Ignore `body.email` and always use the authenticated user's email. Throttle both routes. Drop the alias route.
- Effort: S

### [D-14] Backend binds `0.0.0.0` and runs an unauthenticated raw TCP proxy on port 3000

- Severity: P3
- Location: apps/backend/src/main.ts:29, 32-47
- Evidence: When `PORT` is 4000 the code starts a `net.createServer` on 3000 that pipes every connection to `127.0.0.1:4000`. It binds all interfaces, has no logging or limits, and swallows listener errors (`proxy.on("error", () => {})`). `apps/web/.env.example` still points `VITE_API_URL` at port 3000. In the web Docker image the app itself listens on 3000, so on a shared host the proxy silently fails or the two collide.
- Impact: A second exposed port to the same API that bypasses any port-based firewall rule or reverse-proxy policy aimed at 4000. Not a vulnerability by itself.
- Recommendation: Delete the proxy and point `VITE_API_URL` at 4000. If it is needed for a migration, gate it on an env var. Bind explicit interfaces only when containerised.
- Effort: S

### [D-15] Marketing server: permissive CSP source lists and stack traces returned to clients

- Severity: P2
- Location: apps/marketing/server.ts:26-31, 142
- Evidence: Production `script-src` is `'self' 'nonce-...' https:`. The `https:` source allows script from any HTTPS host, which largely negates the nonce. `connect-src` allows `https:` and `ws:`, `style-src` allows `unsafe-inline`. On a render error the handler runs `res.status(500).end(e.stack)` in all environments. The nonce is applied only to the one inline script the server adds (line 121). HSTS, `X-Frame-Options`, `nosniff`, `Referrer-Policy` and `Permissions-Policy` are set correctly.
- Impact: Weaker XSS containment than the policy suggests; the 500 response discloses file paths and internal structure.
- Recommendation: Replace `https:` in `script-src` with the specific hosts needed, or use `'strict-dynamic'` with nonces. Remove `ws:` in production. Return a generic 500 body and log the stack server-side.
- Effort: S

### [D-16] Web session handling: dead `session.server.ts`, duplicate callback routes, GET sign-out, access token exposed to JS

- Severity: P2
- Location: apps/web/app/session.server.ts; apps/web/app/routes/auth.callback.tsx and callback.tsx; apps/web/app/routes/logout._index.tsx:29-31; apps/web/app/root.tsx:46-49
- Evidence: Real authentication uses `@workos-inc/authkit-react-router` (cookie sealed with `WORKOS_COOKIE_PASSWORD`). `session.server.ts` (cookie `__session`, `SESSION_SECRET`) is not imported anywhere in `app/` (grep for `session.server` finds nothing except its own file), so it is dead code with a second, unused secret requirement. `auth.callback.tsx` and `callback.tsx` are byte-for-byte identical except the component name. The localhost branch of `login._index.tsx`, `signUp._index.tsx` and both callbacks sets `WORKOS_REDIRECT_URI` to `/callback`, while `apps/backend/.env.example` and `apps/web/.env.example` register `/callback`; `/auth/callback` is only referenced as a bank-provider fallback redirect (`finance.service.ts:231`). Whichever URI is registered in the WorkOS dashboard is the live one and the other is an unused route. The callback also does not validate `state` itself; it relies on the library. `logout` handles `GET` as well as `POST` (loader at line 29), so any page can log a user out with an image tag. `root.tsx` returns `accessToken` in loader data, so the WorkOS access token is serialised into the HTML for every page and readable by any injected script. The presence cookie `flump_has_session` is set without `Secure` (`callback.tsx:26`); it carries no secret.
- Impact: No exploit. The duplication is confusing for operators setting the redirect URI, the unused session module suggests a second auth mechanism that does not exist, GET sign-out is a minor CSRF nuisance, and token exposure to JS raises the cost of any future XSS.
- Recommendation: Keep one callback route (match the URI registered in WorkOS), delete the other and `session.server.ts`. Make logout `POST`-only. Pass the token to client code through a server-side proxy route or a short-lived dedicated token, not through loader data, once API calls are centralised (see D-04). Add `Secure` to the presence cookie in production.
- Effort: S

### [D-17] MCP scopes are issued and stored but never enforced; PAT creation ignores server-side scope policy

- Severity: P2
- Location: packages/mcp/src/server.ts and tools/*.ts (no `scopes` check); apps/backend/src/mcp.controller.ts:55-71; apps/backend/src/mcp.service.ts:185
- Evidence: `grep -rn "scopes" packages/mcp/src` outside the verifier and tests returns only the stdio stub. Tools and resources read `ctx.token.userId` (correct) and `ctx.token.anonymizeInstitutions`, but no tool checks for `mcp:simulate` or `mcp:read:*`. A caller may also set `anonymizeInstitutions: false` when creating a PAT from a standard session with no extra confirmation. Positive: PATs are 128-bit random (`randomBytes(16)`), stored as SHA-256 hash with a unique index, revocation and expiry are checked, and the raw token is returned once. Per-user data access in tools is correctly bound to the token's user, not to tool arguments.
- Impact: Scope strings are decorative, so a read-only token cannot be issued in practice. Once D-03 is fixed this is the next gap.
- Recommendation: Add a per-tool required-scope table and check it in one wrapper. Treat `anonymizeInstitutions: false` as a deliberate action (explicit scope, confirmation in the UI). Consider longer PATs (256-bit) and an expiry default.
- Effort: M

### [D-18] Plaid adapter is a stub; no Plaid or provider webhook endpoints exist

- Severity: P2
- Location: packages/banking/src/server/adapters/plaid.ts:121-149, 151-264
- Evidence: `createLinkSession` returns a fabricated `link-sandbox-...` string, `exchangePublicToken` builds `access-sandbox-<publicToken prefix>-<timestamp>` and encrypts that, and `getAccounts`/`syncTransactions` return hardcoded accounts and transactions. `PlaidAdapter` is exported but not referenced by the backend (grep finds it only in `packages/banking`). There is no webhook controller and `rawBody: true` in `main.ts` is therefore unused. Real providers (Monzo, Starling, Trading 212, Open Banking) are separate backend classes using user-pasted tokens or OAuth.
- Impact: Not exploitable today, because the adapter is unreachable. It becomes a risk if wired up as is: users would see fabricated balances as real data, and the missing webhook layer would mean no verification at all.
- Recommendation: Do not expose the Plaid path until it is real. When implementing, verify webhooks per Plaid's documented scheme: check the `Plaid-Verification` JWT (ES256), fetch the key through `/webhook_verification_key/get`, reject tokens older than five minutes, and compare the SHA-256 of the raw body to `request_body_sha256`. I did not re-check this against Plaid's current docs in this pass (see limits). Keep Plaid secrets in env only, and encrypt access tokens with the key from D-11.
- Effort: L

### [D-19] CI and container hardening gaps

- Severity: P2
- Location: .github/workflows/ci-pipeline.yml:15-18; .github/actions/bun-setup/action.yml; apps/*/Dockerfile; docker-compose.yml; apps/web/docker-compose.yml
- Evidence: The CI workflow grants workflow-wide `actions: write` and `pull-requests: write`, though most jobs only need `contents: read`. Third-party actions are pinned by version tag, not commit SHA (`felixmosh/turborepo-gh-artifacts`, `davelosert/vitest-coverage-report-action`, `googleapis/release-please-action`). No job runs `bun audit` or a secret scan. All three Dockerfiles run as root (no `USER`), use `oven/bun:1-slim` without a digest, and the backend and web images copy the whole `node_modules` and `packages` tree. `docker-compose.yml` (root) uses `postgres:18-alpine`; `apps/web/docker-compose.yml` uses `postgres:latest`, both with `postgres/postgres`. CI does not pass app secrets, so no secret leaks into logs were found in the workflow files.
- Impact: A compromised third-party action tag could write to PRs and caches. A container escape or RCE runs as root.
- Recommendation: Scope permissions per job, pin actions to SHAs (Renovate can maintain them), add `bun audit --audit-level=high` and gitleaks jobs, add `USER bun` to the Dockerfiles, and delete the stale `apps/web/docker-compose.yml` or pin its image.
- Effort: M

### [D-20] Dependency advisories: `typeorm` is a runtime dependency of the flagged chain

- Severity: P3
- Location: bun.lock; apps/backend/package.json (`typeorm 0.3.31`); packages/mcp (`zod ^3.24.2`)
- Evidence: From the Phase 0 `bun audit` (21 findings): most highs come from `undici` under `vitest-github-actions-reporter` (dev-only, CI). The runtime-relevant items are `minimatch` and `glob` pulled in by `typeorm` (backend), and `zod <4.6.6` in `@flump/mcp` and the MCP SDK. I did not re-run the audit or read the advisory text in this track.
- Impact: Low in practice: `glob`/`minimatch` ReDoS issues need attacker-controlled patterns, which the backend does not take; the `zod` advisory depends on which parsers are used. Worth fixing as part of routine upgrades.
- Recommendation: Bump `typeorm` and `zod` when patched versions are available, move the reporter to a version with a patched `undici`, and add `bun audit` to CI as a non-blocking report first.
- Effort: S

### [D-21] CORS is correct but loosely configured

- Severity: P3
- Location: apps/backend/src/main.ts:13-30
- Evidence: Origins come from `CORS_ALLOWED_ORIGINS` split on commas (not trimmed) or a localhost default list. No wildcard is used, so this is not a vulnerability. `credentials: true` is set although authentication uses a bearer header, not cookies.
- Impact: A space after a comma in the env var silently drops that origin; the unnecessary `credentials: true` would matter if cookie auth were added later.
- Recommendation: Trim entries, validate the value at boot, drop `credentials: true` unless cookies are used.
- Effort: S

## Checked and found sound

- Read paths and most single-record writes scope by `userId` in the query: `getAccount`, `getAccountDetails`, `getTransactions`, bank-connection sync and delete, budget CRUD, tax `GET/PATCH/DELETE :id` lookups, MCP token list and revoke, `resetFinancialData`.
- `budget.controller.ts` and `user-profile.service.ts` copy explicit fields, so they are not subject to the mass-assignment problem.
- MCP tools and resources take the user from the verified token, not from tool input.
- PAT generation and storage (hashed, unique, expiry and revocation checked).
- The AES-256-GCM implementation itself (random IV, auth tag, authenticated decrypt).
- No secrets, `.env` files or private keys are tracked at HEAD; `.env` variants are gitignored.
- Marketing server sets HSTS, `X-Frame-Options`, `nosniff`, `Referrer-Policy` and `Permissions-Policy`.
- `eval` and `new Function` are absent (Phase 1 sweep); the two `dangerouslySetInnerHTML` uses in `root.tsx` inject server-controlled strings only (`JSON.stringify(ENV)` and a static script).

## Limits

- Code reading only. No runtime pass, no request fuzzing, no check that the live WorkOS environment, Railway or Fly deployments match what the repo implies. Where the backend is hosted and what sits in front of it (a reverse proxy, an IP allowlist) is unknown; I inferred public exposure from the browser calling it directly and from `EXPOSE 4000`.
- I did not invoke the `engineering:code-review`, `workos:workos` or `research` skills, and did not fetch WorkOS or Plaid primary documentation, so the JWKS recommendation (D-01) and the Plaid webhook steps (D-18) come from my own knowledge of those products, not from checked docs. Verify both before implementing.
- `bun audit` was not re-run; D-20 relies on the Phase 0 output.
- `apps/mobile-companion` was only grepped for the mock token and bank-connection calls. Its auth model belongs to Track G.
- The WorkOS key in history was identified by name, length and `sk_test_` prefix only. I did not test whether it is still valid.
- TypeORM column-level concerns (sensitive profile fields stored in plaintext, no row-level security) were not audited.

## Quick wins

1. Rotate the WorkOS API key found in git history (D-12).
2. Remove the `mock-session-token` and `dev_user_123` branches from `auth.guard.ts` and `token-verifier.ts`, or gate them behind an explicit flag that is refused in production (D-02, D-03).
3. Reorder `deleteAccount` so the ownership check runs before any delete, and add a two-user test (D-06).
4. Make `getAuthSession` rethrow instead of returning the mock session, and delete the `|| "mock-session-token"` fallbacks (D-04).
5. Throw at boot if `BANKING_TOKEN_ENCRYPTION_KEY` is unset in production, and stop returning `accessToken` and `refreshToken` in responses (D-11).
6. Set `synchronize: false` outside development (D-10).
7. Delete the dead `/bank-connections/callback` guard bypass, the TCP proxy on port 3000, `session.server.ts` and one of the two callback routes (D-05, D-14, D-16).
8. Add `helmet` and a global throttler to the backend (D-09).
