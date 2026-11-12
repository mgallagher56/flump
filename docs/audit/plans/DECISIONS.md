# Owner decisions for epics E2, E4, E5, E7, E8, E11

Recorded 2026-11-11 from the owner's answers to the questions in SEQUENCE.md. Anything not listed below follows the recommendation in the epic's draft plan (`E<n>-plan-draft.md`) and SEQUENCE.md.

## Stated decisions

| Epic | Decision | Effect on the plans |
|---|---|---|
| E2 | All production data is test data, apart from the owner's own account, which they use for testing. | The cleanup of seeded rows (E2 D3/D4) can delete exact-fingerprint seeded rows and rows owned by the old mock identities `user_mock` and `dev_user_123` without a per-row review. Still take a backup first; the owner's own rows must not match a fingerprint. The "export before delete" option (D4-C) is not needed. |
| E4 | The owner signs off the tax test vectors. | The owner is the named reviewer. No tax fix merges before they have signed off its vectors. |
| E4 | Supported tax years start from 2020/21. | Supersedes the draft's option b (verify 2023/24 to 2026/27, label older years unverified). The resolver supports 2020/21 to 2026/27, and unknown years throw. All seven years' vectors need the owner's sign-off, which is more work than the draft assumed. |
| E7 | The owner signs off all marketing copy. | Removing a false claim and the new wording both merge on the owner's approval. Regulatory statements (FCA, GDPR) are still only added with the owner's explicit wording, never drafted as fact. |
| E7 | Pricing is not set. Design the pricing page fully with the price as a placeholder. | Supersedes the draft's "single 'Flump is free' card". Keep the plan structure (cards, features, call to action) with an obvious placeholder price (for example "£X per month") and no trial or Pro claims that nothing implements. |
| E7 | Use an obvious placeholder email address until the domain exists. | One placeholder (for example `security@example.invalid`) used for the security contact and the manual account-closure route, easy to grep and replace. Remove the fake enquiry form (E7 T2) as planned. |
| E7 | Placeholder company details in the footer. | Obvious placeholders for company name, number and address, not invented real details. |
| Mobile | The mobile app will be rebuilt from scratch, using the web app as the functional guide, covering everything the web app does. This is a separate, thorough plan for later. | New epic E12 (below). The mobile items in E2 (T16 mobile part), E4 (T16), E5 (T17) and E8 (D6) are dropped from those epics: do not fix the old app. |
| All others | Follow the recommended decisions. | See SEQUENCE.md "Decisions needed from you". |

## Still open

- **E2 D6:** is the "Poplar/Curo" rental ledger that was committed to git history (from commit a640c2be) real data of the owner's, and is the repository, or will it be, public? If it is real and the repo may become public, history needs rewriting (a human task with `git filter-repo`). If not, it is deleted from the current tree only. No code task is blocked by this.

## New epic: E12 Mobile rebuild (not planned yet)

Goal: replace `apps/mobile-companion` with a new app built from scratch, implementing every feature of the web app, using the web app's routes and flows as the specification. To be planned separately and thoroughly before any build starts: feature inventory from the web app (routes, loaders, actions, calculators), shared logic via `packages/finance-engine` (no re-implemented maths, which is the B-07 finding), real authentication (the old app has only mock auth), accessibility and design tokens from day one, testing, and release. Until then the old app stays as it is and works only against a backend running in dev mode.

## Updates, later the same day

- **E2 D6 resolved: no git history rewrite.** The owner decided the information is not important enough for the effort. The rental ledger ("Poplar"/"Curo" seed data) is removed from the current files only (E2 T16 and the seed removal tasks); history is left alone. The 8 current files that still contain it are listed in the planning notes; they are cleaned as part of E2.
- **E11 D7 resolved: no enforced checks.** The owner will not upgrade to GitHub Pro, so branch protection and required checks are not available on this private repo. The gates stay advisory on GitHub; Railway "Wait for CI" is the one enforced gate (deploys wait for checks). The E11 plan items that assume branch protection or code-owner review are dropped.
- **Done by the owner:** the `RELEASE_PLEASE_TOKEN` Actions secret exists; Railway "Wait for CI" is on for backend, web and marketing (`checkSuites: true`, verified read-only).

# Owner decisions, round 2 (2026-11-12): "make the recommended decisions for each"

The owner delegated every open decision in the E12, E15, E16, E17, E18, E19, E20 and E23 plans to the plans' own recommendations. A Sonnet agent extracted each recommendation verbatim and classified it. **AUTO** = adopted now (reversible product, design, engineering or process choice that costs no money). **HOLD** = not decided by default (money, legal entity or solicitor, contacting third parties, real personal data, irreversible production action, or the plan gives no single recommendation). Earlier decisions in this file still stand (production data is test data; tax years from 2020/21; pricing, email and company details are placeholders; no history rewrite; no GitHub Pro so no required checks; backup skipped, see below).

**Also decided this round:** the owner will NOT take a database backup before release PR 368 (managed backups need Railway Pro; data is test data). The runbook's free `pg_dump` remains an optional step. The cleanup preview counts must still be read before merging 368.

## ADOPTED (AUTO)

### E15 visual and UX
D1 hybrid: Calm ledger (A) as the base, B's compact density for simulators, tables and the accounts list (via D9-C), C's coach card as a component. D2 keep indigo, refine neutrals. D3-C adopt ui primitives and patterns everywhere (E15 absorbs E9 for screens it touches; needs one AGENTS.md law edit, flag it when made). D4-B Mortgage pilot plus the app shell in parallel (but see conflict 1). D6-A Lucide. D7-A Vitest browser-mode screenshots, PR-only, never blocking on main. D8-A follow system theme with override. D9-C contextual density. D10-A approve the new colour-token batch (finalise after D1). D11a-B expressive marketing layer on the same tokens. D11b-A delete the duplicate web public home and redirect signed-out `/` to marketing. D12-A standalone HTML mockups. D13-A en-GB only: remove `es`, dead keys and the detector. D14-B owner reviews the pilot, then a batch at each phase end. D16 "Not set" (with an action) is the only rendering for unknown values; zeros only for real zeros.

### E16 product review
D1-A UK tax and wealth planner on your own numbers, with an AI companion. D2-A plan-only budget, actuals from CSV import later. D3-B Self Assessment ledger becomes an opt-in module. D4-A bank PAT connect (Monzo, Starling, T212) stays behind "Advanced / beta"; OAuth and open banking flagged off. D5-B merge the Forecast route into Savings, Pension and the Tax hub with a redirect. D6-B cut non-UK scope and Irish tax. D7-B marketing owns home, pricing and tool landing pages. D8-A finish MCP as a preview after E1; hide the fake token card meanwhile. D9-A first-party server-side events plus cookieless page counts (allow-list schema, no amounts), shipping only after E19's notice exists. D10-B adopt the law-compliant dead components (`PayoffStrategyControls`, `SandboxTemplates`) and delete the rest. D11-B dashboard show or hide only, with a default layout by persona. D12-B remove account-history edit UI (history comes from the check-in). D13-A interactive decision pack (done). D15-B mobile scope left to E12. D17-A fix the account write bugs before further E16 execution (done in PR 387).
The pack's feature-level recommendations (keep, fix, merge, demote, cut, add for F01 to F45) are adopted EXCEPT that no cut or demotion is applied to a MOST VALUABLE row (F01, F02, F03, F04, F05, F07, F11, F31) until interviews (D14, HOLD) are done. Cuts and merges on NICE, BLOAT and NO VALUE rows may proceed: F09, F16, F17, F18, F19, F21, F22, F23, F24, F26, F27, F29, F30, F34, F37, F38, F43, F44, F45. F28 follows D16 below. Additions: F41 CSV import and F42 tax-year hub; F40 account deletion and export is built but legal wording is held.

### E17 agent and API surface
D1-A MCP is a preview until Phase 5 and the eval targets are met. D3-B low-risk writes behind `write:*` scopes with propose and confirm, audit and a 24-hour undo; no deletes (Phase 4, later; E19 DPIA, terms and "guidance not advice" copy must cover writes first). D4-B tax tools stay with `verification.status: "unverified"` and a notice in every response until vectors are signed off. D5-A default scopes `read:summary` and `simulate`, anonymised; expiry 7, 30, 90 (default) or 365 days; never "never". D6-A add the missing profile fields; tools return `missing[]` (interim: labelled assumptions). D7-A internal contract only; `/mcp` is the only third-party surface. D8-A `/v1` URI prefix with unversioned aliases deprecated for at least 6 months. D9-A zod in `@flump/api-contract`, OpenAPI generated from it, WorkOS AuthKit as the MCP authorisation server (re-check scope support before Phase 5). D11-A keep the offline context-pack export (anonymised by default). D13-A keep the `flump://` scheme.

### E18 operations
D2-A stay on Hobby, upgrade at public launch. D3-A one root release component; every service watches the root CHANGELOG. D4-A staging data is a restored production dump now, switching to synthetic before any friend is invited. D6-A boot-time migrations for PR 368, moving to the Railway pre-deploy command later. D7-A the combined release PR deploys all three services (the merge itself stays an owner action). D8-A Renovate only (the owner turns off Dependabot security updates in GitHub). D9-A daily and weekly backups plus a weekly encrypted offsite dump once the plan allows; PITR at public launch (a money item). D10-A Railway webhook to a Discord or Slack channel plus uptime alerts.

### E19 privacy and legal (engineering parts only)
D3-B bank connection on only for allowlisted owner accounts. D6-B inactive accounts deleted only on request during the beta. D7-A immediate hard delete. D8-A stop storing synced transactions. D9 no marketing analytics in the beta, cookieless counts at launch (after the PECR notice). D10-A no marketing email. D11-A JSON export first. D12-A 18+ self-declaration (wording reviewed with the terms).

### E20 security
D1-C proxy now (same-origin `/api` proxy with a strict allow-list, stop returning the token from loaders), retire proxy entries into route actions over time. D2-A remove in-app password change; "Change password" emails a WorkOS reset link. D3-B absolute 14 days, idle 24 hours, step-up for sensitive actions. D4 keep `react-router-serve` and add middleware, headers and rate limiting now (Cloudflare is HOLD until the custom domain exists). D5-A in-memory rate limits while there is one replica. D6-A receipts stay in Postgres, validated, excluded from lists, served through a download route. D7-A E20 enforces MCP scopes now with today's names. D8-B HSTS preload after the domain has been stable 3 months. D9-B keep the presence cookie, fix the domain check with a shared helper, add `Secure`. D10-A free security tooling now (the paid pen test is HOLD). D11-A self-host fonts. D12-A optional TOTP through AuthKit. D13-A backend stays public with CORS removed.

### E23 core-journey correctness
D-1-B backend `GET /financial-picture` built from the engine is the single source of truth. D-2-A P0-1 to P0-5 plus the in-flight fixes ship before PR 368. D-3-B store `birth_year`. D-4-C region required in onboarding; existing users get labelled England/Wales/NI assumptions plus a call to action. D-5-B student loan excluded from the headline net worth and shown as a separate income-contingent line; never in debt payoff. D-6-A safe-to-spend = take-home − essentials − debt minimums − planned savings, per week. D-7-A annual tax record belongs to the tax year containing `date` (backfill `end_date`; run the backfill only after a backup is taken, or the owner accepts the risk as for PR 368). D-8-A profile percentages for the workplace scheme, per-pot amounts only for personal or SIPP pots. D-9-A E23 does the numeric transformer (E21 adopts it). D-10-A dev bypass on a local dev host for the E2E suite. D-11 fast-check for portfolio and history properties, hand-written for tax.

### E12 mobile
D1-A, D3-A, D4-A (encrypted read-only cache 7 days, writes online only), D5-A, D6-A (behind the OFF flag), D8-A (no push in v1), D9-A (immediate deletion after typed confirmation), D10-A, D11-A, D12-C, D13-A, D14-A, D15-A, D16-A (native variant; flag the law edit), D17-A, D19-A (store builds ship with bank connection OFF), D20-A (privacy policy and web deletion route are release gates; policy text is held for the solicitor), D21-A (email and password plus magic link), D22-A (en-GB only), D23-A (extract `@flump/tokens`), D27 (reuse web's disclaimer, require email verification, MFA optional). Per E16, the E12 feature inventory is regenerated after E16's cuts before feature screens (M4 onwards) start; M0 to M3 may proceed.

## Conflicts between plans, resolved
1. **E15 pilot vs E16 vs E9:** run E15 phases 0 to 2 now (tokens, components). Start the Mortgage pilot only after E16's mortgage fix and merge tickets land; shell in parallel; dashboard last after the E16 widget set is settled. E9's page migration is superseded by E15 D3-C for kept screens (skip CUT rows); the colocation ratchet runs only on files E15 touches.
2. **Law edits:** the AGENTS.md law 1 wording, section 2 token additions and the E12 native variant are made as ONE deliberate change, flagged in its PR.
3. **Spanish/i18n:** en-GB only on web (remove `es` and the detector) and on mobile; E16's "dormant" is the weaker form of the same outcome.
4. **Bank connection and synced transactions:** one flag, off for everyone except owner-allowlisted accounts; stop storing synced transactions.
5. **MCP:** `birth_year` and required region (E23) win over E17's "age or date of birth"; E17's 13-month audit retention must appear in E19's retention schedule and be deleted with the account; E19's DPIA and terms must cover agent writes before E17 phase 4.
6. **Instrumentation:** build E16's events behind a flag; ship only after E19's notice.
7. **Region and staging order:** owner decides region, then staging is built in that region, then backups and drill, then any production migration.
8. **Staging data:** switch staging to synthetic data before any friend is invited.
9. **Error tracking:** one vendor and one DPA for E18, E12 and E20 (HOLD below).
10. **Deletion and export:** immediate hard delete everywhere; JSON export with it; mobile follows the web endpoint.
11. **Fonts:** self-host (family choice is HOLD).
12. **No required checks (no GitHub Pro):** visual regression and the E2E gate stay advisory; only Railway Wait-for-CI is enforced.
13. **Company details** stay placeholders until the entity decision (HOLD).

## HOLD (not decided; needs the owner, a solicitor or money)

**Owner alone:** E15 D5 typography (look at direction A: Inter plus Plus Jakarta, one variable family, or an editorial serif); E15 D15 confirm "I own the logo and am happy to recolour it"; E16 D14 run 3 to 5 interviews (P1 to P3) before any cut to a MOST VALUABLE row; E16 D16 confirm "stop storing synced transactions" (E19 D8-A already says so); E17 D2 confirm or register the npm `@flump` scope before publishing; E17 D10 set an LLM eval spend cap (a number); E18 D5 and E12 D7 approve one error-tracking vendor (Sentry EU suggested), create the org, accept the DPA; E18 D11 and E19 D4 choose the data region (EU West suggested) and run the migration after backups and staging; E19 D2 pick friends and a date once privacy notice, terms and deletion are live; E12 D25 store-compliance answers; E20 D4 Cloudflare once a custom domain exists; E20 owner tasks (confirm WorkOS redirect URI, decode a real token, rotate the D-12 secrets, review WorkOS session and MFA settings, check the Public Suffix List). E18 owner steps: create the alert channel and webhook; turn off Dependabot security updates.

**Solicitor:** E19 D5 (FCA Innovation Hub first, then one firm on a fixed fee: FCA view and privacy pack); E19 D1 trading entity (limited company if the App Store or public launch is within six months); E17 D12 13-month audit retention; E12 D26 controller identity, ICO registration, DPAs, export obligation; E12 D18 ask Apple App Review about organisation accounts before incorporating; privacy policy, terms, disclaimer, age-gate wording (E19 phase B/C); F40 deletion and export legal review.

**Money:** E18 D1 staging about $3 a month (staging itself is still recommended; the owner approves the spend and runs it); E19 D13 PI and cyber insurance before public launch; E12 D2 Apple about $99 a year and Google Play $25 once (after D18); E12 D24 cost table; E20 D10-B CREST pen test about £3k to £7.5k before public launch; Railway Pro and PITR at public launch; company registration fee.

# Owner decisions, round 3 (2026-11-12): HOLD items, Fable recommendations adopted

The owner asked for a Fable review of every remaining HOLD item and said "take the approach it recommended for all". Each line below is now the decision. Where an item needs the owner's money, account, legal contact or physical action, that action is listed as an owner step and is NOT done by an agent. Legal items are pragmatic sequencing, not legal advice. Prices are estimates; check before paying. Release PR 368 was merged on 2026-11-12.

1. **Typography (E15 D5):** two families, as in direction A: Inter for body and UI plus Plus Jakarta Sans for display and headings, both self-hosted. The owner overrode Fable's single-family recommendation (they like having two fonts). Tabular numerals still come from Inter for all financial figures. No serif.
2. **Logo (E15 D15):** assume the owner owns it and it may be recoloured within the existing indigo. Owner: confirm authorship or a written assignment; free UKIPO search for "Flump" (classes 9, 36, 42) before spending on brand (can wait until launch).
3. **Interviews (E16 D14):** proceed without them, because no MOST VALUABLE row is being cut (F01, F02, F04, F05, F31 fix; F03, F07 keep; F11 merge). Gate instead: the E15 dashboard widget set, E17 phase 3 onwards, and any later real cut. Run 3 interviews (P1, P2, P3) plus one P5 AI power user before E17 phase 3, on staging with the persona fixture, after the F01/F02 fixes land (about 4 owner hours).
4. **Synced bank transactions (E16 D16, E19 D8-A):** confirmed. Stop storing them and delete existing rows, before any friend is invited.
5. **npm scope (E17 D2):** reserve the `flump` npm organisation now with 2FA, publish nothing yet (remote-only first). If taken, use `@flumpapp` or stay remote-only.
6. **LLM eval cap (E17 D10):** GBP 15 a month hard cap, GBP 2 per run, manual `workflow_dispatch` only until public launch (then GBP 40 with nightly runs). Owner: dedicated API workspace and key with that limit, as an Actions secret. Wait until E17 T7.4.
7. **Error tracking (E18 D5, E12 D7):** Sentry SaaS, EU region, free tier, for backend, web and later mobile. Conditions: no session replay, `sendDefaultPii: false`, scrubber tests merged before the production DSN. Owner: create the org (EU), accept the DPA, set DSNs on staging first, add Sentry to the processor list. Fallback if the Bun SDK misbehaves: run the backend on node. Must be live before friends.
8. **Data region (E18 D11, E19 D4):** move to Railway EU West this month, while the database is small and test-only. Sequence: raise the Railway hard limit to $25; take a `pg_dump` offsite; build staging directly in EU West and restore into it (this is the restore drill); smoke-test; move production Postgres then the three services in a quiet window; re-test; keep the dump 30 days. Document WorkOS (US) transfers in the privacy notice.
9. **Friends (E19 D2):** invite 3 to 5 only after every precondition is ticked, no calendar date first (realistically 4 to 6 weeks): invite-only sign-up; bank connection owner-only; ICO fee paid; monitored support/privacy mailbox; beta privacy notice and terms (marked unreviewed); copy hotfix and projection disclaimer live; deletion and export (manual runbook is enough); breach runbook; offsite backup plus a passed restore drill; region move done; synthetic staging data; Sentry with scrubber live; 2025/26 and 2026/27 tax vectors signed off. Tell friends in writing it is a test.
10. **Store compliance (E12 D25):** adopt the positions in the E12 plan summary at M8: organisation accounts, Finance category, bank connection off in store builds, `ITSAppUsesNonExemptEncryption=false`, lowest age band with 18+ in terms, Apple labels (email, user ID, financial info, diagnostics; no tracking), Play Data safety equivalent, personal-finance-tool declaration, seeded reviewer account. Verify against the live console wording; Play rules are UNCONFIRMED.
11. **Domain and Cloudflare (E20 D4):** buy the domain now (about GBP 10 a year), DNS on Cloudflare free with Email Routing for support@, privacy@, security@. The proxy, WAF and rate limiting wait for the custom-domain cutover at launch (then WorkOS Production environment; HSTS preload after 3 stable months).
12. **E22 2027/28 figures:** do NOT ship them as verified. Ship E22's structure and keep the 2026/27 fallback banner. The Fable review flags that the planner's savings/property rates (24/44/49) and cash ISA limit (GBP 20,000) conflict with what it knows from Budget 2025 (22/42/47, GBP 12,000 under-65s); Budget 2026 is after its knowledge cut-off, so unresolved. Owner (about 1 hour): check about 15 figures against OOTLAR Annex A on GOV.UK plus one independent summary, then record E22 D9-A sign-off. Then load 2027/28 as provisional. The strict/fallback code fix must land before 6 April 2027. Re-check after the Scottish Budget, the employer thresholds page and Royal Assent.
13. **Tax vector sign-off (E4):** three passes plus one paid accountant hour (GBP 150 to 300) for judgement rulings (2022/23 NI blend, 2023/24 mid-year NI change, Gift Aid for Scottish taxpayers, Section 24 credit, Plan 5 removal). Pass 1 parameters against GOV.UK per year; pass 2 vectors cross-checked in two independent calculators; pass 3 the owner's own P60s as vectors. Sign 2024/25 to 2026/27 first (gates the friends beta), then 2020/21 to 2023/24.
14. **Mortgage-term column:** approved. Additive migration `term_months integer NULL` and `fixed_rate_end_date date NULL` on the mortgage account, no backfill. Take a dump first.
15. **Legal sequence:** restrict sign-up and keep bank connection owner-only now. Before friends: pay the ICO fee as an individual (about GBP 52) and publish an agent-drafted beta notice and terms marked unreviewed. This month: send the FCA Innovation Hub enquiry (bank connection as account information; where guidance becomes advice). Stay a sole trader for now; incorporate about 8 weeks before Apple enrolment, before charging, or before opening beyond friends. At launch: one fixed-fee solicitor engagement (privacy notice, terms, disclaimer, DPIA review); buy the separate FCA written opinion only if bank connection goes public. 13-month audit retention is adopted provisionally in the retention schedule and deleted with the account. This replaces the plan's "limited company within six months" lean.
16. **Money:** spend now (about GBP 15 a month plus about GBP 60 one-off): raise the Railway hard limit to $25 first, staging about $3 a month, domain, ICO fee, free offsite dump storage, accountant hour. At launch or on a trigger: PI and cyber insurance (first non-friend user or first payment), Apple $99 and Google $25 (after incorporation and mobile M8), Railway Pro and PITR (public launch or first real user data). Pen test: NOT bought by default; trigger only if bank connection goes public, charging starts, or about 500 users; until then E20 hardening, ZAP baseline in CI, the security-reviewer agent and security.txt. This replaces the plan's pen-test-before-launch lean.
17. **Post-deploy checklist for PR 368 (priority order):** backend healthy and `CORS_ALLOWED_ORIGINS` exactly the production web origin; `WORKOS_REDIRECT_URI` is `https://<web host>/callback` and registered in WorkOS; real sign-in, refresh, no CORS errors; logout lands on marketing (origin whitelisted); public sign-up closed; password-reset email to the owner's own address only (the endpoint accepts any body email, E20 Q5); marketing CSP console check; `pg_dump` and note the previous deployment ID (rollback images last about 72 hours); within the week decode a real token, rotate D-12 secrets, review WorkOS session and MFA settings.

## Owner action list (agents do not do these)

**This week:** run item 17; raise the Railway limit to $25 and take the first offsite dump; restrict sign-up; reserve the npm org; buy the domain and set Cloudflare DNS and email forwarding; confirm items 1, 2, 4 and 14 (recorded here as confirmed by delegation).
**This month:** staging and the EU West move; Sentry EU org and DPA; ICO fee; FCA Innovation Hub enquiry; sign 2024/25 to 2026/27 vectors and book the accountant hour; check the 2027/28 figures; publish the beta notice and terms; invite 3 to 5 friends and run the interviews.
**At launch or on trigger:** incorporate; solicitor pack; insurance; Apple and Google accounts; Railway Pro and PITR; Cloudflare proxy, custom domains and WorkOS Production; npm publish and nightly evals; pen test only on a trigger.

# Round 4 (2026-11-12): decisions made while planning E17, E18, E20, E24, E25 and E29

The owner delegated these to agents. Straightforward decisions (low stakes, reversible) went to an Opus planner. Complicated ones went to a Fable decider. Nobody asked the owner. Rounds 1 to 3 still stand. Legal points are pragmatic sequencing, not legal advice. The plans these belong to are `E17-next-phases-plan.md`, `E18-no-owner-plan.md`, `E20-next-phases-plan.md`, `E24-plan.md`, `E25-plan.md` and `E29-plan.md`. Each plan opens with a "Round 4 overrides" box listing what changed in it.

## Straightforward (Opus)

| ID | Decision | Effect on tickets |
|---|---|---|
| E24 D1 page counts | **A.** Marketing counts page views with allow-listed log lines and a rollup script. Cloudflare zone analytics becomes a free cross-check after the proxy cutover. | E24-T9 as planned. No Umami, no beacon. |
| E24 D3 web indexing | **A.** The web app stays noindex permanently. Marketing owns every public page (E16 D7-B). | No change to `apps/web/app/utils/indexing.server.ts`. One `.env.example` line in E24-T6. |
| E24 D4 replies from support@ | **A.** Gmail "send mail as" through a free SMTP relay for the beta. | Documented in E24-T7. The owner sets it up. |
| E17 OD1 E23 picture in MCP | **A.** E17-N10 adopts it. E23 P2-3 is closed by reference. | E17-N10 after E23 P1-4/P1-7. |
| E17 OD3 canonical MCP URL | **`/mcp`.** `/v1/mcp` stays as an alias. | Future Sunset headers (E21) exempt `/mcp`. |
| E17 OD4 read tools before the E23 picture | **Yes**, built on `PortfolioSnapshot` with `missing[]`. | E17-N9 can start now. N10 swaps in the picture later. |
| E17 OD5 transaction search | **A.** Dropped from the v2 catalogue until F41 CSV import exists. | E20-N17 keeps today's entry until E17-N15 removes it. |
| E18 OD-1 trace sampling | **A.** `tracesSampleRate: 0`. | `assertSafeOptions` enforces it. |
| E18 OD-2 user on Sentry events | **A.** Omit `user`. | `scrubEvent` deletes it. |
| E18 OD-3 EU West Postgres move | **A.** Create a new EU West database, restore the final dump into it, then repoint `DATABASE_URL`. The old service is the rollback. | The `region-move.md` runbook follows path A. |
| E20 OD1 non-GET without Origin or Sec-Fetch-Site | **Reject with 403.** | E20-N1 tests it. |
| E20 OD2 rate limiter | **`@nestjs/throttler` if its peer range includes Nest 12.4.1, otherwise an in-house fixed-window store.** | E20-N13 step 1 runs a spike and records the result in the PR. |
| E20 OD3 cookie rename | **Now:** `__Host-wos-session`. Everything is test data, so the forced re-login costs nothing. | E20-N19, serialised with E20-N2. |

## Ticket ownership between plans (Opus)

| Overlap | Owner |
|---|---|
| PAT lifecycle | **E20-N16** owns the validation rules: 90-day default, {7, 30, 90, 365} allowed, null and 0 rejected, name 1 to 64 characters, `anonymizeInstitutions:false` rejected, and the `McpConnectionCard` options. **E17-N16** owns the checksum format, `DELETE /mcp-tokens` and its manifest entry. Order: E17-N6, E20-N16, E17-N7, E17-N16, E17-N15. |
| gitleaks | **E18-N7** creates a new `.github/workflows/security-scan.yml` with the gitleaks job. It does not edit `ci-pipeline.yml`. **E20-N27** appends ZAP and Semgrep jobs to that file and depends on E18-N7. |
| `apps/web/app/entry.server.tsx` | **E20-N3** goes first: it removes Emotion, and line 84 becomes `safeErrorSummary`. **E18-N3** goes next: `reportServerError` and `handleError`. **E20-N11** (nonce and CSP) goes last. |
| MCP scopes and limiter | Order: **E20-N17** (`packages/mcp/src/auth/scopes.ts` with today's names), then **E17-N8** (the `define-tool` hook absorbs the facade), then **E17-N15** (v2 rename). Limiter keying (`http.ts:75,136`) belongs to **E17-N6**. The per-user aggregate across tokens has no ticket and is an optional add-on to E17-N6. |
| Receipt data in MCP | **E20-N15** sets `select:false` on `receiptData`. **E17-N7** keeps the explicit column select, which also drops `receiptFilename` and `receiptMimeType`. |
| `/mcp` cross-user tests | **E20-N23** covers isolation and revoked tokens. **E17-N23** covers audit rows, usage, expiry and 429. |
| Redaction helper | `@flump/observability` (E18-N1) is the canonical scrubber. E20 logging reuses it and adds no second helper. |

## Complicated (Fable)

1. **E24 D2 pricing: A, a free beta with no price.**
   - During the friends beta, E24-T4 keeps the paid card with its placeholder badge and a disabled CTA.
   - At launch, `PRICING.status: "not-set"` removes the paid card and the toggle. The `£X`/`£Y` strings must be absent from the launch bundle: the T1 guard checks the build output, so hiding them is not enough.
   - Revisit only when the owner wants to charge. The order then is: incorporate, entitlements (T11), billing, reviewed terms, insurance, then `status: "set"`.
2. **E24 D5 footer identity: two stages.**
   - **Friends beta:** a truthful operator line, "Flump is run by [owner's name], a sole trader. Private, invite-only beta.", plus the contact email. No company number and no registered office. The owner supplies the name, and agents never invent it.
   - **Public launch:** the limited company's name, number and registered office, filled in when the company is incorporated. The launch guard keeps blocking until then, with no allow-list.
   - A new small E24 ticket (or part of T2) adds `OPERATOR_NAME_PLACEHOLDER` and `LEGAL_ENTITY.kind`.
   - The owner decides whether a postal address appears during the beta. The recommendation is email only, which is an accepted low-stakes risk.
   - The solicitor confirms the wording at launch.
3. **E18 OD-4 morgan access log with OAuth `?code=`: A, accepted for the beta.**
   - E18 adds an "Access logs" section to `docs/security/logging-policy.md`. It states the rule that no secrets or personal data go in web query strings.
   - A guard test lists the allowed `searchParams.get` keys. The Sentry scrubber strips query strings.
   - At the custom-domain cutover, a custom `@react-router/express` server with an allow-listed access log replaces `react-router-serve`. That amends E20 D4 at that point.
   - This moves earlier if logs leave Railway, if a route starts taking tokens or personal data in a query string, or if web request ids are needed.
4. **E20 OD4 step-up mechanism:**
   - **Default:** (a) AuthKit forced re-login, with freshness checked server-side.
   - **Fallback:** (b) a Magic Auth email code.
   - **Never:** (c) password re-entry.
   - The N20 spike must answer seven questions in writing (see `E20-next-phases-plan.md`, Round 4 overrides). The first is the pass/fail test: can AuthKit force a credential prompt while its own session is live? If it cannot, use (b) with no further decision round.
   - Step-up does not gate the friends beta, because bank connect is owner-only and un-anonymising a PAT is rejected. It must land before self-serve account deletion (F40).
5. **E29 timing: split into E29a and E29b.**
   - **E29a (free):** copy rules, an advice-language guard, disclaimers, a draft MCP DPIA and a widened Innovation Hub enquiry. It gates the friends beta, E25 copy and E26.
   - **E29b (the lawyer's perimeter view):** it goes inside the launch fixed-fee solicitor engagement, so rounds 3 items 15 and 16 stand. It gates public launch and E26 for non-friends.
   - **Before friends,** in addition to round 3 item 9:
     - the E29a copy pass and guard;
     - the widened Hub enquiry, covering projections, salary-sacrifice and pension outputs, and LLM replies via MCP;
     - MCP and PAT creation off for friends (owner-allowlisted) until the DPIA draft exists;
     - the beta notice saying "guidance and calculations, not advice; unreviewed".
   - **Before E26 ships to friends:**
     - the DPIA signed by the owner;
     - tool descriptions worded as guidance;
     - the unverified notice in every response;
     - evals showing no personal product recommendations;
     - the Hub reply received, or 8 weeks passed with no adverse signal;
     - an audit log.
   - **A separate written FCA opinion only on a trigger:** bank connection goes public, an adverse Hub reply, the solicitor will not cover the perimeter within the fixed fee, E26 gains writes or names products, or charging starts.

## Owner actions added by round 4

- Supply the footer display name.
- Decide whether a postal address appears during the beta.
- Approve the E24 copy (T2 to T4).
- Send the widened Innovation Hub enquiry.
- Sign the MCP DPIA draft.
- Approve widening the launch solicitor's scope to include a perimeter view.
- Do the WorkOS dashboard check needed for the step-up spike.
- No new spend.

## Round 4 addendum: E25, E29 and overlaps between plans (Opus, straightforward)

| ID | Decision | Effect on tickets |
|---|---|---|
| E25 D1 verification scope | **(b) by feature within a year.** The features are `core`, `hicbc`, `whatIf` and `scheduled`. `core` is the existing `uk-tax.vectors.ts` catalogue. | Adding E25 vectors never un-signs a year the owner has already signed. |
| E25 D2 April 2029 salary-sacrifice NI cap | **(a) opt-in toggle, off by default**, always labelled "Illustration ... Not yet law; may change." | E25-T7 adds a test that the cap is never applied implicitly. In E25-T10 the toggle sits under "More details". |
| E25 D3 live TaxTrapCalculator | **(b) engine figures now, labelled "Unverified estimate".** New E25 surfaces stay gated. | E25-T11. |
| E25 D4 HICBC and pension-method inputs | **(a) held in the session or scenario only.** No profile columns. | Revisit when E26 needs these inputs. |
| E25 D5 childcare £100k cliff | **(a) non-monetary marker** (Tax-Free Childcare and extended hours, per parent; sourced from gov.uk). | E25-T4 `kind: "nonMonetary"`, excluded from take-home and properties. E25-T11 deletes the false "All funded hours revoked". |
| E29 OD1 pension button | **A: "Model this contribution" pre-fills the form and never saves.** | E29-T4 test: `handleSyncContributions` is not called. |
| E29 OD2 lifecycle stages | **A: keep the enums for layout defaults only; drop all stage action text.** | E29-T5; E15 handoff for the dashboard hero. |
| E29 OD3 context-pack download | **A: counts as MCP and is gated.** | E29-T8 guards `mcp.controller.ts:80` as well as `:49`. |
| MCP environment variables | **`MCP_ENABLED`** stays the global kill switch (E20-N18). It defaults to true. When false, `/mcp`, PAT create and the context pack return 503 for everyone. **`MCP_OPEN_ACCESS`** (E29-T8, bank-connection pattern) plus **`MCP_ALLOWED_USER_IDS`**: when false or unset in production, only allowlisted users get access; everyone else gets 404 `feature_disabled`. Check order: kill switch, then auth, then allowlist. | E29-T8 lands first and creates `readMcpAccessConfig(env)` in `apps/backend/src/mcp-access.ts`; E20-N18 reuses it. E29 owner step 3 becomes: set `MCP_ALLOWED_USER_IDS=<owner id>` and leave `MCP_OPEN_ACCESS` unset. Do **not** set `MCP_ENABLED=false`. |
| `apps/web/app/copy-guard.test.ts` | **E29-T3 owns it.** | E25-T9 drops its guard edit. E25-T9 to T11 merge after E29-T3 and add no allow-list entries. |
| `packages/finance-engine/src/tax-year-verification.ts` | **E17-N5 owns the file.** Signature: `type TaxVerification = { status: "verified" \| "unverified"; detail: string }`; `getTaxYearVerification(year)` equals the `core` feature. E25-T8 appends `getTaxFeatureVerification(year, feature)`. Both are built on `yearVerification`, exported by E25-T8. | Whichever ticket lands first creates the file with exactly this signature. |
| `TaxTrapCalculator` directory | **E25-T11 owns all 5 files, including the copy.** It must meet E29 R2, R5, R6 and R8. | Remove it from E29-T3's E15-owned allow-list entries. E15 keeps `TaxTrapEscapeBanner` and the other `packages/ui` copy. |
| One-engine guard | E25-T15 folds into E23 P2-2 / E4 T17 if that ticket has landed, and otherwise creates `scripts/check-one-tax-engine.ts`, which P2-2 absorbs later. Either way: one `check:laws` entry, one baseline that only shrinks, and no new `ci-pipeline.yml` step. | E25-T15. |
| `financial-audit.tool.ts:113` | Order: E17-N1, then E17-N3, then E29-T5's one-line `observations` change, then E17-N11 deletes the tool. If the E29-T5 engine work is ready first, ship it with a `topRecommendations` alias that returns `[]`, and follow with the one-line change. | E29-T5 is not blocked by E17. |

# Owner decisions, round 5 (2026-11-12): visual direction update

1. **Direction C dark mode is the look the owner likes.** They really like the colours, illustrations and style of the dark mode in E15 Direction C "Warm guide": sand-tinted dark neutrals, deep teal-green primary, soft illustrations, big soft shapes, and coach-like plain-language headings ("What to do next", "Where you stand"). Its light mode is "so-so" and "could use a burst of colour".
2. **This overrides the indigo Direction A palette** (round 2 D1 hybrid and D2 "keep indigo, refine neutrals") and the round-3 assumption of recolouring the logo within indigo. What stays from D1: A's calm-ledger structure, B's compact density via D9-C, C's coach card. Fonts do not change: Inter plus Plus Jakarta Sans (round 3).
3. **Token migration is on hold** until the design-direction recommendation (Fable, read-only) arrives with a spec outline. Then: migrate the semantic tokens to the Direction C palette (WCAG AA both themes) and offer 2 to 3 more colourful light-mode variants for the owner to pick. Until then, E15 screen work keeps using the existing semantic tokens only and adds no new colour tokens.
4. Reference: `docs/design/e15/directions/c/index.html` (artifact: https://claude.ai/artifact/VjvVzjiPTWiAZz9nZHq5Gd, private to the owner).
5. **Fable design-direction recommendation, adopted as the decision (the owner can still override): hybrid.** Direction C's look on Direction A's structure and voice.
   - From C: teal-green primary, sand and warm-charcoal neutrals, soft large shapes, illustrations, plain-language headings.
   - Kept from A/B: KPI strip first, contextual density, stated assumptions, Inter plus Plus Jakarta Sans.
   - Not taken from C: the coach-first dashboard order, C's fonts, and any copy that tells users what to do with money.
   - Light mode: one deep-teal `surface.hero` block per page holding the headline figure, an apricot accent (`chart.debt` and the second illustration colour), illustrated empty states, everything else sand and white. Tinted KPI cards and a coloured header band are rejected.
   - Default theme stays "follow system"; use dark for marketing screenshots.
6. **Token notes** (re-run contrast with the mockup's real values; sand and charcoal hexes in the recommendation were stand-ins):
   - `primary.DEFAULT` light `#0F6B5E`, dark `#5CC4AE`. `primary.solid` stays deep teal in both themes (white on `#5CC4AE` is 2.11:1 and fails).
   - `status.positive` shifts to a yellower leaf green (it is otherwise indistinguishable from the new primary). Check `chart.wealth` against `chart.primary` at deltaE 15. `status.info` keeps indigo. `chart.band` moves to a teal alpha.
   - Addendum (PR 482): dark `primary.DEFAULT` is the mockup's real `#6fd0ba`; `chart.primary` dark is `#5cc4ae` (the mockup's dark `primary-solid`).
   - New token `surface.hero` (requires the AGENTS.md section 2 edit, included in this PR). Radii 16 to 24 px in comfortable contexts, 8 to 12 px compact.
7. **Illustrations:** inline decorative SVGs (`aria-hidden`), one per view, colours from semantic tokens, only in empty states, onboarding, error/404 and marketing; never inside KPIs, charts or tables; no outcome imagery. The logo recolour moves to the teal family, which supersedes round 3 item 2.
8. **Copy rules (E29):** keep "Where you stand" and "No pressure, you can change this any time". Rewrite "Your next best step" and "What to do next" as "Finish setting up" or "What your numbers show". Rewrite "Clear the Amex card first" as a factual comparison with a "Compare payoff orders" button. CoachCard is housekeeping-only. Coordinate with the advice guard (PR 474) and add no allow-list entries.
9. **PR order:** (1) docs: this round, tokens.md, the AGENTS.md `surface.hero` edit; (2) token palette swap plus a11y separation tests (`KNOWN_FAILURES` stays empty), landed before any visual baselines; (3) Storybook sign-off frame of C's dashboard, light and dark, at 1280 and 375, with real tokens and fonts (the owner's yes/no gate before screens migrate); (4) radii and elevation; (5) hero surface on the dashboard net-worth block and the mortgage outcome card; (6) illustrations, logo recolour, CoachCard copy. Dashboard and mortgage branches are not paused; they rebase onto (2).
