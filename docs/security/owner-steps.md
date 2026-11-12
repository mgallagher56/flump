# Owner steps (manual, outside the code)

Things only the owner can do. Complete them before the first production deploy unless marked deferred.

## 1. WorkOS dashboard: session lifetime (decision D3-B)

In the WorkOS dashboard, session settings:

- Absolute session lifetime: 14 days.
- Inactivity timeout: 24 hours.
- Optionally enable TOTP as an MFA factor.

## 2. Confirm the redirect URI

- Confirm `/callback` is the registered redirect URI in the WorkOS dashboard (for each environment).
- Once confirmed, the duplicate `/auth/callback` route can be removed.
- Set `WORKOS_REDIRECT_URI` to an https URL in production (the session cookie is only `Secure` when it is https).

## 3. Backend CORS before deploy

Set `CORS_ALLOWED_ORIGINS` on the backend (comma-separated exact origins, for example the web app origin) before deploying. Do this first. If it is unset in production the backend no longer crashes: it logs a loud `console.error` and allows no cross-origin origins, so browser-side calls to the backend fail (degrade) until it is set. Malformed entries still fail boot.

## 4. Replace the security contact

No security contact is published yet. When a monitored mailbox exists, set `SECURITY_CONTACT` on the marketing service (this enables `/.well-known/security.txt`; `Expires` is generated automatically) and update the disclosure copy on the security page.

## 5. Q12: pin the WorkOS issuer (deferred)

1. Obtain one real access token from staging or production and decode it locally (for example `jwt.io` is not acceptable for production tokens; decode offline). Never paste the token anywhere.
2. Record the `iss` value and the claim names.
3. Set `WORKOS_ISSUER` on the backend and the web app, staging first. A wrong value makes every login return 401.
4. The implementer then makes backend boot require `WORKOS_ISSUER` in production.

## Backend proxy trust

The backend trusts one proxy hop (`trust proxy` = 1) by default when `RAILWAY_ENVIRONMENT` is set or `NODE_ENV=production`, matching Railway's single edge proxy, so `req.ip` is the real client address (used by the MCP failed-auth limiter). `TRUST_PROXY_HOPS` overrides the default (for example Cloudflare in front adds a hop; `0` disables trust). The MCP web handler keys on the rightmost `x-forwarded-for` entry, which is only trustworthy behind Railway's edge; do not expose the service by any other route. The failed-auth limiter keys IPv6 by /64 prefix, treats `::ffff:a.b.c.d` as IPv4, and clears an IP's failures after a successful authentication.

## Password reset email (verify by triggering)

`@workos-inc/node` 12.2.0 only offers `userManagement.createPasswordReset({ email })`; there is no send-email call. WorkOS documents it as creating a one-time token and `password_reset_url`. The docs are not explicit that WorkOS also emails the user. Before relying on the in-app reset, trigger one in the real environment and confirm the email arrives. If it does not, the returned URL must be sent by our own mailer. The endpoint now returns 503 on any failure (including an unresolvable email) rather than a false success.
