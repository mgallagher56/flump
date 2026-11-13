# Security headers and CSP

Status of what is implemented against what is planned. Design source: section 5 of `docs/audit/plans/E20-plan-draft.md`.

## Implemented in the Phase 0 PR

### Marketing (`apps/marketing/server.ts`, `server/security.ts`)

- `Strict-Transport-Security: max-age=31536000; includeSubDomains` (no preload, decision D8).
- `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`.
- Enforced `Content-Security-Policy`. In production `script-src` is `'self'` plus a per-request nonce (no `https:`) and `connect-src` is `'self'` (no `https:`, no `ws:`); the marketing site makes no cross-origin fetches. Development keeps `'unsafe-inline'`, `'unsafe-eval'`, `https:` and `ws:` for Vite HMR.
- 500 responses return a generic body; the error is logged server-side only.
- The app URL is resolved once at boot from `VITE_APP_URL`, then `APP_URL`, then the environment (never the request `Host` header).
- `/.well-known/security.txt` is served as `text/plain` only when the `SECURITY_CONTACT` env var is set on the marketing service (email, `mailto:` or https URL); otherwise it returns 404. `Expires` is computed per request (now + 1 year).

### Backend (Q4, separate task in the same PR)

`helmet` configured for a JSON API (CSP `default-src 'none'`, HSTS, nosniff, `Referrer-Policy: no-referrer`), explicit body limits, CORS from `CORS_ALLOWED_ORIGINS`.

### MCP transport (Q10)

Generic 400 bodies for non-auth errors, `WWW-Authenticate` on 401, `Retry-After` on 429, and a per-IP limiter for failed authentication (10 per minute).

## Web caching and response-header coverage

`apps/web/app/security/middleware.server.ts` applies `applyCachePolicy` (in `headers.server.ts`) to every document, `.data` and resource-route response. There is no public-cacheable allow-list: the root loader returns the user, profile and access token for every route (including `/tools`) and may append a refreshed session `Set-Cookie`, so every HTML and `.data` response is user-specific.

- Default is `Cache-Control: no-store` plus `Pragma: no-cache`.
- A response that sets a cookie is always `no-store`.
- A route's own `Cache-Control` is kept only if it already contains `no-store` or `private`; a weaker value (`public`, `max-age`, ...) is replaced with `no-store`.
- Anything not `no-store` (a kept `private`) gets `Vary: Cookie`, keeping existing `Vary` values.
- A future cacheable public page needs an explicit, reviewed opt-in (a route that loads no user data plus a change to this policy), never an implicit default.

### Web server (`apps/web/server.ts`)

The web app runs on a small custom Express server (`@react-router/express`, a near-verbatim port of `react-router-serve` 7.18.5) instead of `react-router-serve`. It exists so the response headers cover every response, including those React Router builds outside any hook: the document-request CSRF 400, document-level catch 500s, `/__manifest` responses, and static files from `express.static`.

- `apps/web/server/securityHeaders.ts` is the first middleware. It sets the whole `SECURITY_HEADERS` set (imported from `app/security/headers.server.ts`, the single source) plus `frame-ancestors 'none'` on every response. When the app sets one of those headers itself (E20-N11 will add a nonce CSP in `entry.server.tsx`), the app's value replaces the default instead of being appended next to it.
- `app.disable("x-powered-by")` and `trust proxy` 1 (Railway terminates TLS one hop in front).
- `Cache-Control` for documents stays with `applyCachePolicy`. Static files keep exactly the values `react-router-serve` used: `/assets` `public, max-age=31536000, immutable`, everything else in `public/` and `build/client` the `express.static` defaults and a 1 hour `max-age` for `public/`. The `compression` middleware is unchanged.
- Shutdown: SIGTERM and SIGINT stop accepting connections, let in-flight requests finish and exit 0; a drain that exceeds 14 seconds is forced to exit 1 (Railway drains for 15 seconds, `apps/web/railway.json`).
- The access log is described in `docs/security/logging-policy.md`.

`.data` responses are still also covered through `handleDataRequest` in `entry.server.tsx`. Tests: unit tests in `apps/web/server/*.test.ts`, and `apps/web/server/server.integration.test.ts`, which spawns the built server and checks the headers on every response kind (CI: the E2E smoke job runs `bun run --cwd apps/web test:server` after the build). Rollback: redeploy the previous deployment, or restore the previous start command (`react-router-serve ./build/server/index.js`) in `apps/web/Dockerfile` (`CMD`) and `apps/web/package.json` (`start`); `@react-router/serve` stays installed for one release.

`Cross-Origin-Resource-Policy: same-origin` is sent with the other headers: nothing cross-origin embeds the app's documents (the marketing site only links to it; Sentry and WorkOS are outbound).

ZAP baseline (`.zap/rules.tsv`): rule 90004 is ignored only for the missing COEP, which would block third-party resources for no isolation benefit we use; the web app sends COOP and CORP. The marketing site does not send COOP or CORP yet, which the ignore also hides for that target. Rule 10049 (storable and cacheable content) stays at the default WARN: the cache policy above is the real control, and a remaining finding points at a response worth checking (static assets are expected to be cacheable). The CSP wildcard finding (10055) stays open for E20-N11.

## Planned (Tier B, not in this PR)

### Web (`apps/web`, Q7 and C1 to C5)

The web app currently sends no security headers from `entry.server.tsx`. Planned:

1. Phase 0 header set on document and `.data` responses: HSTS, `X-Frame-Options`, enforced `frame-ancestors 'none'`, nosniff, Referrer-Policy, Permissions-Policy, `Cross-Origin-Opener-Policy: same-origin`. No COEP.
2. CSRF Origin check on non-GET requests.
3. Nonce plumbing, then a report-only CSP with a `/csp-report` endpoint, at least 14 days of soak, then enforcement.
4. Sentry (E18-N3): the E20-N11 `connect-src` must allow the Sentry EU ingest origin (`https://*.ingest.de.sentry.io`), or browser reports are blocked. `entry.client.tsx` wraps the lazy Sentry start in try/catch so error reporting can never stop hydration; this also hides a CSP failure, so check the browser console for blocked `connect-src` requests when verifying the CSP.
5. Prerequisites: remove the `window.ENV` script after Phase 1, self-host fonts (D11). Emotion is already removed.

### HSTS preload

Deferred (D8). Preload covers every subdomain and is slow to undo; revisit once the custom domain is live.
