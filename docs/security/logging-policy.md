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
