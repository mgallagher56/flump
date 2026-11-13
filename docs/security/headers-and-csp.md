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

## Planned (Tier B, not in this PR)

### Web (`apps/web`, Q7 and C1 to C5)

The web app currently sends no security headers from `entry.server.tsx`. Planned:

1. Phase 0 header set on document and `.data` responses: HSTS, `X-Frame-Options`, enforced `frame-ancestors 'none'`, nosniff, Referrer-Policy, Permissions-Policy, `Cross-Origin-Opener-Policy: same-origin`. No COEP.
2. CSRF Origin check on non-GET requests.
3. Nonce plumbing, then a report-only CSP with a `/csp-report` endpoint, at least 14 days of soak, then enforcement.
4. Sentry (E18-N3): the E20-N11 `connect-src` must allow the Sentry EU ingest origin (`https://*.ingest.de.sentry.io`), or browser reports are blocked. `entry.client.tsx` wraps the lazy Sentry start in try/catch so error reporting can never stop hydration; this also hides a CSP failure, so check the browser console for blocked `connect-src` requests when verifying the CSP.
5. Prerequisites: remove Emotion, remove the `window.ENV` script after Phase 1, self-host fonts (D11).

### HSTS preload

Deferred (D8). Preload covers every subdomain and is slow to undo; revisit once the custom domain is live.
