# E20 plan draft: Session and application security hardening

Status: **draft for review. Nothing has been implemented.** Written by a read-only Opus planner on 2026-11-12.

Code was read from `main` at `e4ff6c3`, exported read-only to a scratch directory. All `path:line` references are to that commit. The installed `@workos-inc/authkit-react-router@0.13.0` was read in `apps/web/node_modules`.

Each item is marked **V** (verified in code or config) or **I** (inference, still to verify).

**About the external sources.** This planner session had no web-fetch tool. The primary sources in section 13 are cited from knowledge and were **not re-fetched**. Each claim that depends on a vendor's current behaviour is flagged "verify" and has a spike task.

---

## 1. Summary

E1 made identity unforgeable and E5 unified the API client. The remaining risk is concentrated in four places:

1. **The WorkOS access token reaches browser JavaScript.** The root, budget and onboarding loaders return it in loader data, and four client modules use it to call the backend directly. XSS therefore means a stolen bearer token.
2. **Nothing limits what a stolen token can do.**
   - It can change the password without the current one.
   - It can mint a never-expiring PAT with real institution names that outlives a password reset.
   - There are no rate limits outside `/mcp`, and no CSP or frame headers on the web app.
3. **Small but real web bugs:**
   - `GET /logout` signs the user out.
   - An `endsWith(<old domain>)` cookie-domain check also matches a lookalike host.
   - Two identical callback routes.
   - A dead second session module.
   - A per-request global `configure()` mutation.
   - Refreshed-session `Set-Cookie` headers are never forwarded (new finding, impact still to confirm).
4. **No proof of authorisation.** There is no two-user IDOR suite on real Postgres, and no check that every route has one.

**Recommended route:**

- **Phase 0:** ship 16 small quick wins. Ten are safe before or alongside release PR 368.
- **Phase 1:** remove the token from the browser with a strict same-origin `/api` proxy, then migrate to route actions over time (D1-C).
- **Phase 2:** CSP in report-only mode, then enforced.
- **Phases 3 to 9, in parallel where files allow:** rate limiting, step-up re-authentication and sessions, receipt serving, the authorisation matrix, MCP scope enforcement with E17, logging policy, and security testing.

**Honest estimate:** 50 to 68 agent-days, 7 to 10 weeks elapsed with two worktrees, and 8 to 12 hours of owner time (section 11).

---

## 2. Threat model

### 2.1 Assets

| Asset | Where it lives | Notes |
|---|---|---|
| `wos-session` sealed cookie (holds access and refresh token) | Browser cookie, sealed with `WORKOS_COOKIE_PASSWORD` (iron-session) | HttpOnly; `SameSite=Lax`; `Secure` only if `WORKOS_REDIRECT_URI` is https; Max-Age 400 days by default (V, `authkit .../sessionStorage.js:60-72`, `config.js:26-31`) |
| WorkOS access token (JWT) | Web server, **and browser loader data today** | V, `root.tsx:59` |
| MCP PATs | Raw value shown once; SHA-256 hash in `mcp_tokens` | 128-bit (V, `mcp.service.ts:184`) |
| Bank provider tokens | AES-256-GCM in `bank_connections` | No key id, so the key cannot be rotated (V, `packages/banking/src/server/crypto.ts:7,38`) |
| Secrets | Railway env: `WORKOS_API_KEY`, `WORKOS_COOKIE_PASSWORD`, `BANKING_TOKEN_ENCRYPTION_KEY`, DB URL | D-12 rotation still open (I) |
| Financial data and PII | Postgres: balances, salary, tax records, **receipts as base64 text** (`tax-record.entity.ts:44-51`), notes, avatar data URL (`user-profile.entity.ts:26-27`) | Receipts may hold addresses, UTRs and EXIF GPS |
| Onboarding seed (salary) | Non-HttpOnly cookie (host-only) plus localStorage | V, `packages/finance-engine/src/persistence.ts:94-101`; `apps/web/app/state/baseline.store.ts:14,39-52` |
| Integrity of calculations and of the agent context | Postgres; MCP outputs | Prompt-injection target |

### 2.2 Actors

- **A1.** Anonymous internet attacker.
- **A2.** Authenticated malicious tenant (user B).
- **A3.** XSS attacker, through stored data or a compromised dependency.
- **A4.** Same-site attacker: any `sibling` host including the marketing apex, and possibly other `*.up.railway.app` apps if that suffix is not on the Public Suffix List (I, verify).
- **A5.** A compromised or prompt-injected AI client holding a PAT.
- **A6.** A hostile third-party data source, such as bank merchant descriptions.
- **A7.** A compromised dependency, CI action or container image.
- **A8.** An operator or insider with Railway access.

### 2.3 Trust boundaries

| Boundary | Between | Credential |
|---|---|---|
| TB1 | browser and web SSR | cookie |
| TB2 | browser and backend, directly | bearer plus CORS. **To be removed in Phase 1** |
| TB3 | web server and backend | bearer, server to server |
| TB4 | backend and Postgres | TLS |
| TB5 | backend and WorkOS API | API key |
| TB6 | backend and bank providers | user tokens, hard-coded hosts |
| TB7 | AI client and `/mcp` | PAT |
| TB8 | tool output and LLM context | stored third-party text |
| TB9 | CI and GitHub/Railway secrets | |
| TB10 | marketing and web | shared parent-domain cookies |

### 2.4 STRIDE table

| Component | S | T | R | I | D | E | Current state | Mitigation (task) |
|---|---|---|---|---|---|---|---|---|
| Web SSR and session | Session riding via CSRF from same-site origins; `GET /logout` | Host-header-driven `configure()` | No security event log | Token in loader data, readable by any script | Unthrottled actions | XSS gives the token and then takeover (AC1) | V: `root.tsx:59`, `logout._index.tsx:29-31`, `callback.tsx:15-22`, no headers in `entry.server.tsx:21-87` | Q1, Q2, Q7, Q15, Phase 1, Phase 2 |
| Backend REST | Bearer replay until `exp` after logout (no `sid` check) | Mass assignment (`body: any`) | No audit of sensitive actions | Error text echoed from WorkOS (`user-profile.service.ts:510`) | No throttling; body limit implicit | Password change with no re-auth | V: `user-profile.controller.ts:70-91`; D-08 open | Q4 to Q6, Phase 3, Phase 4, E21 |
| Authorisation | Not applicable | Cross-user writes (fixed in E1, unproven) | Not applicable | IDOR reads | Not applicable | Ownership bypass | V: unit tests on in-memory repos only (F-04) | Phase 6 |
| MCP | PAT theft (no expiry by default) | Not applicable | No audit trail | Real institution names via `anonymizeInstitutions:false`; `err.message` leaked | Rate limit applied only after auth succeeds | Scopes not enforced (D-17) | V: `mcp.service.ts:189-196`, `http.ts:40-70`, `token-verifier.ts:135` | Q10, Q11, Phase 7, E17 |
| Receipts and avatar | Not applicable | Polyglot or oversize upload | Not applicable | EXIF GPS leak | Unbounded text column | `href={dataURL}` link sink | V: `TaxContainer.tsx:235-247,2157,2177`; `tax.controller.ts:33-35` | Q9, Phase 5 |
| Auth (WorkOS) | Issuer accepts two forms; no `aud` or client binding | Not applicable | Not applicable | Reset-email enumeration | Reset-email spam to any address | Not applicable | V: `workos-jwt.verifier.ts:19-28,53-57`; `user-profile.controller.ts:87-91` | Q5, Q12 |
| Bank connections | Forgeable OAuth `state` (flow dead) | Not applicable | Not applicable | Raw provider errors logged | Not applicable | Env var name chosen by user input | V: `finance.service.ts:199-211,269,324` | L2, E16 cut of OAuth, E21 enum |
| Marketing | Not applicable | Host-based `process.env` mutation per request | Not applicable | `e.stack` in 500 responses | Not applicable | `script-src https:` negates the nonce | V: `apps/marketing/server.ts:26,30,97-118,142` | Q8 |
| Supply chain | Not applicable | Compromised action or dependency | Not applicable | Secret in git history (D-12) | Not applicable | Root containers | V: D-19; audit gate exists (E11 T7) | E18 gitleaks, T2 to T4 |

### 2.5 Abuse cases

**AC1. XSS to token theft to permanent takeover.** This is the worst current chain.

1. Script runs on the web origin.
2. It reads `accessToken` from the serialised loader data (`root.tsx:59`), or fetches `/app/budget.data` (`app.budget.tsx:11`).
3. It calls `POST /user-profile/change-password` with only `newPassword` (`user-profile.controller.ts:70-77`, which calls WorkOS `updateUser` at `identity.adapter.ts:43-48`).
4. It calls `POST /mcp-tokens` with `{expiryDays:null, anonymizeInstitutions:false}`, which creates a never-expiring PAT that returns real institution names (`mcp.service.ts:190-196`).
5. It keeps exfiltrating through `/mcp` even after the victim resets their password, because nothing revokes PATs.

**Breaks the chain:** CSP (Phase 2), no token in the browser (Phase 1), step-up for password and PAT (Q11, Phase 4), default PAT expiry (Q11), and "revoke all PATs and sessions" on password reset (A4).

**AC2. CSRF.**

- RR actions are protected from cross-site POSTs by `SameSite=Lax` (V, library default).
- They are **not** protected from same-site origins (A4).
- `/logout` accepts top-level GET navigation (V).
- The Phase 1 proxy adds a new cookie-authenticated mutation surface.
- **Mitigation:** an Origin / `Sec-Fetch-Site` check on every non-GET request (Q7), POST-only logout (Q1), and a custom-header requirement on `/api` (B2).

**AC3. IDOR.** User B uses user A's UUID.

- E1 fixed the known holes.
- Nothing proves it on real Postgres, and new routes (receipt download, sessions) will add risk.
- **Mitigation:** Phase 6 matrix plus the route-coverage meta-test.

**AC4. Mass assignment.**

- `id`, `userId` and `createdAt` in bodies are handled by allow-lists (E1), but every handler still takes `body: any` (D-08).
- **Mitigation:** E21 zod pipe. Phase 6 probes `id` and `userId` on every write.

**AC5. SSRF.**

- Provider hosts are hard-coded (V: monzo, starling, trading212 and open-banking registry). The risk today is low.
- The smell: `institutionId.toUpperCase() + "_CLIENT_ID"` selects which env var to read (`finance.service.ts:199-204`).
- **Mitigation:** an institution enum (E21). Any future server-side URL fetch (aggregator, webhooks, avatar import) needs a host allow-list and an IP-range deny-list (OWASP SSRF cheat sheet).

**AC6. Indirect prompt injection.**

- Merchant descriptions, account names, notes and budget titles reach MCP tools.
- Impact today: misleading output, or exfiltration through the client's other tools. Flump has no write tools.
- **Mitigation:** E17 section 10 quarantine. E20 adds the scope gate and kill switch (Phase 7).

**AC7. Malicious receipt.**

- Uploads have no server-side MIME check, magic-byte check, size cap or filename sanitising (V).
- Display uses `<img src=data:>`, which is safe even for SVG because SVG in `<img>` does not run script.
- Download uses `<a href={receiptData} download>`, which is a URL sink fed by stored data. React 19 blocks `javascript:` (I, verify for 19.3). `data:text/html` labelled as a PDF can still be downloaded and opened locally.
- **Mitigation:** Q9 now; Phase 5 adds a download route with `Content-Disposition: attachment`, `nosniff` and a sandbox CSP.

**AC8. Brute force and enumeration.**

- `send-password-reset` takes any `body.email` (V) and echoes WorkOS error text (V), which allows enumeration and spam.
- Invalid PAT attempts are never throttled because the limiter runs after auth (V, `http.ts:40-43`), so each attempt is a DB lookup.
- Sign-in brute force is handled by WorkOS's hosted UI (I, verify WorkOS's protections).

**AC9. Supply chain.**

- A compromised npm package can run XSS (hence CSP).
- Tag-pinned actions (D-19), root containers (N-05..07).
- Google Fonts CSS from a third party (cannot run script, but leaks user IPs to Google).

**AC10. Session lifetime and revocation.**

- The sealed cookie lasts 400 days.
- Real lifetime depends on WorkOS dashboard settings (I, unknown).
- Logout revokes the WorkOS session through the `sid`-based logout URL (V, `session.js:439-464`).
- The backend still accepts access tokens until `exp` (no `sid` check). WorkOS access tokens are short-lived, about 5 minutes (I, verify).

**AC11. Clickjacking.** The web app sends no `X-Frame-Options` or `frame-ancestors`, so the profile page (reset data, password) can be framed. **Mitigation:** Q7.

**AC12. Host-header state poisoning.**

- `login`, `signUp` and both callbacks call the global `configure()` when the request hostname is `localhost` (V, `callback.tsx:15-22`, `login._index.tsx:7-14`).
- The override persists for the life of the process (E11 ledger).
- If a request with `Host: localhost` can reach the service, every later login breaks (DoS). Railway's edge probably routes by Host, so this is likely infeasible (I).
- **Mitigation:** gate on `NODE_ENV==="development"` (Q2).

---

## 3. Verified current-state inventory

| # | Gap | Evidence | V/I |
|---|---|---|---|
| G1 | **Access token reaches browser JS.** Producers: root loader returns `accessToken` (`root.tsx:36,59`); `WorkspaceSnapshot.accessToken` (`services/backend-client.server.ts:121,161,215`); `app.budget.tsx:8-11`; `app.onboarding.tsx:51`. Consumers: `hooks/useUserProfile.ts:264-271` (root data), whose `updateProfile` :288, `markChecklistStep` :300, `changePassword` :313, `sendPasswordResetEmail` :327 and `resetFinancialData` :341 are used by HomeDashboard, UserProfilePanel, ForecastContainer, SavingsContainer, PensionContainer, MortgageContainer, BudgetContainer and onboarding; `containers/budget/BudgetContainer.tsx:45,153,168,183,210,230`; `containers/mortgage/MortgageContainer.tsx:69-70,129`; `routes/app.onboarding.tsx:93,317,332`. `HttpProfileAdapter` (`useUserProfile.ts:365-382`) is defined but has no production consumer. The single client is `services/api-client.ts:19-27,33-38` (reads `window.ENV.VITE_API_URL`, sends `Authorization: Bearer`). `window.ENV` is injected at `root.tsx:85-89`. | V |
| G2 | **No security headers on web.** `entry.server.tsx:21-87` sets only Content-Type. `react-router-serve` is used (`apps/web/package.json:78`). There is no `headers` export or middleware. | V |
| G3 | **No security headers on backend.** No helmet. `main.ts` has only CORS (`:28-31`). | V |
| G4 | **Rate limiting only in MCP:** in memory, per user, after auth (`packages/mcp/src/transports/http.ts:25,40-51`; `auth/rate-limiter.ts:18`). No throttler in `apps/backend/package.json`. Express 429 has no `Retry-After` (`http.ts:45-49`). | V |
| G5 | **Password change without re-auth** (`user-profile.controller.ts:70-77`). The alias `update-password` remains (`:79-85`). Only an 8-character minimum (`user-profile.service.ts:483-486`). | V |
| G6 | **Reset email to any address:** `body?.email \|\| req.user?.email` (`user-profile.controller.ts:87-91`). WorkOS error message is echoed (`user-profile.service.ts:510`). The UI sends the email from client state (`UserProfilePanel.tsx:399-400`). WorkOS tokens usually lack an `email` claim, so the server fallback is often undefined (E1 ledger:76, I). | V (claim I) |
| G7 | **Receipt upload:** client `FileReader.readAsDataURL` with no type or size checks (`TaxContainer.tsx:235-247`; `accept` is a hint only, `:2080-2081`). The web action forwards it as-is (`app.tax.tsx:39-41,72-74`). The backend allow-lists the fields but does not validate them (`tax.controller.ts:33-35`). The column is unbounded text. Rendering: `href={receiptData}` (`TaxContainer.tsx:2157`) and `src` (`:2177`). Receipts are included in every `GET /tax-records` list (E17 3.7). Nest's JSON body limit is not set (`main.ts:8-10`). The default is presumably Express's 100 kb, which would make larger receipts fail today (I, verify with a 200 kB POST). | V (limit I) |
| G8 | **Avatar:** client-only checks (`utils/avatar.ts` `processImageFile`: `startsWith("image/")`, 5 MB, re-encoded through canvas, but `img.onerror` resolves the **raw** data URL). The backend stores any string (`user-profile.service.ts:268`). Rendered only in `<img src>` (`UserAvatar.tsx:34-39,106`), also from `user.profilePictureUrl` (a third-party https host). | V |
| G9 | **Logout over GET:** `logout._index.tsx:29-31`. The only logout UI is a link (`components/navigation/UserLogin.tsx:29`). | V |
| G10 | **Cookie-domain suffix bug:** `url.hostname.endsWith(<old domain>)` in `logout._index.tsx:13`, `callback.tsx:25`, `auth.callback.tsx:25`. The presence cookie has no `Secure`. The correct check already exists in `packages/finance-engine/src/persistence.ts:52-59`. The cookie is read by `apps/marketing/src/components/Header.tsx:130`. | V |
| G11 | **Duplicate callback routes:** `callback.tsx` and `auth.callback.tsx` differ only in the component name (diff run). `/auth/callback` is also the bank-OAuth fallback (`app.accounts._index.tsx:80-81`), so a bank `code` would go to WorkOS `authLoader`, which is broken by design. `.env.example` files register `/callback` (D-16). | V |
| G12 | **Dead `session.server.ts`.** Nothing imports it (grep). It requires `SESSION_SECRET` at import. | V |
| G13 | **MCP scopes not enforced:** only `anonymizeInstitutions` is read by tools (`tools/debt-simulator.tool.ts:86`, `financial-audit.tool.ts:251`, resources). `scopes` are only defaulted in `token-verifier.ts:135`. PAT creation takes `body` with `expiryDays` and `anonymizeInstitutions` unvalidated (`mcp.controller.ts:49-65`). `expiryDays` null means never expires (`mcp.service.ts:193-196`). | V |
| G14 | **TCP proxy on port 3000:** `main.ts:35-48`, binds all interfaces, errors swallowed. | V |
| G15 | **CORS defaults:** split without trim (`main.ts:13-14`), ten localhost origins as the default, `credentials: true` with bearer auth (`:28-31`). | V |
| G16 | **Error and stack leakage:** marketing `res.status(500).end(e.stack)` (`apps/marketing/server.ts:142`); MCP non-auth errors return 400 with `err.message` (`http.ts:63-70`); WorkOS messages echoed (`user-profile.service.ts:492-494,510`); provider names reflected in 400s (`finance.service.ts:224-245`). | V |
| G17 | **Logging of PII or tokens:** none of tokens found (good: `workos-jwt.verifier.ts:66-72`, `root.tsx:48`). Raw provider errors logged (`finance.service.ts:269,324`; content unknown, I). `entry.server.tsx:78` logs render errors raw. There is no request or security-event logging at all. | V / I |
| G18 | **WorkOS issuer open:** two issuers accepted by default (`workos-jwt.verifier.ts:19-28`); no `aud` or client binding (`:53-57`). The signature is still pinned to the client JWKS (`:30-31`), so residual risk is low. It is a correctness risk (E1 ledger:28,74). | V |
| G19 | **No two-user IDOR suite on real Postgres** (F-04). Cross-user unit tests exist on in-memory repositories (`finance.service.spec.ts`, `tax.controller.spec.ts`, `budget.controller.spec.ts`, `account-intake.service.spec.ts`). The only real-DB suite is migrations (`migrations/migrations.integration.spec.ts`). No `@nestjs/testing` or `supertest` dependency (`apps/backend/package.json`). There is no metadata test that every route is guarded (E1 ledger:76). | V |
| G20 | **Session lifetime and revocation:** cookie Max-Age 400 days (`authkit config.js:31`, overridable by `WORKOS_COOKIE_MAX_AGE`). The WorkOS dashboard session settings are unknown (I). Logout revokes through the `sid` logout URL (V). There is no session list or revoke UI. Password change revokes nothing. The backend does not check `sid`. | V / I |
| G21 | **New: refreshed session cookie never forwarded.** `getAuthSession` returns `headers` (`utils/auth.server.ts:60`), but no caller uses them (grep). AuthKit appends the refresh `Set-Cookie` only when the result goes through its own loader (`session.js:383-420`). After the access token expires, every request may refresh again without saving the result. If WorkOS refresh tokens rotate, users are logged out early and refresh traffic grows. | V (code) / I (impact) |
| G22 | **Emotion is vestigial:** referenced only in `entry.server.tsx:3-4,45-58`, `entry.client.tsx` and `createEmotionCache.ts` (grep). It injects `<style>` tags with no nonce, which hurts CSP. | V |
| G23 | **Third-party fonts:** Google Fonts CSS and fonts (`root.tsx:22-27`). | V |
| G24 | **Marketing CSP:** `script-src 'self' 'nonce-…' https:` (`server.ts:26`) and `connect-src https: ws:` (`:30`). Per-request `process.env.VITE_APP_URL` mutation based on Host (`:97-118`, a race). HSTS `includeSubDomains`, no preload (`:16`). | V |
| G25 | **Salary in a non-HttpOnly cookie** (onboarding seed), now host-only (`persistence.ts:94-101`). | V |

---

## 4. Target design: removing the access token from the browser

### 4.1 Options

| | **A. Route actions everywhere** (E5 D3-B as written) | **B. Same-origin `/api/*` proxy resource route** | **C. B now, then A over time with a ratchet** |
|---|---|---|---|
| Change | Each client mutation becomes a route `action` called through `useFetcher`. About 13 call sites across 4 modules plus about 10 consumers. Optimistic UI is rewritten per container. | New `routes/api.$.tsx` forwards an allow-listed method and path to the backend, using the session token from `getAuthSession`. `apiFetch` drops its token and calls `/api/...` same-origin. The root, budget and onboarding loaders stop returning the token. | B's diff, plus a tested allow-list that may only shrink as E15 and E16 rewrite containers |
| Effort | L (5 to 7 agent-days; E5 estimated 3 to 5 extra) | M (3 to 4 agent-days) | M now; A's cost is absorbed by E15 and E16 rewrites |
| Blast radius | High: BudgetContainer, UserProfilePanel, HomeDashboard, Pension, Mortgage and onboarding, all hot files for E15, E16 and E23 | Low: `api-client.ts`, `useUserProfile.ts` signature, `root.tsx`, 2 loaders, 1 new route | Low now |
| Security | Best: no generic relay; each action validates its own input | Good: no bearer in JS. The new risk is a cookie-authenticated relay (CSRF, path traversal, open proxy) unless constrained | B's protections until the allow-list is empty |
| Revalidation and UX | Native RR revalidation; works without JS | Same as today | Improves over time |
| E21 typed client | Actions call the typed client server-side | The proxy is untyped. Browser callers can use the typed client over `/api`, since the client is transport-agnostic | Fits |
| E12 mobile | Unaffected (bearer to backend) | Unaffected | Unaffected |

**Recommendation: C** (decision D1). It removes the token within one PR, avoids colliding with E15, E16 and E23 on large containers, and the ratchet guarantees convergence on A.

### 4.2 Proxy hard requirements (task B2)

1. **Allow-list** of `{method, pathPattern}`, matching today's browser calls exactly:
   - `PATCH /user-profile`
   - `PATCH /user-profile/checklist`
   - `POST /user-profile/send-password-reset` (after Q5 the body is ignored)
   - `POST /user-profile/reset-financial-data` (step-up after A3)
   - `GET|POST /budget-entries`
   - `PATCH|DELETE /budget-entries/:uuid`
   - `POST /budget-entries/seed-defaults`
   - `POST /budget-entries/categories`
   - `PATCH /accounts/:uuid`
   - `GET|POST /accounts`
   - `change-password` only if D2-B or D2-C.

   Anything else returns 404.
2. **Path handling:** reject `..`, `%2e`, `%2f`, `//`, `\` and query strings outside the allow-list. Build the backend URL from `apiConfig.apiBaseUrl` plus a normalised path; never from user input.
3. **CSRF:** require `Origin` equal to the app origin (or `Sec-Fetch-Site: same-origin`) **and** a custom header `X-Flump-Request: 1`. The custom header forces a CORS preflight that a foreign origin cannot pass. Content-Type must be `application/json`.
4. **Bounded:** request body at most 64 kB, a timeout, no request-header passthrough except `Content-Type`, and never forward backend `Set-Cookie`.
5. **Session refresh:** forward the session's refresh `Set-Cookie` (fixes G21 for this route).
6. **Errors:** map to the existing `BackendError` kinds with no backend body except the 4xx `message`, matching `api-client.ts:62-71` behaviour.
7. **Tests:** every allow-listed entry; a non-listed path returns 404; a traversal attempt returns 404; a missing header returns 403; a foreign Origin returns 403; no session returns 401; and a guard test fails if the allow-list grows (snapshot with a CODEOWNERS-free comment rule, because branch protection is unavailable, per DECISIONS).

### 4.3 After token removal

- Delete `window.ENV` (`root.tsx:85-89`), which is no longer needed, and `HttpProfileAdapter`.
- Backend CORS: drop browser origins entirely. No browser calls the backend directly any more. E12 native apps do not need CORS (B6).
- Keep the backend public: `/mcp` and E12 need it. Moving REST to Railway private networking is decision D13.

---

## 5. CSP, security headers and cookies

### 5.1 Web response-header layer (Q7 and C1 to C5)

**Where:** `apps/web` runs `react-router-serve`, so there is no Express hook. Two places cover every response type:

- A **root route middleware** (RR 7.18 supports middleware behind the `future.v8_middleware` flag; I, verify the flag name for 7.18.5). It runs before actions and loaders, so it can do the CSRF Origin check, and it can set headers on document and `.data` responses.
- **`entry.server.tsx` `handleRequest` and `handleDataRequest`** as the fallback.

Static assets from `react-router-serve` get no custom headers. That is acceptable; HSTS on documents is enough for the browser.

**Headers in Phase 0** (all enforced except CSP):

- `Strict-Transport-Security: max-age=31536000; includeSubDomains` (no preload, D8)
- `X-Frame-Options: DENY` plus an enforced `Content-Security-Policy: frame-ancestors 'none'`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()`
- `Cross-Origin-Opener-Policy: same-origin` (WorkOS uses redirects, not popups; I, verify)
- **No COEP.** It is not needed (no SharedArrayBuffer) and would break third-party images.

**CSP rollout:**

1. **C1 nonce plumbing:**
   - Generate a 128-bit nonce per request in middleware, or in `handleRequest`.
   - Expose it through a `NonceContext` provider that wraps `<ServerRouter nonce={nonce}>`.
   - Pass `renderToPipeableStream(..., { nonce })`.
   - Add `nonce` to `<Scripts>`, `<ScrollRestoration>` and the theme script.
   - The client provides `""`. Spike whether React 19.3 warns on nonce hydration mismatch (I).
2. **Q16 / C1 prerequisites:** remove Emotion (G22). After Phase 1, delete the `window.ENV` script. Self-host fonts (D11).
3. **C2 report-only policy** (initial, with origins drawn from the code):

   ```
   default-src 'self';
   script-src 'self' 'nonce-{N}';
   style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;   (drop the host if D11-A)
   font-src 'self' https://fonts.gstatic.com;                       (drop the host if D11-A)
   img-src 'self' data: blob: https:;   (WorkOS profilePictureUrl hosts vary; tighten from reports)
   connect-src 'self' {VITE_API_URL origin until Phase 1 lands};
   form-action 'self' https://api.workos.com {AuthKit custom domain if any} {marketing origin};
   frame-ancestors 'none'; object-src 'none'; base-uri 'none';
   report-uri /csp-report; report-to csp-endpoint
   ```

   `form-action` must allow the logout POST's redirect chain (to the WorkOS logout URL, then marketing). Chrome applies `form-action` to redirects (I, verify in report-only).
4. **C2 report endpoint:** `/csp-report` resource route that accepts `application/csp-report` and `application/reports+json`. It is size-capped, rate-limited, and logs only the directive, blocked-URI origin and document path.
5. **C4 soak:** at least 14 days in staging (E18) and production with zero unexplained reports. Expected fixes:
   - the Radix `react-remove-scroll` style singleton (needs `get-nonce` `setNonce`, I);
   - inline `style={{}}` attributes, which need `'unsafe-inline'` in `style-src` or `style-src-attr`.
6. **C5 enforce:** switch to `Content-Security-Policy`, add `upgrade-insecure-requests`, and keep a report-only copy of a stricter next policy: `style-src-elem 'self'` plus `style-src-attr 'unsafe-inline'`.

**Panda CSS implications:**

- Panda emits a static stylesheet at build (`index.css?url`, `root.tsx:14,28`). It needs no runtime injection, so it is CSP-friendly.
- The blocker for dropping `'unsafe-inline'` styles is the many SSR `style="..."` attributes. These are already banned by the AGENTS.md token law ("no inline style soup"), so E15 and E9 removing them is what allows the stricter policy later.
- Script CSP does not depend on this.

### 5.2 Backend headers (Q4)

- `helmet` configured for a JSON API: `contentSecurityPolicy: {directives: {defaultSrc:["'none'"], frameAncestors:["'none'"]}}`, HSTS, `noSniff`, `referrerPolicy: no-referrer`, hide `X-Powered-By`.
- Keep helmet's `Cross-Origin-Resource-Policy: same-origin`. It does not affect CORS-mode fetches, which only exist until Phase 1 (I, verify in staging).
- Explicit body limits: JSON 1 MB globally, 8 MB only on `POST|PATCH /tax-records` while receipts stay inline (D6-A). Use `app.useBodyParser('json', {limit})` (I, verify the API on Nest 12).
- `app.set('trust proxy', N)` with N verified for Railway's edge (I).

### 5.3 Marketing (Q8)

- Replace `https:` in `script-src` with nothing, since all scripts are same-origin plus the nonce.
- Remove `ws:` and `https:` from production `connect-src` (keep only the origins needed; I, check for analytics).
- Generic 500 body. Log the stack server-side.
- Compute the app URL once at boot, not by mutating `process.env` per request.

### 5.4 HSTS preload

This is decision D8. Preload applies to the apex and **all** subdomains and is slow to undo (hstspreload.org requirements: at least 1 year max-age, `includeSubDomains`, `preload`, served on the apex). The custom domain is not live yet (EPICS E24). Defer it.

### 5.5 Cookies

- Production `WORKOS_REDIRECT_URI` must be https so that `Secure` is set (V, library logic). Add a web boot check.
- Set `WORKOS_COOKIE_MAX_AGE` to match the WorkOS absolute session length (D3).
- Consider `WORKOS_COOKIE_NAME=__Host-wos-session`. The `__Host-` prefix requires `Secure`, `Path=/` and no `Domain`, which defends against cookie tossing from sibling subdomains. Changing it logs everyone out once.
- Presence cookie (D9-B): one shared `isFlumpHost(hostname)` helper (exact-or-suffix host match, moved from `persistence.ts:52-59`), `Secure` in production, and `Domain` taken from an env `COOKIE_DOMAIN` rather than from Host.
- The onboarding seed cookie carries salary on the parent domain (G25). Shorten its Max-Age, clear it after onboarding, or move it to a query handoff. Coordinate with the E19 cookie position.

---

## 6. Rate limiting design

**Placement:**

- **Backend:**
  - A global `ThrottlerGuard` (APP_GUARD) keyed by client IP for unauthenticated or failed-auth traffic.
  - A **`UserThrottlerGuard`** applied after `AuthGuard` (`@UseGuards(AuthGuard, UserThrottlerGuard)`) keyed by `req.user.id`. Global guards run before controller guards, so the global one cannot see `req.user`.
- **Important:** after Phase 1 nearly all browser traffic reaches the backend from the **web server's single egress IP**. Per-IP limits on the backend must therefore be generous, or exempt the web server. Users are limited per user. If a service-to-service identity is wanted, add a header shared secret (`X-Flump-Internal`); otherwise rely on per-user limits.
- **Web:** no per-IP limiter in Phase 0 (D4-A). Sign-in and sign-up are WorkOS-hosted. Authenticated actions are limited per user at the backend. Revisit with Cloudflare at the custom domain (D4-C).
- **MCP:** keep the existing per-user limiter. Add a pre-auth per-IP limiter for failed attempts (10 per minute per IP, then 429 with `Retry-After`), per-token limits (E17: 60/min, 300/hour per token, 120/min per user) and `Retry-After` on the Express path.

**Limits per endpoint class** (starting values; tune from logs):

| Class | Routes | Key | Limit |
|---|---|---|---|
| Credential and identity | `POST user-profile/send-password-reset`, `change-password` (if kept) | user | 3 per 15 min, 10 per day |
| Destructive | `POST user-profile/reset-financial-data`, `DELETE accounts/:id`, `DELETE bank-connections/:id` | user | 10 per hour |
| Token minting | `POST mcp-tokens` | user | 5 per hour |
| Bank connect and sync | `POST bank-connections`, `.../sync` | user | 10 per hour (provider quotas) |
| Writes | other POST/PATCH/PUT/DELETE | user | 120 per minute (onboarding seeding bursts about 15 writes; I, measure) |
| Reads | GET | user | 600 per minute |
| Unauthenticated / failed auth | any | IP | 60 per minute |
| Health (E18) | `GET /health` | none | exempt |

**trust proxy:** Express needs the right hop count so that `req.ip` is the client and not Railway's edge. Verify in staging: an echo route compares `X-Forwarded-For` and `req.ip`, and a spoofed `X-Forwarded-For` must not change the key (I).

**Storage:** in memory while there is one replica (E18 notes one replica). Counters reset on deploy, which is acceptable. Switch to Redis (Railway add-on) when replicas exceed one, or if sustained abuse appears (decision D5). Log every trip as a security event (L1).

---

## 7. Input validation and upload hardening

**Hand-off to E21.** E21 owns the global zod pipe and schemas for every mutating endpoint. E20 supplies the security rules to encode:

- string lengths;
- `avatarUrl` either `data:image/(png|jpeg|webp);base64` at most 256 kB, or https;
- institution enum;
- PAT `name` at most 64 characters, `expiryDays` in {7, 30, 90, 365};
- receipt rules below.

E20 Q9 hard-codes the receipt checks in the tax controller now so it does not wait for E21.

**Receipts:**

- **Q9 now:**
  - Server-side in `tax.controller.ts` (and mirrored in the `app.tax.tsx` action for early feedback): parse the data URL.
  - MIME allow-list: `image/png`, `image/jpeg`, `image/webp`, `application/pdf`. **No SVG or HTML.**
  - Magic-byte sniff of the decoded bytes must match the declared MIME.
  - Decoded size at most 5 MB.
  - `receiptFilename` at most 255 characters, with path separators and control characters stripped.
  - Reject mismatches with 400.
  - UI: render the download link only when the stored value passes the same check, and build it with `URL.createObjectURL(blob)` rather than `href={dataURL}`.
  - Legacy rows are validated at render, not rewritten.
- **Phase 5 (D6-A):**
  - `GET /tax-records/:id/receipt` returns bytes scoped by `{id, userId}`.
  - List and detail JSON exclude `receiptData`; they return `hasReceipt`, `receiptMimeType` and `receiptFilename` (E12 B10 and E17 alignment).
  - The web resource route `/app/tax/receipts/:id` streams the file with:
    - `Content-Type` from the sniffed allow-list;
    - `Content-Disposition: attachment; filename*=UTF-8''…` (inline only for raster images);
    - `X-Content-Type-Options: nosniff`;
    - `Content-Security-Policy: sandbox; default-src 'none'`;
    - `Cache-Control: private, no-store`.
  - Optional: re-encode images server-side to strip EXIF GPS and polyglots.
- **D6-B (optional):** S3-compatible object storage (a Railway bucket or Cloudflare R2; I, verify availability and region for E19). Short-lived signed GET URLs with `response-content-disposition`. ClamAV scanning only on this path.

**Avatar (U5):** server-side validation as above. Fix `avatar.ts` so that a decode failure **rejects** instead of resolving the raw data URL.

---

## 8. Password and account-security flows

- **Password change (D2):**
  - Recommended A: delete `change-password` and `update-password`. "Change password" sends a WorkOS reset email to the user's **own** address, looked up server-side with `workos.userManagement.getUser(req.user.id)`. Flump never handles the password, and proving control of the inbox is the re-authentication.
  - Option C (in-app with step-up) depends on A2.
- **Reset email:** ignore any body. Use the email from `getUser`. Return a generic `{success:true}` whatever WorkOS says. Log the WorkOS error code server-side only.
- **Step-up re-authentication (A2), for both web and E12 mobile:**
  - `POST /auth/step-up/start` sends a WorkOS Magic Auth code to the user's email (I, verify Magic Auth APIs and whether a code can be verified without creating a session).
  - `POST /auth/step-up/verify {code}` records `user_reauth(userId, sid, verifiedAt)`.
  - A `@RequiresRecentAuth(600)` guard reads `sid` from the verified JWT claims and requires a row within 10 minutes. The verifier must return `sid`.
  - This works for password, social and SSO users.
  - Alternative for password users only: `authenticateWithPassword`. It has side effects, because it creates a session and fails if MFA is enrolled (I).
- **Apply step-up to (A3):**
  - PAT creation with `mcp:read:full` or `anonymizeInstitutions:false`;
  - `reset-financial-data`;
  - account deletion (E19);
  - bank token connect;
  - in-app password change if D2-C;
  - any future email change.
- **Sessions list and revoke (A4):** "Signed-in devices" in the profile, using WorkOS list-sessions and revoke-session (I, verify the endpoints). "Sign out everywhere" revokes all WorkOS sessions **and** all PATs (optional checkbox). A password reset completed in WorkOS should trigger the same, through a WorkOS event or webhook if available (I).
- **MFA (D12):** enable optional TOTP in AuthKit (dashboard, owner) and link to it from the profile. Required MFA is not recommended for beta.
- **Notifications (A5):** email on PAT creation, password change and new-device sign-in. Depends on whether WorkOS emails cover password events (I) and on a transactional email provider (E19 and E24 own the mailbox).
- **Session lifetime (A7, D3):** dashboard absolute and idle settings plus `WORKOS_COOKIE_MAX_AGE`. Document them.

---

## 9. Authorisation (IDOR) test suite design (Phase 6)

**Harness (Z1):**

- `apps/backend/test/authz/` (or `src/authz/*.integration.spec.ts`, gated by `dbTestMode` like the migrations suite; CI already runs Postgres, E11 T3).
- Boot the real `AppModule` against `TEST_DATABASE_URL`, run migrations, and override `TOKEN_VERIFIER` with a `WorkOsJwtVerifier` on `createTestJwks()` (`src/auth/testing/test-jwks.ts`).
- Mint tokens for `user_A`, `user_B` and an expired one.
- Use `app.listen(0)` plus `fetch`, which needs no supertest. Add `@nestjs/testing` as a dev dependency if needed.
- Use `assertSafeTestDatabase` (exists).

**Matrix (Z2).** For every route, a table row `{method, path, seed(ownerA) -> params, body}`:

- owner (A) gets 2xx.
- other user (B) gets **404**, identical body to "not found", and the DB row is unchanged (checked by direct query).
- no token or expired token gets 401.
- every write is also probed with `{id: <A's id>, userId: "user_A"}` in B's body: B cannot overwrite or adopt A's row.
- list endpoints return none of A's rows for B.

Routes in scope (V, from the controllers): finance (17), budget (6), tax (6), user-profile (7, minus deleted aliases), mcp-tokens (4), plus the new receipt, step-up and sessions routes. `/mcp` gets its own PAT-based cross-user test: B's PAT never returns A's data.

**Route coverage meta-test (Z3):**

- Enumerate every route with Nest `DiscoveryService` and `MetadataScanner` (`PATH_METADATA`, `METHOD_METADATA`).
- Fail if any route lacks a matrix row, or lacks `AuthGuard` without being on the explicit allow-list (`GET /`, `POST|GET /mcp`, `GET /health`, `/csp-report`).
- Fail if a matrix row points to a route that no longer exists.

**Measurement:** routes with matrix rows divided by total routes, target 100%. Printed by the meta-test.

---

## 10. Other areas

**MCP and agent security (Phase 7, coordinated with E17):**

- **E20 owns:**
  - scope enforcement in one wrapper (D7-A), with a `TOOL_SCOPES` table using today's names, which E17 Phase 2 renames;
  - step-up for elevated PATs;
  - default expiry 90 days and maximum 365;
  - pre-auth throttling;
  - error-leak fix;
  - `Origin` validation on `/mcp` (403 if present and not allow-listed; E17-F07);
  - an `MCP_ENABLED` kill switch;
  - stripping `receiptData` from the MCP data provider (`mcp.service.ts` `getUserFinancialData` loads full tax rows; I whether any tool emits them).
- **E17 owns:** the tool redesign, the audit table (`agent_audit_events`), untrusted-text quarantine, OAuth/CIMD, and the PAT format with checksum.
- Token hashing is already correct: SHA-256 is adequate for 128-bit random secrets, and a slow hash is not needed.

**Secrets and dependencies (with E18):**

- gitleaks in CI (E18 done-when; run the binary directly; `gitleaks-action` needs a licence for organisations, I).
- D-12 rotation is a human task (E3 checklist).
- Add a key id to bank-token ciphertext (`crypto.ts`) so that `BANKING_TOKEN_ENCRYPTION_KEY` can be rotated (S5).
- Audit gate: keep E11 T7 (blocks high and critical, 90-day expiring allow-list).
- Pin actions to SHAs (D-19, E18).

**Logging and PII redaction (Phase 8):**

- **Policy (L1):**
  - Never log tokens, `Authorization`, cookies, request or response bodies, emails, names, amounts, free text or receipt data.
  - Allowed: WorkOS user id (pseudonymous), route template, status, latency, error class, jose code (as now), and a request id.
- A `SecurityEvent` logger with OWASP Logging Vocabulary names:
  - `authn_token_fail` (route plus truncated IP hash);
  - `authz_fail`;
  - `ratelimit_exceeded`;
  - `pat_created`, `pat_revoked`;
  - `password_reset_requested`;
  - `stepup_ok`, `stepup_fail`;
  - `upload_rejected`;
  - `csp_violation`;
  - `session_revoked`.
- **L2:** fix the raw `err` logs (`finance.service.ts:269,324`), the WorkOS message echoes, and `entry.server.tsx:78`.
- **L3:** E18 error tracking `beforeSend` scrubbing (headers, cookies, request data, breadcrumb URLs with ids).

**Security testing (Phase 9):**

- ZAP baseline (passive) GitHub Action against **staging** weekly and before each release, with a rules file and an artifact report. It needs the E18 staging environment.
- Semgrep CE (free CLI, OSS rules `p/owasp-top-ten p/typescript p/react p/nodejsscan`), report-only, then gate on ERROR.
- `bun audit` (exists) plus Dependabot alerts (free on private repos; owner toggles them).
- CodeQL and GitHub secret scanning on a **private** repo need paid GitHub Code Security or Secret Protection (I, verify pricing). Not available under D7.
- Pen test: a UK CREST-accredited web and API test, about 3 to 5 days, roughly £3,000 to £7,500 (estimate, I), before public launch (D10).
- `/.well-known/security.txt` (RFC 9116) on marketing and web, plus a disclosure policy page. Uses the placeholder `security@example.invalid` until E19 and E24 provide a mailbox (DECISIONS E7).

**Incident response hooks (with E18 and E19, task T6):** a runbook covering:

- **Global logout:** rotate `WORKOS_COOKIE_PASSWORD`. This invalidates every sealed cookie.
- **Per-user:** WorkOS revoke sessions.
- **Revoke all PATs:** `UPDATE mcp_tokens SET revoked_at=now()`.
- `MCP_ENABLED=false`.
- Rotate the WorkOS API key and the banking key (needs S5).
- Preserve logs.
- ICO notification within 72 hours of awareness (UK GDPR Art. 33; E19 owns the legal process).
- User comms template.

---

## 11. Phases and tasks

**Conventions:**

- Effort: S = up to 1 agent-day, M = 2 to 3, L = 4 to 6.
- Model: sonnet for implementation and review, haiku for mechanical or search work (AGENTS.md section 6).
- Every task is test-first. Finish each task with `rtk bun run lint`, `rtk bun run check-types`, `rtk bun run test` and `rtk bun run build` (AGENTS.md sections 5 and 7).
- `apps/web/app` tasks wait for PR 386 (SEQUENCE.md:143).
- **Tier A** = safe to ship before or alongside release PR 368 (isolated, low regression). **Tier B** = after the E18 staging environment exists.

### Phase 0. Quick wins (about 11 to 14 agent-days)

**Q1. POST-only logout (Tier A, S, sonnet)**
- **Files:** `apps/web/app/routes/logout._index.tsx`, `components/navigation/UserLogin.tsx` (becomes `<Form method="post" action="/logout">`; the existing flat file is edited, not created), `logout._index.test.ts`.
- **Acceptance:** GET `/logout` returns 405 (or a redirect to `/` with no `Set-Cookie`). POST signs out. Header snapshot updated deliberately. E5 `RouteErrorState` "Sign in again" still posts.
- **Verify:** `cd apps/web && rtk bunx vitest run app/routes/logout._index.test.ts app/components/navigation`.
- **Risk:** the logout button stops working. Mitigation: a component test clicks it and asserts a POST.

**Q2. Cookie domain, duplicate callback and dev-only `configure()` (Tier A, S, sonnet)**
- **Files:** `routes/callback.tsx`; delete `routes/auth.callback.tsx` and its test; `routes/login._index.tsx`, `signUp._index.tsx`, `logout._index.tsx`; shared helper `isFlumpHost` moved to `packages/finance-engine/src/persistence.ts` and exported; `app.accounts._index.tsx:80-81` stops building a `/auth/callback` bank URL (E16 cuts bank OAuth; return a "not available" error).
- **Acceptance:** a lookalike host gets no `Domain`. Cookies are host-only, with `Secure` on https. `configure()` runs only when `NODE_ENV==="development"`. The E11 test that pinned the bug is flipped.
- **Depends on:** the owner confirms `/callback` is the URI registered in WorkOS.
- **Risk:** the wrong callback is deleted. Mitigation: the owner checks the dashboard first.

**Q3. Delete dead `session.server.ts` (Tier A, S, haiku)**
- **Files:** remove `apps/web/app/session.server.ts`; drop `SESSION_SECRET` from `.env.example` and docs if nothing else needs it (grep).
- **Acceptance:** grep finds no `SESSION_SECRET` requirement; build passes.

**Q4. Backend `main.ts` hardening (Tier A, S to M, sonnet)**
- **Files:** `apps/backend/src/main.ts`, new `src/config/cors.config.ts` plus spec, `package.json` (add `helmet`).
- **Changes:** delete the TCP proxy; trim and validate `CORS_ALLOWED_ORIGINS` at boot (production requires it, no localhost defaults); `credentials:false`; helmet API config; explicit body limits (5.2); `trust proxy` from env; remove `rawBody` if unused (D-18).
- **Acceptance:** spec tests for the parsing; `curl -sI localhost:4000/` shows `Strict-Transport-Security`, `X-Content-Type-Options` and `Content-Security-Policy: default-src 'none'`; port 3000 is not listening (`lsof -i :3000` empty).
- **Risk:** a missing CORS env breaks production web calls until Phase 1. Mitigation: set `CORS_ALLOWED_ORIGINS` before deploying (rollout checklist).

**Q5. Password endpoints (Tier A, S, sonnet)**
- **Files:** `user-profile.controller.ts`, `user-profile.service.ts`, `identity/identity.adapter.ts` (add `getUserEmail(userId)`), specs; `hooks/useUserProfile.ts` and `UserProfilePanel.tsx:399-400` stop sending an email.
- **Changes:** delete the `update-password` alias; the reset ignores the body and uses `getUser` email; generic responses; no WorkOS `err.message` echo.
- **Acceptance:** a spec posts `{email:"victim@x"}` and asserts the adapter received the caller's own email; an unknown-user error still returns `{success:true}`.
- **Risk:** the in-memory adapter needs an email fixture.

**Q6. Throttler on auth-adjacent routes (Tier B, M, sonnet)**
- **Files:** `app.module.ts` (ThrottlerModule plus global IP guard), new `src/security/user-throttler.guard.ts` plus spec; decorators on `user-profile`, `mcp-tokens` and `bank-connections` routes.
- **Acceptance:** the 4th reset within 15 minutes returns 429 with `Retry-After`; a different user is unaffected; GET reads are not throttled at low volume.
- **Risk:** throttler versus Nest 12 compatibility (I). Spike first.

**Q7. Web headers and CSRF Origin check (Tier B, M, sonnet)**
- **Files:** `apps/web/react-router.config.ts` (middleware flag), `app/root.tsx` (middleware export), new `app/security/headers.server.ts` and `csrf.server.ts` plus tests; `entry.server.tsx` `handleDataRequest`.
- **Acceptance:**
  - document and `.data` responses carry the 5.1 Phase 0 set plus enforced `frame-ancestors 'none'`;
  - a POST with `Origin: https://evil.example` or `https://marketing.example.test` gets 403;
  - a same-origin POST passes;
  - missing `Origin` with `Sec-Fetch-Site: same-origin` passes; missing both on a non-GET gets 403 (decide whether old browsers matter).
- **Verify:** route tests; `curl -sI $STAGING_WEB/app | grep -iE "strict-transport|x-frame|content-security"`.
- **Risk:** the WorkOS callback is a GET, so it is unaffected. Forms posting from the WorkOS domain: none (I).

**Q8. Marketing server (Tier A, S, sonnet)**
- **Files:** `apps/marketing/server.ts` plus a new `server.test.ts` if feasible.
- **Acceptance:** a 500 returns a generic body; production CSP has no `https:` in `script-src` and no `ws:`; the app URL is resolved once at boot.

**Q9. Receipt validation now (Tier B, M, sonnet)**
- **Files:** new `apps/backend/src/tax/receipt-validation.ts` plus spec; `tax.controller.ts`; `app.tax.tsx`; `TaxContainer.tsx` (blob-URL link, render guard); explicit body limit on tax routes.
- **Acceptance:** spec rejects `data:text/html`, `image/svg+xml`, a mismatched magic number, files over 5 MB, and path-like filenames. A legacy invalid row renders without a link. A real 4 MB PDF uploads end to end.
- **Risk:** `TaxContainer.tsx` is a hotspot (E15 and E16). Keep the diff minimal.

**Q10. MCP transport errors and pre-auth limit (Tier A, S, sonnet)**
- **Files:** `packages/mcp/src/transports/http.ts`, `auth/token-verifier.ts` (case-insensitive Bearer, `WWW-Authenticate`), tests.
- **Acceptance:** non-auth errors return a generic 400 with no `err.message`; the 11th invalid PAT from one IP in a minute returns 429 with `Retry-After`.

**Q11. PAT defaults (Tier B, S, sonnet)**
- **Files:** `mcp.controller.ts`, `mcp.service.ts`, specs; `McpConnectionCard` copy (colocated component; story and test).
- **Acceptance:** expiry defaults to 90 days, maximum 365, `null` is rejected, `name` at most 64. `anonymizeInstitutions:false` is rejected until A3 exists, with a message explaining why.
- **Depends on:** D7 and E17 alignment.

**Q12. Pin the WorkOS issuer (Tier A, S, owner plus sonnet)**
- **Owner:** decode one real production or staging access token (`iss`, claims list; never paste the token anywhere).
- **Implementer:** set `WORKOS_ISSUER` on backend and web (the library reads `WORKOS_ISSUER`, V `config.js`); backend boot requires it in production; record the claims in docs.
- **Acceptance:** a boot spec fails without it in production.
- **Risk:** a wrong value makes every login 401. Mitigation: staging first.

**Q13. security.txt and disclosure page (Tier A, S, haiku)**
- **Files:** `apps/marketing/public/.well-known/security.txt` (Contact placeholder, Expires, Policy, Preferred-Languages: en), a disclosure policy section in `SecurityPage`, and a copy guard entry.
- **Acceptance:** file served with `text/plain`; claims test passes.

**Q14. Threat model and security docs (Tier A, S, sonnet)**
- **Files:** `docs/security/threat-model.md` (section 2 of this plan), `docs/security/headers-and-csp.md`, `docs/security/logging-policy.md` (stub).
- **Acceptance:** reviewed by the owner.

**Q15. Forward refreshed-session cookies (Tier B, S to M, sonnet)**
- **Files:** `utils/auth.server.ts`, `root.tsx` and every loader or action that calls `getAuthSession`, or a single middleware that appends `session.headers`. Test with a mocked `authkitLoader` returning headers.
- **Acceptance:** a refreshed session's `Set-Cookie` reaches the response. Staging check: after token expiry, a second request does not refresh again (log count).
- **Risk:** a duplicate `Set-Cookie`. Mitigation: append once, in middleware.

**Q16. Remove vestigial Emotion (Tier B, S, sonnet)**
- **Files:** `entry.server.tsx`, `entry.client.tsx`, delete `createEmotionCache.ts`; remove the `@emotion/*` dependencies.
- **Acceptance:** SSR HTML has no `data-emotion` style tags; visual snapshot tests unchanged.

### Phase 1. Remove the token from the browser (D1-C, about 7 to 9 agent-days)

Runs after PR 386, the E23 onboarding fixes, Q7 (the CSRF check) and Q15.

**B1. Spike (S, sonnet).** `getAuthSession` in a resource route, refresh headers, error mapping. Write up the proxy allow-list from the inventory in G1.

**B2. `/api` proxy (M, sonnet)**
- **Files:** `apps/web/app/routes/api.$.tsx`, `app/services/api-proxy.server.ts` plus tests.
- **Acceptance:** section 4.2 items 1 to 7.

**B3. Browser client on same-origin (M, sonnet)**
- **Files:** `services/api-client.ts` (remove the token parameter, base `/api`, add the `X-Flump-Request` header), `hooks/useUserProfile.ts`, `containers/budget/BudgetContainer.tsx`, `containers/mortgage/MortgageContainer.tsx`, `routes/app.onboarding.tsx`, and their tests.
- **Acceptance:** no client module imports or reads `accessToken` (grep guard script `scripts/check-no-browser-token.ts` in CI). All existing behaviour tests pass.

**B4. Loaders stop exposing the token (M, sonnet)**
- **Files:** `root.tsx` (remove `accessToken` and the `window.ENV` script), `app.budget.tsx`, `app.onboarding.tsx`, `services/backend-client.server.ts` (`WorkspaceSnapshot` keeps the token internal only), delete `HttpProfileAdapter`; tests.
- **Acceptance:** a new test renders the root and the budget route through `createRoutesStub` or a server render with a known token value and asserts it is absent from the HTML and from `.data` responses.

**B5. Backend CORS off (S, sonnet).** `main.ts`. Production uses no browser origins. Acceptance: a preflight from the web origin gets no ACAO header. Ship only after B3 is deployed.

**B6. Ratchet (S, haiku).** Allow-list size test plus a README note: entries may only be removed as containers move to actions.

**Risks:**
- Hidden direct callers that were missed: the B3 grep guard catches them.
- Onboarding seeding now goes through the proxy, so the write throttle must accommodate it (section 6).

### Phase 2. CSP (about 5 to 6 agent-days plus a 14-day soak)

**C1. Nonce plumbing (M, sonnet)**
- **Files:** `entry.server.tsx`, new `app/security/nonce.tsx` (context), `root.tsx` (`Scripts`, `ScrollRestoration`, theme script).
- **Acceptance:** every inline `<script>` in the SSR output carries the nonce (test parses the HTML); there is no hydration warning in the browser console (Playwright smoke).

**C2. Report-only policy and `/csp-report` (M, sonnet).** Acceptance: header present; a report POST is stored or logged with sanitised fields; oversize requests get 413; rate-limited.

**C3. Self-host fonts if D11-A (S, sonnet).** `@fontsource` packages imported in `index.css`; remove the Google links (`root.tsx:22-27`). Acceptance: no request to `fonts.g*` (Playwright network log).

**C4. Soak and fix (M, sonnet).** Zero unexplained reports for 14 days in staging and production.

**C5. Enforce (S, sonnet).** Acceptance: a header test plus a Playwright journey (sign-in through dev bypass, budget add, tax add with receipt, profile) shows no console CSP errors.

**Risk:** breaking hydration or streaming. Mitigation: report-only first, and enforce behind an env flag so rollback is one variable.

### Phase 3. Rate limiting, complete (about 3 to 4 agent-days)

**R1. Per-user limits on every controller (M, sonnet).** Uses the section 6 table. Logs to `SecurityEvent`. Acceptance: one spec per class; `/health` exempt.

**R2. MCP per-token limits and `Retry-After` (S, sonnet, with E17).**

**R3. trust proxy verification in staging (S, sonnet plus owner).** Acceptance: a spoofed `X-Forwarded-For` does not change the key.

### Phase 4. Account security (about 10 to 13 agent-days)

**A1. WorkOS research spike (S, sonnet).** Magic Auth verify semantics, list and revoke sessions, the `sid` claim, MFA settings, password events and webhooks, session length settings, refresh-token rotation (for G21). Output: a verified notes file with links.

**A2. Step-up service (L, sonnet)**
- **Files:** `apps/backend/src/auth/step-up.controller.ts`, `step-up.service.ts`, `recent-auth.guard.ts`, entity `UserReauth`, migration, specs; the verifier returns `sid`; web `ReauthDialog` colocated component (5 files, light and dark stories, `play()` test, semantic tokens only).
- **Acceptance:** without a fresh step-up, a protected route returns 403 `{code:"reauth_required"}`. After verify it passes for 10 minutes for that `sid` only. A different `sid` gets 403. Codes are throttled at 5 attempts.

**A3. Apply step-up (M, sonnet).** The routes listed in section 8. Acceptance: authz matrix rows add the "no step-up gives 403" case.

**A4. Sessions list and revoke, revoke-all (M, sonnet).** Backend endpoints plus a colocated `SessionsList` component. Dates use `Intl.DateTimeFormat('en-GB')` and `tabular-nums`.

**A5. Notifications (S to M, sonnet).** Depends on E19 and E24 email.

**A6. MFA enablement (S, owner plus haiku).** Dashboard setting plus profile link and copy.

**A7. Session lifetime config (S, sonnet plus owner).** `WORKOS_COOKIE_MAX_AGE`, optional `__Host-` name, dashboard settings documented.

**D2-A follow-through (S, sonnet).** Remove the change-password UI; the button sends the reset email.

### Phase 5. Receipts and avatar (about 5 to 7 agent-days; plus L if D6-B)

**U1. Backend receipt endpoint; lists exclude `receiptData` (M, sonnet).** `tax.controller.ts` with `select`; specs including cross-user 404.

**U2. Web download route; TaxContainer uses it (M, sonnet).** Acceptance: response headers as in section 7; no `data:` href remains (grep guard).

**U3. Server-side image re-encode, optional (M, sonnet).**

**U4. Object storage (L, sonnet; only if D6-B).**

**U5. Avatar validation and `avatar.ts` reject-on-error (S, sonnet).**

### Phase 6. Authorisation matrix (about 7 to 9 agent-days)

**Z1. Harness (M, sonnet).** Acceptance: two users seeded, one smoke route proven in CI with `REQUIRE_DB_TESTS=1`.

**Z2. Matrix for all controllers (L, sonnet; may be split per controller across parallel haiku and sonnet agents).** Acceptance: section 9 cases for every route.

**Z3. Route coverage meta-test (S to M, sonnet).** Acceptance: deliberately adding an unguarded test route makes it fail.

### Phase 7. MCP (about 3 to 4 agent-days, with E17)

**M1. Scope wrapper and table plus tests per tool (M, sonnet).**

**M2. `/mcp` Origin validation (S, sonnet).**

**M3. `MCP_ENABLED` kill switch (S, sonnet).**

**M4. Strip `receiptData` and free text from the provider (S, sonnet).** Coordinate with E17 T1.2; whichever lands first owns it.

### Phase 8. Logging (about 3 to 4 agent-days)

**L1. Policy plus `SecurityEvent` logger plus redaction helper (M, sonnet).**

**L2. Fix the raw logs and echoes (S, sonnet).**

**L3. Error-tracking scrubbing, with E18 (S, sonnet).**

### Phase 9. Testing and process (about 3 to 5 agent-days plus owner)

- **T1.** ZAP baseline workflow (S to M, sonnet; needs E18 staging).
- **T2.** Semgrep CE job (S, haiku).
- **T3.** Dependabot alerts on, and one bot only (owner, E18).
- **T4.** gitleaks if E18 has not done it (S, haiku).
- **T5.** Pen-test scope document and procurement (owner).
- **T6.** Incident response runbook (S, sonnet).
- **S5.** Bank-token key id and rotation command (M, sonnet; coordinate with E3).

### Estimate

| Phase | Agent-days |
|---|---|
| 0 | 11 to 14 |
| 1 | 7 to 9 |
| 2 | 5 to 6 |
| 3 | 3 to 4 |
| 4 | 10 to 13 |
| 5 | 5 to 7 |
| 6 | 7 to 9 |
| 7 | 3 to 4 |
| 8 | 3 to 4 |
| 9 | 3 to 5 |
| S5 | 2 |
| **Total** | **59 to 77 raw**, about **50 to 68** after overlap with E17, E21 and E18 work that is done once |

- **Elapsed:** 7 to 10 weeks with 2 worktrees, plus the CSP soak.
- **Owner time:** 8 to 12 hours (decisions, token decode, WorkOS dashboard, staging checks, pen-test procurement, copy sign-off).
- **Optional extras:** D6-B adds about 5 days; a pen test adds about £3k to £7.5k (I).

---

## 12. Sequencing, laws, risks, decisions, measurement

### Sequencing against other epics

- **Release PR 368:** Tier A quick wins (Q1, Q2, Q3, Q4, Q5, Q8, Q10, Q12, Q13, Q14) can ship before or with it. None are required by Fable's pre-368 list, except Q12, which is on it. Do not let E20 delay 368.
- **PR 386** (E8 web sweeps) merges before any `apps/web/app` task.
- **E18:**
  - staging gates Tier B, the CSP soak, ZAP and the trust proxy check;
  - E18 owns gitleaks, error tracking and the `/health` endpoint, which E20 exempts from auth and throttling;
  - the runbooks share T6.
- **E19:** account deletion uses A2 step-up and A4 revoke-all; the mailbox feeds `security.txt`; ICO breach process; fonts and seed-cookie privacy; the cookie position covers the presence and seed cookies.
- **E21:**
  - E20 supplies the validation rules; E21's zod pipe replaces Q9's hand-written checks later;
  - the typed client must be transport-agnostic so that browser code uses it over `/api` and server code uses it with the session token;
  - Phase 6 matrix tables should reuse E21 contract fixtures.
- **E17:** M1 to M4 and Q10 and Q11 here; tools, audit table, OAuth and quarantine there. Agree ownership of `packages/mcp/src/server.ts` before starting M1.
- **E12:** no conflict. Mobile keeps bearer tokens to the backend (stored in Keychain or Keystore, E12's concern). Step-up and per-user limits apply to it. CORS is irrelevant for native apps.
- **E15:**
  - Phase 1 option C avoids rewriting E15's containers;
  - E15 rewrites retire proxy entries (ratchet);
  - E15 removing inline styles enables the stricter style CSP;
  - new UI (ReauthDialog, SessionsList) follows E15 tokens.
- **E23:** wait for the onboarding fixes before B3 edits `app.onboarding.tsx`.
- **E16:** Q2 removes the bank-OAuth fallback (E16 cuts OAuth); Phase 5 effort depends on whether the tax ledger is demoted (E16 D3).

### AGENTS.md laws touched

- **Section 1, colocation:** new components (`ReauthDialog`, `SessionsList`, any receipt viewer) are 5-file directories. The edits to the flat `UserLogin.tsx` and `UserProfilePanel.tsx` create no new flat files.
- **Section 2, tokens:** new UI uses semantic tokens only. Dates and counts in session and PAT lists use `tabular-nums` and en-GB formatting.
- **Section 3:** no KpiStrip or SimulatorSplitLayout change.
- **Section 4, Definition of Done:** stories in light and dark with zero a11y violations, plus `play()` tests, for the new components.
- **Section 5:** the four checks before every PR.
- **Section 6:** sonnet and haiku only for implementers.
- **Section 7:** `rtk` prefix.

### Risk register

| # | Risk | Likelihood / impact | Mitigation |
|---|---|---|---|
| R1 | CSP breaks hydration or streaming | M / H | Report-only, 14-day soak, env flag to enforce, Playwright journey |
| R2 | `/api` proxy becomes an open relay or path-traversal route | M / H | Strict allow-list, normalisation, Origin plus custom header, tests in 4.2 |
| R3 | Backend per-IP limits throttle everyone behind the web server IP | H / M | Per-user keys; generous IP limit; optional internal header |
| R4 | Issuer pin is wrong and every login returns 401 | M / H | Decode a real token; staging first; env override |
| R5 | Q15 changes session behaviour (double cookies or logouts) | M / M | Single middleware append; staging observation |
| R6 | Logout POST change leaves a dead button | L / M | Component test |
| R7 | Receipt validation rejects legitimate files, or reveals today's 100 kB limit failures | M / M | 200 kB and 4 MB end-to-end tests; legacy rows validated at render only |
| R8 | Throttler or helmet incompatible with Nest 12 | L / M | Spike in Q6; pin versions |
| R9 | trust proxy wrong, so IP spoofing defeats the limits | M / M | R3 staging check |
| R10 | File conflicts with E15, E16 and E23 (TaxContainer, onboarding, UserProfilePanel) | H / M | Minimal diffs; sequence after E23; option C |
| R11 | Step-up depends on unverified WorkOS Magic Auth semantics | M / M | A1 spike; fallback D2-A needs no step-up |
| R12 | Removing in-app password change confuses users | L / L | Copy: "We'll email you a secure link" |
| R13 | `__Host-` cookie rename logs everyone out | certain / L | Ship with a release note; optional |
| R14 | Rate-limit counters reset on deploy | certain / L | Accept while there is one replica; Redis trigger documented |

### Decisions needed from the product owner

1. **D1. How is the access token removed from the browser?**
   - A. Move every client mutation into route actions now. Best end state, but large and collides with E15, E16 and E23.
   - B. A same-origin `/api` proxy with a strict allow-list, and stop returning the token from loaders. Small and fast; adds a constrained cookie-authenticated relay.
   - C. B now, and retire proxy entries into route actions as containers are rewritten, enforced by a shrinking allow-list test.
   - Recommendation: **C.**
   - Blocks: B2 to B6, C5 (`connect-src 'self'`).

2. **D2. In-app password change?**
   - A. Remove it. "Change password" emails a WorkOS reset link to the user's own verified address.
   - B. Keep it, requiring the current password through WorkOS `authenticateWithPassword`. This fails for social and SSO users and has session side effects.
   - C. Keep it behind step-up (an email code, A2).
   - Recommendation: **A now.** C later if users ask.
   - Blocks: Q5 follow-through, A3 scope.

3. **D3. Session lifetime?**
   - A. Status quo: 400-day cookie, unknown WorkOS settings.
   - B. Absolute 14 days, idle 24 hours, with step-up for sensitive actions.
   - C. Bank-like: absolute 12 hours, idle 30 minutes.
   - Recommendation: **B** (sensible for a read-mostly finance app with tax PII; revisit after beta).
   - Blocks: A7.

4. **D4. Web server and edge?**
   - A. Keep `react-router-serve`; use RR middleware and `entry.server` for headers and CSRF; rate limiting only at the backend.
   - B. A custom Express server (`@react-router/express`) with helmet and express-rate-limit.
   - C. A as now, plus Cloudflare (free tier) in front of all three services when the custom domain goes live.
   - Recommendation: **C.**
   - Blocks: Q7 (A part), R3.

5. **D5. Rate-limit storage?**
   - A. In memory (one replica).
   - B. Redis on Railway.
   - C. Postgres-backed.
   - Recommendation: **A**, moving to B as soon as replicas exceed one.
   - Blocks: Q6, R1.

6. **D6. Receipts storage?**
   - A. Keep them in Postgres; validate; exclude from lists; serve through a download route.
   - B. Object storage with signed URLs and optional ClamAV.
   - C. Drop receipts (if E16 demotes or cuts the tax ledger).
   - Recommendation: **A** (B only if the ledger is kept and usage grows).
   - Blocks: Phase 5.

7. **D7. Who enforces MCP scopes?**
   - A. E20 now, using today's scope names in one wrapper that E17 later renames.
   - B. Wait for E17 Phase 2 scopes v2.
   - C. E20 only blocks elevated PATs now; per-tool enforcement waits for E17.
   - Recommendation: **A** (D-17 is in E20's done-when; the mechanism carries over).
   - Blocks: M1, Q11.

8. **D8. HSTS preload?**
   - A. Never.
   - B. After the custom domain has been stable for 3 months with every subdomain on HTTPS.
   - C. Now.
   - Recommendation: **B.**

9. **D9. The `flump_has_session` presence cookie?**
   - A. Delete it; the marketing header always shows "Sign in".
   - B. Keep it; fix the domain check with a shared helper; add `Secure`; set `Domain` from env.
   - Recommendation: **B** (small change; marketing `Header.tsx:130` uses it).

10. **D10. Security testing budget?**
    - A. Free tools only: ZAP baseline, Semgrep CE, bun audit, Dependabot, gitleaks.
    - B. A, plus one CREST pen test before public launch (about £3k to £7.5k, estimate).
    - C. B, plus a paid bug bounty.
    - Recommendation: **A now, B before public launch** (after Phases 1 to 4).

11. **D11. Fonts?**
    - A. Self-host (removes third-party origins from the CSP and stops sending user IPs to Google).
    - B. Keep Google Fonts and allow them in the CSP.
    - Recommendation: **A** (coordinate with E15 typography).

12. **D12. MFA?**
    - A. Optional TOTP through AuthKit.
    - B. Required for all users.
    - C. None.
    - Recommendation: **A.**

13. **D13. Backend exposure after Phase 1?**
    - A. Keep it public (needed for `/mcp` and E12), with CORS removed.
    - B. REST on Railway private networking; only `/mcp` public, as a separate service or domain.
    - C. B later, when E12 defines its API ingress.
    - Recommendation: **A now, revisit C with E12.**

**Owner tasks with no code:**
- Confirm the registered WorkOS redirect URI.
- Decode a real token (Q12).
- Rotate the D-12 secrets (E3 checklist).
- Check whether `up.railway.app` is on the Public Suffix List (affects A4 same-site risk).
- Review the WorkOS session and MFA settings.

### Measurement

- **Headers:** MDN HTTP Observatory and securityheaders.com grades for web, marketing and backend. Target A now and A+ after CSP is enforced. Track per release.
- **CSP:** violation reports per day, trending to zero before enforcement; enforcement achieved (yes or no).
- **ZAP baseline against staging:** 0 High and 0 Medium; Low findings triaged in `.zap/rules.tsv` with reasons.
- **Authorisation matrix:** routes covered divided by total routes = 100% (printed by Z3); 3 principals per route; mass-assignment probes on 100% of writes.
- **Token exposure:** 0 browser modules reading `accessToken` (B3 guard); 0 occurrences of the token in SSR HTML or `.data` (B4 test).
- **Rate limiting:** 429 trips per class per week (`SecurityEvent`); 0 complaints of false positives.
- **Secrets and dependencies:** gitleaks findings = 0; audit gate green; allow-list entries younger than 90 days.
- **Incident readiness:** time to "global logout plus revoke all PATs" in a staging drill under 15 minutes.

---

## 13. Primary sources (cited from knowledge; NOT re-fetched in this session, verify before implementing)

- **OWASP ASVS 5.0** (github.com/OWASP/ASVS): V3 Web Frontend Security (CSP, headers, cookies); V6 Authentication (re-authentication for sensitive operations); V7 Session Management (timeouts, termination, re-auth before sensitive changes); V8 Authorization; V5 File Handling; V16 Security Logging and Error Handling; V13 Configuration.
- **OWASP Top 10:2021** (A01 Broken Access Control, A03 Injection, A05 Security Misconfiguration, A07 Identification and Authentication Failures, A08, A09 Logging, A10 SSRF) and **Top 10:2025** (A01 Broken Access Control, A02 Security Misconfiguration, A03 Software Supply Chain Failures, A07 Authentication Failures, A09 Logging and Alerting Failures, A10 Mishandling of Exceptional Conditions; verify final naming). OWASP API Security Top 10 2023 (API1 BOLA, API3 BOPLA / mass assignment, API4 Unrestricted Resource Consumption). OWASP Top 10 for LLM Applications 2025 (LLM01 Prompt Injection, LLM02 Sensitive Information Disclosure, LLM06 Excessive Agency).
- **OWASP Cheat Sheet Series** (cheatsheetseries.owasp.org): Session Management; Cross-Site Request Forgery Prevention (Fetch Metadata, Origin verification, custom request headers); Content Security Policy; HTTP Headers; File Upload; Authentication (re-authentication); Forgot Password (uniform responses); Authorization; Insecure Direct Object Reference Prevention; Mass Assignment; Server-Side Request Forgery Prevention; Denial of Service; Logging; Logging Vocabulary; Secrets Management; LLM Prompt Injection Prevention; Vulnerability Disclosure; Third Party JavaScript Management.
- **MDN** (developer.mozilla.org): Content-Security-Policy (nonce, `strict-dynamic`, `frame-ancestors`, `form-action`, report-to); Strict-Transport-Security; Permissions-Policy; Cross-Origin-Opener-Policy, -Embedder-Policy, -Resource-Policy; Referrer-Policy; X-Content-Type-Options; Sec-Fetch-Site; Set-Cookie (SameSite, `__Host-` prefix); HTTP Observatory. hstspreload.org (preload requirements). RFC 6797 (HSTS). RFC 9116 (security.txt).
- **WorkOS** (workos.com/docs): User Management sessions (access and refresh tokens, JWKS `api.workos.com/sso/jwks/<clientId>`, confirmed in E1); the AuthKit React Router SDK README (github.com/workos/authkit-react-router; cookie behaviour verified in the installed source); Sessions API (list and revoke; verify); Magic Auth (verify); MFA (verify); Password reset (verify that `createPasswordReset` sends or only creates); AuthKit as MCP authorisation server (E17).
- **React Router v7** (reactrouter.com): Sessions and Cookies; Actions and `useFetcher`; Resource Routes; Middleware (`future.v8_middleware`; verify for 7.18.5); `nonce` props on `<Scripts>`, `<ScrollRestoration>` and `ServerRouter`. React DOM `renderToPipeableStream` `nonce` option (react.dev).
- **NestJS** (docs.nestjs.com): Security → Helmet, CORS, Rate Limiting (`@nestjs/throttler`, custom `getTracker`, proxies); Techniques → Validation (`ValidationPipe` whitelist and `forbidNonWhitelisted`); raw body and body parser limits. Express "behind proxies" (expressjs.com/en/guide/behind-proxies.html).
- **MCP** (modelcontextprotocol.io/specification/2025-11-25): Authorization (RFC 9728, RFC 8707 audience, no token passthrough); Security Best Practices (confused deputy, token passthrough, SSRF, session hijacking, scope minimisation); Streamable HTTP transport (servers MUST validate `Origin`). RFC 9700 (OAuth 2.0 Security BCP).
- **Tools:** ZAP baseline scan (zaproxy.org/docs/docker/baseline-scan; `zaproxy/action-baseline`); Semgrep CE; gitleaks (github.com/gitleaks/gitleaks); GitHub Dependabot alerts (free on private repos); GitHub Code Security and Secret Protection pricing for private repos (verify).
- **UK:** ICO personal data breach guidance (72-hour reporting, UK GDPR Art. 33); NCSC Vulnerability Disclosure Toolkit.

**Unverified items carried as spikes:**
- WorkOS Magic Auth verify semantics, the sessions API, refresh-token rotation, the `sid` and `auth_time` claims, and what `createPasswordReset` does.
- The RR middleware flag for 7.18.5.
- React 19.3 nonce hydration behaviour, and whether it blocks `javascript:` hrefs.
- Throttler and helmet compatibility with Nest 12, and the default JSON body limit.
- Railway proxy hop count and whether `up.railway.app` is on the PSL.
- GitHub private-repo pricing.
- The Radix style-injection nonce.

---

## Files referenced (absolute paths)

**Audit documents:**
- /Users/marcgallagher/personal/flump/docs/audit/EPICS.md (E20 at lines 549-555, launch checklist at 594-615)
- /Users/marcgallagher/personal/flump/docs/audit/D-security.md
- /Users/marcgallagher/personal/flump/docs/audit/plans/E1-auth-design.md
- /Users/marcgallagher/personal/flump/docs/audit/plans/E1-auth-ledger.md
- /Users/marcgallagher/personal/flump/docs/audit/plans/E5-plan-draft.md
- /Users/marcgallagher/personal/flump/docs/audit/plans/E11-ledger.md
- /Users/marcgallagher/personal/flump/docs/audit/plans/E11-plan-draft.md
- /Users/marcgallagher/personal/flump/docs/audit/plans/E17-plan-draft.md
- /Users/marcgallagher/personal/flump/docs/audit/plans/E3-config-db-design.md
- /Users/marcgallagher/personal/flump/docs/audit/plans/DECISIONS.md
- /Users/marcgallagher/personal/flump/docs/audit/plans/SEQUENCE.md

**Code on main (relative to `/Users/marcgallagher/personal/flump/`):**
- apps/web/app/root.tsx, entry.server.tsx, session.server.ts, createEmotionCache.ts, utils/auth.server.ts, utils/avatar.ts, services/api-client.ts, services/backend-client.server.ts, hooks/useUserProfile.ts
- apps/web/app/routes/logout._index.tsx, callback.tsx, auth.callback.tsx, login._index.tsx, app.tax.tsx, app.budget.tsx, app.onboarding.tsx, app.accounts._index.tsx
- apps/web/app/containers/tax/TaxContainer.tsx, containers/budget/BudgetContainer.tsx, containers/mortgage/MortgageContainer.tsx, components/budget/UserProfilePanel.tsx, components/navigation/UserLogin.tsx, components/navigation/UserAvatar.tsx, state/baseline.store.ts
- apps/backend/src/main.ts, auth/workos-jwt.verifier.ts, auth/auth.guard.ts, auth/testing/test-jwks.ts, user-profile.controller.ts, user-profile.service.ts, identity/identity.adapter.ts, mcp.controller.ts, mcp.service.ts, tax.controller.ts, entities/tax-record.entity.ts, finance.service.ts
- packages/mcp/src/transports/http.ts, auth/token-verifier.ts, auth/rate-limiter.ts; packages/banking/src/server/crypto.ts; packages/finance-engine/src/persistence.ts
- apps/marketing/server.ts, apps/marketing/src/components/Header.tsx
- Installed library read for cookie and session behaviour: /Users/marcgallagher/personal/flump/apps/web/node_modules/@workos-inc/authkit-react-router/dist/cjs/{sessionStorage.js,config.js,session.js,auth.js}

Note: line numbers are from `main` at e4ff6c3, read from a read-only export at /private/tmp/claude-501/-Users-marcgallagher-personal-flump/f53838d8-2f6a-4832-a92e-67fe1d0489a4/scratchpad/m2. The e1-auth-fail-closed worktree is at an older commit (f5d05b0).
