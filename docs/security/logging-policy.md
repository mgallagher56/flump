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
