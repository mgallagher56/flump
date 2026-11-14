# API versioning and deprecation

This is the policy for the Flump backend's HTTP API. The contract lives in `packages/api-contract`, and `packages/api-contract/openapi.json` is generated from it.

## The stable surface

- `/v1/...` is the stable surface. New clients call `/v1` only.
- The same routes without the `/v1` prefix are deprecated aliases. They keep working until the web app and the MCP client have moved to `/v1` (BE-10). After that they are removed, with notice first.
- Two unversioned paths are not deprecated: the health probes (`/health`, `/health/ready`) and the MCP endpoint (`/mcp`), because infrastructure and AI clients are configured with them.

## What may change within v1

Only additive changes:

- a new route, or a new optional request field;
- a new response field (clients must ignore fields they do not know);
- a new error `code` (clients treat an unknown code like the generic one for its HTTP status).

Anything else is a breaking change: removing or renaming a route, a response field or an enum value; changing a field's type; making a request field required or adding a required one; narrowing what a request field accepts. Breaking changes go to `/v2`, and `/v1` keeps being served for at least 3 months after `/v2` ships.

`scripts/backend-laws/check-openapi-breaking.ts` (part of `bun run check:laws`) regenerates the document and compares it twice. Against the working-tree `openapi.json` any difference fails, so the committed file stays up to date: run `bun run --cwd packages/api-contract openapi:write` and commit it. Against `openapi.json` at the merge base with `main` every breaking change fails unless it is listed in `packages/api-contract/openapi-breaking-allowlist.json` as `{ "kind", "where", "reason" }` (matched exactly on `kind` and `where`). An entry that matches nothing only warns, so the list can be emptied in a later PR. The base comparison needs git history: CI checks out the lint job with `fetch-depth: 0`, and a checkout with no merge base fails rather than skipping. Say in the PR why any allow-listed change is acceptable.

### One-off pre-BE-10 exception

BE-09 makes deliberate breaking changes inside `/v1`, before any external client exists and while the web client is the only consumer (BE-10 moves it onto the new conventions). Each one is in the allow-list with its reason:

- `userId` and `externalAccountId` removed from account responses (audit L3);
- create POSTs answer 201 instead of 200, and action POSTs keep 200 instead of Nest's default 201 (audit M-API5); the web client accepts any 2xx;
- request bodies are strict, so unknown keys are a 400 instead of being dropped (audit M-API2); the web payload contract tests cover every web call.

Once BE-09 is merged these entries match nothing (the base then has the new shape) and warn; clear the list in a later PR. This is not a precedent: after BE-10, breaking changes go to `/v2` or through the deprecation policy.

## Deprecation signals

A deprecated route or alias:

- answers with a `Deprecation: true` header and a `Link: </v1/...>; rel="successor-version"` header naming its replacement;
- gets a `Sunset` header (an HTTP date) once a removal date is announced. No date is set yet (`UNVERSIONED_SUNSET` in `apps/backend/src/config/v1-alias.middleware.ts`);
- is marked `deprecated: true` in `openapi.json` when it is a route alias (`aliasOf` in the manifest).

Requests on `/v1` paths that are not aliases carry no deprecation headers.

## Money

Money is a JSON number in pounds, never a string or pence (decision D9). Request amounts have at most 2 decimal places. Every money field in `openapi.json` says so in its description.

## Errors

Every error response has the same body:

```json
{
  "code": "validation_failed",
  "message": "Request failed validation",
  "issues": [],
  "requestId": "..."
}
```

`code` is stable lowercase snake case (`validation_failed`, `invalid_json`, `unauthorized`, `forbidden`, `not_found`, `conflict`, `precondition_failed`, `idempotency_key_reused`, `payload_too_large`, `rate_limited`, `internal_error` and a few feature codes). `issues` is present only for `validation_failed`. `requestId` matches the `x-request-id` response header. Unexpected failures are a 500 with a generic message and no internal detail.

## Pagination

Every list route takes `?limit=` and `?cursor=` (BE-09). The body stays a JSON array, so existing clients keep working; when another page follows, its cursor is in the `X-Next-Cursor` response header, which is absent on the last page. Pass the cursor back unchanged: it is opaque, and a forged or malformed one is a 400 `validation_failed`. Page sizes live in `PAGE_LIMITS` in `packages/api-contract/src/pagination.ts`: small per-user lists default to their maximum of 500, so a client that does not page yet still gets every row; account values (`/account-details`, every account's monthly history) default to and cap at 5,000 and tax records at 2,000, because the web client reads them whole; transactions and token activity default to 100, maximum 500. Until BE-10 the web client ignores `X-Next-Cursor`; BE-10 must follow it. Timestamp keys in the cursor keep Postgres's full microsecond precision, so rows in the same millisecond still page in order. A contract test fails if a GET route returning an array has no `limit`.

## Safe retries and concurrent edits

- `Idempotency-Key` (optional, 1 to 255 printable ASCII characters) on create POSTs, except `imports.stage` (its key is in the body), `mcpTokens.create` (the plaintext token is never stored to replay) and `bankConnections.connect` (its body carries a bank token or code, whose hash is never stored). A repeat with the same key and body within 24 hours returns the first status, body and `ETag` / `Location` headers (when the create set them) with `Idempotent-Replayed: true` and creates nothing; the same key with a different body is a 422 `idempotency_key_reused`; a repeat while the first is still running is a 409 `conflict`. Keys are per user and route. Expired rows are ignored, and each new claim deletes that user's expired rows; a financial data reset deletes all of them. A sweep for users who never return is left to the BE-06 retention job, and account deletion (BE-04) must delete them by `user_id` (there is no users table to cascade from).
- `If-Match` (optional) on updates of accounts (`PATCH` and `PUT`), budget entries, tax records and the profile. Send the `ETag` header from the GET-one or the previous update (`"<updatedAt ISO string>"`). If the resource has changed since, nothing is written and the answer is a 412 `precondition_failed`. The ETag has millisecond precision (Postgres keeps microseconds; the comparison truncates the stored value to milliseconds, in UTC), so two writes to one resource within the same millisecond share a version. Without the header an update behaves as before; clients opt in with BE-10.

## Deprecated routes, removal after BE-10

These keep working until the clients move (BE-10). The aliases answer with `Deprecation` and `Link` headers (`aliasOf` in the manifest); the oddly named routes have no replacement yet and are listed so the next version can fix them.

| Route                                     | Replacement                                     |
| ----------------------------------------- | ----------------------------------------------- |
| `PUT /accounts/:id`                       | `PATCH /accounts/:id` (alias)                   |
| `POST /bank-connections/:id/sync`         | `POST /bank-connections/:id/refresh` (alias)    |
| `GET /account-details`                    | `GET /accounts/details` (planned)               |
| `POST /user-profile/send-password-reset`  | `POST /user-profile/password-reset` (planned)   |
| `POST /user-profile/reset-financial-data` | `DELETE /user-profile/financial-data` (planned) |
| `POST /budget-entries/categories`         | `POST /budget-categories` (planned)             |
| `GET /mcp-tokens/context-pack`            | `GET /context-pack` (planned)                   |

## Change log

- BE-09: `userId` and `externalAccountId` removed from account responses (audit L3). A breaking change made within v1 on purpose: removed before any external client; internal clients updated. Account responses gained `updatedAt` (the ETag).
