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

Set `CORS_ALLOWED_ORIGINS` on the backend (comma-separated exact origins, for example the web app origin) before deploying. Do this first; the backend validates it at boot.

## 4. Replace the security contact

`apps/marketing/public/.well-known/security.txt` and `apps/marketing/src/utils/placeholders.ts` use `security@example.invalid`. Replace both with a monitored address, and refresh the `Expires` date at least yearly.

## 5. Q12: pin the WorkOS issuer (deferred)

1. Obtain one real access token from staging or production and decode it locally (for example `jwt.io` is not acceptable for production tokens; decode offline). Never paste the token anywhere.
2. Record the `iss` value and the claim names.
3. Set `WORKOS_ISSUER` on the backend and the web app, staging first. A wrong value makes every login return 401.
4. The implementer then makes backend boot require `WORKOS_ISSUER` in production.
