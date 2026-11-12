# Flump threat model (condensed)

Source: section 2 of `docs/audit/plans/E20-plan-draft.md`. This is a living summary; the plan holds the evidence references.

## Assets

| Asset                                                  | Location                                             | Notes                                                                       |
| ------------------------------------------------------ | ---------------------------------------------------- | --------------------------------------------------------------------------- |
| `wos-session` sealed cookie (access and refresh token) | Browser cookie, sealed with `WORKOS_COOKIE_PASSWORD` | HttpOnly, `SameSite=Lax`, `Secure` only when `WORKOS_REDIRECT_URI` is https |
| WorkOS access token (JWT)                              | Web server, and browser loader data today            | Removal from the browser is planned (Phase 1)                               |
| MCP personal access tokens                             | SHA-256 hash in `mcp_tokens`; raw value shown once   | 128-bit random                                                              |
| Bank provider tokens                                   | AES-256-GCM in `bank_connections`                    | No key id, so the key cannot yet be rotated                                 |
| Secrets                                                | Railway environment                                  | Rotation (D-12) still open                                                  |
| Financial data and PII                                 | Postgres                                             | Receipts are stored as base64 text and may contain addresses and EXIF GPS   |
| Onboarding seed (salary)                               | Non-HttpOnly cookie (host-only) and localStorage     |                                                                             |
| Calculation integrity and agent context                | Postgres, MCP outputs                                | Prompt-injection target                                                     |

## Actors

- A1 anonymous internet attacker
- A2 authenticated malicious tenant
- A3 XSS attacker (stored data or compromised dependency)
- A4 same-site attacker on any `sibling` host (and possibly other `*.up.railway.app` apps if that suffix is not on the Public Suffix List; to verify)
- A5 compromised or prompt-injected AI client holding a PAT
- A6 hostile third-party data source (for example bank merchant descriptions)
- A7 compromised dependency, CI action or container image
- A8 operator or insider with Railway access

## Trust boundaries

| ID   | Between                       | Credential                                  |
| ---- | ----------------------------- | ------------------------------------------- |
| TB1  | browser and web SSR           | cookie                                      |
| TB2  | browser and backend directly  | bearer plus CORS (to be removed in Phase 1) |
| TB3  | web server and backend        | bearer, server to server                    |
| TB4  | backend and Postgres          | TLS                                         |
| TB5  | backend and WorkOS API        | API key                                     |
| TB6  | backend and bank providers    | user tokens, fixed hosts                    |
| TB7  | AI client and `/mcp`          | PAT                                         |
| TB8  | tool output and LLM context   | stored third-party text                     |
| TB9  | CI and GitHub/Railway secrets |                                             |
| TB10 | marketing and web             | shared parent-domain cookies                |

## Principal risks and mitigation tasks

| Component           | Main risk                                                                                 | Task                           |
| ------------------- | ----------------------------------------------------------------------------------------- | ------------------------------ |
| Web SSR and session | CSRF from same-site origins, `GET /logout`, token readable by any script                  | Q1, Q2, Q7, Q15, Phase 1 and 2 |
| Backend REST        | Bearer replay until `exp`, mass assignment, error text echoed                             | Q4 to Q6, Phases 3 and 4       |
| Authorisation       | Cross-user reads and writes unproven by integration tests                                 | Phase 6                        |
| MCP                 | PAT theft, unlimited pre-auth guessing, leaked error text, unenforced scopes              | Q10 (this PR), Q11, Phase 7    |
| Receipts and avatar | Polyglot or oversize upload, `href={dataURL}` sink                                        | Q9, Phase 5                    |
| Auth (WorkOS)       | Issuer not pinned, no audience or client binding                                          | Q5, Q12                        |
| Bank connections    | Forgeable OAuth `state` (flow currently dead), raw provider errors                        | L2, E16                        |
| Marketing           | `e.stack` in 500 bodies, `script-src https:` negating the nonce, per-request env mutation | Q8 (this PR)                   |
| Supply chain        | Compromised action or dependency, secret in git history                                   | E18, T2 to T4                  |

## Worst current chain (AC1)

XSS, then theft of the access token from loader data, then takeover until the token expires. Phase 1 removes the token from the browser and Q7 introduces the CSP that limits XSS.
