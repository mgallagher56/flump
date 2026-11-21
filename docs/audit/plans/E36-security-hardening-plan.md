# E36. Security hardening before real production

Decisions: accepted on 21 November 2026

> Owner, 2026-11-21: "Accept the other decisions". SD1 to SD8 are accepted as recommended in section 5. SD3 (WorkOS Radar) and SD6 (penetration test quotes) are paid outside services and stay the owner's to arrange; turning on any WorkOS setting is the owner's. Three answers still wait on something: SD2 is revisited with real users, SD3 depends on the plan and price, and SD4 is chosen at the E24 domain step.

> **Status: plan for owner approval. No code.** Written 2026-11-15 against `origin/main` at `b3e0e578`. The repository is public, so this plan names no secrets, hosts or real figures. Facts marked **[U]** were not confirmed in a primary source today.

**Summary.** The owner asked for a security hardening plan covering the package supply chain, accounts, limiting the damage of a breach, post-quantum readiness, AI-assisted attacks and an external penetration test. A lot is already in place: installs use a frozen lockfile with scripts off, every action and base image is pinned, and secret, static and passive dynamic scans run in CI. So this plan starts with an inventory and lists only the real gaps. The largest are: no release-age delay in Bun itself, no SBOM, no published way to report a vulnerability, MFA and passkeys not switched on, sensitive columns other than bank tokens stored unencrypted, one database role for everything, and no independent test. Seven slices, most of them small. Several steps are dashboard settings or money decisions that only the owner can take, and they are marked.

## 1. What already exists on main

| Area | In place | Where |
| --- | --- | --- |
| Installs | `bun install --frozen-lockfile --ignore-scripts` in CI and in all three Docker builds; Bun pinned to 1.4.4 | `.github/actions/bun-setup/action.yml`, the backend, web and marketing Dockerfiles, `package.json` (`packageManager`) |
| Lifecycle scripts | No `trustedDependencies` in any workspace, and Bun does not run dependencies' scripts by default | `package.json` files |
| Updates | Renovate with a three-day release age for npm packages (`security:minimumReleaseAgeNpm`), OSV alerts on, no automerge, one grouped non-major PR | `renovate.json` |
| Actions and images | Every third-party action pinned to a commit SHA; base images pinned by digest; a test fails on a tag-pinned image or persisted checkout credentials (SEC-E, merged) | `.github/workflows/*.yml`, `scripts/ci-config.test.ts` |
| Scans | gitleaks on the commit range, Semgrep CE, a weekly passive ZAP baseline, `bun audit` in the pipeline | `.github/workflows/security-scan.yml`, `ci-pipeline.yml` |
| Sign-in | WorkOS AuthKit, JWT verified on the backend, closed-beta allowlist, recent-login check for sensitive actions | `apps/backend/src/auth/` |
| Abuse limits | IP and per-user rate limiting backed by Postgres; a signed client IP header; a CSRF Origin check; receipt upload validation | `apps/backend/src/security/` |
| Backups and merge rules | A scheduled backup workflow; required CI checks before merge | `.github/workflows/backup.yml` |
| Encryption at rest | Bank tokens under AES-256-GCM with versioned keys and a rotation runbook; HMAC-SHA256 for keyed references and tombstones | `packages/banking` (`crypto`), `docs/runbooks/bank-token-key-rotation.md`, `apps/backend/src/security/keyed-ref.ts` |
| Incident response | A runbook that starts the 72-hour clock for the ICO at step 1 | `docs/runbooks/incident.md` |
| Web hardening | Headers and CSP (report-only for the full policy), logging policy, threat model | `docs/security/` |
| MCP | Allowlist, scopes, output policy tests, audit events with hashed arguments | `apps/backend/src/auth/mcp-access.ts`, `packages/mcp/src/policy/`, `agent-audit.service.ts` |

**Backend re-score items E36 depended on** (`docs/audit/backend-2026-11/RESCORE.md`), all now merged and not repeated here: SEC-A production environment checks and SEC-F audit-trail integrity (#738, 15 November 2026), BE-18 bank launch readiness (#752), SEC-D receipt encryption (#753), and SEC-B MCP token tightening, merged with BE-15 in #725. (Updated 18 November 2026; this paragraph first listed SEC-A, SEC-D, SEC-F and BE-18 as open.)

## 2. Gaps and what to do

### (a) Package supply chain

| Gap | Action | Who |
| --- | --- | --- |
| Bun has no release-age delay. Renovate's delay only shapes its own PRs; a hand-run `bun add` or `bun update` can pull a version published minutes ago | Add `bunfig.toml` with `[install] minimumReleaseAge = 604800` (seconds; Bun's documentation also describes unit forms; exclusions go in `minimumReleaseAgeExcludes`) | Agent |
| Renovate waits three days, not seven | Set `minimumReleaseAge` to "7 days" for npm in `renovate.json`, including the Playwright rule, which sets its own three days. Urgent security fixes: a documented exception, where a named advisory allows a hand-made PR with an entry in `minimumReleaseAgeExcludes` for that exact version, removed afterwards. Whether Renovate's own vulnerability PRs skip the delay is **[U]**; test it on the first alert | Agent |
| `trustedDependencies` could be added quietly | A law in `scripts/ci-config.test.ts`: the list is absent or matches an allowlist in the test, each entry with a reason | Agent |
| No SBOM | Generate a CycloneDX SBOM for each image in CI and keep it as a build artifact for each release. Tool choice checked against current docs in the slice (**[U]**) | Agent |
| `bun audit` can fail open | The pipeline prints a warning when the audit cannot run. Keep that, but fail the job on a known high or critical advisory with no recorded exception | Agent |
| Dependency count | One pass: list direct dependencies per workspace, remove unused ones (knip is installed and checks the backend through `check-backend-laws`; extend it to web and packages), and record why each remaining runtime dependency is needed | Agent |
| New actions | `scripts/ci-config.test.ts` already tests SHA pins. Extend it to glob every workflow file, so a new workflow cannot skip it | Agent |

### (b) Accounts

All settings are in the WorkOS dashboard, so every row is an **owner-only** step; the agent's part is the checklist in `docs/security/owner-steps.md` and any code that reads the result.

| Gap | Action |
| --- | --- |
| MFA is optional (`owner-steps.md` lists TOTP as optional) | Require MFA for the owner's and any admin's WorkOS dashboard and hosting accounts now. For users: offer TOTP and passkeys at launch; decision SD2 on whether to require a second factor |
| Passkeys are off | Enable passkeys in AuthKit. WorkOS says passkeys count as both factors, work only with the hosted UI, and are bound to the sign-in domain, so the custom AuthKit domain must be set first (E24 owner action) or early passkeys stop working |
| Password policy | Set the strongest AuthKit password policy offered. Whether it includes a breached-password check is **[U]**: the docs found today do not say. If it does not, ask WorkOS, and do not build one in Flump (it would mean handling passwords) |
| Bots and credential stuffing | Enable WorkOS Radar, which blocks or challenges automated sign-in attempts in hosted AuthKit with no code change. Check the plan and price first (**[U]**) |
| Recovery | Confirm that password reset and "try another way" cannot bypass a second factor. WorkOS fixed one such bypass in January 2025 (**[U]**, from a search extract of its bulletins) |

### (c) Limiting the impact of a breach

| Gap | Action | Who |
| --- | --- | --- |
| Data kept that may not be used | A minimisation pass over `docs/legal/data-map.md`: each stored field has a use, or is dropped. Names and avatar URLs on `user_profiles` are the first candidates | Agent proposes; owner decides |
| Field-level encryption covers bank tokens only | After SEC-D (receipts), extend the same versioned-key AES-256-GCM helper to the free-text and identifying columns: account names, institution names, MCP token labels. Balances stay in clear, because the database must sum and sort them; that limit is stated in the security page | Agent; key from the owner |
| One database role | Three roles: migrations (owns the schema), application (no DDL, no access to backups), read-only for backups and support. SEC-F's restricted role for `audit_events` becomes part of this | Agent writes the SQL and runbook; owner creates the roles |
| Breach runbook | `incident.md` has the 72-hour duty. Add: the ICO report form fields filled in advance, the test for "notifiable", who tells users and in what words, how to revoke every session and MCP token at once, and a dated tabletop exercise in `drill-log.md` | Agent drafts; owner runs the drill |
| Backups | The restore drill is already an open owner action (E18). Add a check that backups are encrypted and stored under a different credential from the application | Owner |

### (d) Post-quantum readiness

The realistic risk for Flump is "harvest now, decrypt later": traffic recorded today and decrypted years on. Financial records stay sensitive for a long time, so the key exchange matters now; signatures can wait for the ecosystem.

| Item | Action |
| --- | --- |
| Hybrid key exchange at the edge | Chrome and Firefox already offer the hybrid X25519MLKEM768 group by default. Whether Flump's host negotiates it is **[U]**. Test the staging endpoint with a TLS client. If it does not, the custom domain (E24) is the moment to choose an edge that does. Owner decision SD4 |
| Symmetric keys | Already 256-bit (AES-256-GCM, HMAC-SHA256). Add a law that no new code uses a smaller key or SHA-1 |
| Crypto inventory | A new `docs/security/crypto-inventory.md`: every algorithm, key size, key location and rotation path, including what WorkOS and the host do for us. The NCSC asks organisations to finish discovery and a first plan by 2028, start priority migration by 2031 and finish by 2035 (guidance of March 2025) |
| Agility | One crypto module per purpose with a version byte in each ciphertext (bank tokens have this). No algorithm names scattered in feature code |

### (e) AI-assisted attacks

| Risk | Action | Who |
| --- | --- | --- |
| Convincing phishing at scale | Passkeys (section b) are the phishing-resistant answer. Publish one line on the security page: Flump never asks for a password, code or bank login by email | Owner approves wording |
| The public repo is read by attackers' tools | A short review of what it reveals: architecture and scan configuration are fine to show; check that runbooks carry no hostnames, project ids, email addresses or allowlist entries, and that gitleaks history scanning covers all branches. The WorkOS key once in git history was rotated on 2026-11-13 (E3 D-12) | Agent reviews; owner rotates |
| No way to report a flaw | Add `SECURITY.md`. The marketing server already serves `security.txt` once a `SECURITY_CONTACT` variable is set (`apps/marketing/server/ops.ts`); no mailbox exists yet. Turn on GitHub private vulnerability reporting | Owner creates the mailbox; agent adds the files |
| Prompt injection through MCP | Account names, notes and imported rows are attacker-controllable text that reaches a model. Add tests that such text is returned as data, never as instructions: a fixture set of injection strings through every read tool and the staged-import flow, asserting the envelope marks user text and that no write happens without the existing review step | Agent |
| Faster scanning for known flaws | Covered by (a): patch speed with the urgent exception, and failing CI on high advisories | Agent |

### (f) External penetration test

Before the first real production users, after slices H1 to H4. Scope: the web app and its session handling, the `/v1` API with a focus on one user reading another's data, the MCP endpoint and tokens, sign-in configuration, and the deployed headers. Out of scope: WorkOS and the host themselves, and bank connections while they stay off.

Price is an **owner money decision**. A small web and API test from an accredited UK firm is likely to be a few thousand pounds for roughly four to eight tester days (**[U]**, a general market estimate, not a quote); ask for three quotes and a free retest of findings.

## 3. Slices

| Slice | Contents | Depends on |
| --- | --- | --- |
| H1 | Supply chain: `bunfig.toml` release age, Renovate seven days and the urgent exception, laws for `trustedDependencies` and SHA pins, audit failing on high, SBOM, dependency pass | None |
| H2 | Reporting and repo review: `SECURITY.md`, `security.txt`, private reporting, the public-repo review, the phishing line | Owner mailbox |
| H3 | Accounts: owner checklist for MFA, passkeys, password policy, Radar, recovery | Owner dashboard steps; custom domain for passkeys |
| H4 | Breach impact: database roles, extended field encryption, minimisation pass, breach runbook and tabletop | SEC-D, SEC-F, BE-18 |
| H5 | Post-quantum: edge test, crypto inventory, key-size law | H4 for the inventory |
| H6 | MCP prompt-injection tests | E17 write tools merged |
| H7 | External penetration test and fixes | H1 to H4; owner money decision |

H1, H2 and H6 can start at once and run in parallel.

## 4. Strongest argument against

Flump has no users, no revenue and one developer. The biggest security risk today is not a missing control but an unfinished one: the restore drill never run, the full CSP still report-only. A new epic can become a way to do interesting work (post-quantum, SBOMs) while those stay open. On this view only H1, H2 and the owner steps in H3 are worth doing before launch, the open SEC items come first, and the rest waits for real users.

## 5. Decisions for the owner

| # | Decision | Options | Recommendation |
| --- | --- | --- | --- |
| SD1 | Release-age delay | 3 days (today); 7 days with an urgent exception; 14 days | **7 days** |
| SD2 | Second factor for users | Optional; required for everyone; required only for MCP and data export | **Optional at launch, passkeys offered first**; revisit with real users |
| SD3 | WorkOS Radar | Enable; rely on Flump's own rate limits | **Enable**, if the plan and price allow |
| SD4 | Edge for the custom domain | Stay on the host's edge; put a CDN in front that negotiates hybrid key exchange | **Test first**; choose at the E24 domain step |
| SD5 | Field encryption scope | Bank tokens and receipts only; add names and labels; add balances | **Add names and labels**; balances stay in clear |
| SD6 | Penetration test | Before the friends beta; before public launch; not yet | **Before public launch**, three quotes |
| SD7 | Order | E36 now; open SEC items and owner actions first, then H1 to H3 | **Open items first, then H1 to H3** |
| SD8 | Security mailbox | A monitored address now; wait for the custom domain | **With the custom domain** (E24), then H2 |

## Sources (all read 2026-11-15)

- Bun, `bun install` documentation (minimum release age, trusted dependencies, frozen lockfile): <https://bun.com/docs/pm/cli/install>.
- Renovate, security presets (`security:minimumReleaseAgeNpm`, three days): <https://docs.renovatebot.com/presets-security/>.
- WorkOS, passkeys: <https://workos.com/docs/authkit/passkeys>; Radar: <https://workos.com/docs/authkit/radar>; security bulletins: <https://workos.com/security/bulletins>.
- NCSC, "Timelines for migration to post-quantum cryptography", March 2025: <https://www.ncsc.gov.uk/guidance/pqc-migration-timelines>.
- Cloudflare, post-quantum cryptography support (browser defaults): <https://developers.cloudflare.com/ssl/post-quantum-cryptography/pqc-support/> (through search extracts).
- UK GDPR article 33 (72-hour notification): cited through `docs/runbooks/incident.md` (**[U]**, not re-read).
