# E19 Privacy, legal and regulatory: implementation plan (draft for owner review)

Status: planning only. Nothing has been implemented. Prepared 2026-11-12 by a read-only planner.

**This is not legal advice.** I am not a lawyer. Where this plan describes the law, it says what the primary text says and what to ask a qualified adviser. It does not give a conclusion. Anything marked SOLICITOR needs a qualified UK solicitor, or a direct answer from the ICO or FCA, before anyone relies on it.

**Evidence markers**
- **[V-code]**: I read it in the code on local `main` (`e4ff6c3`). My worktree branch `ci-release-please-token` is 123 commits behind `main`, so every code citation below is from `main`.
- **[V-src]**: I fetched and read the primary source on 2026-11-12.
- **[U]**: unverified or inferred. Check before relying on it.

---

## 1. Summary

Flump holds detailed personal financial data and has none of the legal paperwork a public service needs: no privacy notice, no terms, no published cookie position, no ICO fee, no ROPA, no DPIA, no account deletion, no data export, no breach runbook and no monitored contact address. The bank-connection prototype can also be used today by anyone who can sign up.

Two things stand out from the code and the sources:

1. **Bank connection is reachable in production, and the legal question is open.** `POST /bank-connections` stores an encrypted personal access token and syncs accounts, balances and transactions from Monzo, Starling and Trading 212 [V-code]. The marketing site says bank connection is "coming soon" and "not available yet" [V-code]. The UK definition of an account information service explicitly covers a service whose information goes "only to the payment service user" [V-src: PSRs 2017 reg 2]. The technical-service-provider exclusion explicitly does not cover account information services [V-src: PSRs 2017 Sch 1 Pt 2 para 2(j)]. Monzo's own developer docs say its API "is not suitable for building public applications" and allow connection only to "your own account or those of a small set of users you explicitly allow" [V-src]. Flag it off now for everyone except, possibly, the owner, until a solicitor has given a view.
2. **Moving Railway to the EU does not remove US transfers.** WorkOS is a US processor whatever region Railway runs in, so transfer documentation is needed in every case. Railway's privacy policy says it complies with the EU-US Data Privacy Framework and its UK Extension (the "UK-US data bridge") [V-src]. WorkOS's DPA (updated 27 June 2023) relies on standard contractual clauses, including UK clauses [V-src]. Whether WorkOS uses the UK IDTA or the UK Addendum, and whether it is certified under the framework, is [U].

The plan runs in five phases. **Phase A** is engineering with no legal input, starting now: the bank-connect flag, copy hotfixes, self-hosted fonts, a cookie and storage cleanup, and the data map. **Phase B** drafts the governance documents and the solicitor brief. **Phase C** drafts the legal texts and gets them reviewed. **Phase D** builds the deletion, export, notice and legal pages, and the region move if chosen. **Phase E** covers mobile and later items. Owner and solicitor actions are on a separate track (section 9). Rough external cost: about **£4,500 to £17,000 in the first year** (section 11), mostly solicitor fees.

---

## 2. Data inventory and data map

### 2.1 Server-side data (Postgres on Railway, region `us-west2`)

The region comes from the Fable review in EPICS.md E18/E19. I did not re-check it; confirm with `railway status` or the dashboard.

**Lawful-basis note:** every basis in this table is a *candidate* for the owner and solicitor to confirm, not a conclusion.

| Data item | Where stored | Purpose | Lawful basis (candidate) | Retention (proposed, D6) | Processors | Special-category or high-risk note |
|---|---|---|---|---|---|---|
| WorkOS user id (`sub`), email, first and last name, password hash, sessions | WorkOS (hosted AuthKit). The backend only reads the email from the token: `user-profile.controller.ts:62` [V-code]. Name changes are synced to WorkOS through `identity.adapter.ts:30-41` [V-code] | Authentication, account identity | Contract (Art 6(1)(b)) | Life of account; deleted through the WorkOS `deleteUser` call at account deletion | WorkOS (US) | WorkOS session records likely hold IP address and user agent [U] |
| Profile: display, first and last name, `avatar_url` (may be a data URL), currency, country, employment type, salary, take-home, second, rental and buy-to-let income, mortgage type and share, pension %, salary sacrifice, savings targets, dashboard config, onboarding flags | `user_profiles` (`entities/user-profile.entity.ts:9-223`) [V-code] | Core calculations and personalisation | Contract | Life of account | Railway | Detailed income and property data is high-risk. The avatar data URL is returned on every `GET /user-profile` (E12 B11) |
| Accounts: name, type (including Credit Card, Loan, Owed), balance, rate, contribution, `connection_id`, `external_account_id` | `accounts` (`account.entity.ts`) [V-code] | Net worth, debt and savings tools | Contract | Life of account | Railway | Debt balances can indicate financial difficulty or vulnerability, which is high-risk but not special category under Art 9 [U, SOLICITOR] |
| Monthly balance history | `account_details` (`account-detail.entity.ts`). **There is no `user_id` column**, so it can only be deleted by joining on account ids. The existing reset already does this (`user-profile.service.ts:355-361` on main) [V-code] | History charts | Contract | Life of account | Railway | |
| Transactions: amount, **description**, category, timestamp | `transactions` (`transaction.entity.ts`). Written by bank sync (`finance.service.ts:470-471`) and by `POST /transactions` [V-code] | Stored; E16 says it is never shown (G-09) | Contract (user instruction) | **D8**: recommend stopping storage | Railway; the bank as source | Merchant descriptions can reveal health, religion, union membership or sex life. These are third-party payees' data too. Art 9 inference risk [SOLICITOR] |
| Budget entries: category, name, amount, frequency, essential flag, **free-text notes** | `budget_entries` (`budget-entry.entity.ts`) [V-code] | Budget and runway | Contract | Life of account | Railway | Free text may contain special-category data |
| Tax records: income or expense, source, category, name, amount, dates, **notes**, **receipt file as base64** (`receipt_data` text, filename, MIME type) | `tax_records` (`tax-record.entity.ts:9-58`). The receipt is read with `readAsDataURL` in `TaxContainer.tsx:234` [V-code] | Self-employed and landlord tax estimates | Contract | Life of account; the user can delete | Railway | Receipts may contain third parties' names and addresses. They are large blobs returned in lists (E12 B10) |
| Bank connections: institution, status, **encrypted access and refresh tokens**, expiry, auth type, last sync | `bank_connections` (`bank-connection.entity.ts`). AES-256-GCM through `BankSyncOrchestrator.encryptToken` (`finance.service.ts:177`). The public response strips tokens (`toPublicConnection`) [V-code] | Account sync | Contract (user instruction) | Delete on disconnect; purge stale error-state tokens after 30 days | Railway; Monzo, Starling, Trading 212 (sources, not processors) | A credential to the user's bank, so highest security sensitivity. Regulatory perimeter question (section 5) |
| MCP tokens: name, SHA hash, prefix, scopes, anonymise flag, expiry, last used, call count, revoked | `mcp_tokens` (`mcp-token.entity.ts`) [V-code] | AI assistant access | Contract | Revoked or expired rows purged after 90 days | Railway | Enables export of the whole financial dataset to third-party AI (section 6.9) |
| MCP outputs (accounts, budget, tax records, transactions, simulations) | Not stored. Sent to the user's AI client (`mcp.service.ts:91-261`) [V-code] | User-directed sharing with the user's own AI assistant | Contract or user instruction; the controller/processor framing is [SOLICITOR] | n/a (Flump cannot recall data once sent) | The user's chosen AI provider (not Flump's processor; framing [SOLICITOR]) | Institution names are anonymised by default (`mcp.service.ts:190`). Notes and descriptions are not scrubbed (M-11) |
| Application logs | Railway log stream. Includes `console.error` of provider sync errors with institution name and error objects (`finance.service.ts:191,269,324`), WorkOS verifier failure reasons (`workos-jwt.verifier.ts:72`) and marketing SSR errors (`apps/marketing/server.ts:136`) [V-code] | Operations and debugging | Legitimate interests | Railway retention depends on the plan [U]. Policy: no tokens, amounts or free text | Railway | Provider error objects could echo account data [U]; review in A5 |
| Backups | None evidenced in the repo (E18) | Recovery | Legitimate interests | Proposed: 7 to 30 days rolling (E18) | Railway | Deleted users' data lingers until backups rotate. Restores must re-apply tombstones (6.7) |
| Future: support emails, audit events (E17), product events (E16 §7), error tracking (E18) | Not built | Support, security, analytics, operations | Legitimate interests (product events: LIA plus PECR statistical exception) | Support: 2 years after closure. Audit: 12 months. Events: 13 months. Errors: 30 to 90 days | Mail host, Sentry-type vendor (TBD) | Error tracking must scrub request bodies |

### 2.2 Browser storage (PECR scope) [V-code]

| Key | Type and scope | Set by | Content | Proposed PECR position (to confirm) |
|---|---|---|---|---|
| `__session` | httpOnly cookie, `sameSite=lax`, secure in production, 7 days with "remember" | `apps/web/app/session.server.ts:7-16` | Signed session id | Strictly necessary (Sch A1 para 4(2)(e)(i), authentication) [V-src] |
| WorkOS AuthKit session cookie (name set by the library; `wos-session` by default [U]) | httpOnly cookie | `authkitLoader` (`utils/auth.server.ts:40`) | Encrypted session | Strictly necessary |
| `flump_onboarding_seed` | **Non-httpOnly cookie on `.flump.co.uk`, 24 hours**, plus a localStorage copy | `packages/finance-engine/src/persistence.ts:156-161`, written from the marketing teaser (`InteractiveFinancialTeaser.tsx:258,269`) | **Salary, debts, savings, pension pot, age** (`OnboardingSeedPayload`, `types.ts:51-76`) | Arguably strictly necessary ("information put into a website", para 4(2)(e)(ii)) because the user asked for it to be carried over. But it is personal financial data in a JS-readable, cross-subdomain cookie sent with every request. Minimise it (task A6) |
| `flump_has_session` | Cookie on `.flump.co.uk`, 30 days | `persistence.ts:231-238` (not used by the apps; grep found no caller) | `1` | Strictly necessary if used; otherwise delete it |
| `flump-theme` | localStorage (web and marketing) | `hooks/useTheme.ts:5`, `marketing/src/context/ThemeContext.tsx`, inline scripts in `root.tsx` and `marketing/index.html` | `light` or `dark` | Fits the new "website appearance" exception (Sch A1 para 6), which needs clear information and a simple, free way to object. The theme toggle itself arguably satisfies "object" [V-src text; application to Flump is SOLICITOR] |
| `flump_financial_baseline_v1` | localStorage | `apps/web/app/state/baseline.store.ts:14,47` | **Full financial baseline.** Survives logout | Strictly necessary as "user input" at most. **Must be cleared on logout and account deletion** (A6) |
| `flump_runway_calculator_settings` | localStorage | `utils/runwayStorage.ts:12` | Calculator settings | Preference or input; clear on logout |
| `flump_setup_checklist_dismissed` | localStorage | `SetupChecklist.tsx:130,240` | Boolean | Preference |
| Google Fonts | **Third-party request** (no Flump storage) | `apps/web/app/root.tsx:22-26` (main), `apps/marketing/index.html` | Sends the visitor's IP address and user agent to Google (US) | Not a PECR storage issue but a UK GDPR disclosure and transfer. **Self-host the fonts (A3)** and the issue disappears |

**Analytics and trackers:** none found. A grep for posthog, plausible, gtag, googletagmanager, sentry, mixpanel, hotjar, umami, resend, sendgrid, nodemailer and postmark returned only false positives such as "segment" in tab components [V-code]. **Email:** Flump sends none. WorkOS sends authentication emails such as password reset (`identity.adapter.ts:51-54`) [V-code].

### 2.3 Data flows (processors and recipients)

- Browser → web (Railway) → backend (Railway) → Postgres (Railway). The browser also calls the backend directly with a bearer token: `root.tsx` exposes `window.ENV` and `accessToken` (D3, E20).
- Browser → WorkOS hosted AuthKit (US) for sign-in, sign-up and password reset.
- Backend → `api.monzo.com`, Starling, `live.trading212.com` with the user's token (`apps/backend/src/providers/*.ts`) [V-code]. HSBC, Barclays and other open-banking OAuth configurations exist but have no callback (D-05).
- Backend `/mcp` → the user's AI client (Claude, ChatGPT, etc.) → that vendor's model, under the user's own account with that vendor.
- Browser → `fonts.googleapis.com` and `fonts.gstatic.com` (web and marketing).
- The web app links out to StepChange, National Debtline and Citizens Advice (`BudgetDashboard.tsx`) and to developers.monzo.com. These are links, not data flows.

---

## 3. Gap analysis against UK GDPR, the DPA 2018, PECR and the DUAA 2025

| Obligation | Current state | Gap | Deliverable |
|---|---|---|---|
| Transparency (Arts 12 to 14) | No privacy notice anywhere. The footer links only to `/security` (`Footer.tsx:140-148`) [V-code] | Total | C1 privacy notice, D1 legal pages |
| Lawful basis (Art 6) | Not recorded | Total | B1 ROPA, data map |
| Data minimisation (Art 5(1)(c)) | Transactions stored but never shown. Receipts and avatar returned in full in lists. Seed cookie carries financial data. Baseline in localStorage survives logout | Partial | A6, D10, D11 |
| Storage limitation (Art 5(1)(e)) | No retention policy or automated purge | Total | B4, D9 |
| Security (Art 32) | E1 done (signed JWTs, fail closed). E3 done (TLS to the database, migrations, token key, tokens no longer returned). Open: E20 (token in browser JS, CSP, rate limits), E18 (backups) | Partial | Link to E1, E3, E18, E20 in B6 |
| Processors (Art 28) | Railway and WorkOS used; no record that their DPAs were accepted | Paperwork | B3, O4 |
| International transfers (Arts 44 to 49) | All Railway services in `us-west2`; WorkOS in the US; Google Fonts | Undocumented | B3, D-region decision (D4), A3 |
| ROPA (Art 30) | None. The under-250-staff exemption does not apply where processing is not occasional (Art 30(5)); Flump's processing is continuous [U, check with solicitor] | Total | B1 |
| DPIA (Art 35) | None. Financial data plus novel tech (AI access through MCP) plus bank credentials. Whether a DPIA is mandatory is a judgement call; doing one is cheap | Total | B2 |
| Right of access (Art 15) | No export | Total | D6, manual runbook B8 |
| Erasure (Art 17) | Only "reset financial data" (`user-profile.service.ts:344-420` on main). It keeps the profile row, name, avatar and MCP tokens, and does not touch WorkOS [V-code] | Total | D3, D4, D5 |
| Portability (Art 20) | None | Total | D6 (machine-readable JSON) |
| Rectification (Art 16) | Most fields can be edited in the UI. Email change: no UI found [U] | Small | Runbook B8 (email change through WorkOS `updateUser` on request) |
| Objection and restriction (Arts 18, 21) | Only relevant to legitimate-interests processing (logs, future analytics) | Small | Analytics opt-out if E16 instrumentation ships; runbook |
| Automated decisions (Art 22) | Calculators are user-run simulations with no legal or similarly significant effect [U] | Statement only | Privacy notice says so |
| Breach (Arts 33, 34) | No runbook. The 72-hour ICO notice and the internal breach log are required [Art 33, well established] | Total | B5 |
| ICO fee (Data Protection (Charges and Information) Regulations 2018) | Not paid. ICO: "organisations (including sole traders) ... need to pay ... unless they are exempt". Tier 1 is £52, or £47 by direct debit (£5 discount) [V-src, fetched 2026-11-12] | Total | O2 |
| Complaints to the controller (DPA 2018 s164A, inserted by DUAA s103, **in force 19 June 2026**) | None. A controller "must facilitate the making of complaints ... such as providing a complaint form which can be completed electronically", must acknowledge within 30 days, and must respond without undue delay [V-src] | Total | D13, B8 |
| PECR reg 6 (as substituted by DUAA s112 and Sch 12, **in force 5 Feb 2026**, SI 2026/82) | Only necessary or preference storage. No statement anywhere | Statement only; no banner needed if the analytics decision stays "none" or "cookieless" | C3 |
| Children | No age statement | Small | Terms 18+ plus an onboarding declaration (D7 task) |
| DPO (Art 37) | Probably not required (not large-scale regular systematic monitoring) [U] | Confirm | Solicitor question |

---

## 4. Deliverables and owners

| ID | Deliverable | Drafted by | Approved by | Published at |
|---|---|---|---|---|
| A4 | Data map (section 2, kept current) | sonnet agent | OWNER | `docs/legal/data-map.md` |
| B1 | ROPA (ICO controller template fields) | sonnet | OWNER | `docs/legal/ropa.md` (internal) |
| B2 | DPIA (ICO template structure: core service, bank connection, MCP, receipts) | sonnet | OWNER; SOLICITOR review | `docs/legal/dpia.md` (internal) |
| B3 | Processor register and transfer record | haiku gathers, sonnet writes | OWNER accepts the DPAs | `docs/legal/processors.md` |
| B4 | Retention schedule | sonnet | OWNER (D6) | `docs/legal/retention.md`; summarised in the notice |
| B5 | Breach response runbook | sonnet | OWNER | `docs/runbooks/breach.md` |
| B6 | Security measures statement | haiku | OWNER | `docs/legal/security-measures.md` |
| B7 | FCA perimeter brief and questions | sonnet | OWNER, then sent to SOLICITOR | `docs/legal/fca-perimeter-brief.md` |
| B8 | Subject-rights and complaints runbook | sonnet | OWNER | `docs/runbooks/subject-rights.md` |
| C1 | Privacy notice | sonnet drafts from A4 and B1 | OWNER; SOLICITOR review | `/privacy` (marketing) |
| C2 | Terms of service, including MCP and AI terms | sonnet | OWNER; SOLICITOR review | `/terms` |
| C3 | Cookie and storage statement | sonnet | OWNER (SOLICITOR optional) | `/privacy#cookies` or `/cookies` |
| C4 | Accessibility statement | sonnet, from E8 and E15 results | OWNER | `/accessibility` |
| C5 | Canonical disclaimer and regulatory-status strings | sonnet | OWNER and SOLICITOR wording | `packages/finance-engine/src/disclaimers.ts` |
| D* | Engineering (section 8) | sonnet implementers | OWNER merges | code |
| O* | Owner and solicitor actions (section 9) | OWNER | n/a | n/a |

### 4.1 Required content of the privacy notice (C1)

Based on the content of Arts 13 and 14 and ICO guidance on privacy information; the solicitor confirms. The notice should cover:

- **Controller:** identity and contact details (the individual's name or the company, its number and registered office, D1); a privacy contact mailbox; no DPO unless the solicitor advises one.
- **Data and sources:** the categories of data, mapped to section 2.1, including data from bank providers when bank connection is enabled (Art 14 source).
- **Purposes and lawful basis:** each purpose with its lawful basis, and the legitimate interests relied on (security logging, service improvement).
- **Recipients:** processors by name (Railway, WorkOS, mail host, error tracker if adopted); the user-directed disclosure to AI clients through MCP, with a plain warning that Flump cannot recall data once sent.
- **Transfers:** international transfers and the safeguard for each (Railway: data bridge; WorkOS: SCCs or IDTA [U]; fonts: none once self-hosted).
- **Retention:** periods from B4, including backup lag ("removed from backups within N days").
- **Rights:** access, rectification, erasure, restriction, portability and objection, and how to use each (in-app export and delete, plus the mailbox); the right to complain to Flump (s164A) and to the ICO.
- **Other statements:** that providing data is contractual and what happens if it is not provided; that there is no automated decision-making with legal effect; that the service is for adults (18+); the storage and cookies section (C3); a change log with version and effective date.

### 4.2 Required content of the terms of service (C2)

All of these need SOLICITOR review, especially the liability terms under the Consumer Rights Act 2015.

1. **Parties and eligibility:** who the provider is; UK residents aged 18 or over; beta status and availability.
2. **What Flump is and is not:** calculations and general guidance on figures the user enters; not financial, investment, debt, mortgage, pension or tax advice. Wording from C5, framed by the solicitor's FCA view. Flump is not authorised by the FCA unless and until it is. Tax figures are estimates for named tax years.
3. **Accuracy:** the user is responsible for the inputs; tax-year coverage; no reliance for returns. Link to TAX_DISCLAIMER and the E22 stale-rates behaviour.
4. **Bank connection terms (if enabled):** the user supplies their own credential; Flump reads data only; revocation; provider terms. Wording depends entirely on the FCA view.
5. **MCP and AI terms (section 6.9).**
6. **Acceptable use:** no scraping or abuse; rate limits; security research under the disclosure policy.
7. **Accounts:** suspension, termination, deletion, export.
8. **Price:** free beta, or paid terms if E24 decides to charge (cancellation rights under the Consumer Contracts Regulations 2013; DMCC Act 2024 subscription rules, commencement [U]).
9. **Legal mechanics:** liability limits that cannot exclude statutory rights (CRA 2015, the unfair-terms regime); changes to the terms; governing law and courts (England and Wales; consumers in Scotland and Northern Ireland keep local courts); complaints process.

---

## 5. FCA perimeter analysis plan

### 5.1 Facts to put to the solicitor (all [V-code] unless marked)

1. **Bank data by personal access token.** In the web app the user pastes a Monzo or Starling personal access token, or a Trading 212 key (`ConnectBankWizard.tsx`; action `app.accounts._index.tsx:59-69`). The backend encrypts and stores it (`finance.service.ts:177`). It calls `api.monzo.com/accounts`, `/balance`, `/pots` and `/transactions` (`monzo.provider.ts:58-135`) and the Trading 212 cash endpoint (`trading212.provider.ts:58`), then stores the accounts and transactions (`finance.service.ts:371-471`). The data is shown back to the user, combined with manually entered accounts, as net worth and debt.
2. **OAuth and open banking.** OAuth URLs for HSBC, Barclays, Revolut, Santander, NatWest, Lloyds and Chase are configured (`open-banking-standard.provider.ts:21-65`), but there is no callback handler, so they do not work (D-05).
3. **Where bank connect is offered.** Today it is open to any signed-up user. Sign-up is open through WorkOS (`routes/signUp._index.tsx`). Marketing says bank connection is "coming soon" (`SecurityPage.tsx` on main) [V-code].
4. **Calculators.** These produce user-specific outputs: a debt payoff order (avalanche or snowball) on the user's own debts; mortgage overpayment versus investing in an ISA, where the MCP tool returns `recommendation: "Invest 100% of surplus in UK ISA / SIPP."` (`packages/mcp/src/tools/mortgage-isa.tool.ts:88`); pension contribution and tax-relief estimates; and the £100k tax trap, Section 24 and student loan tools.
5. **MCP.** The user creates a token and their own AI client reads accounts, budgets, tax records and transactions and runs simulations. The AI writes the final narrative to the user. No write tools exist.
6. **No products.** There are no product recommendations, no named providers, no affiliate links, no payments and no money movement.
7. **The owner.** The owner is an individual with no company. Flump is free with no pricing set (E7 decision) and the beta is planned.

### 5.2 Primary texts read [V-src]

- **PSRs 2017 reg 2:** an account information service is "an online service to provide consolidated information on one or more payment accounts held by the payment service user with another payment service provider ... and includes such a service whether information is provided (a) in its original form or after processing; (b) only to the payment service user or to the payment service user and to another person in accordance with the payment service user's instructions". **I found no "own-account only" exclusion in the definition. Clause (b) expressly covers information going only to the user.** If any FCA guidance creates such an exclusion, the solicitor must point to it. I could not read PERG 15 because the FCA Handbook site needs JavaScript, so this is [U].
- **PSRs 2017 Sch 1 Pt 2 para 2(j):** the technical-service-provider exclusion applies "excluding payment initiation services or account information services".
- **RAO art 39E:** "Giving advice to a borrower about the liquidation of a debt due under a credit agreement is a specified kind of activity" (debt counselling).
- **RAO art 53(1):** advising on investments requires advice "on the merits of his ... buying, selling, subscribing for ... a particular investment".
- **Monzo developer docs:** "not suitable for building public applications. You may only connect to your own account or those of a small set of users you explicitly allow." This is a contractual limit separate from regulation. Starling's and Trading 212's API terms are [U].

### 5.3 Questions for a regulatory solicitor (B7 packages these with the facts)

**Bank data**
1. Does the token flow make Flump (or the owner) a provider of account information services under the PSRs 2017, given reg 2(b) and Sch 1 para 2(j)? Does it matter that the user supplies their own developer token instead of going through PSD2 open-banking access?
2. Does the answer change if bank connect is used only by (a) the owner on their own accounts, (b) a handful of invited friends free of charge, or (c) the public? How does "regular occupation or business activity" apply to a free beta [U whether this is the test in the PSRs]?
3. Is the Trading 212 connection in scope at all (is it a "payment account")? Do other permissions apply to reading investment account data?
4. Which route is realistic: (a) register as a registered AISP (cost, PII insurance requirement, time), (b) act as an agent of, or under the permission of, an authorised aggregator, or (c) drop bank connection? What does each mean for marketing copy?

**Guidance versus advice**

5. Is a debt payoff order computed from the user's own credit-card and loan balances "advice ... about the liquidation of a debt" (art 39E)? Which framings and design choices keep it on the information or guidance side (for example: show both strategies with neutral outcomes, no "you should")?
6. Does the mortgage-versus-ISA comparison, or the MCP `recommendation` string, amount to advising on investments (art 53, "particular investment") or advising on regulated mortgage contracts (art 53A [U])? Does generic "an ISA or SIPP" wording keep it outside art 53?
7. Do pension contribution and salary-sacrifice estimates raise any pension advice issue?

**Promotions and other regimes**

8. Financial promotions (FSMA s21): could marketing pages or tool pages that compare overpaying with investing be an "invitation or inducement to engage in investment activity" in the course of business? What review process is needed for marketing copy?
9. Does any FCA regime apply to the tax tools? (Tax advice is generally not FCA-regulated [U].) What liability is there in negligence or misrepresentation, and are the disclaimers adequate?

**MCP and AI**

10. Is Flump responsible if a third-party AI turns Flump's calculations into personal recommendations? What should the MCP tool outputs and the terms say?

**Status and claims**

11. Which statements of regulatory status may Flump make, for example "Flump is not authorised by the FCA" (the current claims guard in `apps/marketing/src/claims.test.ts:27` treats that sentence as needing owner sign-off)?
12. Is it worth approaching the FCA Innovation Hub or Direct Support, and are pre-incorporation individuals eligible [U]?

### 5.4 Interim engineering mitigations (Phase A, before any view is obtained)

- **Bank connect flag (A1):** off in production except for an allowlist (D3).
- **Neutral copy (A2):** remove "guaranteed", "recommendation" and FCA-attributed wording, at these lines [V-code on main]:
  - `OverpayVsSaveCompare.tsx:438,585`
  - `tools.$slug.tsx:96,104,199,262,270`
  - `tools._index.tsx:142`
  - `marketing ToolsIndexPage.tsx:124`
  - `BudgetDashboard.tsx:652` ("UK FCA Priority Debt Guardrail Active")
  - `mortgage-isa.tool.ts:60,88,145`
- **"Guidance, not advice" notice (D8):** a `ProjectionNotice` on every projection surface: `/app` (dashboard), `/app/debt`, `/app/mortgage`, `/app/pension`, `/app/savings`, `/app/forecast`, `/app/tax` (alongside `TaxDisclaimerButton`), `/app/budget` where runway is projected, `/sandbox`, web `tools.$slug` and `tools._index`, marketing `ToolPage`, and a `notice` field in every MCP tool result (coordinate with E17).
- **No product recommendations, provider names, affiliate links or referrals.** No automated decisions. Keep showing both strategies side by side.
- **Marketing claims guard:** extend `claims.test.ts` to web and MCP strings, adding "guarantee", "FCA", "Open Banking", "regulated" and "recommendation" (closes the E7 T14 web half).

### 5.5 Options and cost to obtain a view

- **A.** Fixed-fee short written opinion from a fintech or regulatory solicitor on questions 1 to 12: about £2,500 to £8,000 [U, rough].
- **B.** FCA Innovation Hub first (free, eligibility [U]), then a narrower solicitor opinion.
- **C.** Drop bank connection entirely and seek a narrower view on calculators only: about £1,500 to £4,000 [U].

---

## 6. Other legal areas and engineering designs

### 6.1 Cookie and storage position (C3; no banner needed under current facts)

- Under the substituted PECR reg 6 and Sch A1 [V-src]:
  - session cookies and AuthKit cookies are "strictly necessary" (para 4(2)(e)(i));
  - the onboarding seed and baseline are "information put into a website" (para 4(2)(e)(ii)), once minimised;
  - the theme falls under para 6 (appearance), which needs clear information plus a free, simple way to object.

  **No consent banner is needed** if analytics stays at "none" or "cookieless and server-side". The statement must still be published. [Application to Flump: SOLICITOR optional.]
- If cookie-based analytics are added later, the statistical-purposes exception (para 5) needs clear information, a simple free objection, and no sharing beyond service-improvement helpers [V-src]. E16 §7's server-side event table avoids device storage altogether.
- Google Fonts: self-host them (A3). PECR is not engaged, but self-hosting removes an undocumented disclosure to Google.

### 6.2 International transfers and data region (D4)

- **UK to EEA:** the UK treats the EEA as adequate [U; long-standing DPA 2018 Sch 21 position]. **UK to US:** the data bridge in force from 12 October 2023 covers only US organisations certified under the UK Extension [V-src]. Railway's privacy policy says it complies with the UK Extension [V-src], which needs confirming on the DPF list [U]. WorkOS uses SCCs [V-src]; the UK Addendum or IDTA is [U].
- **Railway regions [V-src docs.railway.com]:** US West `us-west2` (California), US East (Virginia), **EU West `europe-west4-drams3a` (Amsterdam)**, Southeast Asia (Singapore). Changing the region of a service without a volume causes no downtime. **A service with a volume (Postgres) needs volume migration, which "can take a while depending on the size of the volume, and will cause downtime"** [V-src]. Price difference by region [U].
- **Effort:** about 0.5 to 1 day including an E18 backup, a rehearsal on staging, and a maintenance window. Migrate Postgres first, then backend, web and marketing. Check latency between WorkOS and Railway. Update `processors.md` and the notice.

### 6.3 Account deletion design (D3 to D5; E12 B6 is the consumer)

**Endpoint and request**
- `DELETE /user-profile` on `user-profile.controller.ts`, guarded by `AuthGuard`. The body is `{ confirm: "DELETE" }`, validated with E21's zod pipe if it has landed, otherwise a local zod schema that E21 later adopts. Optional E20 re-auth: require token `iat` under 10 minutes [U, depends on the WorkOS token claims].

**Order of operations** (an amended version of E12 §4.2, so a failed step can be retried)
1. Insert a `deleted_users` tombstone: `user_hash` = HMAC-SHA256(userId, `DELETION_HMAC_KEY`), `status: pending`, `requested_at`. Storing a hash minimises what is kept for ever.
2. Set `revoked_at` on all MCP tokens. Call `userManagement.listSessions(userId)` then `revokeSession` for each. Both methods exist in the installed `@workos-inc/node` 12.2.0: `deleteUser(userId)`, `listSessions(userId, options?)`, `revokeSession(payload)` [V-code, node_modules].
3. `userManagement.deleteUser(userId)`. If WorkOS fails, leave the tombstone `pending` and return 202. A retry job finishes it.
4. One database transaction deletes `account_details` (by account ids), `transactions`, `accounts`, `bank_connections`, `budget_entries`, `tax_records`, `mcp_tokens` and `user_profiles`. Reuse the reset pattern at `user-profile.service.ts:355-420` (main).
5. Set the tombstone to `completed`, record step timestamps, return 204.

**Guarding tokens that are still valid**
- `AuthGuard` (`apps/backend/src/auth/auth.guard.ts`) and the MCP token path (`mcp.service.ts:70` `findTokenByHash`) reject any `sub` that has a tombstone with 401. `findOrCreateProfile` (`user-profile.service.ts:161`) must never recreate a profile for a tombstoned user. This closes the window where an access token stays valid; the WorkOS access-token lifetime is [U].

**Retry, idempotency and tests**
- A retry job (Nest schedule or Railway cron, E18) re-runs pending tombstones older than 5 minutes.
- Deleting twice returns 204. Two-user isolation is tested on real Postgres using the `migrations.integration.spec.ts` pattern.

**Web**
- Typed-confirmation `ConfirmDialog` (`~/features/feedback/components/ConfirmDialog`, already used in `UserProfilePanel.tsx:31`), then WorkOS `signOut`, then a client wipe of the `flump_*` localStorage keys and cookies (section 2.2).
- A public "Delete your account" page explaining the in-app path and the mailbox route. Google Play requires a web deletion resource for apps with accounts [V-src, support.google.com answer 13327111]. Apple 5.1.1(v) requires in-app deletion (E12 §7.6).

**Soft versus hard delete and backups**
- Hard delete (D7-A recommended; consistent with E5 D4 "no undo"). Backups hold the data until they rotate; the notice states the window.
- **Restore runbook:** after any restore, re-run deletion for every tombstone. With HMAC hashes this means re-hashing each restored user id and comparing, so the restore script needs the HMAC key.

### 6.4 Data export design (D6)

- `GET /user-profile/export`, guarded and throttled to about 5 per hour (E20 throttler). Returns `application/json` as an attachment: `flump-export-YYYY-MM-DD.json`.
- **Contents:** `schemaVersion`, `generatedAt`; the WorkOS identity (`getUser`: email, name, created date); profile; accounts with details; transactions; budget entries; tax records, with receipts as base64 plus filename and MIME type (or a separate `GET /tax-records/:id/receipt` link list if E12 B10 lands first); bank connections without tokens (via `toPublicConnection`); MCP token metadata without hashes; terms-acceptance records; E17 audit events when they exist.
- CSV zip later (D11).
- The same JSON answers subject access requests (B8). The one-month deadline is Art 12(3), extendable by two months [well established].

### 6.5 Retention automation (D9)

A daily job:
- purge `mcp_tokens` revoked or expired more than 90 days ago;
- null the tokens on `bank_connections` that have been in `error` or `disconnected` for more than 30 days;
- re-run pending tombstones;
- if D6-A is chosen: inactivity warning, then deletion. This needs a "last seen" column and an email capability. WorkOS cannot send arbitrary email, so this needs a mail provider and is a new processor.

### 6.6 Tax calculator disclaimers and accuracy statement

- Keep `TAX_DISCLAIMER` (`packages/finance-engine/src/tax-rules.ts:35`, main). Remove the Irish references if E16 D6 cuts non-UK scope. Keep the Scottish-rates caveat until E23 stores region.
- Add a dated accuracy statement: "Rates for 2020/21 to 2026/27, last checked [date]; test cases reviewed by the developer". **Do not imply professional sign-off.** Under the E4 decision the owner, not a tax professional, signs the vectors.
- E22 stale-rates banner. CTA wording per L-03 if it still exists anywhere (not found on main).

### 6.7 Accessibility statement (C4)

- Use the GOV.UK model structure even though the Public Sector Bodies Accessibility Regulations do not apply to a private provider [U]. Under the Equality Act 2010, service providers must make reasonable adjustments [U, s29/s20].
- **Contents:** standard aimed for (WCAG 2.2 AA); status (partially compliant); known issues from E8 and E15 axe runs; how to request an alternative format or report a problem (the support mailbox); response time; how it was tested and when; review date.

### 6.8 Company and trading details (D1)

- **Sole trader:** unlimited personal liability; the ICO fee is still due (sole traders are named on the ICO page [V-src]); the owner's name and address may appear publicly in the ICO register and the notice [U].
- **Limited company:** liability shield; online incorporation £100 and confirmation statement £50 a year [V-src, gov.uk]; accounts and filing (accountant about £500 to £1,500 a year [U]); a D-U-N-S number (free [U]) for an Apple organisation account.
- **App Store:** guideline 5.1.1(ix) expects regulated-field apps to come from a legal entity (E12 §7.6, confirmed in substance there). Footer placeholders: `apps/marketing/src/utils/placeholders.ts` (main).

### 6.9 MCP and AI terms

- **Terms and token-creation copy:** the user chooses the AI client and its provider; data sent leaves Flump and is governed by that provider's terms; revoking a token stops future access only; Flump outputs are calculations, and the AI's wording is the AI's; keep client confirmations on; no write tools today.
- **Future writes (E17):** need explicit scopes, confirmation and audit.
- **Copy accuracy:** the token-creation UI (`features/ai-connections`) gets consent copy per E17 §9. "Institution names replaced by default" stays the only anonymisation claim (M-11).
- **Solicitor question:** the controller and processor framing for MCP disclosures (question 10).

### 6.10 Marketing email consent

No email marketing exists today. If added: opt-in consent (PECR reg 22) with an unticked box, a record of consent, and unsubscribe on every message. The soft opt-in for a free service is [SOLICITOR]. Recommend none for the beta (D10).

### 6.11 Children and age gate

Terms say 18+. Onboarding asks for a self-declaration (stored with terms acceptance). Delete the account if a child is discovered. The ICO Children's Code applies if the service is "likely to be accessed" by children [U]; that is unlikely for this product, but record the reasoning in the DPIA.

### 6.12 Support, complaints and vulnerability disclosure

- Monitored mailboxes on the real domain: `support@`, `privacy@`, `security@` (can be aliases).
- A complaints route (s164A: an electronic form or email plus another channel; acknowledge within 30 days).
- `apps/marketing/public/.well-known/security.txt` per RFC 9116 (`Contact`, `Expires`, `Policy`, `Canonical`, `Preferred-Languages: en`). Replace `security@example.invalid`.
- Optional signposting for people in debt: links to StepChange, National Debtline and Citizens Advice already exist in `BudgetDashboard.tsx`; MoneyHelper could be added.

### 6.13 Insurance (D13, owner decision)

Professional indemnity (calculation errors, guidance claims) and cyber (breach response costs). Get quotes once D1 is decided, and ask the solicitor whether PI is advisable before public launch.

---

## 7. AGENTS.md laws touched

| Law | Where |
|---|---|
| §1 colocated components | D1 `apps/marketing/src/pages/LegalDocumentPage/`; D5 `apps/web/app/features/account-data/components/DataRightsPanel/` and `DeleteAccountDialog/`; D8 `packages/ui/src/patterns/ProjectionNotice/`; D13 `ContactPage/`. Each needs `.tsx`, `.styles.ts`, `.stories.tsx` (light and dark, zero axe violations, `play()`), `.test.tsx` and `index.ts`. Legacy flat files edited in A1 and A2 (`ConnectBankWizard.tsx`, `BudgetDashboard.tsx`) are not moved, to keep scope tight |
| §2 semantic tokens and tabular numbers | All new UI uses `surface.*`, `text.*`, `status.info.*` (the notice) and `status.danger.*` (delete). Effective dates and export timestamps use `tabular-nums` and `Intl` en-GB dates |
| §3 SimulatorSplitLayout and KpiStrip | D8 places `ProjectionNotice` inside each page's existing outcome area. It does **not** add a fifth KpiStrip item or restructure layouts. `SimulatorSplitLayout` (used only by sandbox on main) gets no API change |
| §4 and §5 CI pre-flight | Every engineering task runs `rtk bun run lint`, `rtk bun run check-types`, `rtk bun run test`, `rtk bun run build` before any PR |
| §6 subagent model | Tasks below name sonnet or haiku. Opus only for re-planning |

---

## 8. Phased tasks (sized for subagents)

Format: **ID. Title (effort, model)**. Files and area. Acceptance. Dependencies. Who approves.

### Phase A: start now, no legal input

- **A1. Bank-connect production flag (M, sonnet).**
  - *Files:* new `BANK_CONNECTIONS_ENABLED` (default `false` when `NODE_ENV=production`) and `BANK_CONNECTIONS_ALLOWED_USER_IDS` in `apps/backend/src/config/config.module.ts` validation; guard `POST /bank-connections`, `/:id/sync` and `/:id/refresh` (`finance.controller.ts:155-175`) with a 404 `feature_disabled`; `GET` and `DELETE` stay available. Web: hide entry points in `ConnectBankWizard.tsx`, `BankConnectionsList.tsx`, `AddEditAccountsDialog.tsx` and the `connectBank` intent at `app.accounts._index.tsx:59` from a root-loader flag.
  - *Acceptance:* tests for off, on and allowlisted users; existing connections can still be disconnected; production env set by the owner.
  - *Dependencies:* none. *Approves:* OWNER (D3).
- **A2. Advice and guarantee copy hotfix and claims-guard extension (S/M, sonnet).**
  - *Files:* the lines in section 5.4. Rename MCP text, not schema keys (`guaranteedInterestSavedGbp` is a key change, so coordinate with E17).
  - *Acceptance:* a guard test over `apps/web/app`, `packages/mcp/src` and `apps/marketing/src` fails on banned terms.
  - *Approves:* OWNER signs the copy (E7 decision).
- **A3. Self-host fonts (S, sonnet).**
  - *Files:* `apps/web/app/root.tsx:22-26`, `apps/marketing/index.html`; `@fontsource/*` or files in `public/`; tighten `font-src 'self'` in `apps/marketing/server.ts:29,46`.
  - *Acceptance:* no requests to `fonts.g*` in either build (grep the built HTML); visual check light and dark.
- **A4. Data map doc (S, haiku then sonnet).**
  - *Files:* `docs/legal/data-map.md`, built from section 2 and re-verified against the entities, storage keys and log calls.
  - *Approves:* OWNER.
- **A5. Log hygiene (S, sonnet).**
  - *Files:* `finance.service.ts:191,269,324` log the provider status code and message class only, never the error object; `apps/marketing/server.ts:136`.
  - *Acceptance:* unit tests assert no token or body in logs; logging policy in B6.
- **A6. Browser storage minimisation (M, sonnet).**
  - Seed cookie (`persistence.ts:156-161`): add `Secure` in production, shorten `max-age` to 1 hour, clear on hydration (already at `baseline.store.ts:122`).
  - Delete the unused `flump_has_session` helpers or document them.
  - Wipe the `flump_*` localStorage keys on logout and deletion. `logout._index.tsx` is server-side, so add a small client wipe on the post-logout landing, or a `/logout` interstitial.
  - *Acceptance:* tests with `InMemoryStorageDriver`.
- **A7. Restrict sign-up for the beta (S, OWNER plus haiku).**
  - Turn off public sign-up or require invitations in the WorkOS dashboard (capability [U]). Fallback: a backend `BETA_ALLOWED_EMAILS` check in `AuthGuard` returning 403 with a friendly page.
  - *Approves:* OWNER (D2).

### Phase B: governance documents (drafts; owner, then solicitor where marked)

- **B1. ROPA (S, sonnet).** Depends on A4. Approves: OWNER.
- **B2. DPIA (M, sonnet).** Covers core service, bank connection, MCP and receipts, with a risk table and mitigations linked to A1 to A6, D3 to D10, E18 and E20. Approves: OWNER, then SOLICITOR.
- **B3. Processor register and transfer record (S, haiku gathers, sonnet writes).** Railway (DPA and DPF UK Extension), WorkOS (DPA 2023-06-27, SCCs; check the UK mechanism), mail host, error tracker (E18), GitHub (code only; note that E2 D6's rental ledger remains in git history). Approves: OWNER (O4).
- **B4. Retention schedule (S, sonnet).** Depends on D6 and D8.
- **B5. Breach runbook (S, sonnet).**
  - *Steps:* detect and triage; contain (rotate `BANKING_TOKEN_ENCRYPTION_KEY`, WorkOS keys, database credentials; revoke MCP tokens in bulk); assess risk; notify the ICO within 72 hours where required; tell users if risk is high; keep an internal log of every breach.
  - *Templates:* ICO report fields and user email.
  - *Approves:* OWNER.
- **B6. Security measures doc (S, haiku).** Links E1, E3, E18 and E20 evidence.
- **B7. FCA perimeter brief (M, sonnet).** Section 5.1 to 5.3 plus screenshots. Approves: OWNER, then sent to SOLICITOR (O5).
- **B8. Subject-rights and complaints runbook (S, sonnet).** Identity check (request from the account email), one-month clock, manual export and deletion scripts for the beta (SQL mirroring D4 plus deletion in the WorkOS dashboard), s164A complaint acknowledgement within 30 days.

### Phase C: legal texts

- **C1 privacy notice, C2 terms, C3 storage statement, C4 accessibility statement (M each, sonnet).** Built from A4, B1 and B4 and the content lists in 4.1 and 4.2. Mark each `DRAFT v0.x` until approved. Approves: OWNER; SOLICITOR for C1 and C2.
- **C5. Canonical disclaimer strings (S, sonnet).** `packages/finance-engine/src/disclaimers.ts`: `PROJECTION_NOTICE`, `REGULATORY_STATUS`, `MCP_NOTICE`, next to `TAX_DISCLAIMER`. Approves: OWNER and SOLICITOR wording.

### Phase D: engineering for rights and publication

- **D1. Marketing legal pages (M, sonnet).**
  - *Files:* `LegalDocumentPage` (colocated) rendering structured content from `apps/marketing/src/content/legal/{privacy,terms,cookies,accessibility}.ts` (version and effective date); routes in `apps/marketing/src/App.tsx`; footer links (`Footer.tsx:140-148`); sitemap if M-02 has landed.
  - *Acceptance:* the four routes render, the footer links work, light and dark stories pass axe.
  - *Dependencies:* C1 to C4 drafts (pages can ship showing "draft"). Approves: OWNER.
- **D2. security.txt and disclosure policy (S, haiku).** Depends on O3 (real mailbox). Acceptance: `GET /.well-known/security.txt` returns 200 `text/plain` with valid `Expires`.
- **D3. Tombstone table, guard and no-recreate rule (M, sonnet).** Migration under `apps/backend/src/migrations/`; `auth.guard.ts`; MCP token lookup; `findOrCreateProfile`. Depends on E21 (or a local schema). Approves: OWNER.
- **D4. `DELETE /user-profile` (L, sonnet).**
  - *Files:* `identity.adapter.ts` gains `deleteUser` and `revokeAllSessions` (also in `InMemoryIdentityAdapter`); the service method; the retry job.
  - *Acceptance:* order per 6.3; idempotent; real-Postgres two-user test; WorkOS failure path returns 202 and the retry completes it; every table is empty for that user afterwards.
  - *Dependencies:* D3, E18 (cron). Unblocks E12 T7.26 and T7.27.
- **D5. Web "Your data" panel (M, sonnet).** `DataRightsPanel` and `DeleteAccountDialog` (colocated) on `/app/profile` (`app.profile.tsx`); public "delete your account" page (E12 B13). Depends on D4 and D6.
- **D6. Export endpoint (M, sonnet).** Per 6.4. Acceptance: snapshot test of the schema; tokens and hashes absent; throttled. Depends on E20 throttler (or a local limit).
- **D7. Terms acceptance and 18+ record (M, sonnet).**
  - *Files:* `user_profiles` gets `terms_version`, `terms_accepted_at`, `privacy_version`, `age_confirmed_at` (migration); onboarding step in `app.onboarding.tsx`; re-prompt when the version changes.
  - *Dependencies:* C1 and C2 versions. Approves: OWNER.
- **D8. ProjectionNotice (M, sonnet).**
  - `packages/ui/src/patterns/ProjectionNotice/` (colocated, `status.info` tokens).
  - Placed on the surfaces in 5.4. MCP `notice` field in the `packages/mcp/src/tools/*` results (snapshot tests; coordinate with E17).
  - Depends on C5 wording (ship with a placeholder approved by the owner).
- **D9. Retention job (M, sonnet).** Per 6.5. Depends on B4, E18.
- **D10. Receipts and avatar minimisation (M, sonnet).** E12 B10 and B11: list endpoints omit `receiptData`; size caps; `avatarUrl` limited to `https:` or capped `data:image/*`. Overlaps E20 receipt MIME validation, so do it once.
- **D11. Synced transactions (S, sonnet).** If D8-A: remove the save at `finance.service.ts:470-471`, add a migration deleting stored rows (back up first, E18), update the MCP transaction tool behaviour.
- **D12. Railway region move (M, OWNER-executed with a sonnet runbook).** Only if D4-A or C. Depends on E18 backups and staging.
- **D13. Contact and complaints page (S, sonnet).** Colocated `ContactPage`: support and privacy mailboxes, complaint form or mailto, postal route. Depends on O3.
- **D14. Launch placeholder guard (S, haiku).** Overlaps E24. The build fails if `placeholders.ts` values or `DRAFT v0` markers remain when `LAUNCH=true`.

### Phase E: later

- Mobile store items (E12): privacy labels, Play data-safety form and deletion URL (reuse D5); organisation account (D1).
- Analytics opt-out if E16 §7 ships.
- CSV export (D11).
- Email capability for inactivity warnings and breach notices.

---

## 9. Owner and solicitor actions

| ID | Action | When |
|---|---|---|
| O1 | Decide the trading entity (D1). If a company: incorporate, get a D-U-N-S number, update `placeholders.ts` | Before public launch; before the App Store |
| O2 | Pay the ICO fee (tier 1: £52, or £47 by direct debit) in the controller's name (individual or company). Use the ICO self-assessment tool | **Before inviting anyone other than yourself** |
| O3 | Domain email plus `support@`, `privacy@` and `security@` mailboxes; checked at least weekly, with an autoresponder | Before the friends beta |
| O4 | Accept or sign the Railway and WorkOS DPAs and keep copies; confirm WorkOS's UK transfer mechanism and Railway's DPF listing | Phase B |
| O5 | Engage a regulatory solicitor with B7 (D5) | Start Phase B; the answer blocks public launch |
| O6 | Engage a privacy solicitor (possibly the same firm) for C1, C2 and B2 | Phase C |
| O7 | Insurance quotes (D13) | Before public launch |
| O8 | Region decision (D4) and maintenance window | Phase D |
| O9 | Sign off all copy and disclaimer wording | Ongoing |
| O10 | Set the production env for A1; configure WorkOS sign-up restriction (A7) | Phase A |

---

## 10. Order of work, launch blockers and the beta minimum

**Order:** A1, A2, A3, A6 and A7 now, in parallel. Then A4, B1 to B8 and O2 to O5. Then C1 to C5 alongside D3, D4 and D6 (D3 waits for E21 or a local schema). Then D1, D5, D7, D8 and D13. Then solicitor revisions. Then D9 to D12 and D14. **E19 deletion work blocks E12 M9**, and E24 depends on E19.

### Owner-only use (now)
Processing only your own data for yourself is likely within the household exemption [U, SOLICITOR]. But sign-up is open, so A7 (restrict sign-up) is the main gap.

### Minimum posture for a closed beta with friends (invite-only, free)
This is a risk-acceptance posture. The owner should record it as such.
1. A7 sign-up restricted to invitees; A1 bank connect off except for the owner (D3-B).
2. O2 ICO fee paid; O3 monitored mailbox.
3. A short beta privacy notice and beta terms (C1 and C2 drafts approved by the owner), published (D1), stating that the beta is unreviewed. Solicitor review recommended but may follow.
4. A2 copy hotfix and D8 ProjectionNotice live.
5. Deletion and export available by manual runbook within one month (B8).
6. B5 breach runbook; E18 backups and restore drill; E1 done.
7. A3 fonts, A5 logs and A6 storage fixes; transfers documented in the notice (B3).
8. A DPIA screening at least (B2 draft).

### Public launch blockers (adds to the beta list)
- Solicitor-reviewed privacy notice, terms and storage statement, with terms acceptance recorded (D7).
- FCA perimeter view obtained and implemented (or bank connect removed); disclaimer wording signed off by the solicitor.
- DPIA and ROPA complete.
- Automated deletion including WorkOS, plus export (D3 to D6).
- Retention job, at least tokens and tombstones (D9).
- Region decided or transfers documented (D4).
- Accessibility statement (C4), with E8 and E15 axe runs passing.
- security.txt (D2), complaints route (D13), real company or trader details (D14 guard).
- E20 security items; insurance decision recorded (D13).

---

## 11. External cost estimate (rough; verify every figure)

| Item | Estimate | Confidence |
|---|---|---|
| ICO fee | £52 a year (£47 by direct debit) | [V-src] |
| Companies House incorporation and confirmation statement | £100 once plus £50 a year | [V-src] |
| Accountant for a limited company | £500 to £1,500 a year | [U] |
| Regulatory solicitor, FCA perimeter written view | £2,500 to £8,000 | [U] |
| Privacy pack review (notice, terms, storage, DPIA) | £1,500 to £5,000 | [U] |
| PI plus cyber insurance | £400 to £2,000 a year combined | [U] |
| Domain email | £3 to £8 per mailbox per month | [U] |
| Railway region move | Probably no price change; owner time only | [U] |
| If bank connect is pursued: RAISP registration or aggregator partner | £5,000 to £20,000+ in the first year, including compliance and PII | [U, very rough] |
| D-U-N-S; Apple; Google | Free; about $99 a year; $25 once (E12) | mixed |
| **First-year total without bank-connect authorisation** | **About £4,500 to £17,000** | [U] |

---

## 12. Risk register

| # | Risk | Likelihood | Impact | Mitigation | Owner |
|---|---|---|---|---|---|
| R1 | Unauthorised account information services by token sync | Medium | High | A1 flag; B7 and O5 | OWNER |
| R2 | Calculator or MCP output treated as regulated advice (debt counselling, investments) | Medium | High | A2, D8, C5; solicitor wording | OWNER |
| R3 | Breach of bank tokens or financial data | Low–Med | High | E1, E3 done; E20; B5; A5 | OWNER |
| R4 | Erasure request cannot be met | High today | Medium | B8 now, D4 later | OWNER |
| R5 | Strangers sign up during the "closed" beta | High today | Medium | A7 | OWNER |
| R6 | US transfer undocumented | High today | Medium | B3, D4 | OWNER |
| R7 | Deleted user's data reappears after a backup restore | Low | Medium | Tombstone re-apply in the restore runbook | OWNER |
| R8 | Special-category inference from transactions or notes | Medium | Medium | D11 stop storing; DPIA | OWNER |
| R9 | Third-party AI leaks or misuses MCP data | Medium | Medium | Consent copy, anonymise by default, terms 6.9 | OWNER |
| R10 | Marketing misstatement (FCA, GDPR, "guaranteed") | Medium | Medium | Claims guard (A2) | OWNER |
| R11 | Unfair-terms or consumer-law problem if paid | Low (free) | Medium | Solicitor review of C2; E24 | OWNER |
| R12 | App Store rejection as an individual developer | High if individual | Medium | D1 company | OWNER |
| R13 | Personal liability as a sole trader | Medium | High | D1, D13 | OWNER |
| R14 | Downtime or data loss during the region move | Low | High | E18 backup, staging rehearsal | OWNER |
| R15 | DUAA complaint duty missed | Medium | Low | D13, B8 | OWNER |

---

## 13. Decisions needed from the product owner

1. **D1. Trading entity?**
   - A. Sole trader now, limited company before public launch.
   - B. Limited company now.
   - C. Stay an individual.
   - Recommendation: **B** if the App Store and public launch are within six months, otherwise **A**. The App Store (5.1.1(ix)) and the liability shield both point to a company.
   - Blocks: O1, D14, the notice's controller identity.
2. **D2. Beta scope?**
   - A. Invite-only friends with sign-up restricted.
   - B. Owner-only until the solicitor pack is done.
   - C. Open beta.
   - Recommendation: **A**, once the beta minimum in section 10 is met. Blocks: A7.
3. **D3. Bank connection in production?**
   - A. Off for everyone.
   - B. On only for allowlisted owner accounts.
   - C. On for beta users.
   - Recommendation: **B**. C should wait for the FCA view and is also limited by Monzo's developer terms. Blocks: A1.
4. **D4. Data region?**
   - A. Move to EU West (Amsterdam) now, while the database is small.
   - B. Stay in `us-west2` and document transfers.
   - C. Document now, move before public launch.
   - Recommendation: **A**, timed after E18 backups and staging; B's documentation is needed regardless because of WorkOS. Blocks: D12, B3.
5. **D5. Legal advice route?**
   - A. One firm, fixed fee, for both the FCA view and the privacy pack.
   - B. Regulatory specialist for the FCA view; templates plus a light review for privacy.
   - C. FCA Innovation Hub first, then A.
   - Recommendation: **C, then A** (cheap first step, eligibility [U]). Blocks: O5, O6.
6. **D6. Inactive accounts?**
   - A. Delete after 24 months inactive, with a warning.
   - B. Delete only on request.
   - C. 12 months.
   - Recommendation: **B for the beta, A at launch** (A needs email capability). Blocks: B4, D9.
7. **D7. Deletion semantics?**
   - A. Immediate hard delete.
   - B. 7-day grace period, cancelled by signing in.
   - C. 30-day soft delete.
   - Recommendation: **A** (simplest, matches E5 D4). Blocks: D4.
8. **D8. Synced transactions?**
   - A. Stop storing them.
   - B. Show them on account detail.
   - C. Leave as is.
   - Recommendation: **A** while bank connect is owner-only. Blocks: D11.
9. **D9. Marketing analytics?**
   - A. None.
   - B. Cookieless or server-side counts (PECR statistical exception notice and objection).
   - C. Cookie analytics with a consent banner.
   - Recommendation: **A for the beta, B at launch**. Blocks: C3.
10. **D10. Marketing email?**
    - A. None.
    - B. Opt-in product updates.
    - Recommendation: **A**.
11. **D11. Export format?**
    - A. JSON only.
    - B. JSON plus CSV zip.
    - Recommendation: **A first**. Blocks: D6.
12. **D12. Age gate?**
    - A. 18+ self-declaration at onboarding.
    - B. Terms only.
    - Recommendation: **A**. Blocks: D7.
13. **D13. Insurance?**
    - A. Buy PI and cyber before public launch.
    - B. Defer until revenue.
    - Recommendation: **A**, quotes after D1, informed by the solicitor.

---

## 14. Verification

**Per engineering task**
- The test that fails before and passes after (EPICS shared rule).
- Stories in light and dark with zero axe violations, plus `play()` tests for the new components.
- The four checks: `rtk bun run lint`, `rtk bun run check-types`, `rtk bun run test`, `rtk bun run build`.

**Specific checks**
- **A1:** with the flag off in a production-like env, `POST /bank-connections` returns 404.
- **A3:** grep the built HTML for `fonts.g`, expecting no hits.
- **A6:** after logout, there are no `flump_*` localStorage keys.
- **D4:** real-Postgres integration test showing zero rows per table for the deleted user, the second user untouched, a 401 for the old token, no profile recreated, and the WorkOS fake recording `deleteUser` and `revokeSession`.
- **D6:** JSON schema snapshot with no `accessToken`, `refreshToken` or `tokenHash`.
- **D1 and D2:** the routes return 200, and `security.txt` has valid `Expires`.

**Documents:** owner approval recorded in `docs/audit/plans/DECISIONS.md`; solicitor sign-off dates recorded in the document headers.

---

## 15. Sources

**Read and checked on 2026-11-12 [V-src]**
- ICO data protection fee pages: the tiers, £52 and £78, the £5 direct-debit discount, and that sole traders must pay.
- GOV.UK "UK-US data bridge: supporting documents": in force 12 October 2023; covers certified organisations only.
- Railway privacy policy and DPA: they mention the DPF, the UK Extension and SCCs.
- Railway docs on deployment regions: the region list, and that moving a service with a volume means migration and downtime.
- WorkOS DPA, updated 27 June 2023: uses EEA, Swiss and UK SCCs.
- PSRs 2017 reg 2 (the AIS definition) and Sch 1 (AIS listed at (h); exclusion 2(j)).
- RAO 2001 art 39E (debt counselling) and art 53 (advising on investments).
- Monzo developer docs.
- DUAA 2025 s112 and Sch 12 (the new PECR reg 6 and Sch A1; in force 5 February 2026 by SI 2026/82).
- DUAA 2025 s103 (DPA s164A complaints; in force 19 June 2026).
- Google Play account-deletion requirements.
- GOV.UK Companies House fees.
- `@workos-inc/node` 12.2.0 method signatures in the local `node_modules`.

**Not verified [U]**
- FCA PERG 15 and PERG 8, which I could not read because the FCA site needs JavaScript.
- FCA targeted-support or advice-guidance boundary changes.
- WorkOS DPF status and its UK Addendum or IDTA.
- The WorkOS access-token lifetime and session IP fields.
- Railway log retention and regional pricing.
- Starling and Trading 212 API terms.
- DMCC Act subscription commencement.
- Apple sub-rule numbering (as noted in E12).
- Whether ICO DPIA screening criteria mandate a DPIA here.
- Every cost estimate.

**Relevant paths (absolute)**
- `/Users/marcgallagher/personal/flump/docs/audit/EPICS.md` (E18 to E24 and the launch checklist)
- `/Users/marcgallagher/personal/flump/docs/audit/plans/DECISIONS.md`
- `/Users/marcgallagher/personal/flump/docs/audit/plans/E16-plan-draft.md` (§6 rows on bank connect and G-09; §7 instrumentation)
- `/Users/marcgallagher/personal/flump/docs/audit/plans/E17-plan-draft.md` (§8 audit, §9 privacy)
- `/Users/marcgallagher/personal/flump/.claude/worktrees/e2-backend-no-seeding-3ba884/docs/audit/plans/E12-mobile-rebuild-plan.md` (§4.2 deletion, §4.6 B6/B10/B11/B13, §7.6 store policy)
- Backend: `/Users/marcgallagher/personal/flump/apps/backend/src/entities/*.ts`, `user-profile.controller.ts`, `user-profile.service.ts`, `finance.service.ts`, `finance.controller.ts`, `identity/identity.adapter.ts`, `auth/auth.guard.ts`, `mcp.service.ts`
- Storage: `/Users/marcgallagher/personal/flump/packages/finance-engine/src/persistence.ts`, `/Users/marcgallagher/personal/flump/apps/web/app/state/baseline.store.ts`, `/Users/marcgallagher/personal/flump/apps/web/app/session.server.ts`
- Web and marketing: `/Users/marcgallagher/personal/flump/apps/web/app/root.tsx`, `/Users/marcgallagher/personal/flump/apps/marketing/index.html`, `/Users/marcgallagher/personal/flump/apps/marketing/server.ts`, `/Users/marcgallagher/personal/flump/apps/marketing/src/components/Footer.tsx`, `/Users/marcgallagher/personal/flump/apps/marketing/src/utils/placeholders.ts`, `/Users/marcgallagher/personal/flump/packages/finance-engine/src/tax-rules.ts`
- Fetched source text, kept for reference: `/private/tmp/claude-501/-Users-marcgallagher-personal-flump/f53838d8-2f6a-4832-a92e-67fe1d0489a4/scratchpad/fetch/`

**Caveat for whoever picks this up:** my worktree branch is 123 commits behind local `main`, so I took code facts from `main` (`e4ff6c3`). Re-check line numbers against the current `main` before starting any task.
