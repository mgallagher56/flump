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

- `apps/web/server/securityHeaders.ts` is the first middleware. It sets the whole `SECURITY_HEADERS` set (imported from `app/security/headers.server.ts`, the single source) plus `frame-ancestors 'none'` on every response. When React Router appends one of those headers itself, the app's value replaces the default instead of being appended next to it (the report-only CSP below is a different header name, so it is simply added once next to the enforced one); a header written through `res.writeHead(status, { ... })` overrides the default too (Node merges that object over `setHeader` values).
- `app.disable("x-powered-by")`.
- `trust proxy` is hard-coded to `1` (Railway terminates TLS one hop in front), so `req.ip`, `req.protocol` and the forwarded host come from the last proxy hop. A `TRUST_PROXY_HOPS` variable for a second hop (for example a CDN in front of Railway at the custom-domain cutover, the HOLD item) is not wired yet; until it is, adding a hop in front of the app means editing `server/app.ts`. A wrong hop count lets a client spoof `X-Forwarded-*`. CSRF origin checks read `x-forwarded-host` and `x-forwarded-proto` directly and do not depend on this setting.
- Request ids (`x-request-id`) are client-suppliable (a UUID, or a strict-charset `x-railway-request-id`). They are for log correlation only, never for authorisation, idempotency or deduplication.
- `source-map-support`, which `react-router-serve` installed, is not carried over. The web build emits no `.map` files (it never mapped anything), so production stack traces are the same as before; Sentry has its own source-map upload path if that is wanted later. Under Bun, stack traces are the bundled `build/server/index.js` positions.
- `Cache-Control` for documents stays with `applyCachePolicy`. Static files keep exactly the values `react-router-serve` used: `/assets` `public, max-age=31536000, immutable`, everything else in `public/` and `build/client` the `express.static` defaults and a 1 hour `max-age` for `public/`. The `compression` middleware is unchanged.
- Shutdown: SIGTERM and SIGINT stop accepting connections, let in-flight requests finish and exit 0; a drain that exceeds 14 seconds is forced to exit 1 (Railway drains for 15 seconds, `apps/web/railway.json`).
- The access log is described in `docs/security/logging-policy.md`.

`.data` responses are still also covered through `handleDataRequest` in `entry.server.tsx`. Tests: unit tests in `apps/web/server/*.test.ts`, and `apps/web/server/server.integration.test.ts`, which spawns the built server and checks the headers on every response kind (CI: the E2E smoke job runs `bun run --cwd apps/web test:server` after the build). Rollback: redeploy the previous deployment, or restore the previous start command (`react-router-serve ./build/server/index.js`) in `apps/web/Dockerfile` (`CMD`) and `apps/web/package.json` (`start`); `@react-router/serve` stays installed for one release.

`Cross-Origin-Resource-Policy: same-origin` is sent with the other headers: nothing cross-origin embeds the app's documents (the marketing site only links to it; Sentry and WorkOS are outbound).

ZAP baseline (`.zap/rules.tsv`): rule 90004 is ignored only for the missing COEP, which would block third-party resources for no isolation benefit we use; the web app sends COOP and CORP. The marketing site does not send COOP or CORP yet, which the ignore also hides for that target. Rule 10049 (storable and cacheable content) stays at the default WARN: the cache policy above is the real control, and a remaining finding points at a response worth checking (static assets are expected to be cacheable). The CSP wildcard finding (10055) stays visible and is not ignored: `.zap/rules.tsv` has no row for it on purpose. In the report-only policy the wildcard is `img-src ... https:` (any HTTPS image host, kept for avatars and receipt previews); ZAP may also flag `style-src 'unsafe-inline'`. Both are deliberate for now and are revisited when the policy is enforced (E20-N12).

## Web CSP, report-only (E20-N11, implemented)

The web app sends a SECOND header, `Content-Security-Policy-Report-Only`, on every HTML document response, next to the unchanged enforced `Content-Security-Policy: frame-ancestors 'none'`. It enforces nothing: browsers only POST violations to `/csp-report`. The code is `apps/web/app/security/csp.server.ts` (policy builder, nonce generator) and the root middleware (`middleware.server.ts`), which sets it only on `text/html` responses (not `.data`, resource routes, static files, or the CSRF 403).

| Directive         | Value                                                                                                                                                                                                                                                          |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `default-src`     | `'self'`                                                                                                                                                                                                                                                       |
| `script-src`      | `'self' 'nonce-<N>'` (per-request 128-bit nonce, no `'unsafe-inline'`, no `'unsafe-eval'`)                                                                                                                                                                     |
| `style-src`       | `'self' 'unsafe-inline'` (inline styles in `root.tsx` and components; Radix injects style elements)                                                                                                                                                            |
| `img-src`         | `'self' data: blob: https:` (the `https:` is the ZAP 10055 wildcard)                                                                                                                                                                                           |
| `font-src`        | `'self'` (fonts are self-hosted, D11)                                                                                                                                                                                                                          |
| `connect-src`     | `'self' https://*.ingest.de.sentry.io` (the Sentry EU ingest used by `entry.client.tsx`)                                                                                                                                                                       |
| `form-action`     | `'self'` plus the exact WorkOS origin (`https://api.workos.com`, or `https://$WORKOS_API_HOSTNAME`) and the marketing origin (`getMarketingUrl`, so `VITE_MARKETING_URL`); the logout form posts to `/logout`, which redirects to WorkOS and then to marketing |
| `frame-ancestors` | `'none'`                                                                                                                                                                                                                                                       |
| `object-src`      | `'none'`                                                                                                                                                                                                                                                       |
| `base-uri`        | `'none'`                                                                                                                                                                                                                                                       |
| `report-uri`      | `/csp-report`                                                                                                                                                                                                                                                  |

Nonce flow: the root middleware generates the nonce (`crypto.randomBytes(16)`, base64url) and stores it in the router context (`nonceContext`); `entry.server.tsx` reads it from `loadContext`, wraps the render in `NonceProvider` (`app/security/nonce.tsx`) and passes it to `renderToPipeableStream` and `<ServerRouter nonce>`. `root.tsx` puts it on the `window.ENV` script, the theme-init script, `ScrollRestoration` and `Scripts`, in both the app and the root `ErrorBoundary`. Hydration: browsers hide a `nonce` attribute's value after parsing, so the client has no provider and renders `nonce=""`, which matches the DOM it hydrates (the standard Remix/React Router pattern). Any new inline `<script>` must use `useNonce()`; the SSR test `entry.server.nonce.test.tsx` fails if a script in the root document has no nonce.

`/csp-report` (`app/routes/csp-report.ts`, logic in `app/security/csp-report.server.ts`): accepts POST bodies of type `application/csp-report`, `application/reports+json` and any other JSON; no session needed. Always 204 (invalid JSON, wrong shape and rate-limited requests included), except 413 for a body over 8 kB. In-memory limit of 60 reports per minute per client, keyed by the last `X-Forwarded-For` entry (the one the single trusted Railway hop appended; same trust model as `trust proxy` 1), resetting on deploy. It logs one JSON line per report with only the directive name, the blocked origin (scheme and host, or a keyword such as `inline`) and the document path without query or fragment, with opaque path segments collapsed to `:id`, all through `redactString`. The raw report, `script-sample`, `original-policy` and every query value are never logged. It is not exempt from the E20-N1 same-origin check: browsers send CSP report POSTs with `Origin` and `Sec-Fetch-Site: same-origin` for a same-origin `report-uri`, so a real report passes, and a cross-site POST gets the 403 like any other write.

Reading reports: filter Railway logs on `"context":"CspReport"`.

### E20-N12 enforce plan (not part of N11)

After at least 14 days with zero unexplained reports (ideally on staging first): `CSP_ENFORCE=true` makes `FULL_CSP_HEADER_NAME` in `csp.server.ts` resolve to `Content-Security-Policy` (adding `upgrade-insecure-requests`) instead of the report-only name; a stricter policy can stay report-only. That constant is the only place the header name lives, so N12 is one env flag plus tests. Rollback is unsetting the variable. Manual journey before enabling: sign-in, budget add, tax add with receipt, profile, with the browser console showing no CSP violations.

## Planned (Tier B, not in this PR)

### Web (`apps/web`, Q7 and C1 to C5)

Done: the Phase 0 header set (HSTS, `X-Frame-Options`, enforced `frame-ancestors 'none'`, nosniff, Referrer-Policy, Permissions-Policy, COOP, no COEP), the CSRF Origin check, and the nonce plumbing plus report-only CSP with `/csp-report` (above). Still planned:

1. Enforcement after the soak (E20-N12, above).
2. Sentry (E18-N3): `connect-src` allows the Sentry EU ingest origin (`https://*.ingest.de.sentry.io`), or browser reports are blocked. `entry.client.tsx` wraps the lazy Sentry start in try/catch so error reporting can never stop hydration; this also hides a CSP failure, so check the browser console for blocked `connect-src` requests when verifying the CSP.
3. Prerequisites: remove the `window.ENV` script after Phase 1, self-host fonts (D11, done). Emotion is already removed.

### HSTS preload

Deferred (D8). Preload covers every subdomain and is slow to undo; revisit once the custom domain is live.
