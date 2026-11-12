# E1 design: real authentication and authorisation, fail closed

Status: **draft for review.** Nothing in this spec has been implemented. Source: [EPICS.md](../EPICS.md) epic E1 and the findings it lists.

## Purpose and success criteria

Make identity impossible to forge, in every environment, and make cross-user access impossible by construction.

Done when all of these hold:

1. A request with an unsigned, wrongly signed, wrongly issued or expired token is rejected with 401 by the backend. `mock-session-token` and `dev_user_123` do not authenticate unless the explicit dev flag is on.
2. The backend refuses to boot when auth is misconfigured: no `WORKOS_CLIENT_ID` and no dev flag, or the dev flag together with `NODE_ENV=production`.
3. The MCP endpoint accepts only valid, unrevoked, unexpired personal access tokens (PATs).
4. The web app never invents a session. No `mock-session-token` literal remains in `apps/web`.
5. One user cannot read, change or delete another user's accounts, transactions, bank connections, budget, tax records or profile. Tests prove it.
6. The tests that currently assert the bypasses are replaced.

## Decisions already made

| Decision                | Choice                                                               | Reason                                                                                 |
| ----------------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Local dev and test auth | **Explicit dev flag**: `AUTH_DEV_BYPASS=true`, refused in production | Easy local setup; the mobile app, which still sends a mock token, keeps working in dev |
| MCP OAuth JWT path      | **Disabled until the remote MCP server is deployed**; PAT only       | Nothing verifiable exists to test it against; smaller change                           |

## Findings covered

D-01, D-02, D-03, D-04, G-03, B-01, F-01, F-03 (partly), D-06, D-07. D-08 and B-02 (a full validation layer) are in scope as a **separate, later ticket** because they are large and independent.

## Facts from the code that shape the design

- The web app already forwards the WorkOS access token (a JWT from AuthKit) to the backend as `Authorization: Bearer`. It substitutes `mock-session-token` only when `accessToken` is missing (about 15 files) or when `authkitLoader` throws (`apps/web/app/utils/utils.ts`). So real verification on the backend works for correctly signed-in users.
- `apps/backend` already depends on `@workos-inc/node`. The SDK exposes a JWKS URL helper, so no new auth service is needed. A JOSE library such as `jose` is needed for verification (not currently a dependency; add it to the backend).
- `/bank-connections/callback` is skipped by the guard, but **no controller route with that path exists**. It only appears as a `redirectUri` string in `finance.service.ts`, so the bypass protects nothing today and the OAuth connect flow redirects to a missing route (that is E6/I-08, not E1).
- The MCP stdio CLI (`packages/mcp/src/transports/stdio.ts`) builds its own token object and does not use `TokenVerifier`, so tightening the verifier does not affect it.
- Every controller except the MCP routes already uses `@UseGuards(AuthGuard)` and reads `req.user.id`, so scoping depends on the guard being correct. The MCP `/mcp` routes verify inside the handler.

## Design

### Backend: a verifier strategy chosen at boot

`AuthGuard` becomes thin: extract the bearer token, call a `TokenVerifier`, set `request.user = { id, email }`, return true; on any failure throw 401. Two implementations, selected once in the module factory:

- **WorkOsJwtVerifier** (default). Verifies the signature against the WorkOS JWKS for the configured client id, requires `exp`, and checks `iss`. Rejects `alg: none` and any algorithm not in an allow-list. Takes `sub` as the user id. Email comes from the token claim if present, never a default.
- **DevBypassVerifier**. Accepts the literal dev token and returns the fixed dev user. Only constructed when `AUTH_DEV_BYPASS=true`. Logs a loud warning at boot.

Boot validation (fails the process before listening):

- `AUTH_DEV_BYPASS=true` and `NODE_ENV=production` is an error.
- Neither `WORKOS_CLIENT_ID` nor `AUTH_DEV_BYPASS=true` is an error.
- If the dev flag is on, `WORKOS_API_KEY` set to a real value is also an error (prevents a dev flag leaking into an environment that has real credentials).

Removed: the `mock-session-token` branch, the unsigned-JWT decode, the "no `WORKOS_API_KEY` means dev user" fallback, and the `/bank-connections/callback` skip. The catch-all that turned any error into the dev user is deleted; errors become 401.

Open point for implementation, to confirm against WorkOS docs (the `research` skill) before coding: the exact issuer string and JWKS URL for AuthKit access tokens. Tests do not depend on it, because they inject a test JWKS and issuer.

### Backend: cross-user fixes

- **D-06:** `deleteAccount` loads the account by `{ id, userId }` first and returns 404 if it is not the caller's; only then delete its transactions and the account.
- **D-07:** request bodies are never spread into `save()` for `id`, `userId` or `connectionId`. Use an explicit allow-list of fields for create and update paths in `account-intake.service.ts` (the first, narrow fix). The full DTO and `ValidationPipe` layer is the later ticket.

### MCP

- `TokenVerifier.verifyAuthorizationHeader`: remove the mock-token branch; remove the unsigned OAuth path (it now throws "OAuth tokens are not enabled"); a PAT with no token store throws instead of returning `cli_user`.
- Remove `getOAuthProtectedResourceMetadata` from the controller route while OAuth is off, so the endpoint does not advertise an authorisation server that cannot issue accepted tokens. Keep the code, behind the same switch, for the ticket that re-enables OAuth.
- Keep the PAT path as is: hashed, revocable, expiring.
- If dev bypass is on, the backend may pass `allowDevToken: true` into the verifier options for local MCP testing. The default is off.

### Web

- `getAuthSession` stops swallowing errors: the `catch` returns the original error (redirect responses still pass through). No mock session.
- One helper, for example `requireAccessToken(args)`, returns the token or redirects to sign-in. Replace each `accessToken || "mock-session-token"` with it, so the fallback is deleted in one place and not 15.
- Dev behaviour: if `AUTH_DEV_BYPASS=true` and not production, `getAuthSession` returns a dev session and token. Same single place, same flag, same production refusal at web boot.
- The root loader (`root.tsx`) and `useUserProfile.ts` stop referencing the literal.

### Mobile

No change in E1. It sends `mock-session-token`; in dev with the flag on it keeps working. Against anything else it gets 401, which is correct. Its real sign-in belongs to E12.

## Error handling

- Guard failures: 401 with a generic message. Do not distinguish "expired" from "bad signature" in the response body; log the reason server-side without the token.
- Web: 401 from the backend redirects the browser to sign-in; actions return 401 to the caller. This interacts with E5 (loaders hiding errors), which comes after.
- Boot validation errors name the offending variable, never print values.

## Testing (test-first, project `tdd` skill)

Backend guard, using a throwaway key pair and an injected JWKS:

- valid signed token, correct issuer: allowed, `request.user.id` equals `sub`.
- unsigned token, `alg: none`, wrong key, wrong issuer, expired, missing `sub`: all 401.
- `mock-session-token` and a missing token: 401 in the default configuration.
- dev flag on in non-production: dev token allowed.
- boot validation: each of the three invalid configurations throws.

Cross-user (Nest testing module with two users, one repository each):

- user B cannot get, update or delete user A's account, transaction, bank connection, budget entry, tax record or profile (404 or 403, and the row is unchanged).
- `deleteAccount` for another user's id deletes nothing, including transactions.
- create and update ignore `userId` and `id` in the body.

MCP: mock token rejected; OAuth JWT rejected; PAT valid, revoked, expired, unknown, and no-store cases.

Web: `getAuthSession` rethrows a non-response error; a missing token redirects and never produces the literal; the dev session appears only with the flag outside production.

Replace `apps/backend/src/auth/auth.guard.spec.ts` and the relevant parts of `apps/web/app/utils/utils.test.ts`. They currently assert the bypasses.

## Rollout and risk

1. Confirm production has `WORKOS_CLIENT_ID` set and whether real users exist. This was not checkable during the audit.
2. Deploy order: set the backend config first, then deploy backend and web together. A web session that was quietly running on the mock fallback is sent to sign-in after the change; that is expected.
3. Rotate the secrets found in git history (E3, D-12) around the same time. The WorkOS key and JWT secret are a separate task for a person.
4. Rollback is a normal redeploy; do not add a bypass to make rollback easier.

## Out of scope

Full DTO and `ValidationPipe` layer (D-08, B-02, separate ticket in E1), TypeORM and database safety (E3), seeded fake data (E2), error rendering in loaders (E5), the broken bank-connect redirect (E6), mobile sign-in (E12), re-enabling MCP OAuth (its own ticket once deployed).

## Open questions

1. Exact AuthKit issuer and JWKS URL (confirm from WorkOS docs before coding).
   - Finding (Task 1), PARTIALLY CONFIRMED / CONFLICTING. JWKS URL `https://api.workos.com/sso/jwks/<clientId>`: confirmed by https://workos.com/docs/user-management/sessions (summarised fetch) and by `getJwksUrl` (`sso/jwks/${clientId}`) in the installed @workos-inc/node. Issuer: the installed @workos-inc/node README ("Access token issuer validation") gives `https://api.workos.com/user_management/<clientId>`, which is what the code uses; the docs page fetch summary instead said `https://api.workos.com/` (custom auth domain if configured). UNCONFIRMED which is correct for a live token: decode one real AuthKit access token and check `iss` before production rollout. Custom auth domains change the issuer.
2. Does production already run with `WORKOS_CLIENT_ID` configured on the backend?
3. Should the dev bypass user id be configurable, or fixed at `dev_user_123`? This spec assumes fixed.
