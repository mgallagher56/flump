# Logging policy (stub)

Status: stub. To be completed with the Phase 3 audit-logging work.

Rules that already apply:

- Never log secrets, tokens (access, refresh, PAT), cookies, `Authorization` headers or password fields.
- Never return stack traces or upstream error text to clients. Log them server-side and return a generic message (marketing 500s and MCP non-auth errors do this).
- Log financial amounts and personal data only where there is a documented need; prefer identifiers.
- CSP reports (`/csp-report`, implemented in E20-N11, see `docs/security/headers-and-csp.md`) log only the directive, the blocked origin (scheme and host) and the document path without query or fragment, one JSON line with `"context":"CspReport"`; never the raw report, a full URL or any query value.

To be defined:

- Security event log (login, logout, password change, PAT create and revoke, authorisation failures).
- Retention and access to Railway logs.
- Redaction helper and where it is enforced.

## Error reporting

The backend reports 5xx responses and uncaught exceptions to Sentry (EU) only when `SENTRY_DSN` is set. Exception messages are never sent: `beforeSend` in `apps/backend/src/observability/sentry.ts` replaces every `exception.value` (linked causes included) and the event `message` and `logentry` with `[message withheld]`, because provider and database errors embed response bodies and row data. The exception type and the scrubbed stack frames are kept; only the fixed `sentry self-test` message passes through. The shared scrubber in `@flump/observability` is unchanged. Web error reporting decides its own policy separately. Sentry also leaves Node's crash-on-unhandled-rejection behaviour in place (`strict` mode).

Sentry SDK v11 removed `sendDefaultPii` and made every automatic data category opt-out, so all Sentry clients (backend, web server, web client) pass `dataCollection: PRIVATE_DATA_COLLECTION` from `@flump/observability`: no user or IP data, cookies, HTTP headers, HTTP bodies, URL query strings, GraphQL, AI or MCP content, database query data, queue arguments or local variables. Tracing stays off (`tracesSampleRate: 0`, `traceLifecycle: 'static'` so `beforeSendTransaction` still applies), the module-loader channel injection is disabled, and only an explicit integration allow-list is installed (`defaultIntegrations: false`). `assertSafeOptions` enforces this contract in the Sentry init tests and still rejects a v10-style `sendDefaultPii: true`. The Bun envelope test also asserts that v11-era host, device, locale and module keys never reach an envelope.

The Sentry logs, metrics and span APIs (`Sentry.logger`, `metrics`, `startSpan`) and `setUser`, `setContext`, `setTag` and `setExtra` must not be called anywhere: there is no `beforeSendLog` hook, so logs and metrics would bypass `beforeSend`. `scripts/ops/sentry-sources.test.ts` fails if any source under `apps/` or `packages/` uses them. `frameContextLines` is 0, so no source lines are attached to stack frames.

## Access logs

The backend logs one structured JSON line per request (`LOG_FORMAT=json`, or `NODE_ENV=production`): `requestId`, `method`, `route`, `status` and `durationMs`. `route` is the route template (`/accounts/:id`, or `unmatched` for 404s and middleware rejections), never the URL. The line never carries the path parameters, query string, headers (including `Authorization` and `Cookie`) or body. Every response carries an `x-request-id` header: a client-supplied value is kept only if it is a UUID, otherwise the server generates one, and the Sentry exception filter tags events with the same id. The code is `apps/backend/src/observability/request-context.middleware.ts`.

In JSON mode Nest nests the logged object under `message`, so a line looks like `{"level":"log","pid":1,"timestamp":...,"message":{"requestId":"...","method":"GET","route":"/accounts/:id","status":200,"durationMs":3.2},"context":"HttpAccess"}`. In Railway, filter on `@message.requestId` or `@message.route`, not `@requestId`. A request whose client disconnected before the response finished is logged once with `"aborted":true`. Successful `/health*` probes are not logged (they would dominate the volume); failing probes are.

Format selection: JSON when `NODE_ENV=production` or `LOG_FORMAT=json`; values are trimmed and case-insensitive. `LOG_FORMAT=text` forces Nest's text format even in production (for local debugging); any other `LOG_FORMAT` value falls back to the `NODE_ENV` rule.

`x-request-id` is for correlation only. It is never used for authorisation, idempotency or deduplication, and a client can only choose a UUID.

## Scrubbed stdout

Everything the backend prints through Nest's logger goes through `ScrubbingConsoleLogger` (`apps/backend/src/observability/scrubbing-console-logger.ts`), which `createAppLogger` returns in both JSON and text modes. It overrides `printMessages` and `printStackTrace` (the seams every Nest log path ends in, including `ExceptionsHandler`, provider `Logger.*` calls and Errors passed as messages) and the public `log`/`error`/`warn`/`debug`/`verbose`/`fatal` methods, because Nest parses arguments before it reaches `printMessages`. Strings go through `redactString`, objects through `redactDeep`, and Errors are copied with a scrubbed message, stack, own primitive fields, `cause` and `AggregateError` members. The log level, context (when it is a plain class name), timestamp, pid and error class name pass through.

Stacks are rebuilt line by line. Every line that is not a frame is fully redacted and the message lines are joined onto one line with escaped line breaks. A line starting with `at ` is kept only if it is a trusted frame: the strict shape `at [async] [new] name [[as alias]] (location)`, a real location (an absolute, `~`, `file://`, `node:`, `[eval]` or drive path with `:line:column`, or `native`, `<anonymous>`, `index N`), and name and path segments that the scrubber leaves unchanged. Anything else becomes `at [redacted]`. Frames keep function, file and `line:column`; `?query` and `#hash` are dropped from paths and home-directory prefixes (`/Users`, `/home`, `C:\Users`, any case) become `~`. A forged frame whose function name is a plain identifier (for example `at jdoe (/a.js:1:1)`) cannot be told from a real one and is kept. Stacks are capped at 16 KiB and 200 lines and strings at 8192 characters before any regex runs. In text mode, line breaks and control characters (including ANSI escapes and U+2028/U+2029) in messages, contexts and stacks are escaped as visible text so a message cannot forge a log line; JSON mode serialises them safely. With no stack, `error()` prints nothing extra, like the stock logger.

The access-log pass-through (UUID `requestId`, `method`, route template, `status`, `durationMs`, `aborted`) applies only to an object with exactly that key set whose every field has its strict shape (a route starts with `/` and has segments of at most 31 characters, or is `unmatched`). Any other object goes through `redactDeep`. Own Error fields `code`, `statusCode`, `status`, `errno` and `severity` are printed when they are SQLSTATE or errno-like names, small integers or upper-case severities; every other own field is redacted.

The scrubber fails closed. If sanitising or printing throws (a throwing getter, a Proxy, a hostile `toString`), the logger prints the fixed line `[log scrubbing failed]` with the level and, only if it is a plain class name, the context. It never prints the raw input and never throws into the caller, so `Logger.error` in a catch block cannot mask the original error.

`redactString` also removes free-text credentials: `key=value`, `key: value` and `"key":"value"` pairs for password, secret, token, api key, `auth`, cookie, session and similar keys (including backslash-escaped JSON and URL-encoded `%3D`, `%3A`, `%22` separators); `Bearer` and `Basic` credentials; `Cookie:` and `Set-Cookie:` header text; JWTs; and `scheme://user:pass@host` userinfo. Unquoted values after password, passwd, pwd and secret run to the end of the line or the next `&`, `,` or `;` (so they may contain spaces). All quantifiers in these patterns are bounded and the input is length-capped first, but the pre-existing patterns are only timing-tested, not proven linear. The module avoids regex lookbehind so it parses in older Safari. The raw `console.error` and `console.warn` calls in `finance.service.ts`, `user-profile.service.ts` and `identity.adapter.ts` now use a Nest `Logger`.

Known gaps:

- Scrubbing is pattern-based. A secret with no key name and no recognised shape and under 32 characters in free text is not detected, and a word-like value in a non-sensitive key (for example a short token in a field called `route` outside the access-log shape) is printed. Providers must still avoid putting credentials in error messages.
- Keys that only partly match (`tokenizer`, `author`) are intentionally left alone, so a credential under an unusual key name is not caught.
- Output that bypasses Nest's logger (a direct `console.*` call, a library writing to stdout, Node's uncaught exception printer) is not scrubbed. `cors.config.ts` still prints one static boot-time `console.error` that contains no request data.
- A frame line whose path contains spaces is treated as text and fully redacted, so it loses its path.

### Web access log (implemented)

The web app runs on a custom Express server (`apps/web/server.ts`, see `docs/security/headers-and-csp.md`) whose access log replaces the `morgan("tiny")` line of `react-router-serve`, which printed raw URLs including the query string. This supersedes the earlier OD-4 A acceptance of that log (`docs/audit/plans/E18-no-owner-plan.md`); the reversal is recorded in round 7 of `docs/audit/plans/DECISIONS.md`.

One line per response: `requestId`, `method`, `route`, `status` and `durationMs` (`aborted: true` when the client left early). JSON when `NODE_ENV=production` (`{"level":"info","context":"HttpAccess",...}`), plain text otherwise (`GET /debts/:id 200 4.2ms <id>`). `route` is the request path without the query string or fragment, with dynamic-looking segments (UUIDs, digits, long hex or token-like strings) collapsed to `:id`; React Router's route template is not available at the Express layer. The method and route also pass through `redactString` from `@flump/observability` as defence in depth. Absolute-form request targets (`GET http://user:pass@host/x`) lose scheme and authority first. Long slugs log as `:id` by design: any segment of 20 or more characters of `[A-Za-z0-9_-]` collapses (so `/tools/mortgage-overpay-vs-isa` logs as `/tools/:id`), because a passphrase-style segment such as `correct-horse-battery-staple` cannot be told apart from a slug. Short static route names (`/app/budget`, `/tools/mortgage`, `/login`, `/callback`) are kept. Never logged: the query string, headers, cookies, body or client IP. `req.ip` is never used for access control and never logged. Successful `/healthz` probes and successful `/assets/*` requests are not logged; failures are.

Request id: a UUID `x-request-id` from the client is kept, otherwise a strict-charset (`[A-Za-z0-9_-]{8,64}`) `x-railway-request-id`, otherwise a fresh UUID. It is echoed as the `x-request-id` response header. It is for correlation only, never for authorisation.

Code and tests: `apps/web/server/accessLog.ts`, `accessLog.test.ts` (query values never appear; invalid ids are replaced) and `server.integration.test.ts` (the real server's log line for `/callback?code=...&state=...`).

Planned guard (not built yet): a test that lists the `searchParams.get` keys allowed in web routes and fails when a route reads any other key, so a new query-string parameter has to be reviewed against this policy.
