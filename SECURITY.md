# Security Policy

## Supported Versions

Only the current deployment from the `main` branch receives security updates.

| Version                   | Supported |
| ------------------------- | --------- |
| `main` (current release)  | Yes       |
| Older commits or branches | No        |

## Reporting a Vulnerability

Please **do not** open a public GitHub issue or pull request for an undisclosed security vulnerability.

Report vulnerabilities privately through either of the following channels:

1. **GitHub Private Vulnerability Reporting (preferred):**
   <https://github.com/mgallagher56/flump/security/advisories/new>
2. **RFC 9116 `security.txt`:**
   See `/.well-known/security.txt` on the web or marketing application for the active contact URI and policy reference.

### What to include

- A clear description of the issue and its potential impact.
- Affected route, endpoint, MCP tool, or package.
- Minimal step-by-step instructions or proof-of-concept request to reproduce the issue.

### Disclosure guidelines

- Give us reasonable time to investigate and remediate the issue before any public disclosure.
- Do not access, modify, or exfiltrate other people's data.
- Do not degrade the availability of the service (no denial-of-service or automated high-volume scanning against production).
- We do not operate a paid bug bounty programme.

## Phishing & Account Safety

Flump **never** asks for your password, verification code, MFA code, or bank login by email or message.

## Supply-Chain Release-Age Gate & Urgent Advisory Exception (E36)

Both Bun (`bunfig.toml`) and Renovate (`renovate.json`) enforce a **7-day minimum release age** (`604800` seconds) before adopting newly published npm package versions, alongside `--frozen-lockfile --ignore-scripts` in CI and container builds.

- **Urgent security fixes:** When a named high or critical security advisory requires upgrading to an npm package version published fewer than 7 days ago, a pull request may temporarily add that exact package to `minimumReleaseAgeExcludes` in `bunfig.toml` (citing the advisory identifier in a comment), and must remove the exclusion once the 7-day window has elapsed.
