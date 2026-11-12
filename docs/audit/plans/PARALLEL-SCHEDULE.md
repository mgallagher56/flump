# Parallel execution schedule: E17, E18, E20, E24, E25 and E29 (round 4)

Written 2026-11-12 against `origin/main` `06c520e0`. This plan covers the tickets in:

- [E17-next-phases-plan.md](E17-next-phases-plan.md)
- [E18-no-owner-plan.md](E18-no-owner-plan.md)
- [E20-next-phases-plan.md](E20-next-phases-plan.md)
- [E24-plan.md](E24-plan.md)
- [E25-plan.md](E25-plan.md)
- [E29-plan.md](E29-plan.md)

Decisions are in [DECISIONS.md](DECISIONS.md) round 4. Each plan opens with a "Round 4 overrides" box, and those overrides win over the plan body.

**Work already in flight in other sessions. Never touch these files:**

- **E15:** the mortgage and dashboard routes and components in `apps/web`, and `packages/ui`. New directories in `packages/ui` are allowed (see the rules below).
- **E12:** `apps/mobile-companion`, plus `packages/api-client` and `packages/format`.
- **E21:** backend contract validation (`apps/backend/src/contract/*`, `security.config.ts` v1 alias) and `packages/api-contract`.

Rules for every lane:

- One PR per ticket.
- The implementer uses the `sonnet` model; docs-only tickets may use `haiku`.
- Run the AGENTS.md section 5 pre-flight before every PR: `rtk bun run lint`, `rtk bun run check-types`, `rtk bun run test`, `rtk bun run build`.
- Rebase-merge, and the owner merges.
- Within a lane, tickets run in the order shown. Different lanes share no files, except the hotspots listed below, which have a fixed order.

## Lanes that can start now (wave 1)

| Lane | Area (files) | Tickets in order | Notes |
|---|---|---|---|
| **A. Ops scripts and runbooks** | NEW `scripts/ops/*`, `docs/runbooks/*`, `apps/*/railway.json` | E18-N8, E18-N9, E18-N10, E18-N12 in parallel → E18-N11 | New files only. N11 appends to `staging.md` after N9. |
| **B. Observability (backend)** | NEW `packages/observability`, `apps/backend/src/{instrument.ts,observability/*}`, `main.ts`, `app.module.ts` (one line) | E18-N1 → E18-N2 → E18-N4; E18-N5 at any time | N2 must run the Bun/Node check first (DECISIONS round 3 item 7). |
| **C. CI and Docker** | NEW `.github/workflows/security-scan.yml`, `.gitleaks*`, `.zap/*`; `apps/*/Dockerfile`, `.dockerignore`, `ci-pipeline.yml` | E18-N7 → E20-N27; E18-N6 → E18-N13 | Before E18-N6, ask the E12 session whether any Dockerfile work is open. |
| **D. Web security infrastructure** | `apps/web/app/entry.server.tsx`, `entry.client.tsx`, `react-router.config.ts`, NEW `app/security/*`, `root.tsx` (export line), `utils/auth.server.ts` | E20-N3 → E20-N1 → E20-N19 → E20-N2 → (after E18-N1) E18-N3 → (after lane E's N8) E20-N11 → soak → E20-N12 | Lane D and E15's shell both touch `root.tsx`: keep each diff to one hunk and rebase on E15. |
| **E. Token out of the browser** | NEW `routes/api.$.tsx`, `services/api-proxy.server.ts`, `services/api-client.ts`, `hooks/useUserProfile.ts`, budget route and container, onboarding route, `root.tsx` loader | E20-N4 → (E20-N5 ∥ E20-N6) → E20-N7 (after E23 onboarding merges) → E20-N8 → E20-N9 (**after the E15 mortgage follow-ups**) → E20-N10 (after deploy) | Lane E edits no dashboard file. E20-N9 is the only ticket that touches E15's mortgage file, and it goes last. |
| **F. Backend hardening and authorisation** | NEW `apps/backend/src/security/*`, `tax.controller.ts`, `tax-record.entity.ts`, decorator lines on controllers, NEW `apps/backend/test/authz/*` | E20-N13 → E20-N14 → E20-N15; E20-N22 at any time → E20-N23 (after N15 and lane G's E20-N16) | Lane F edits one line in `app.module.ts`. Never edit `contract-shadow.interceptor.ts`: E21 removes `HELD_BACK_GROUPS` entries itself after E20-N14 and N16. |
| **G. MCP backend and auth** | `apps/backend/src/mcp.{controller,service}.ts`, NEW `apps/backend/src/{mcp-access.ts,agent/*}`, `packages/mcp/src/{auth/*,transports/http.ts}` | E29-T8 → E20-N17 → E17-N6 → E20-N16 → E20-N18 → E17-N7 → E17-N16 → E17-N17 → E17-N15 → E17-N23 | Single writer for these files. E17-N15 also waits for E17-N8 (lane H). E17-N10 waits for E23 P1-4/P1-7. |
| **H. MCP tools** | `packages/mcp/src/{tools,resources,prompts,server.ts,types.ts,define-tool.ts,testing,__tests__,policy}` | E17-N1 → E17-N3 → E17-N4 → E17-N5 → E17-N8 (after E20-N17) → E17-N9 → E17-N11 → E17-N12 (after E25-T6) → E17-N14 → E17-N22; E29-T6 after N1 | E20-N17 edits `server.ts`. Land it, then start E17-N8. E29-T5's one-line edit to `financial-audit.tool.ts` goes after E17-N1 and before N11 deletes the tool. |
| **I. Web AI connections** | `features/ai-connections/**`, `routes/app.profile*.ts(x)`, `UserProfilePanel.tsx:883` | E17-N18 → E17-N20, after E17-N16, N17 and N19 | Starts in wave 2. |
| **J. Marketing (E24)** | `apps/marketing/src/{utils,pages,components,App.tsx}` | E24-T2 → E24-T3 → E24-T12 → E24-T4 | Copy merges on owner approval. E25-T12 and E29-T4's marketing lines come after E24-T4. |
| **K. Marketing server (E24)** | `apps/marketing/server/*`, `server.ts` | E24-T6 → E24-T9 | Lane K shares no files with lane J. |
| **L. Launch tooling (E24)** | NEW `scripts/{lib/launch-*,check-launch-*}`, `turbo.json`, app `package.json` build lines, root `package.json`, `ci-pipeline.yml` (one step) | E24-T1 ∥ E24-T10 | E24-T10's CI step goes after lane C's E18-N13 or rebases on it. E24-T1 touches Dockerfiles, so it lands after E18-N6. |
| **M. Web feedback (E24)** | `components/home/HomeFooter.tsx`, `features/feedback/components/RouteErrorState/*`, NEW `utils/support.ts` | E24-T5 | Lands before E15 T3.12 and before E29-T4's HomeFooter line. |
| **N. Tax engine (E25)** | `packages/finance-engine/src/{uk-*.ts,tax-rules.ts,test-vectors/*}`, `scripts/*tax-signoff*` | E25-T1 → E25-T2 → E25-T3 → E25-T4 → E25-T5 → E25-T6 → E25-T7; E25-T8 after T2 | Pick one owner for `tax-year-verification.ts` with E17-N5 (DECISIONS round 4 addendum). Record E22 follow-up 6 as done by E25-T1. |
| **O. Compliance engine and guards (E29)** | NEW `finance-engine/src/{compliance/*,disclaimers.ts}`, `health-score.ts`, `ai-context-pack.ts:166-180,328-367`, `debt-payoff.ts`, `apps/web/app/copy-guard.test.ts`, NEW `advice-allowlist.ts`, `apps/marketing/src/claims.test.ts` | E29-T7 → E29-T3 → E29-T5 | Shares `types.ts` and the `index.ts` barrel with lane N. These are small additive hunks, but land in turn: rebase, never edit the same block at the same time. E17-N4 owns `ai-context-pack.ts:166-180`, so E29-T5 stays at `:328-367`. |
| **P. Docs only** | `docs/compliance/*`, `docs/legal/*`, `docs/launch/*`, `docs/mcp/*`, `.github/pull_request_template.md`, `scripts/mcp-eval/*` | E29-T1 → E29-T2, E29-T10, E29-T11; E29-T9; E24-T7; E24-T11; E17-N19; E17-N21; E17-N2 | All of these can run at the same time. |

## Wave 2 (once a dependency lands)

- **E29-T4** (web and marketing copy rewrite) can start after E29-T3 and E29-T5. It also needs E24-T4 for the marketing lines and E24-T5 for HomeFooter. It touches no E15 file.
- **E25-T9 → E25-T10, E25-T11** (new `packages/ui` pattern and calculator directories) can start after E25-T6, or earlier on fixtures. They are new directories, so they don't collide with E15. Copy is gated by E29a: the E29-T3 guard must be green. The figures are gated by owner sign-off (E25-T8).
- **E25-T12** (marketing tool page) can start after E25-T10, E25-T11 and E24-T4.
- **E25-T15** (one-engine guard) can start after E25-T5.
- **Lane I** (E17-N18, E17-N20) can start after E17-N16, E17-N17 and E17-N19.
- **E20-N20 → E20-N21** (step-up) can start after E20-N13 and the written spike (DECISIONS round 4, Fable 4). E20-N21 touches `UserProfilePanel.tsx`, so rebase it on lane I.
- **E20-N24** (issuer pin) waits for the owner to decode a real token. **E20-N25 and E20-N26** can run at any time. **E20-N28** comes last.

## Wave 3 (waits for another epic)

- **E25-T13** (tax hub and pension planner) waits for E23 P1-4, P1-7 and P1-10. Run it inside E23 P1-10 or straight after it.
- **E25-T14** (home marginal-rate widget) waits for E23 P1-9 and for E15 to fix the dashboard widget set.
- **E17-N10** waits for E23 P1-4 and P1-7. **E17-N13** waits for E16 F41 (CSV import).
- **E24-T8** (swap the real contact details in) waits for the owner's domain and mailboxes.
- **E26** is not planned yet. It needs E25-T6, E17-N12 and E29a (DPIA signed, evals, Hub reply or 8 weeks).

## Shared files and their fixed order

| File | Order |
|---|---|
| `apps/web/app/entry.server.tsx` | E20-N3 → E18-N3 → E20-N11 |
| `apps/web/app/root.tsx` | E20-N1 (middleware export) → E18-N3 (`ENV` keys) → E20-N8 (removes `window.ENV`; keeps the Sentry keys as server-read config) → E20-N11 (nonce). Rebase on E15 shell PRs each time. |
| `apps/web/app/utils/auth.server.ts` | E20-N19 → E20-N2 |
| `apps/backend/src/main.ts` | E18-N2 → E18-N4 |
| `apps/backend/src/app.module.ts` | Any order, one line each: E18-N2, E20-N13, E20-N20, E17-N7, and E21's own changes |
| `apps/backend/src/health/health.controller.ts` | E18-N5 → the E20-N13 exemption |
| `apps/backend/src/mcp.controller.ts`, `mcp.service.ts` | Lane G order only |
| `packages/mcp/src/server.ts`, `types.ts` | E17-N3 → E20-N17 → E17-N8 → the rest of lane H |
| `packages/mcp/src/transports/http.ts` | E17-N6 → E20-N18 → E17-N17 |
| `.github/workflows/ci-pipeline.yml` | E18-N6 → E18-N13 → E24-T10. E18-N7 and E20-N27 use `security-scan.yml` instead. |
| `apps/{backend,web,marketing}/Dockerfile` | E18-N6 → E24-T1 (adds an `ARG`) |
| `apps/web/app/copy-guard.test.ts` | E29-T3 owns the advice-language guard. E24-T5 adds domain bans afterwards. |
| `apps/marketing/src/claims.test.ts` | E29-T3 → E24-T2/T4 additions |
| `apps/marketing/src/components/Footer.tsx` | E24-T2 → E24-T3 → E24-T12 → E29-T4 |
| `packages/finance-engine/src/index.ts`, `types.ts` | Additive barrel lines and type additions from E25, E29, E17-N4/N5 and E23. Rebase; never reorder. |
| `packages/finance-engine/src/ai-context-pack.ts` | E17-N4 (`:166-180`) → E29-T5 (`:328-367`) → E23 P2-4 (`:180-302`) |
| `apps/web/app/containers/tax/TaxContainer.tsx` | E20-N14 → E20-N15 → E25-T13. E15 T3.7 rebases on these. |
| `apps/web/app/containers/pension/PensionContainer.tsx` | E29-T4 (the "Model this" button) → E25-T13 |

## Path to inviting friends (DECISIONS round 3 item 9 plus round 4)

Agent tickets on that path:

- E29-T1, E29-T3, E29-T4, E29-T5, E29-T7, E29-T8
- E18-N1, E18-N2, E18-N3 (scrubber merged before the production DSN)
- E18-N9, E18-N10, E18-N11 (staging, drill, synthetic data)
- E24-T2, E24-T3, E24-T5, E24-T12
- E20-N1 and the lane E tickets (token out of the browser) are strongly recommended. They are not a stated precondition.

Owner steps on that path:

- Hub enquiry (E29-T11 draft)
- region move and staging
- Sentry org and DPA
- ICO fee
- beta notice and terms
- vector sign-off for 2024/25 to 2026/27
- footer name

## Owner actions in one place

Each plan's OWNER STEPS section is the detailed list. In summary:

- **E18:** Railway limit; dump; staging in EU West; restore drill; Sentry EU org, DPA and DSN (staging first); region move; alert channel; turn off Dependabot security updates; set config-file paths; seed synthetic data; full-history gitleaks scan.
- **E20:** WorkOS session and MFA settings; decode a token for the issuer pin; rotate D-12 secrets; unset CORS after N8; 14-day CSP soak; `ZAP_TARGET_URLS`; Public Suffix List check.
- **E24:** domain and Email Routing; Railway env flags; copy approval; footer name and postal-address choice; launch attestations in `readiness.json`.
- **E17:** consent copy; `MCP_AUDIT_HMAC_KEY`; reserve the npm org; eval key at T7.4; interviews before phase 3.
- **E25:** sign the E25 vectors (three passes); add the accountant-hour rulings; recheck the 2029 cap each release; approve copy.
- **E29:** sign the T1 rules, the copy sheet and the DPIA; send the Hub enquiry this month and record the date; set `MCP_ALLOWED_USER_IDS`; widen the launch solicitor's scope.
