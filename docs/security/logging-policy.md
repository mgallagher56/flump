# Logging policy (stub)

Status: stub. To be completed with the Phase 3 audit-logging work.

Rules that already apply:

- Never log secrets, tokens (access, refresh, PAT), cookies, `Authorization` headers or password fields.
- Never return stack traces or upstream error text to clients. Log them server-side and return a generic message (marketing 500s and MCP non-auth errors do this).
- Log financial amounts and personal data only where there is a documented need; prefer identifiers.
- CSP reports (planned) log only the directive, blocked-URI origin and document path.

To be defined:

- Security event log (login, logout, password change, PAT create and revoke, authorisation failures).
- Retention and access to Railway logs.
- Redaction helper and where it is enforced.

## Error reporting

The backend reports 5xx responses and uncaught exceptions to Sentry (EU) only when `SENTRY_DSN` is set. Exception messages are never sent: `beforeSend` in `apps/backend/src/observability/sentry.ts` replaces every `exception.value` (linked causes included) and the event `message` and `logentry` with `[message withheld]`, because provider and database errors embed response bodies and row data. The exception type and the scrubbed stack frames are kept; only the fixed `sentry self-test` message passes through. The shared scrubber in `@flump/observability` is unchanged. Web error reporting decides its own policy separately. Sentry also leaves Node's crash-on-unhandled-rejection behaviour in place (`strict` mode).

## Access logs

The backend logs one structured JSON line per request (`LOG_FORMAT=json`, or `NODE_ENV=production`): `requestId`, `method`, `route`, `status` and `durationMs`. `route` is the route template (`/accounts/:id`, or `unmatched` for 404s and middleware rejections), never the URL. The line never carries the path parameters, query string, headers (including `Authorization` and `Cookie`) or body. Every response carries an `x-request-id` header: a client-supplied value is kept only if it is a UUID, otherwise the server generates one, and the Sentry exception filter tags events with the same id. The code is `apps/backend/src/observability/request-context.middleware.ts`.

The web app's access log is the morgan log that `react-router-serve` writes, which includes the request path and query string. For the beta this is accepted (decision OD-4), on the condition that no web route reads a secret from a query string. A custom `@react-router/express` server with a route-template access log replaces it at the domain cutover, or earlier if logs leave Railway or a query string starts carrying secrets.

Planned guard (not built yet): a test that lists the `searchParams.get` keys allowed in web routes and fails when a route reads any other key, so a new query-string parameter has to be reviewed against this policy.
