# E24 Launch readiness and business model: implementation plan

> **Round 4 overrides** (see [DECISIONS.md round 4](DECISIONS.md)). Where these conflict with the text below, these win:
> - D1 A, D3 A, D4 A (Gmail send-as through a free SMTP relay).
> - D2 (Fable): A, a free beta. T4 renders the paid card and toggle only while `FLUMP_LAUNCH` is not true or `PRICING.status === 'set'`. Add a launch-state test: no paid card, no toggle, and no `£X` in the bundle (T1 checks the build output, so CSS-hiding is not enough).
> - D5 (Fable): two stages. Friends beta: a truthful sole-trader operator line with a name the owner supplies, the contact email, and no company number or office. Launch: company details on incorporation, with the guard blocking until then. New ticket **E24-T12**: `OPERATOR_NAME_PLACEHOLDER` plus `LEGAL_ENTITY.kind: 'sole-trader' | 'company'` in `placeholders.ts`, and the Footer renders by kind (after T2 and T3, before T4; Footer.tsx and placeholders.ts).
> - readiness.json: the 'FCA view' attestation stays a launch item (E29b).

**Status:** plan only. Nothing is implemented. Written against origin/main `c3297f26` (2026-11-12).
**Scope:** E24 as defined in `docs/audit/EPICS.md:580-585`, plus the launch-readiness checklist at `docs/audit/EPICS.md:594-614`.
**Blocked by (for the checklist to *pass*):** E18, E19 and E20. The tooling, docs and marketing tickets below can start now.

## What already exists on main

| Item | Evidence |
|---|---|
| noindex by default, robots `Disallow: /` unless `ALLOW_INDEXING` is exactly `"true"`; `/healthz` | `529bcab1`. Marketing: `apps/marketing/server/ops.ts:6-34`, wired at `apps/marketing/server.ts:41`. Web: `apps/web/app/utils/indexing.server.ts:6-21`, `apps/web/app/routes/robots[.]txt.ts`, `apps/web/app/entry.server.tsx`. Documented in `apps/marketing/.env.example` and `apps/web/.env.example` |
| security.txt served only when `SECURITY_CONTACT` is a valid email or https URL | `5bd34ea2`. `apps/marketing/server/security.ts:62-83`, `apps/marketing/server/ops.ts:41-57` |
| Placeholders file | `apps/marketing/src/utils/placeholders.ts:8-14` holds `£X`, `£Y` and three `[... PLACEHOLDER]` company strings. **The EPICS text is out of date:** `security@example.invalid` is no longer in this file, because the security contact is now env-gated. |
| Pricing page with a placeholder price, a disabled paid CTA and a "Placeholder price: not final" badge | `32f9d2f5`. `apps/marketing/src/pages/PricingPage.tsx:117-269`. The page is a flat file, not a colocated directory. |
| Footer shows the placeholder company details | `apps/marketing/src/components/Footer.tsx:151-158` |
| All `flump.co.uk` references removed; cookies are host-only | `6a5d86a9`. Hardcoded Railway fallbacks remain at `apps/marketing/server/security.ts:3,13-14`, `apps/marketing/src/utils/url.ts:27-30` and `apps/web/app/utils/marketingUrl.ts:12` |
| Closed beta: backend allowlist and an invite-only page | `e7f0ae9e`, `docs/runbooks/e19-closed-beta-signup.md` |
| Copy guards that can be extended | `apps/marketing/src/claims.test.ts:9-37`, `apps/web/app/copy-guard.test.ts:12-21` |
| Pattern for a CLI guard with a lib, bun tests and a CI step summary | `scripts/check-tax-year-calendar.ts`, `scripts/lib/tax-year-calendar.ts`, `.github/workflows/ci-pipeline.yml:57-87`, `scripts/ci-config.test.ts:69` |
| Analytics | None, confirmed by the E19 data map (`docs/audit/plans/E19-plan-draft.md:65`) |

**Problems found while reading the code (fixed in the tickets below):**
1. **Fake feedback form in web.** `apps/web/app/components/home/HomeFooter.tsx:70-82` says "Your message has been received" but sends nothing. Line 248 shows `support@flump.app`, a domain the project does not own. The footer is still used by `routes/tools.$slug.tsx:473` and `routes/tools._index.tsx:321`.
2. **Sign-up CTAs go to a closed sign-up.** Every marketing sign-up button points at `${appUrl}/signUp`, but sign-up is invite-only. Locations: `Header.tsx:252,378`, `Footer.tsx:136`, `HomePage.tsx:111,207`, `McpPage/McpPage.tsx:304`, `ToolPage.tsx:40`, `InteractiveFinancialTeaser.tsx:259,270`, `PricingPage.tsx:210`.
3. **The build flag would be invisible to the build.** `turbo.json` declares no `env` for `build`, so turbo's strict env mode would hide any new build flag. The Dockerfiles also declare no `ARG`.

---

## Tickets (one PR each)

### E24-T1: Launch flag and placeholder build guard
- **Goal:** with `FLUMP_LAUNCH=true`, the web and marketing production builds fail if they contain placeholder text. Without the flag, the guard does nothing.
- **Files:**
  - NEW `scripts/lib/launch-placeholders.ts`. A pure scanner that takes a list of files and returns the hits.
    - Patterns: `PLACEHOLDER` (case-sensitive), `example\.invalid`, `£[XY]\b` and `\\u00a3[XY]\b` (in case the minifier escapes the pound sign), and unowned domains (`flump\.app`, `flump\.co\.uk`).
    - Skips `.map` files.
  - NEW `scripts/check-launch-placeholders.ts`. A CLI that takes directories as arguments.
    - Exits 0 straight away unless `FLUMP_LAUNCH === "true"` or `--force` is passed.
    - Exits 1 when it finds hits, listing each file and pattern.
    - Exits 3 when a directory is missing. A build that produced nothing must not pass.
  - NEW `scripts/check-launch-placeholders.test.ts` (bun:test).
  - `apps/marketing/package.json:9`: `"build"` gains `&& bun ../../scripts/check-launch-placeholders.ts dist`.
  - `apps/web/package.json:79`: `"build"` gains `&& bun ../../scripts/check-launch-placeholders.ts build`.
  - `turbo.json` `tasks.build`: add `"env": ["FLUMP_LAUNCH"]`.
  - `apps/marketing/Dockerfile:24-27` and `apps/web/Dockerfile` (build stage, before the RUN at :28): add `ARG FLUMP_LAUNCH`. Railway passes service variables as build args only when the Dockerfile declares them.
  - `apps/marketing/.env.example` and `apps/web/.env.example`: document `FLUMP_LAUNCH`.
- **Depends on:** none.
- **Parallel-safe with:** T2-T7, T9-T11.
- **Conflicts:**
  - Light overlap with E15 on `apps/web/package.json` (scripts line only).
  - The E12 Docker CI check from `e9455f8b` must stay green.
  - Does not touch `placeholders.ts`.
- **Verify:**
  - Unit tests: a fixture dir with each pattern; a clean dir; the flag off means a no-op; a missing dir exits 3.
  - Manual: `FLUMP_LAUNCH=true rtk bun run build` on current main must fail and list exactly the known placeholders (placeholders.ts strings, HomeFooter `support@flump.app`). The same build without the flag must pass.
  - `docker build` both images with `--build-arg FLUMP_LAUNCH=true`: expect failure; without the arg: expect success.
  - The AGENTS.md section 5 checks: `rtk bun run lint`, `rtk bun run check-types`, `rtk bun run test`, `rtk bun run build`.
- **Risks:**
  - False positives from bundled dependencies (the uppercase `PLACEHOLDER` pattern). Check them in the manual run and allow-list by file and pattern only, with a reason.
  - The guard only sees build-time text. Runtime env values (for example `SECURITY_CONTACT`) are covered by T10's owner attestations.

### E24-T2: Support channel and contact page (marketing; delivers E19 D13's page)
- **Goal:** one place for the support and privacy contact details, and a real `/contact` page.
- **Files:**
  - `apps/marketing/src/utils/placeholders.ts`: add `SUPPORT_EMAIL_PLACEHOLDER = "support@example.invalid"` and `PRIVACY_EMAIL_PLACEHOLDER = "privacy@example.invalid"`. These follow the round 1 single-greppable-placeholder rule, and T1 catches them.
  - NEW `apps/marketing/src/utils/site.ts`. Exports `SUPPORT_EMAIL`, `PRIVACY_EMAIL`, `SIGNUP_MODE: "invite-only" | "open"` (default `invite-only`, per round 3 item 15) and `mailto(address, subject)`.
  - NEW colocated `apps/marketing/src/pages/ContactPage/` with `ContactPage.tsx`, `.styles.ts`, `.stories.tsx`, `.test.tsx` and `index.ts`.
    - Sections: support, feedback, beta invite request (anchor `#beta`), a security link to `/security`, and a complaints section.
    - The complaints section has a heading and the mailbox only. Its wording is held for the owner (E19 s164A).
  - `apps/marketing/src/App.tsx:5-19`: add the `/contact` route.
  - `apps/marketing/src/components/Footer.tsx:141-147`: add a Contact link.
  - `packages/ui/src/tokens/architecture.laws.test.ts:34` already scans `MARKETING_PAGES_DIR`. No edit is needed, but confirm the new directory passes.
- **UI laws:** law 1 (five files, because it is a page), law 2 (semantic tokens only; no inline `style`), law 4 (Light and Dark stories with a11y, and `play()` checks the mailto hrefs).
- **Depends on:** none.
- **Parallel-safe with:** T1, T5, T6, T7, T9, T10, T11.
- **Conflicts:**
  - T3 (Footer, `site.ts`) and T4 (`site.ts`): run in the order T2, then T3, then T4.
  - Future E19 C1-C4 pages edit `App.tsx` and the Footer. Coordinate the order.
- **Verify:**
  - Tests: the page renders both mailboxes, the `#beta` anchor exists, and no financial data appears in the mailto body.
  - Extend `claims.test.ts` with a test that the contact page makes no response-time promise (E7 S9, "1 business day").
  - Run the section 5 checks.
  - Merges after the owner approves the copy (E7).
- **Risks:** this overlaps E19 D13. Record in the E19 ledger that T2 delivers D13's page structure, so the work is not done twice.

### E24-T3: Closed-beta sign-up CTAs (marketing)
- **Goal:** no CTA promises a sign-up that the invite-only system will refuse.
- **Files:**
  - `apps/marketing/src/utils/site.ts` (from T2): add `signupCta()`.
    - `invite-only`: `{ href: "/contact#beta", label: "Request an invite" }`.
    - `open`: `{ href: \`${appUrl}/signUp\`, label: "Get started" }`.
  - Replace the hardcoded hrefs and labels at `Header.tsx:252-265,378-383`, `Footer.tsx:136-138`, `HomePage.tsx:111,207`, `McpPage/McpPage.tsx:304-306`, `ToolPage.tsx:40` and `InteractiveFinancialTeaser.tsx:259,270`.
  - Update the existing tests and stories that assert "Sign up" or "Get started" (`Header.test.tsx`, `Footer.test.tsx`, `HomePage.test.tsx`, `McpPage.test.tsx`, `ToolPage.test.tsx`).
  - Add a marketing test that no non-test source contains the literal `/signUp` outside `site.ts`.
- **UI laws:** law 2 only; no new components.
- **Depends on:** T2.
- **Parallel-safe with:** T1, T5, T6, T7, T9, T10, T11.
- **Conflicts:** T2 and T4 (Footer, `site.ts`). Run after T2 and before T4.
- **Verify:** the tests above and the section 5 checks. Manually check `/`, `/mcp` and `/tools/*` in a dev server in Light and Dark.
- **Risks:** the `InteractiveFinancialTeaser` hands off the onboarding seed through `/signUp`. In invite-only mode that hand-off is skipped, which is correct while sign-up is closed. Note it in the PR.

### E24-T4: Truthful pricing / free-beta page
- **Goal:** the page states the real position: a free, invite-only beta where nothing is charged. It keeps the full plan design with the obvious `£X`/`£Y` placeholder, as DECISIONS round 1 requires, and adds no trial or Pro claims.
- **Files:**
  - Move `apps/marketing/src/pages/PricingPage.tsx`, `.test.tsx` and `.stories.tsx` into a NEW colocated `apps/marketing/src/pages/PricingPage/` with five files.
    - The css blocks at `:12-105` move to `PricingPage.styles.ts`.
    - Remove the inline `style` props at `:122,133,135,195,199,210,214,239,254`.
    - The `App.tsx:5` import path resolves to the barrel unchanged.
  - Copy changes:
    - Intro `:138-141` and meta `:125-128` say "free, invite-only beta; nothing is charged; a paid plan may come later and its price is not set".
    - The Free card CTA `:210-218` uses `signupCta()`.
    - Keep the paid card `:221-261` with its placeholder badge (`:236`) and disabled button.
  - NEW `apps/marketing/src/utils/pricing.ts`. A single `PRICING` object `{ monthly, annual, status: "not-set" | "set" }` that reads from `placeholders.ts`, so the owner changes one file when a price is set.
  - Tests:
    - The beta statement is present.
    - `/trial|Pro\b|No credit card/` is absent.
    - The toggle switches the placeholder (`role="switch"`, `aria-checked`).
    - The paid CTA is disabled.
  - Story `play()` covers the toggle in Light and Dark.
- **UI laws:** law 1 (five files), law 2 (semantic tokens: the existing `status.warning.*` badge is fine), law 2 tabular-nums (keep `:81,87`), law 4.
- **Depends on:** T3 (`signupCta`). After T1 lands, a launch build fails until the owner sets a price or chooses free-beta-only (open decision D2).
- **Parallel-safe with:** T1, T5, T6, T7, T9, T10, T11.
- **Conflicts:** `site.ts` and `pricing.ts` only, so it is sequential after T3. E15 D11a (expressive marketing layer) may restyle this page later, so land T4 first.
- **Verify:** the tests and stories above, zero a11y violations in Light and Dark, and the section 5 checks. Merges after the owner approves the copy (E7).
- **Risks:** a monthly/annual toggle with no real price is mildly odd. It stays because round 1 requires the full design.

### E24-T5: Web feedback and support (remove the fake form)
- **Goal:** web feedback is a real channel. No fake form remains, and no unowned domain appears.
- **Files:**
  - NEW `apps/web/app/utils/support.ts` and `support.test.ts`.
    - `SUPPORT_EMAIL = "support@example.invalid"` (placeholder; T1 catches it).
    - `feedbackMailto(routeKey: string, appVersion: string)`. The subject is prefilled with the route key and version only: no amounts and no free text from app state.
  - `apps/web/app/components/home/HomeFooter.tsx`:
    - Delete the fake submit state and handlers at `:64-90` and the modal form around `:200-260`.
    - Replace `support@flump.app` at `:248` with a "Send feedback" mailto link built from `feedbackMailto`.
    - Do not restyle the file. Its inline styles are E15 T3.12's job.
  - `apps/web/app/features/feedback/components/RouteErrorState/RouteErrorState.tsx`: add a "Report this problem" mailto link to the invite-only and error states. The component directory already has all five files, so update its test and story.
  - `apps/web/app/copy-guard.test.ts:12-15`: ban `flump\.app` and `flump\.co\.uk`, plus "message has been received" unless something is actually sent.
- **UI laws:** law 1 (`RouteErrorState` already has five files; HomeFooter is a legacy flat file and is only reduced here), law 2 (semantic tokens for the new link), law 4 (story and test cover the link).
- **Depends on:** none.
- **Parallel-safe with:** everything except T8.
- **Conflicts:**
  - E15 T3.12 (signed-out web surfaces, `components/home/*`) is not in flight. Land T5 first, or fold it into T3.12 if that starts first.
  - Not in E15's in-flight mortgage or dashboard files.
- **Verify:**
  - Tests: HomeFooter has no form or textarea and shows the mailto href; `RouteErrorState` renders the link; the copy guard passes.
  - Run the section 5 checks.
  - Optional: `rtk bun run test:storybook` and `rtk bun run test:storybook:dark` for `RouteErrorState`.
- **Risks:** mailto depends on the user's mail client. That is acceptable for a beta of 3 to 5 friends.

### E24-T6: Deliberate indexing, canonical URLs and sitemap (marketing server)
- **Goal:** indexing can only be turned on deliberately, and once it is, it is correct.
- **Files:**
  - `apps/marketing/server/ops.ts:6`: `isIndexingAllowed` requires both `ALLOW_INDEXING === "true"` and `FLUMP_LAUNCH === "true"`. Log a warning at boot if only one of the two is set.
  - `apps/marketing/server/ops.ts:26-31`: when indexing is allowed and `SITE_URL` is set, robots.txt adds a `Sitemap: ${SITE_URL}/sitemap.xml` line.
  - NEW `apps/marketing/server/sitemap.ts` and `sitemap.test.ts`.
    - `GET /sitemap.xml` returns 404 unless indexing is allowed and `SITE_URL` is a valid https origin.
    - URLs come from a route list (`/`, `/tools`, `/pricing`, `/security`, `/mcp`, `/contact`) plus the tool slugs from the registry `ToolsIndexPage` uses.
    - Mount it in `registerOps` at `ops.ts:60-64`.
  - `apps/marketing/server.ts:82-87`: when `SITE_URL` is set, inject `<link rel="canonical" href="${SITE_URL}${pathname}">` with the query stripped. Skip it otherwise, because `6a5d86a9` removed canonicals until a domain exists.
  - `apps/marketing/server/ops.test.ts`: cover the four flag combinations.
  - `apps/marketing/.env.example`: document `SITE_URL` and the two-flag rule.
  - Web stays noindex by configuration (open decision D3). No change to `apps/web/app/utils/indexing.server.ts`.
- **Depends on:** T1 (flag name). It sits behind config, so it is inert until the domain exists.
- **Parallel-safe with:** T1-T5, T7, T10, T11.
- **Conflicts:** T9 (`server.ts`). Run T6 before T9.
- **Verify:**
  - Tests for every flag combination, the XML shape, and the absence of the canonical tag without `SITE_URL`.
  - `curl -I` against `bun run start` locally, with and without the flags.
  - Run the section 5 checks.
- **Risks:** changing what `ALLOW_INDEXING` means could surprise someone who sets it alone. The boot warning and the `.env.example` text cover that.

### E24-T7: Domain, email, launch-day and support runbooks (docs only)
- **Files:**
  - NEW `docs/runbooks/launch-domain-and-email.md`:
    - Cloudflare DNS for the Railway custom domains (CNAME and TXT verification; proxy off until the cutover, per round 3 item 11).
    - Cloudflare Email Routing for `support@`, `privacy@` and `security@` to the owner's inbox.
    - SPF and DMARC records for routing.
    - Note that routing receives mail only; replies need a sending setup (open decision D4).
    - Per-service env change list:
      - Marketing: `APP_URL`/`VITE_APP_URL`, `SECURITY_CONTACT`, `SITE_URL`, `ALLOW_INDEXING`, `FLUMP_LAUNCH`, analytics vars.
      - Web: `VITE_MARKETING_URL`, `VITE_WORKOS_REDIRECT_URI`.
      - Backend: `CORS_ALLOWED_ORIGINS`, WorkOS Production environment, `TRUST_PROXY_HOPS` once the Cloudflare proxy is on (`docs/security/owner-steps.md:36`).
    - The hardcoded Railway fallbacks to override (`security.ts:3,13-14`, `url.ts:27-30`, `marketingUrl.ts:12`).
    - HSTS preload after 3 stable months.
  - NEW `docs/runbooks/launch-day.md`. Sequence:
    1. `bun run check:launch --strict` passes.
    2. Placeholder swap (T8).
    3. Set `FLUMP_LAUNCH=true` on web and marketing; the build guard passes.
    4. Set `SITE_URL`.
    5. Set `ALLOW_INDEXING=true` on marketing only.
    6. Owner submits the sitemap.
    7. Analytics on only after the notice is live (T9).
    - Rollback: unset `ALLOW_INDEXING`.
  - NEW `docs/runbooks/support-and-feedback.md`:
    - Mailbox check at least weekly with an autoresponder (E19 O3).
    - Complaints acknowledged within 30 days (s164A, per the E19 plan).
    - Feedback becomes an issue with `needs-triage` (`docs/agents/triage-labels.md`).
    - Never paste user financial data into issues.
- **Depends on:** none.
- **Parallel-safe with:** all tickets.
- **Verify:** `rtk bun run lint` (biome formats markdown through lint-staged), then a link check by eye.
- **Risks:** Cloudflare and Railway dashboard labels change. Mark the steps "verify against the live console".

### E24-T8: Swap placeholders for real contact details (triggered)
- **Goal:** replace the support and privacy placeholders with the real addresses once the owner's domain and mailboxes work.
- **Files:**
  - `apps/marketing/src/utils/placeholders.ts`: replace the support and privacy constants (from T2), or move them into `site.ts`.
  - `apps/web/app/utils/support.ts` (from T5).
  - Company details stay placeholders until the entity decision (DECISIONS round 2 conflict 13, round 3 item 15). T1 therefore keeps blocking a launch build until that is resolved, which is intended.
  - Update the tests that pin the placeholder values (`placeholders.test.ts:6-7`, `Footer.test.tsx:42-44`).
- **Depends on:** OWNER STEPS O1 and O2 (domain and mailboxes live, inbound tested), and T2 and T5.
- **Conflicts:** T2 and T5 files, so run it last.
- **Verify:**
  - A `FLUMP_LAUNCH=true` build lists only the company and price hits.
  - Run the section 5 checks.
  - The owner sends a test email to each address.

### E24-T9: Cookieless page counts behind a flag (marketing)
- **Goal:** first-party page counts with no cookies, no device storage, no IP address, no user agent and no third party (round 2 E16 D9-A, E19 D9 "cookieless at launch after the PECR notice"). The feature is built now and stays off.
- **Files:**
  - NEW `apps/marketing/server/analytics.ts` and `analytics.test.ts`. Middleware that is enabled only when **both** of these are set:
    - `ANALYTICS_MODE === "log"`;
    - `ANALYTICS_NOTICE_URL` is set. This is the published cookie and storage statement (E19 C3), and is the code-level form of round 2 conflict 6.
  - What it counts and logs:
    - Counts only `GET` HTML navigations.
    - Maps the path to an allow-listed route key (`/`, `/pricing`, `/tools/<known-slug>`, …, otherwise `other`).
    - Keeps only the referrer host.
    - Drops known bots.
    - Emits one JSON log line: `{"type":"pageview","key":...,"ref":...,"day":"YYYY-MM-DD"}`.
    - Never sets a cookie.
  - `apps/marketing/server.ts:59-61`: mount it after sirv (assets never reach it) and before the SSR catch-all.
  - NEW `scripts/ops/pageview-rollup.ts` and `pageview-rollup.test.ts`. Reads exported Railway log lines on stdin and prints daily counts per key.
  - `apps/marketing/.env.example`: document the flag and the gate.
- **Tests:**
  - No `Set-Cookie` header.
  - No IP or user agent in the log line.
  - An unknown path maps to `other`.
  - Disabled when either env var is missing.
  - Assets are not counted.
- **Out of scope:** E16 §7 backend `product_event` (signed-in product events). That needs a backend module and api-contract schemas, which conflicts with E21. Leave it with E16 and E21 behind its own flag.
- **Depends on:** T6 (`server.ts` order). Can only be **enabled** after E19 C1/C3 are published and the owner sets the env.
- **Parallel-safe with:** T1-T5, T7, T8, T10, T11.
- **Conflicts:** T6 (`server.ts`).
- **Verify:** the tests above, the section 5 checks, and a manual check of local `bun run start` with the flags set: inspect the log output and the response headers.
- **Risks:**
  - Railway Hobby keeps logs for 7 days, so the owner must run the rollup weekly or ship logs (E18 notes it should wait for redaction).
  - If D1 picks a different option, this ticket changes.

### E24-T10: Machine-checkable launch-readiness checklist
- **Goal:** each line of `docs/audit/EPICS.md:595-614`, plus the E24 lines, maps to evidence a script can check.
- **Files:**
  - NEW `docs/launch/readiness.json`. Items have `{ id, text, epic, evidence[] }`. Evidence kinds:
    - `file`: a path exists (for example `docs/runbooks/breach.md`, the `/privacy` route in `apps/marketing/src/App.tsx`).
    - `absent`: a regex is absent under the given paths (placeholders in `apps/marketing/src` and `apps/web/app`, `C-11`'s `netProfit * 0.29`).
    - `present`: a regex is present.
    - `command`: an existing root script that exits 0 (`check:tax-calendar`, `tax:signoff` status, `check:audit`).
    - `owner`: an attestation `{ by, date, note }` that is empty until the owner provides it (ICO fee, FCA view, restore drill, DPAs, domain live, mailbox monitored).
    - E24 adds these items: support channel live, feedback route, analytics only after the notice, entitlements design present, sign-up mode matches the WorkOS setting.
  - NEW `scripts/lib/launch-readiness.ts`, `scripts/check-launch-readiness.ts` and `scripts/check-launch-readiness.test.ts`.
    - By default it prints a table and exits 0 (report mode).
    - With `--strict`, or `FLUMP_LAUNCH=true`, it exits 1 on any failing or unattested item.
    - `--markdown` prints the table for a PR body.
    - The **drift test** parses every `- [ ]` line under the "Launch-readiness checklist" heading in EPICS.md and fails if any line has no item with identical `text`.
  - Root `package.json` scripts: add `"check:launch": "bun scripts/check-launch-readiness.ts"`.
  - `.github/workflows/ci-pipeline.yml`: after the tax guard (`:57-87`), add an advisory step that writes the report to `$GITHUB_STEP_SUMMARY` and never fails in report mode (no required checks, per round 2 conflict 12).
  - `scripts/ci-config.test.ts`: add a test, following the pattern at `:69`, that CI runs `check:launch`.
- **Depends on:** none. It reads paths created by other epics and reports them as failing until they exist.
- **Parallel-safe with:** all tickets.
- **Conflicts:** `.github/workflows/ci-pipeline.yml` and root `package.json` may also be edited by E11 or E18. Keep the diff to one step and one script line.
- **Verify:**
  - Unit tests for each evidence kind and the drift test.
  - `rtk bun run check:launch` on main prints mostly failing items and exits 0; `--strict` exits 1.
  - Run the section 5 checks.
- **Risks:**
  - Owner attestations are self-reported. The rule: only the owner's own commit or message fills `owner` evidence, and an agent never fills it.
  - Regex evidence can go stale. Keep items narrow and cite the ledger.

### E24-T11: Entitlements design, deferred (docs only)
- **Files:** NEW `docs/launch/entitlements-design.md`. Status: DEFERRED, with no code until the owner decides to charge and has incorporated (round 3 item 15). Contents:
  - Plan model (`free`, `paid`) and entitlement keys (`bank_connect`, `mcp_write`, `export_formats`, …).
  - One backend source: `GET /v1/me/entitlements`, enforced in backend guards with web gating as display only.
  - Grandfathering for beta users.
  - Billing provider options: merchant-of-record versus Stripe plus own VAT. This is the owner's decision, through the decider.
  - Data minimisation for billing (E19 processor register).
  - What the pricing page shows for each state (T4's `PRICING.status`).
- **Depends on:** none.
- **Parallel-safe with:** all tickets.
- **Verify:** lint. The owner reviews it.

---

## OWNER STEPS (agents do not do these)

- **O1 (this week, round 3 items 11 and 16):** buy the domain (about £10 a year) and add it to Cloudflare free.
- **O2:** enable Email Routing for `support@`, `privacy@` and `security@`, verify the destination inbox, and test inbound mail. Set up the weekly check and autoresponder (E19 O3).
- **O3:** decide how replies are sent (D4).
- **O4 (Railway env):** set `SECURITY_CONTACT=security@<domain>` on marketing now. At launch, set `FLUMP_LAUNCH`, `SITE_URL`, `ALLOW_INDEXING` (marketing only) and, after the notice, `ANALYTICS_MODE` and `ANALYTICS_NOTICE_URL`.
- **O5 (at launch):** add the Railway custom domains and DNS records, switch WorkOS to the Production environment with the new redirect URIs, update `CORS_ALLOWED_ORIGINS`, turn on the Cloudflare proxy and set `TRUST_PROXY_HOPS`. Consider HSTS preload after 3 months.
- **O6:** approve the marketing copy for T2, T3 and T4 (E7: the owner signs off all copy). Approve the complaints wording on `/contact` (E19).
- **O7:** decide on pricing and when to charge (D2). Incorporate before charging (round 3 item 15). Arrange insurance when the trigger is met (item 16).
- **O8:** supply the company or sole-trader footer details once the entity decision is made (D5, solicitor).
- **O9:** verify the domain in Google Search Console and Bing (DNS TXT) and submit the sitemap at launch.
- **O10:** fill the `owner` attestations in `docs/launch/readiness.json` (ICO fee, FCA view, restore drill, DPAs, mailbox monitored, WorkOS sign-up closed). Commit them or send them in writing.
- **O11:** run the weekly pageview rollup once analytics is on.
- **O12:** merge every E24 PR and the release PRs.

## OPEN DECISIONS

- **D1: How marketing counts page views.** *Straightforward* (reversible, no personal data either way).
  - A. Allow-listed log lines plus a rollup script. Costs £0 and adds no processor (T9).
  - B. Self-hosted Umami on Railway (about $5 a month, a new DB, more ops).
  - C. Cloudflare Web Analytics beacon (third-party JS and a new processor). Cloudflare's zone analytics also become free once the proxy is on.
  - **Recommendation:** A now. Use Cloudflare zone analytics as a free cross-check after the proxy cutover.
- **D2: Pricing at launch, when T1's guard fires on `£X`.** *Complicated* (financial and legal: billing, VAT, consumer terms, insurance trigger; send to fable or the owner).
  - A. Launch as a free beta: hide the paid card behind `PRICING.status`, no price.
  - B. Set a real price at launch, which needs incorporation, billing, T11 built and the terms.
  - C. Keep the placeholder card and allow-list it in the guard. Not truthful at launch, so rejected.
  - **Recommendation:** A.
- **D3: Web app indexing.** *Straightforward.*
  - A. The web app stays noindex permanently; only marketing is ever indexed, consistent with E16 D7-B.
  - B. Index web `/tools`.
  - **Recommendation:** A, by not setting the variable. Optionally add a doc line to `apps/web/.env.example`.
- **D4: Sending replies from `support@`.** *Straightforward,* but money if a paid mailbox is chosen.
  - A. Gmail "send mail as" through a free SMTP relay.
  - B. A paid mailbox (about £3 to £8 per mailbox per month, E19 plan :490).
  - C. Reply from the personal address.
  - **Recommendation:** A for the beta.
- **D5: Footer identity for a sole trader at launch.** *Complicated* (legal, Business Names Act style disclosure; include it in the solicitor pack, round 3 item 15). No recommendation beyond "keep the placeholders until the solicitor answers". T1 keeps a launch build blocked until then.

## Lane summary (which tickets can run at the same time without touching the same files)

- **Lane A, scripts and infra:** T1 and T10 run concurrently. T1 touches turbo, the Dockerfiles and the app package.json build lines; T10 touches root package.json, the CI workflow and ci-config.test.
- **Lane B, marketing UI:** T2, then T3, then T4 (shared Footer, `site.ts` and App.tsx).
- **Lane C, marketing server:** T6, then T9 (shared `server.ts`). Runs concurrently with Lane B: there is no file overlap, because the sitemap only reads the tool registry.
- **Lane D, web:** T5, alone. It stays clear of E15's mortgage and dashboard files and packages/ui. Land it before E15 T3.12.
- **Lane E, docs:** T7 and T11, any time.
- **Last:** T8, after O1 and O2, T2 and T5.
- **Overlap with work in other sessions:**
  - None with E12 (mobile-companion) or E21 (backend and api-contract): E24 touches no backend code, and T9 deliberately leaves product events out.
  - E15 overlap is limited to T5's HomeFooter and RouteErrorState and the scripts line of `apps/web/package.json` in T1.

