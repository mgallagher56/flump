# E19 A7: closed beta (invite-only sign-up)

Not legal advice. This is the engineering control plus the owner steps.

## Two layers

1. **WorkOS (owner step, preferred).** Public sign-up is exposed by the WorkOS-hosted AuthKit
   page behind `/signUp` (`getSignUpUrl`). Code cannot close it. In the WorkOS dashboard, for
   the production environment, turn off public sign-up / switch to invitation-only (AuthKit
   settings; the exact label may differ, check the live dashboard) and invite friends from
   Users. Also consider removing the "Sign up" link on the marketing site while closed.
2. **Backend allowlist (backstop, built in this PR).** `AuthGuard` refuses any signed-in user
   who is not listed, with `403 {"error":"not_invited"}`. The web app shows an "invite-only"
   page with a sign-out button instead of a broken screen.

## Backend env (Railway, backend service)

| Variable                | Meaning                                                                       |
| ----------------------- | ----------------------------------------------------------------------------- |
| `BETA_ALLOWED_EMAILS`   | comma-separated, case-insensitive. Needs an `email` claim in the access token |
| `BETA_ALLOWED_USER_IDS` | comma-separated WorkOS user ids (`sub`). Works with no email claim            |

- Neither set: nobody is blocked (so deploying cannot lock the owner out first).
- Either set: the API is closed to everyone not listed. **Set your own entry first** and test
  that you can still sign in before inviting anyone.
- The token's `email` claim is unconfirmed (decode a real token, the E20 owner task). If the
  claim is missing, listing by email locks everyone out: use `BETA_ALLOWED_USER_IDS`.
- Scope: this guards the endpoints that use `AuthGuard`. MCP tokens an unlisted user created
  earlier are not covered; all current data is test data, so revoke them by hand if needed.
