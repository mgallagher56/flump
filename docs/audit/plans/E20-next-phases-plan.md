# E20 next phases: security hardening after Phase 0

> **Round 4 overrides** (see [DECISIONS.md round 4](DECISIONS.md)). Where these conflict with the text below, these win:
> - OD1 reject with 403, OD2 `@nestjs/throttler` if Nest 12 is compatible else in-house, OD3 rename the cookie now.
> - OD4 (Fable): default (a) AuthKit forced re-login with server-side freshness; fallback (b) Magic Auth code; never (c). The N20 spike must answer in writing: 1) can AuthKit force a credential prompt while its session is live (pass/fail for a); 2) does the token carry `auth_time`, and if not, a step-up nonce in `state` recorded by the callback; 3) what happens to `sid` and refresh tokens on re-login; 4) for (b), can a code be verified without replacing the session, plus lifetime, attempt limits and deliverability; 5) freshness bound to `sid` and user for 10 minutes; 6) the mobile native flow; 7) allow-listed return-to, never auto-replayed. If 1 fails, use (b) with no new decision round. Step-up does not gate friends, but it must land before self-serve deletion (F40).
> - N16 owns all PAT validation rules and the card options (E17-N16 keeps format and revoke-all). It lands after E17-N6 and before E17-N7.
> - N17 lands before E17-N8. Limiter keying is E17-N6's (R2 is not ticketed here).
> - N27 drops gitleaks: E18-N7 creates `security-scan.yml`, and N27 depends on it and appends ZAP and Semgrep.
> - N3 lands before E18-N3 (`entry.server.tsx`), and N11 lands after both.
> - N15's grep for `receiptData` also covers `packages/mcp` and `mcp.service.ts`. N23 owns `/mcp` cross-user isolation.
> - Logging reuses `@flump/observability` (E18-N1) once it lands.
> - N18 reuses `readMcpAccessConfig(env)` from E29-T8 (`apps/backend/src/mcp-access.ts`); `MCP_ENABLED` is the kill switch only, and the allowlist flag is `MCP_OPEN_ACCESS`.

**Status:** plan, not started. It follows `E20-plan-draft.md` (threat model, sections 4 to 10) and the binding decisions in `DECISIONS.md` round 2 (E20 D1-C to D13-A) and round 3 (items 11 and 16).

## Landed (evidence on origin/main)

| Item | Commit | Evidence |
|---|---|---|
| Q1 POST-only logout, Q2 `isFlumpHost`, Secure cookie, dev-only `configure()`, `/auth/callback` deleted, Q3 `session.server.ts` deleted, D2-A reset-email UI | eadff90f | `routes/logout._index.tsx`, `callback.tsx`; `auth.callback.tsx` and `session.server.ts` gone |
| Q4 TCP proxy removed, CORS validation, helmet, body limits; Q5 own-email reset | 330e6caa, 5bd34ea2 | `apps/backend/src/config/security.config.ts:39-67`, `cors.config.ts:33-51`, `main.ts:9-16` |
| Q8 marketing CSP and generic 500; Q13 security.txt (gated on `SECURITY_CONTACT`); Q14 docs; Q10 MCP generic errors and failed-auth limiter | 1a602141, cb4c1c2e, 1f82344a | `apps/marketing/server/security.ts`; `docs/security/*.md`; `packages/mcp/src/transports/http.ts:55-66`; `packages/mcp/src/auth/failed-auth-limiter.ts:44` |
| Trust one proxy hop in production | cb4c1c2e | `security.config.ts:28-32,48` |
| D11-A self-hosted fonts (outside E20) | 390e6f82 | `apps/web/app/root.tsx:15`; no Google origins left |
| D-11 public bank DTO and strict key (outside E20) | on main | `finance.service.ts:129-135` (`toPublicConnection`); `packages/banking/src/server/crypto.ts:23-26` |
| E21 contract pipe: shadow mode, plus enforce behind `CONTRACT_MODE` | b594c357 | `contract-shadow.interceptor.ts`; `packages/api-contract/src/domains/mcp-tokens.ts:4-13` already rejects `expiryDays: null` |

## Remaining

- **Tier B:** Q6 throttling, Q7 web headers and CSRF, Q9 receipt validation, Q11 PAT defaults, Q15 forward refreshed cookies, Q16 remove Emotion.
- **Q12** issuer pin: waits for the owner to decode a token.
- **Phase 1** token out of the browser (D1-C), **Phase 2** CSP, **Phase 3** rate limits, **Phase 4** session policy and step-up (D3-B), **Phase 5** receipts (D6-A), **Phase 6** IDOR suite, **Phase 7** MCP (D7-A), **Phase 8** logging fixes, **Phase 9** tooling (D10-A), and the finalised threat model.

## Current browser-token inventory (verified)

**Producers (loader data that reaches the browser):**
- `apps/web/app/root.tsx:31,54` returns `accessToken`; `:55-57` and `:83-87` inject `window.ENV`.
- `routes/app.budget.tsx:8-11`.
- `routes/app.onboarding.tsx:49-56`.
- Not leaking, server-only: `services/backend-client.server.ts:127,167,221` (`WorkspaceSnapshot.accessToken`), used server-side at `routes/app.accounts._index.tsx:91-100`. The pension, tax, savings, debt, profile, `_index`, `app._index` and `accounts.$account` loaders use the token server-side and do not return it.
- The dashboard (`routes/_index.tsx:55-69`) does not return it, so **the E15 dashboard files need no change**.

**Browser consumers (`apiFetch` with a token):**
- `hooks/useUserProfile.ts:266-273` reads it from root data.
  - Calls at `:290` (PATCH /user-profile), `:302` (PATCH /user-profile/checklist), `:318` (POST /user-profile/send-password-reset), `:330` (POST /user-profile/reset-financial-data).
  - `HttpProfileAdapter` at `:351-380` is dead code.
- `containers/budget/BudgetContainer.tsx:46` (from loader), with calls at `:154` (POST /budget-entries), `:169` (PATCH /budget-entries/:id), `:184` (DELETE /budget-entries/:id), `:211` (POST /budget-entries/seed-defaults), `:230` (POST /budget-entries/categories).
- `routes/app.onboarding.tsx:98`, with calls at `:323` (GET /accounts, GET /budget-entries) and `:349` (POST /accounts and /budget-entries through `services/onboarding-seed.ts:15-34`).
- `containers/mortgage/MortgageContainer.tsx:46-47` (root data, cast), with a call at `:106` (PATCH /accounts/:id).

**The client:** `services/api-client.ts:5-38` reads `window.ENV.VITE_API_URL` at `:19-27` and sends a Bearer header at `:38`.

**Proxy allow-list, which is exactly the calls above:**

| Method | Path |
|---|---|
| PATCH | /user-profile |
| PATCH | /user-profile/checklist |
| POST | /user-profile/send-password-reset |
| POST | /user-profile/reset-financial-data |
| GET, POST | /budget-entries |
| PATCH, DELETE | /budget-entries/:uuid |
| POST | /budget-entries/seed-defaults |
| POST | /budget-entries/categories |
| GET, POST | /accounts |
| PATCH | /accounts/:uuid |

---

## Tickets (one PR each)

Every ticket finishes with `rtk bun run lint`, `rtk bun run check-types`, `rtk bun run test`, `rtk bun run build` (AGENTS.md sections 5 and 7). The implementer model is sonnet unless stated (section 6).

### Lane W: web security infrastructure

**E20-N1. Web security middleware: headers and CSRF Origin check (Q7)**
- **Goal:** every document, `.data` and resource-route response carries:
  - HSTS `max-age=31536000; includeSubDomains`, no preload (D8-B);
  - `X-Frame-Options: DENY` and an enforced `Content-Security-Policy: frame-ancestors 'none'`;
  - nosniff, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()`, `COOP: same-origin`.
  - Non-GET requests need `Origin` equal to the app origin, or `Sec-Fetch-Site: same-origin`. Otherwise 403.
- **Files:**
  - `apps/web/react-router.config.ts:3-5`: add `future: { v8_middleware: true }`. Verified the flag exists in RR 7.18.5. Authkit 0.13.0 does not read `args.context` (checked `session.js`).
  - NEW `apps/web/app/security/headers.server.ts`, `csrf.server.ts`, `middleware.server.ts`, each with a `.test.ts`.
  - `apps/web/app/root.tsx`: one `export const middleware = [securityMiddleware]` next to the loader at `:26`.
  - **Fallback** if the flag breaks the test stubs: headers from `entry.server.tsx:62-67` plus a `handleDataRequest` export.
- **Depends on:** nothing.
- **Parallel-safe with:** N3, N4, every backend lane.
- **Conflicts with:**
  - E15 shell (`root.tsx`, light).
  - Inside E20: N8 and N11 also edit `root.tsx`, so N1 goes first.
- **Verify:**
  - Unit tests cover the header set on a document and a `.data` response; a POST with `Origin: https://evil.example` gets 403; a same-origin POST passes; a POST with neither header gets 403 (see open decision 1).
  - Manual: `curl -sI $WEB/app | grep -iE "strict-transport|x-frame|frame-ancestors"`, and logout still works (POST from `UserLogin`).
- **Risks:**
  - The middleware flag changes `context` typing in loaders. Spike first.
  - Logout redirects to WorkOS (a GET), so it is unaffected.
- **Laws:** section 5.

**E20-N2. Forward refreshed-session `Set-Cookie` (Q15)**
- **Goal:** the refresh `Set-Cookie` that `getAuthSession` returns (`utils/auth.server.ts:61`, unused today) reaches the response exactly once.
- **Files:**
  - `apps/web/app/utils/auth.server.ts:36-62`: store `headers` in a per-request `WeakMap<Request, Headers>`.
  - NEW `apps/web/app/security/session-cookies.server.ts` plus test.
  - `security/middleware.server.ts` (from N1): append after `next()`.
  - `utils/auth.server.test.ts`.
- **Depends on:** N1.
- **Parallel-safe with:** N3, N4 to N7 and the backend lanes.
- **Conflicts with:** none outside E20.
- **Verify:**
  - A test with a mocked `authkitLoader` that returns `init.headers` shows one `Set-Cookie` on the response.
  - Staging: after the access token expires, a second request does not refresh again (log count).
- **Risks:** duplicate cookies, or overwriting the logout `destroySession`. Skip when the response already has `Set-Cookie` for `wos-session`.

**E20-N3. Remove vestigial Emotion, and fix the raw render-error log (Q16, part of L2)**
- **Files:**
  - `apps/web/app/entry.server.tsx:3-4,14,46-60`: remove the Emotion cache and stream.
  - `entry.server.tsx:84`: change `console.error(error)` to `safeErrorSummary`.
  - `apps/web/app/entry.client.tsx`: Emotion imports at `:7,:17-19`, plus `ClientCacheProvider`.
  - Delete `apps/web/app/createEmotionCache.ts`, and `apps/web/app/context.tsx` if only Emotion uses it (grep first).
  - `apps/web/package.json:11-13`: drop the `@emotion/*` packages.
- **Depends on:** nothing.
- **Parallel-safe with:** everything except N11 (both touch `entry.server.tsx`; N3 goes first).
- **Conflicts with:** none outside E20.
- **Verify:** an SSR HTML test asserts there are no `data-emotion` style tags; the build passes; Storybook loads.
- **Risks:** a hidden `@emotion/styled` consumer. Run `grep -rn "@emotion" apps/web packages/ui` first.

### Lane T: access token out of the browser (D1-C)

**E20-N4. Same-origin `/api` proxy and a token-less `apiFetch`**
- **Goal:** from section 4.2 of the draft:
  - strict allow-list (inventory above); anything else returns 404;
  - path normalisation that rejects `..`, `%2e`, `%2f`, `//` and `\`;
  - `Origin` check plus `X-Flump-Request: 1`, and `Content-Type: application/json` on bodies;
  - 64 kB body cap and a timeout;
  - forwards only `Content-Type`, never the backend's `Set-Cookie`, and forwards the session-refresh cookie;
  - errors map to `BackendError` semantics;
  - per-session-user in-memory limit of 120 writes per minute (D4, D5-A).

  `apiFetch` calls `/api${endpoint}` with no `Authorization` header. `accessToken` becomes optional and ignored, so call sites compile unchanged.
- **Files:**
  - NEW `apps/web/app/routes/api.$.tsx`. Flat routes map it to `/api/*`, per `app/routes.ts:5-13`.
  - NEW `apps/web/app/services/api-proxy.server.ts` plus `.test.ts`.
  - `apps/web/app/services/api-client.ts`:
    - `:5-6`: make the token optional;
    - `:19-27`: change the base to `/api`;
    - `:35`: remove the token check;
    - `:38`: drop Bearer and add `X-Flump-Request`.
  - `services/api-client.test.ts`.
  - `services/single-api-client.guard.test.ts:31-36`: exempt `api-proxy.server.ts` from `direct-api-fetch`.
- **Depends on:** nothing. It has its own Origin check, so it does not wait for N1.
- **Parallel-safe with:** N1, N3 and the backend lanes.
- **Conflicts with:** none outside E20. The endpoint literals stay as they are, so E23's `apps/backend/test/contract/route-inventory.spec.ts:103` keeps matching.
- **Verify:**
  - Proxy tests: every allow-list entry passes; a path not on the list returns 404; a traversal attempt returns 404; a missing header returns 403; a foreign Origin returns 403; no session returns 401; a body over the cap returns 413.
  - A snapshot test of the allow-list fails if it grows (the B6 ratchet).
  - Manual: in the browser devtools, no request goes to the backend origin.
- **Risks:**
  - The proxy becomes an open relay (R2): the allow-list is strict and tested.
  - Onboarding bursts against the 120 per minute limit: measure them.
- **Laws:** section 5.

**E20-N5. Profile hook stops reading the token**
- **Files:**
  - `apps/web/app/hooks/useUserProfile.ts:264-273` (remove `useRouteLoaderData`); `:291,297,303,309,320,325,331,341` (drop `accessToken` and its dependency entries).
  - Delete `HttpProfileAdapter` at `:351-380`.
  - `hooks/useUserProfile.test.ts` and `useUserProfile.test.tsx`.
- **Depends on:** N4.
- **Parallel-safe with:** N6, N7.
- **Conflicts with:** none. The hook is shared, but HomeDashboard, Pension, Savings, Mortgage and UserProfilePanel files stay untouched.
- **Verify:** the hook tests pass; `grep -n accessToken apps/web/app/hooks/useUserProfile.ts` returns nothing.
- **Risks:** low.

**E20-N6. Budget route and container off the token**
- **Files:**
  - `apps/web/app/routes/app.budget.tsx:8-11`: stop destructuring and returning `accessToken`.
  - `apps/web/app/containers/budget/BudgetContainer.tsx:46,155,170,185,212,232`.
  - `BudgetContainer.test.tsx`.
- **Depends on:** N4.
- **Parallel-safe with:** N5, N7.
- **Conflicts with:** E15 T3.8 (Budget) if it has started; check before branching. It is not in flight today.
- **Verify:** container tests pass; a loader test asserts the `/app/budget` data has no `accessToken` key.

**E20-N7. Onboarding off the token**
- **Files:**
  - `apps/web/app/routes/app.onboarding.tsx:53-56` (loader returns `{ userProfile, user }`), `:98`, `:323`, `:350`.
  - `routes/app.onboarding.test.tsx`.
- **Depends on:** N4, and the E23 onboarding work landing.
- **Parallel-safe with:** N5, N6.
- **Conflicts with:**
  - E23: branch `e23-p0-backend` edits `app.onboarding.test.tsx`.
  - E15 T3.2 (onboarding).
  - Rebase after E23 merges.
- **Verify:** the onboarding seed retry tests still pass; the loader data has no token.

**E20-N8. Root stops exposing the token or `window.ENV`, plus a no-token guard**
- **Files:**
  - `apps/web/app/root.tsx:29-57`: keep the token internal to the loader, and remove `accessToken` and `ENV` from the return.
  - `root.tsx:62` and `:83-87`: delete the `window.ENV` script.
  - `root.test.tsx`.
  - `services/backend-client.server.ts:125-128`: add a doc comment that `accessToken` is server-only and must never be returned from a loader.
  - NEW `apps/web/app/ratchets/no-browser-token.test.ts`:
    - scans every non-`.server.ts` file under `app/` for `accessToken`;
    - ratchet allow-list with only `containers/mortgage/MortgageContainer.tsx` (removed by N9);
    - also invokes every route module's `loader` with a mocked session token `"SENTINEL_TOKEN"` and asserts the serialised data does not contain it.
  - `services/single-api-client.guard.test.ts:29-31`: `api-client.ts` no longer reads `VITE_API_URL`.
- **Depends on:** N4, N5, N6, N7.
- **Parallel-safe with:** the backend lanes.
- **Conflicts with:** E15 shell (`root.tsx`, light); inside E20, N1 and N11.
- **Verify:**
  - The guard test passes.
  - Manual: view source of `/app/budget`, then `/app/budget.data`, and search for `eyJ`. It must be absent.
- **Risks:** Mortgage passes `undefined`, which N4 makes harmless. It compiles because of the cast at `MortgageContainer.tsx:46`.

**E20-N9. Mortgage off the token (last: E15 collision)**
- **Files:**
  - `apps/web/app/containers/mortgage/MortgageContainer.tsx:46-47,107`.
  - `MortgageContainer.test.tsx`.
  - `ratchets/no-browser-token.test.ts`: remove the allow-list entry.
- **Depends on:** N8, and E15 mortgage follow-ups merged (`fix/e15-mortgage-followups`).
- **Conflicts with:** E15 (mortgage), and it must go last.
- **Verify:** the guard has an empty allow-list; the mortgage save test passes.

**E20-N10. Backend CORS off in production (B5, D13-A)**
- **Files:**
  - `apps/backend/src/config/cors.config.ts:39-46`: an empty list in production becomes the expected state. Log at info, not `console.error`.
  - `cors.config.spec.ts`.
  - `docs/security/owner-steps.md` section 3.
- **Depends on:** N8 deployed and verified.
- **Parallel-safe with:** everything.
- **Conflicts with:** E21 does not touch `cors.config.ts`.
- **Verify:** spec passes; on staging, a preflight from the web origin gets no ACAO header and the app still works.
- **Risks:** a stray direct browser call breaks. N8's guard prevents it.

### Lane C: CSP (Phase 2)

**E20-N11. Nonce plumbing, report-only CSP and `/csp-report`**
- **Files:**
  - `apps/web/app/entry.server.tsx:48-54`: generate a 128-bit nonce; pass `nonce` to `renderToPipeableStream` and `<ServerRouter nonce>`.
  - NEW `apps/web/app/security/nonce.tsx` (context) plus test.
  - `apps/web/app/root.tsx`: the nonce goes on the theme script at `:88`, on `ScrollRestoration` and `Scripts` at `:129-130`, and in the ErrorBoundary at `:148,159-160`.
  - `security/headers.server.ts` gains a `Content-Security-Policy-Report-Only` header. Starting policy (`connect-src 'self'` works because N8 has landed):

    ```
    default-src 'self'; script-src 'self' 'nonce-N';
    style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:;
    font-src 'self'; connect-src 'self'; form-action 'self' <WorkOS and marketing origins>;
    frame-ancestors 'none'; object-src 'none'; base-uri 'none'; report-uri /csp-report
    ```

    `style-src 'unsafe-inline'` stays because of `root.tsx:91-98` and the other inline styles.
  - NEW `apps/web/app/routes/csp-report.ts` plus test: 8 kB cap, rate-limited, logs only the directive, the blocked origin and the path.
- **Depends on:** N1, N3, N8.
- **Conflicts with:** E15 shell (`root.tsx`).
- **Verify:**
  - A test parses the SSR HTML and finds the nonce on every inline `<script>`.
  - A report POST returns 204; an oversize one returns 413.
  - Manual: there is no hydration warning in the console.
- **Risks:** a nonce hydration mismatch with React 19.3 (spike). The Radix style singleton is covered because styles stay `unsafe-inline`.

**E20-N12. Enforce the CSP after the soak**
- **Files:** `security/headers.server.ts`: `CSP_ENFORCE=true` switches to the enforced header and adds `upgrade-insecure-requests`; a stricter policy stays as report-only. Plus tests.
- **Depends on:** N11, then at least 14 days with zero unexplained reports. Ideally on staging (E18, round 3 item 8); otherwise on production with the owner reading the reports.
- **Verify:** a header test, plus a manual journey (sign-in, budget add, tax add with receipt, profile) with no CSP console errors.
- **Risk:** low, because rollback is one environment variable.

### Lane B: backend hardening

**E20-N13. Backend rate limiting, in memory (Q6, R1, D4, D5-A)**
- **Goal:** apply the section 6 table of the draft, keyed per user for authenticated routes and per IP for everything else. Responses are 429 with `Retry-After`, plus a `ratelimit_exceeded` log line (route template and user id only). `/health*` and `/mcp` are exempt; `/mcp` keeps its own limiter.

  | Class | Limit |
  |---|---|
  | Credential | 3 per 15 minutes, 10 per day |
  | Destructive | 10 per hour |
  | Token mint | 5 per hour |
  | Bank | 10 per hour |
  | Writes | 120 per minute |
  | Reads | 600 per minute |
  | Per IP | 300 per minute (generous, because after Phase 1 the web server is one IP) |

- **Files:**
  - Step 1 spike: `bun info @nestjs/throttler peerDependencies` against Nest 12.4.1 (open decision 2).
  - NEW `apps/backend/src/security/`:
    - `rate-limit.store.ts` (fixed window, shaped like `packages/mcp/src/auth/rate-limiter.ts`);
    - `rate-limit.decorator.ts` (`@RateLimit(class)`);
    - `user-rate-limit.interceptor.ts` (an APP_INTERCEPTOR runs after guards, so it can see `req.user`);
    - `ip-rate-limit.guard.ts` (APP_GUARD);
    - `security.module.ts`;
    - a spec for each.
  - `apps/backend/src/app.module.ts:28-38`: one `SecurityModule` import line.
  - Decorators:
    - `user-profile.controller.ts:71` (credential) and `:76` (destructive);
    - `mcp.controller.ts:49` (token mint);
    - `finance.controller.ts:151` (destructive), `:177,183,189` (bank), `:195` (destructive).
- **Depends on:** nothing.
- **Parallel-safe with:** the web lanes, N14, N17, N19.
- **Conflicts with:**
  - E21: one line in `app.module.ts`, next to the `ContractShadowInterceptor` provider at `:58`. Do not touch `security.config.ts`, which E21 owns (v1 alias at `:51`).
  - E23 may edit controllers, so the decorator lines are small rebases.
  - Inside E20: N16 (`mcp.controller.ts`) and N20 (`app.module.ts`). Land N13 first.
- **Verify:**
  - The 4th password reset within 15 minutes returns 429 with `Retry-After`; a different user is unaffected; a GET at low volume is not limited; `/health` is never limited.
  - Manual on staging: a spoofed `X-Forwarded-For` does not change the IP key (R3).
- **Risks:** counters reset on deploy (accepted, R14); a false-positive limit on onboarding seeding (measure it).

**E20-N14. Receipt validation (Q9)**
- **Rules:**
  - The data URL must parse; MIME must be one of `RECEIPT_MIME_TYPES`, imported read-only from `@flump/api-contract` (backend dependency at `apps/backend/package.json:21`).
  - A magic-byte sniff must match the declared MIME; decoded size at most 5 MB; filename at most 255 characters with no path separators or control characters.
  - Failures return 400.
- **Files:**
  - NEW `apps/backend/src/security/receipt-validation.ts` plus spec.
  - `apps/backend/src/tax.controller.ts:38-44` (validate inside `pickTaxRecordFields`), covering `:76-104` (bulk), `:107-115` (create) and `:117-130` (patch).
  - `apps/web/app/containers/tax/TaxContainer.tsx:236-261`: client type and size check before `readAsDataURL`.
  - `TaxContainer.tsx:2110,2135`: change `accept` to `image/png,image/jpeg,image/webp,application/pdf`.
  - `TaxContainer.test.tsx`, `tax.controller.spec.ts`.
- **Depends on:** nothing.
- **Parallel-safe with:** N13, N16, N17.
- **Conflicts with:**
  - E15 T3.7 and E16 (`TaxContainer.tsx` hotspot); keep the diff minimal.
  - E21: after this lands, E21 removes the receipt reason from `HELD_BACK_GROUPS` (`contract-shadow.interceptor.ts:32-36`). The leap-day reason remains E21's.
- **Verify:** the spec rejects `data:text/html`, `image/svg+xml`, a mismatched magic number, a 6 MB file and `../x.pdf`; a real 4 MB PDF round-trips (the 8 MB tax body limit is at `security.config.ts:9,65`).
- **Risk:** legacy rows are left alone and only validated when rendered (N15).

**E20-N15. Receipt download route; lists exclude receipt data (D6-A, U1 and U2)**
- **Files:**
  - `apps/backend/src/entities/tax-record.entity.ts:51-52`: `select: false` on `receiptData`. This also strips it from the MCP provider at `mcp.service.ts:106-125`, which closes M4 for receipts.
  - `tax.controller.ts`:
    - add `hasReceipt` to the list and detail responses (`:56-73`);
    - NEW `GET /tax-records/:id/receipt` scoped by `{id, userId}`; it returns bytes after re-validating with N14 (legacy rows that fail give 404);
    - PATCH keeps the stored data when the body omits it.
  - NEW `apps/web/app/routes/app.tax.receipts.$id.tsx`, a resource route with tests. It streams the file with:
    - the sniffed `Content-Type`;
    - `Content-Disposition: attachment; filename*=UTF-8''…` (inline only for raster images);
    - nosniff, `Content-Security-Policy: sandbox; default-src 'none'`, `Cache-Control: private, no-store`.
  - `TaxContainer.tsx`:
    - `:2155-2210`: `href` and `src` point at `/app/tax/receipts/:id`; delete the `href={receiptData}` at `:2189`;
    - `:213-215` and `:330-332`: send `receiptData` only when a new file is chosen.
  - `components/tax/TaxIncomeSectionCard.tsx:656-672`: use `hasReceipt`.
  - Tell E21 about the response shape in `packages/api-contract/src/domains/tax.ts:25-39`; E20 does not edit that file.
- **Depends on:** N14.
- **Conflicts with:** E15 T3.7 and E16 (Tax), E21 (contract shape), E12 (mobile reads tax records; `hasReceipt` is additive).
- **Verify:**
  - A cross-user request for the receipt returns 404 (also covered in N23).
  - `grep -rn 'href={.*receiptData' apps/web/app` finds nothing.
  - Response-header test.
  - Manual: download a PDF and view a PNG.
- **Risk:** `select: false` silently drops receipt data where code needed it. Grep for `receiptData` across the backend and MCP.

**E20-N16. PAT lifecycle defaults (Q11; E17 T2.2 overlap)**
- **Rules:** expiry defaults to 90 days and must be one of {7, 30, 90, 365}; `null` returns 400; name is 1 to 64 characters after trim; `anonymizeInstitutions: false` is rejected with an explanation until step-up exists (N21).
- **Files:**
  - `apps/backend/src/mcp.controller.ts:49-65`.
  - `apps/backend/src/mcp.service.ts:170-217` (defaults at `:189-196`).
  - `mcp.controller.spec.ts`, `mcp.service.spec.ts`.
  - `apps/web/app/features/ai-connections/components/McpConnectionCard/McpConnectionCard.tsx:77,102,579-581`: remove "Never", add 7 and 365. Update its `.test.tsx` and `.stories.tsx`.
- **Depends on:** nothing.
- **Parallel-safe with:** N14, N17.
- **Conflicts with:**
  - **E17 T2.2** (same files). E20 takes expiry, name and anonymise; E17 keeps revoke-all and the checksum PAT format. Dedupe with the E17 planner.
  - E17 T2.4 rewrites `McpConnectionCard`.
  - E21: after this lands, E21 drops `mcp-tokens` from `HELD_BACK_GROUPS`.
  - Inside E20: N13 (decorator at `mcp.controller.ts:49`).
- **Verify:** specs pass; stories render in light and dark with zero a11y violations, plus a `play()` test (AGENTS.md section 4).
- **Laws:** sections 1, 2 (semantic tokens only) and 4.

**E20-N17. MCP scope enforcement (D7-A, D-17), using today's scope names**
- **Mapping:**
  - Every tool, resource and prompt needs `mcp:read:anonymized` or `mcp:read:full`.
  - These also need `mcp:simulate`: `simulate_debt_payoff`, `simulate_uk_tax_and_pension_sacrifice`, `compare_mortgage_overpay_vs_isa`, `calculate_self_assessment_and_section24`, `project_wealth_scenario`, `evaluate_uk_student_loan`.
  - These need read only: `evaluate_cashflow_runway_and_health`, `query_transactions_and_spending`.
  - Effective anonymisation is `record.anonymizeInstitutions || !scopes.includes("mcp:read:full")`.
  - Unknown scope strings are dropped.
  - Every registered primitive must have an entry in `TOOL_SCOPES`, `RESOURCE_SCOPES` or `PROMPT_SCOPES`; the facade throws at construction if one is missing or the handler argument is not a function, and an unlisted lookup at runtime is denied.
  - A missing scope returns a tool error `INSUFFICIENT_SCOPE`. `tools/list` is not filtered (E17 section 8).
- **Exact files (for dedupe with E17):**
  - NEW `packages/mcp/src/auth/scopes.ts`: `TOOL_SCOPES`, `RESOURCE_SCOPES`, `PROMPT_SCOPES`, `hasScopes`, `effectiveAnonymize`.
  - NEW `packages/mcp/src/auth/scopes.test.ts`.
  - `packages/mcp/src/server.ts:24-55`: register through a scoped facade that wraps `registerTool`, `registerResource` and `registerPrompt` handlers. The tool files stay unchanged, so they do not collide with E17 T1.4 to T1.8.
  - `packages/mcp/src/auth/token-verifier.ts:135-141`: filter scopes and compute the effective anonymisation.
  - `packages/mcp/src/index.ts`: export `scopes`.
  - `packages/mcp/src/mcp.test.ts`: one test per tool, with and without the scope.
- **Depends on:** nothing.
- **Parallel-safe with:** everything except N18 (same package; serialise).
- **Conflicts with:** **E17** T1.3 (`define-tool.ts` absorbs the facade later) and T2.1 (scopes v2 renames the table). Agree that E20 lands first and E17 renames.
- **Verify:** a token with only `mcp:simulate` gets `INSUFFICIENT_SCOPE` on `query_transactions_and_spending`; the default PAT scopes behave exactly as today.
- **Risk:** the SDK `registerResource` signature varies by overload. Wrap only the handler argument.

**E20-N18. MCP Origin validation and kill switch (M2, M3)**
- **Behaviour:** an `Origin` header that is present and not on `MCP_ALLOWED_ORIGINS` gets 403. `MCP_ENABLED=false` returns 503 on `/mcp` before auth.
- **Files:**
  - `packages/mcp/src/transports/http.ts:55-66` (Express path) and `:111-140` (Web path).
  - `transports/http.test.ts`.
  - `apps/backend/src/mcp.service.ts:55-62`: pass the options from config.
- **Depends on:** N17 (serialise within the package).
- **Conflicts with:** E17-F07 and the E17 transport work. Name it to the E17 planner.
- **Verify:** unit tests; manual `curl -H "Origin: https://evil.example" $API/mcp` returns 403.

### Lane S: session and account security (D3-B, D12-A)

**E20-N19. Session lifetime policy (D3-B config, A7)**
- **Goal:**
  - Web boot defaults `WORKOS_COOKIE_MAX_AGE` to `1209600` (14 days; authkit reads it at `config.js:31,85`).
  - Production fails boot if `WORKOS_REDIRECT_URI` is not https or if the max-age is over 14 days.
  - Optionally rename the cookie to `__Host-wos-session` with `WORKOS_COOKIE_NAME` (open decision 3).
- **Files:** `apps/web/app/utils/auth.server.ts:22-23` (next to the existing boot check), `utils/auth.server.boot.test.ts`, `apps/web/.env.example`, `docs/security/owner-steps.md` section 1.
- **Depends on:** nothing.
- **Parallel-safe with:** everything except N2 (same file; serialise).
- **Verify:**
  - The boot tests pass.
  - Manual: the `Set-Cookie` `Max-Age` is 1209600 and the cookie has `Secure`.
  - Idle 24 hours is a WorkOS dashboard setting (owner).
- **Risk:** the rename logs every user out once (R13; acceptable with beta test data).

**E20-N20. Step-up re-authentication service (D3-B, A1 and A2)**
- **Goal:** step 1 is a written spike (WorkOS forced re-login or `max_age`, Magic Auth code verify, the `sid` and `auth_time` claims). Then a backend `@RequiresRecentAuth(600)` guard returns 403 `{ code: "reauth_required" }`.
- **Files:**
  - NEW `apps/backend/src/auth/step-up.controller.ts`, `step-up.service.ts`, `recent-auth.guard.ts`, `apps/backend/src/entities/user-reauth.entity.ts`, a migration, and specs.
  - `apps/backend/src/auth/token-verifier.ts:1-5`: `AuthenticatedUser` gains `sid`.
  - `auth/workos-jwt.verifier.ts:50-65`: return `sid` and `auth_time`.
  - `app.module.ts`: register.
- **Depends on:** N13 (`app.module.ts`), the spike, and open decision 4.
- **Conflicts with:** E21 (`app.module.ts`, one line); inside E20, N24 (verifier).
- **Verify:** a protected route without step-up returns 403; after step-up it passes for 10 minutes for that `sid` only; a different `sid` gets 403; codes are throttled.
- **Risk:** WorkOS semantics are unverified (R11).

**E20-N21. Apply step-up, with a ReauthDialog**
- **Applies to:** reset financial data, PAT `anonymizeInstitutions: false` (which reverses N16's rejection), and bank connect. Account deletion follows when E19 F40 lands.
- **Files:**
  - `user-profile.controller.ts:76`.
  - `mcp.controller.ts:49`.
  - `finance.controller.ts:177`.
  - NEW `apps/web/app/features/security/components/ReauthDialog/{ReauthDialog.tsx, .styles.ts, .stories.tsx, .test.tsx, index.ts}`.
  - `apps/web/app/hooks/useUserProfile.ts` (`resetFinancialData` handles `reauth_required`).
  - `components/budget/UserProfilePanel.tsx:301` call site.
  - Optional: a TOTP link and copy in the profile (D12-A).
- **Depends on:** N20, N16.
- **Conflicts with:** E15 T3.10 (`UserProfilePanel`), E17 T2.4 (AI card).
- **Verify:** IDOR matrix rows for "no step-up gives 403"; stories in light and dark with zero a11y violations, plus a `play()` test.
- **Laws:** sections 1 (five files), 2 and 4.

### Lane Z: authorisation proof (Phase 6)

**E20-N22. Two-user IDOR harness, route-coverage meta-test, finance and budget matrix**
- **Harness:**
  - Boot the real `AppModule` on `TEST_DATABASE_URL`, using the same migration mock and schema reset as `apps/backend/test/contract/web-mutations.contract.spec.ts:31-100`.
  - Override `TOKEN_VERIFIER` with `WorkOsJwtVerifier` on `createTestJwks()` (`src/auth/testing/test-jwks.ts:12`) to mint `user_A`, `user_B` and an expired token.
  - Gate with `resolveDbTestMode`; unset the beta allowlist.
- **Matrix cases:**
  - A gets 2xx.
  - B gets 404, with the same body as a real not-found and the row unchanged (checked by direct query).
  - No token, or an expired one, gets 401.
  - Every write body is probed with `{ id: A's id, userId: "user_A" }`.
  - Lists return none of A's rows.
- **Meta-test:** enumerate routes through `PATH_METADATA` and `METHOD_METADATA`, as `test/contract/route-inventory.spec.ts` does. It fails when a route has no matrix row, or has no `AuthGuard` while not on the allow-list (`GET /`, `/health`, `/health/ready`, `GET|POST /mcp`).
- **Files:**
  - NEW `apps/backend/test/authz/support.ts`, `matrix.ts`, `authz.finance.spec.ts` (finance controller routes at `finance.controller.ts:101-195`), `authz.budget.spec.ts` (`budget.controller.ts:209-349`), `route-coverage.spec.ts`.
  - Rows for tax, user-profile and mcp-tokens are marked "pending N23".
- **Depends on:** nothing. `@nestjs/testing` and `supertest` are already dev dependencies (`apps/backend/package.json:40,46`).
- **Parallel-safe with:** everything. It only adds a new directory.
- **Conflicts with:** E23 (`test/contract`); copy the pattern rather than editing E23's files.
- **Verify:** `REQUIRE_DB_TESTS=1 TEST_DATABASE_URL=… rtk bun run test -- authz` (`vitest.config.ts:11` already includes `test/**`); deliberately adding an unguarded route makes the meta-test fail.

**E20-N23. IDOR matrix for the remaining controllers, plus MCP across users**
- **Files:**
  - NEW `apps/backend/test/authz/authz.tax.spec.ts` (`tax.controller.ts:56-140` plus the N15 receipt route, including `capPreviousRecordIds` across users at `:86-92`).
  - NEW `authz.user-profile.spec.ts` (`user-profile.controller.ts:60-81`).
  - NEW `authz.mcp-tokens.spec.ts` (`mcp.controller.ts:39-86`).
  - NEW `authz.mcp.spec.ts`: B's PAT never returns A's data; A's revoked PAT returns 401.
- **Depends on:** N22, N15, N16.
- **Verify:** the meta-test prints 100% coverage.

### Lane O: remaining small items, tooling and docs

**E20-N24. Pin the WorkOS issuer (Q12, gated on the owner)**
- **Files:** `apps/backend/src/auth/workos-jwt.verifier.ts:19-28` (a single issuer from `WORKOS_ISSUER`), `auth/auth.module.ts` (production boot requires it), specs, and `WORKOS_ISSUER` documented for web.
- **Depends on:** owner step 2, and N20 (same file).
- **Verify:** a boot spec fails without the variable in production; staging deploys first.
- **Risk:** a wrong value returns 401 on every login (R4).

**E20-N25. Minor D-items: log hygiene, dead callback, avatar**
- **Files:**
  - `apps/backend/src/finance.service.ts:290`: delete the dead `/auth/callback` default from the ledger note; fail closed.
  - `apps/web/app/utils/avatar.ts:125,144,151`: reject on decode or canvas failure instead of resolving the raw data URL (U5).
  - `utils/avatar.test.ts`.
  - The avatar server rule already exists in E21's contract (`packages/api-contract/src/profile.test.ts:5-11`), so nothing more is needed here.
- **Depends on:** nothing.
- **Parallel-safe with:** everything.
- **Verify:** unit tests.

**E20-N26. Bank-token key id for rotation (S5, D-11 remainder; optional before friends)**
- **Files:** `packages/banking/src/server/crypto.ts:7-26,75-122` (a `k1:` prefix, a key map from `BANKING_TOKEN_ENCRYPTION_KEYS`, legacy decrypt), its tests, and a re-encrypt command NEW `apps/backend/src/scripts/rotate-banking-key.ts`.
- **Depends on:** nothing.
- **Conflicts with:** E3 config rules.
- **Verify:** a legacy ciphertext decrypts; a new one carries the key id.

**E20-N27. Security scanning workflow: gitleaks, ZAP baseline, Semgrep CE (D10-A)**
- **Goal:** a new workflow, so `ci-pipeline.yml` stays untouched (E12 and E23 edit it).
  - **gitleaks:** a pinned binary or image digest, run on the PR diff range. This replaces E18 A-08; tell the E18 owner.
  - **ZAP baseline (passive):** weekly plus `workflow_dispatch` against `vars.ZAP_TARGET_URLS`; skipped with a notice when unset. Uses `.zap/rules.tsv` and uploads the report artifact.
  - **Semgrep CE:** report-only (`p/owasp-top-ten p/typescript p/react p/nodejsscan`).
  - Actions pinned by SHA (D-19). Advisory only: there is no GitHub Pro, so no required checks (DECISIONS E11 D7).
- **Files:** NEW `.github/workflows/security-scan.yml`, NEW `.gitleaks.toml`, NEW `.gitleaksignore` (fingerprints after rotation), NEW `.zap/rules.tsv`.
- **Depends on:** owner step 3 for the history findings.
- **Conflicts with:** E18 A-08 (dedupe).
- **Verify:** a throwaway commit with a fake `sk_test_` string fails the gitleaks job (then drop the commit); a manual ZAP run produces a report.

**E20-N28. Finalise the security docs**
- **Files:**
  - `docs/security/threat-model.md`: TB2 removed, AC1 chain closed, residual risks, a per-actor control map, an evidence column linking N1 to N27.
  - `docs/security/headers-and-csp.md`: the implemented web set and the CSP.
  - `docs/security/logging-policy.md`: the event vocabulary actually emitted.
  - `docs/security/owner-steps.md`.
  - NEW `docs/security/rate-limits.md`.
  - NEW `docs/security/incident-response.md` (T6): global logout by rotating `WORKOS_COOKIE_PASSWORD`; revoke all PATs; `MCP_ENABLED=false`; key rotation; 72-hour ICO notification (E19 owns the legal process).
  - `docs/audit/plans/E20-ledger.md`.
- **Depends on:** last; after N12 and N23.
- **Verify:** owner review; the lint (format) check passes.

---

## OWNER STEPS (agents do not do these)

1. **WorkOS dashboard:**
   - absolute session 14 days and inactivity 24 hours (D3-B);
   - enable optional TOTP (D12-A);
   - confirm `/callback` is the registered redirect URI;
   - note whether refresh tokens rotate (for N2) and whether Magic Auth or forced re-auth is available (input to N20).
2. **Q12:** decode one real staging or production access token offline and record `iss` and the claim names. Set `WORKOS_ISSUER` on staging first, then unblock N24.
3. **D-12 rotation:**
   - rotate the WorkOS API key and client secret;
   - treat the old `JWT_SECRET` and `DB_PASSWORD` as burned;
   - run a local full-history gitleaks scan;
   - hand the fingerprints to N27's `.gitleaksignore`.
4. **Web environment:**
   - `WORKOS_REDIRECT_URI` must be https;
   - accept the one-time logout if the `__Host-` rename (N19) ships.
5. **After N8 is deployed and checked:** unset `CORS_ALLOWED_ORIGINS` on the backend (N10).
6. **CSP soak:** read the `/csp-report` logs for at least 14 days, then set `CSP_ENFORCE=true` (N12).
7. **ZAP:** set the repository variable `ZAP_TARGET_URLS` (staging once it exists, round 3 item 8) and triage the reports.
8. **Checks:**
   - whether `up.railway.app` is on the Public Suffix List (A4 same-site risk);
   - trust-proxy check on staging with a spoofed `X-Forwarded-For` (N13);
   - that the password-reset email actually arrives (`owner-steps.md`).
9. **HOLD (round 3 item 11):** Cloudflare proxy, WAF and edge rate limiting wait for the custom-domain cutover. Then set `TRUST_PROXY_HOPS=2`. HSTS preload comes only after 3 stable months (D8-B). A pen test happens only on a round 3 item 16 trigger.

## OPEN DECISIONS (not settled in DECISIONS.md)

1. **A non-GET request with neither `Origin` nor `Sec-Fetch-Site` (N1).**
   - Options: (a) reject with 403; (b) allow.
   - Recommendation: **(a).** Every supported browser sends one of the two, and the app has no non-browser posters.
   - Straightforward.
2. **Rate-limiter implementation (N13).**
   - Options: (a) `@nestjs/throttler`, if its peer range includes Nest 12; (b) an in-house fixed-window store (~80 lines, the same shape as the MCP limiter).
   - Recommendation: **(a) if compatible, else (b).** Both are in memory under D5-A.
   - Straightforward.
3. **Rename the cookie to `__Host-wos-session` (N19).**
   - Options: (a) now; (b) at the custom-domain cutover.
   - Recommendation: **(a)**, while the data is test data. It defends against cookie tossing from sibling subdomains.
   - Straightforward.
4. **Step-up mechanism (N20).**
   - Options: (a) an AuthKit forced re-login redirect, checked by `auth_time`; (b) a WorkOS Magic Auth email code; (c) password re-entry (fails for social and SSO users, and has session side effects).
   - The choice depends on the spike's evidence and is security-sensitive.
   - Recommendation pending the spike: **(a) if WorkOS supports it, else (b).**
   - **Complicated:** route it to fable with the spike notes.

## Lane summary (concurrency)

| Lane | Order | Notes |
|---|---|---|
| W web infra | N1 → N2; N3 in parallel | N1, N8 and N11 share `root.tsx`; N3 and N11 share `entry.server.tsx` |
| T token | N4 → (N5 ∥ N6 ∥ N7 after E23 onboarding) → N8 → N9 after E15 mortgage → N10 after deploy | N9 goes last: it collides with E15. No E15 dashboard file is touched |
| C CSP | N11 after N1, N3 and N8 → soak → N12 | Staging preferred |
| B backend | N13 first; N14 → N15; N16 → N17 → N18 (`packages/mcp` serial) | E21: one line in `app.module.ts`; never edit `security.config.ts`, `contract-shadow.interceptor.ts` or `packages/api-contract`. Ask E21 to drop `HELD_BACK_GROUPS` after N14 and N16 |
| S session | N19 (serialise with N2); N20 after N13 and the spike → N21 after N16 | N21 touches `UserProfilePanel` (E15 T3.10) |
| Z authz | N22 at any time → N23 after N15 and N16 | New `apps/backend/test/authz/` only |
| O other | N24 (owner-gated, after N20); N25 and N26 at any time; N27 at any time; N28 last | N27 uses a new workflow file and replaces E18 A-08 |

**No E20 ticket touches E12's `apps/mobile-companion` or `packages/api-client`.** Mobile keeps bearer tokens to the backend, and the per-user limits and step-up apply to it as well.

**E17 dedupe list:**

| Ticket | Files |
|---|---|
| N16 | `apps/backend/src/mcp.controller.ts:49-65`, `apps/backend/src/mcp.service.ts:170-217`, `McpConnectionCard.tsx` |
| N17 | NEW `packages/mcp/src/auth/scopes.ts` and `scopes.test.ts`, `packages/mcp/src/server.ts`, `packages/mcp/src/auth/token-verifier.ts:135-141`, `packages/mcp/src/index.ts`, `packages/mcp/src/mcp.test.ts` |
| N18 | `packages/mcp/src/transports/http.ts`, `transports/http.test.ts`, `apps/backend/src/mcp.service.ts:55-62` |
| N15 | Receipt stripping from the MCP provider, through the `select: false` on `tax-record.entity.ts:51` (overlaps E17 T1.2) |
