# E7 draft plan (planning workflow output)

Status: **draft, not reviewed, nothing implemented.** Produced by a read-only planner and fact-checked by a second agent; both can be wrong. Facts cite file:line in the code at the time of the run.

**Epic:** E7 - Marketing and security claims vs reality (M-06, M-07, M-08, M-09, M-10, G-08, G-12, I-07)

**Goal:** No page on apps/marketing, and no public or in-app copy on apps/web, promises a feature, certification, regulatory status or security property the current code (after E1 and E3) does not have. Each claim is removed or reworded to a statement that can be checked against a file:line. Every wording change has owner sign-off, and legal sign-off where it touches FCA status, UK GDPR or consumer pricing. The security enquiry form stops confirming messages it never sends.

**Classification:** bounded

## Design

## E7 spec: claim register and decisions

The audit docs live only in the main checkout (/Users/marcgallagher/personal/flump/docs/audit). This worktree has only the E1 and E3 plans. Task 1 should copy this register into this worktree as docs/audit/plans/E7-claims-design.md.

Verdicts are against the current HEAD (11eccf8, after E1 and E3).

**What E1 and E3 changed:**
- Auth is now real (WorkOS JWT verifier). "Your data is private to your account" is now defensible.
- Bank tokens are encrypted with a required key and are no longer returned to clients.
- Database TLS verifies certificates by default.
- E1 removed the MCP OAuth metadata route. The remote MCP claims became more false, not less.

Approver codes: **O** is the owner. **O+L** is the owner plus legal (FCA status, UK GDPR, consumer pricing, company identity). **R** means remove the element rather than reword it.

### Security page (apps/marketing/src/pages/SecurityPage.tsx)

| # | Claim (file:line) | Current reality (evidence) | Verdict | Proposed wording (en-GB, sentence case) | Approver | Action |
|---|---|---|---|---|---|---|
| S1 | Title "Trust, security and FCA AISP compliance" (:85) | No FCA authorisation, partner or FRN anywhere in the repo. Bank connection is pasted tokens or a broken OAuth redirect (finance.service.ts:142-215; no callback route in finance.controller.ts:155-171). | false | "Security and privacy \| Flump" | O+L | reword |
| S2 | Meta "FCA-regulated read-only Open Banking, 256-bit encryption, strict UK GDPR compliance, and manual privacy mode" (:88) | Same as S1. Only bank tokens are encrypted (crypto.ts:3). There is no privacy policy (App.tsx:14-20). | false | "How Flump handles your data: manual-first planning, encrypted bank connection tokens and no data selling." | O+L | reword |
| S3 | "AES-256-GCM encryption at rest, TLS 1.3 in transit, and absolute user ownership" (:126-127) | AES-256-GCM covers bank tokens only. The TLS version is set by the host, not the app (server.ts:16). Per-user auth is real after E1 (auth.guard.ts:27). | partly | "Flump is built around minimal data access. You choose what to enter, bank connection tokens are encrypted, and your data is visible only to your account." | O | reword |
| S4 | Card "FCA Open Banking read-only AISP scope ... operates strictly under AISP regulations ... no PISP permissions" (:157-162) | The regulatory status is unsupported. The no-payments part is true: the provider interface has no payment method (provider.interface.ts:25-33). | false (regulatory) / true (no payments) | Heading "Read-only by design". Body: "Flump only reads balances and transactions. It has no feature to make payments, move money or change your account settings." | O+L | reword |
| S5 | Card "AES-256-GCM and TLS 1.3 ... All sensitive personal financial records ... HSTS preloading" (:183-188) | Only bank tokens are encrypted. HSTS has no preload (server.ts:16). | false | Heading "Encryption". Body: "Bank connection tokens are encrypted at rest with AES-256-GCM. The site and app are served over HTTPS, and browsers are told to use HTTPS only." (Add database-at-rest encryption only if the host confirms it.) | O | reword |
| S6 | "fully usable with manual balance entries and CSV imports" (:212) | No CSV route or UI exists. | partly | "Flump works fully with manual entries, giving you the same tax and wealth projections without connecting a bank." | O | reword |
| S7 | "UK GDPR compliance and one-click deletion ... permanently purges all historical data" (:235-240) | Only reset-financial-data exists. It keeps the profile row, MCP tokens and the WorkOS identity (user-profile.service.ts:329-385). No account deletion or export exists, and there is no privacy policy. | false | Heading "Your data, your choice". Body: "We never sell your data or transaction history. You can delete all your financial data from your profile at any time. To close your account completely, email [address]." (Depends on D3 and D4.) | O+L | reword |
| S8 | "FCA regulatory permissions ledger ... what Flump is technically and legally authorised to perform" table (:244-409), including "Prohibited (OAuth 2.0 PKCE)" | No authorisation. No PKCE (monzo.provider.ts:11-18). Flump does store pasted provider tokens, encrypted (finance.service.ts:176). | false | none | O+L | **R** (remove the whole table) |
| S9 | "Contact security and support" button and enquiry modal; "Enquiry sent ... within 1 business day" (:131-133, :412-598) | Nothing is sent (:72-80). There is no server route (server.ts:81). | false | See D4. Interim: remove. | O | **R**, then replace per D4 |

### Home sections, footer and header (apps/marketing/src/components)

| # | Claim (file:line) | Current reality (evidence) | Verdict | Proposed wording (en-GB, sentence case) | Approver | Action |
|---|---|---|---|---|---|---|
| H1 | SecurityPrivacySection diagram labels: "FCA Open Banking Architecture", "AISP Read-Only", "Open Banking OAuth 2.0 PKCE Handshake", "TLS 1.3", "Read-only encrypted telemetry stream", "PISP Blocked", "AES-256-GCM data at rest" (SecurityPrivacySection.tsx:85,99,120,124,139,173,191) | As S1, S4, S5 and S8. | false | Retitle "How your data flows". Nodes: "Your manual entries" → "Flump planning engine (cannot make payments)" → "Optional bank connection (beta): encrypted token". Drop the TLS 1.3, PKCE and AISP badges. | O+L | reword, or **R** the diagram |
| H2 | Pillar "FCA Open Banking ... operates through FCA-regulated Open Banking APIs" (SecurityPrivacySection.tsx:280-291) | As S1. | false | Heading "Optional bank connection (beta)". Body: "Connect a supported bank with your own read-only access token. Flump cannot move money or change account settings." (Depends on D1.) | O+L | reword |
| H3 | "Zero data selling ... never sell your records" (SecurityPrivacySection.tsx:318-338) | No third-party scripts (index.html:16,31). This is a policy statement. | true in code | keep | O (confirm as policy) | keep |
| H4 | FAQ "read-only AISP regulated by the FCA" (HomeFAQ.tsx:43) | As S1 and S4. | false | "No. Flump only reads the balances and transactions you choose to share. It has no feature to make payments, move money or change your account details." | O+L | reword |
| H5 | FAQ "Is there a free tier? ... free baseline tier" (HomeFAQ.tsx:58-59) | No tiers or gating exist; everything is free. | partly | Question "Is Flump free?" Answer: "Yes. Every tool in Flump is free to use today. No credit card is required." (Depends on D2.) | O | reword |
| H6 | Matrix row "FCA Open Banking read-only sync (UK banks and cards)" ticked for Flump (ComparisonMatrix.tsx:77-80) | As S1. | false | none (or, under D1 option b, "Direct bank connection (beta)") | O+L | **R** row |
| H7 | Footer badge "256-bit AES encryption" (Footer.tsx:81) | Bank tokens only. | partly | "Encrypted bank tokens", or remove | O | **R** recommended |
| H8 | Footer links "FCA AISP read-only scope" and "UK GDPR data policies" (Footer.tsx:133,136) | No privacy page exists (App.tsx:14-20). | false | "Read-only by design" → /security. Remove the GDPR link until a privacy policy page exists. | O+L | reword / **R** |
| H9 | Footer notice "FCA Open Banking read-only and regulatory notice ... via regulated Open Banking ... (AISP)" (Footer.tsx:158-168) | As S1. Contradicts the web footer (HomeFooter.tsx:226). | false | Heading "Important information". Body: "Flump is a personal finance planning and modelling tool. It does not give regulated financial, tax or investment advice, and it is not authorised by the Financial Conduct Authority. Tax calculations follow HMRC rules for the current tax years and are for reference." | O+L | reword |
| H10 | "© Flump Technologies Ltd ... Registered in England & Wales" (Footer.tsx:173) | No company number or registered office. The web footer says "Flump. Open-source" (HomeFooter.tsx:232). | unverified | See D6. | O+L | reword or **R** |
| H11 | Mobile nav sub-label "FCA AISP" (Header.tsx:326) | As S1. | false | "Security and privacy" | O | reword |

### Pricing page (apps/marketing/src/pages/PricingPage.tsx)

| # | Claim (file:line) | Current reality (evidence) | Verdict | Proposed wording (en-GB, sentence case) | Approver | Action |
|---|---|---|---|---|---|---|
| P1 | Title and meta "Free manual vs Pro Open Banking", "upgrade to Pro for automated FCA Open Banking sync" (:44,47) | No billing code. FCA status as S1. | false | "Pricing \| Flump is free" and "Every Flump tool is free to use. No credit card required." (D2 a) | O+L | reword |
| P2 | "unlock real-time bank sync" (:85-86) | Sync runs on demand only; no scheduler. | false | "Every planning tool is free while Flump is in early access." | O | reword |
| P3 | Monthly/annual toggle "(Save 20%)", £7.99/£9.99 and "billed £95.88/yr" (:89-141, :329-332) | No billing exists. | false | none | O+L | **R** |
| P4 | "CSV transaction and balance imports" (:233) | Not wired. | false | none | O | **R** |
| P5 | "FCA Open Banking auto-sync" (:253) and "Regulated FCA Open Banking sync (all UK banks)" (:357) | As S1. Only listed institutions are supported (finance.service.ts:144-155). | false | none (or "Bank connection (beta)" under D1 b) | O+L | **R** |
| P6 | Free/Pro split: Section 24 shown as unavailable on Free (:263); the £100k tax trap, Section 24 and 30-year scenarios listed as Pro (:369-393) | No gating. These tools are free (ToolsIndexPage.tsx:95). | partly | List them as included free | O | reword |
| P7 | "Daily transaction auto-categorisation" (:404) | No categoriser or scheduler. | false | none | O | **R** |
| P8 | "Start 14-day free Pro trial →" linking to /signUp?plan=pro (:409-415), plus ?plan=free (:268) | `plan` is never read (signUp._index.tsx:5-17). | false | none. Free CTA: "Get started free" → /signUp with no plan parameter. | O+L | **R** |

### MCP page and spotlight (apps/marketing)

| # | Claim (file:line) | Current reality (evidence) | Verdict | Proposed wording (en-GB, sentence case) | Approver | Action |
|---|---|---|---|---|---|---|
| A1 | "Runs via `npx @flump/mcp`" (McpSpotlightSection.tsx:87; McpPage.tsx:117-147,262) | The package is private and depends on workspace:* (packages/mcp/package.json:4,36). | false | Under D5 c: "Local CLI (preview): run Flump MCP from source. Setup guide coming soon." | O | reword |
| A2 | FLUMP_API_URL the default audience string (now `flump-mcp`); remote URL and ".well-known/oauth-protected-resource"; "OAuth 2.1" (McpPage.tsx:124,141,262-264,467-487) | No host deploy config. The OAuth route was removed by E1 (mcp.controller.ts:20). | false | none | O | **R** the remote tab and URLs |
| A3 | Implied "your data in Claude" via PAT | The stdio CLI's PAT call gets 401 and silently returns default baseline data (stdio.ts:8-40; mcp.controller.ts:79-80). | false today | Do not claim personal-data access until the E1 follow-up is fixed. | O | reword |
| A4 | "Strict PII anonymisation: names and account numbers ... stripped", "6 PII-scrubbed resources" (McpSpotlightSection.tsx:64,80-81; McpPage.tsx:234-237) | Audit finding M-11 (P2, not in E7): only institution names are relabelled. | partly | "Institution names are replaced with generic labels by default." | O | reword (fold in per D7) |

### Web app (apps/web/app), mirrors

| # | Claim (file:line) | Current reality (evidence) | Verdict | Proposed wording (en-GB, sentence case) | Approver | Action |
|---|---|---|---|---|---|---|
| W1 | "FCA read-only Open Banking and 256-bit encryption" (components/home/HomeHero.tsx:242) | As S1 and S5. | false | "Manual-first, no bank login needed" | O+L | reword |
| W2 | "Free manual tier · No credit card required · FCA Open Banking" (HomeCTA.tsx:79) | As S1. | false | "Free to use · No credit card required" | O | reword |
| W3 | FAQ answer (HomeFAQ.tsx:79) | as H4 | false | as H4 | O+L | reword |
| W4 | "FCA-regulated Open Banking APIs" pillar (SecurityPrivacySection.tsx:138-147) | as H2 | false | as H2 | O+L | reword |
| W5 | "FCA regulated Open Banking. 256-bit encrypted read-only connection." (dialogs/addEditAccountsDialog/AddEditAccountsDialog.tsx:494) | The token is encrypted; the FCA part is false. | partly | "Your access token is encrypted and used only to read balances and transactions." | O+L | reword |
| W6 | "Sync via FCA read-only Open Banking ..." (setup/SetupChecklist.tsx:66) | As S1. | false | "Connect a supported bank (beta) or add current accounts and savings pots manually." | O | reword |
| W7 | npx snippet, remote URL, "OAuth 2.1 PKCE" (features/ai-connections/components/McpConnectionCard/McpConnectionCard.tsx:68,98-103,745) | as A1 and A2 | false | as A1. Hide the Remote MCP tab. | O | reword / **R** tab |
| W8 | "not an authorised or regulated financial advisory firm under the FCA" (HomeFooter.tsx:224-228) | Consistent with the repo. | true | keep; align the marketing footer (H9) to it | O+L | keep |

### Out of E7, noted for hand-off

- ConnectBankWizard.tsx:601,614 "Open Banking AISP access token". This belongs to E6/I-08, which owns the wizard.
- BudgetDashboard.tsx:632 "UK FCA Priority Debt Guardrail". This refers to FCA debt guidance, not authorisation. Optional reword to "Priority debt guardrail".

### Copy approach

- Removals and rewording only. No new features.
- New wording follows docs/copy-style-guide.md: en-GB, sentence case, no exclamation marks, no buzzwords, spaced en-dashes.
- Every row needs owner approval. Rows marked O+L need legal approval before merge.
- Copy-only edits stay in the existing flat files. Restructuring them into colocated directories would bury a legal-review diff, and AGENTS.md section 1 targets new components.
- Any new element must follow AGENTS.md section 1 (colocated directory) and section 2 (semantic tokens, no raw hex). Examples: a SecurityContact block, a privacy page, a "Beta" badge.
- If a price ever remains, it needs tabular-nums.

### Security enquiry form options (D4)

**(a) mailto link to a monitored inbox.**
- Dependencies: the owner supplies an address (none exists in the repo) and someone monitors it.
- No server change. A CSP form-action does not apply to anchors (server.ts:34).
- Optional /.well-known/security.txt (RFC 9116, needs an Expires date). sirv may need `dotfiles: true` (server.ts:75-77).
- Drop the "1 business day" promise unless it is staffed. Note that UK GDPR requests have a statutory one-month clock, so the inbox needs a process.
- Effort S.

**(b) Send through an email service.**
- Dependencies:
  - Owner picks a provider and holds the account.
  - API key in the marketing deploy environment.
  - New POST route plus body parser in server.ts, which has none today (server.ts:15-81).
  - Server-side validation and rate limiting (none in marketing).
  - Spam control. A honeypot needs nothing extra; a captcha would need CSP script-src changes (server.ts:26).
  - Origin check.
  - A client fetch with real pending, success and error states.
  - A privacy notice covering the collected name and email, plus a processor DPA.
  - Still needs a monitored inbox.
- Effort M plus legal.

**(c) Remove the form and button.**
- No dependencies, but users are left with no contact route. A privacy notice must give controller contact details anyway, so this works only as an interim.

**Recommendation:** ship (c) now (Task 2, no decision needed), then (a) once an address exists. Choose (b) only if enquiry volume justifies it.

## Decisions needed from the product owner

1. **D0. Who signs off copy, and what can merge before legal review?**
   - (a) The owner approves every row; rows marked O+L also need legal sign-off before merge, but pure removals of false claims can merge on owner approval alone
   - (b) The owner approves everything, everything ships, and legal reviews afterwards
   - (c) Nothing merges until legal has reviewed the whole register
   - Recommendation: (a). Removing a false claim carries less risk than keeping it. New positive regulatory or GDPR statements (for example 'not authorised by the FCA', or erasure by email) wait for legal.
   - Blocks: T4, T5, T6, T7, T8, T9, T10, T11, T12, T13, T14

2. **D1. How should the site describe bank connection and FCA status?**
   - (a) Remove every FCA, AISP and 'regulated' claim. Describe bank connection as 'beta: connect with your own read-only access token' and keep the true 'Flump cannot move money' statement
   - (b) As (a), but present bank sync as 'coming soon' everywhere until E6 fixes the OAuth callback, and remove the comparison-matrix and pricing rows
   - (c) Keep FCA wording only once the owner names a regulated AISP partner and its FRN, states Flump's own status, and legal approves (financial promotion risk)
   - Recommendation: (b) for public marketing and the web public home. Use (a) wording for in-app dialogs, because the token flow does exist (finance.service.ts:142-195). Option (c) needs facts that only the owner has.
   - Blocks: T4, T7, T8, T9, T10, T13, T15

3. **D2. What happens to the Pricing page, given no billing exists?**
   - (a) Keep /pricing as a single 'Flump is free' card with an honest included-features list; no prices, toggle, trial or Pro card
   - (b) Keep a Pro card labelled 'coming soon' with no price and a waitlist (the waitlist needs a capture mechanism, which has the same dependencies as D4)
   - (c) Remove /pricing and its nav links entirely (changes Header.test.tsx:26,100-106 and Footer.tsx links)
   - Recommendation: (a). It is the smallest change, keeps navigation and tests stable, and publishes no prices before billing exists.
   - Blocks: T8, T11

4. **D3. Erasure and UK GDPR: reword, or build account deletion?**
   - (a) Reword to what exists ('delete all your financial data from your profile'), plus a manual account-closure route by email; remove 'UK GDPR compliance' and the GDPR footer link until a privacy policy page exists
   - (b) Build account deletion (delete the profile row, MCP tokens and WorkOS user) and data export first, then restore the erasure claim (a separate L-size epic)
   - (c) Remove the erasure sentence only, with no replacement
   - Recommendation: (a) now, and open a separate ticket for (b) and for a legally drafted privacy policy page. The email route depends on D4 providing an address; if none, fall back to (c).
   - Blocks: T6, T10

5. **D4. What replaces the security enquiry form?**
   - (a) A mailto link to an owner-supplied monitored address, plus optional security.txt
   - (b) A real send through an email service (provider account, API key, new POST route with body parsing, rate limit, spam control, privacy notice, DPA)
   - (c) Remove the form only
   - Recommendation: (c) immediately (Task 2 needs no decision), then (a) once the owner supplies an address. Make no response-time promise unless it is staffed.
   - Blocks: T3

6. **D5. MCP instructions: publish, rewrite, or label as preview?**
   - (a) Rewrite to install-from-source (clone, bun install, build packages/mcp, point the client at dist/transports/stdio.js) and remove the remote tab
   - (b) Publish @flump/mcp to npm (remove private, publish or bundle @flump/finance-engine, own the npm scope, add a release pipeline) and deploy the remote host before advertising it
   - (c) Label MCP as 'preview', remove the npx and remote instructions and URLs, and keep the tool catalogue (which is accurate) until the stdio PAT 401 (E1 ledger) is fixed
   - Recommendation: (c). Even (a) would deliver default baseline data rather than the user's own, because of the context-pack 401 (stdio.ts:16-40, mcp.controller.ts:79-80).
   - Blocks: T12, T13

7. **D6. What company identity goes in the footer?**
   - (a) The owner supplies the registered company name, number and registered office (UK trading disclosure rules, legal to confirm)
   - (b) Replace it with '© {year} Flump' to match the web footer
   - (c) Keep as is
   - Recommendation: (a) if the company is incorporated, otherwise (b). (c) is not advised, because the two apps currently disagree.
   - Blocks: T10

8. **D7. Should E7 also fix the MCP 'strict PII anonymisation' wording (M-11, P2, not formally in E7)?**
   - (a) Yes, fold it in, since the same strings are touched in T12
   - (b) No, leave it for a separate ticket
   - Recommendation: (a). It is the same files and tests (McpPage.test.tsx:21, McpSpotlightSection.test.tsx:16), so a second pass would be wasted work.
   - Blocks: T12

## Tasks

### 1. T1. Write the E7 claim register and sign-off sheet (spec) (effort S)

- Files: `docs/audit/plans/E7-claims-design.md`
- Interfaces: Markdown table only. Copy the register from this plan's design section.
- Tests:
  - No code. The doc lists every row S1-S9, H1-H11, P1-P8, A1-A4 and W1-W8 with file:line, verdict, proposed wording, an approver column (O or O+L) and a blank 'approved wording' column for the owner

### 2. T2. Remove the fake security enquiry form and its false confirmation (effort S)

- Files: `apps/marketing/src/pages/SecurityPage.tsx`, `apps/marketing/src/pages/SecurityPage.test.tsx (new)`, `apps/marketing/src/pages/SecurityPage.stories.tsx (new, Light and Dark)`
- Interfaces: Delete the useState hooks at :65-70, handleSubmitInquiry at :72-80, the button at :130-134 and the modal at :412-598, along with now-unused imports (FiMail, FiSend, FiX, useState, flex, stack, the modal styles). No copy is reworded, so this needs no wording approval, only an owner nod.
- Tests:
  - SecurityPage.test: 'does not offer an enquiry form that cannot send'. queryByRole('button',{name:/Contact security and support/i}) is null, queryByRole('dialog') is null, and queryByText(/Enquiry sent/i) is null
  - SecurityPage.test: 'makes no response-time promise'. queryByText(/1 business day/i) is null
  - Story: a play() test asserts the h1 'Security built into the architecture' renders. The axe check is clean in Light and Dark

### 3. T3. Add a security contact via mailto (D4 option a) (effort S, needs decision)

- Files: `apps/marketing/src/utils/contact.ts (new)`, `apps/marketing/src/utils/contact.test.ts (new)`, `apps/marketing/src/pages/SecurityPage.tsx`, `apps/marketing/src/pages/SecurityPage.test.tsx`, `optional: apps/marketing/public/.well-known/security.txt and apps/marketing/server.ts:74-77 (sirv dotfiles)`
- Interfaces: export const SECURITY_CONTACT_EMAIL: string; export function securityMailto(subject?: string): string. Style the link with semantic tokens only (primary.DEFAULT, text.secondary).
- Depends on: T2
- Tests:
  - contact.test: securityMailto() returns 'mailto:<address>?subject=Security%20enquiry', with the subject URL-encoded
  - SecurityPage.test: 'links to the security inbox'. getByRole('link',{name:/Email security/i}) has an href starting 'mailto:'

### 4. T4. Security page: remove the FCA and AISP claims and the permissions ledger table (S1, S2, S4, S8) (effort S, needs decision)

- Files: `apps/marketing/src/pages/SecurityPage.tsx`, `apps/marketing/src/pages/SecurityPage.test.tsx`
- Depends on: T2
- Tests:
  - 'makes no FCA authorisation claim'. container.textContent does not match /AISP|FCA-regulated|authorised to perform|regulatory permissions ledger/i
  - 'states the read-only fact'. getByRole('heading',{name:'Read-only by design'}) and getByText(/no feature to make payments/i)
  - Helmet: render inside HelmetProvider with a context object and assert helmet.title does not contain 'FCA'

### 5. T5. Security page: fix the encryption, transport and CSV wording (S3, S5, S6) (effort S, needs decision)

- Files: `apps/marketing/src/pages/SecurityPage.tsx`, `apps/marketing/src/pages/SecurityPage.test.tsx`
- Depends on: T2
- Tests:
  - 'does not overstate transport security'. textContent does not match /TLS 1\.3|HSTS preload|All sensitive personal financial records/i
  - 'scopes encryption to bank tokens'. getByText(/Bank connection tokens are encrypted at rest/i)
  - 'does not promise CSV import'. queryByText(/CSV/i) is null

### 6. T6. Security page and footer: replace the erasure and GDPR promise (S7, H8 GDPR link) (effort S, needs decision)

- Files: `apps/marketing/src/pages/SecurityPage.tsx`, `apps/marketing/src/pages/SecurityPage.test.tsx`, `apps/marketing/src/components/Footer.tsx`
- Depends on: T2
- Tests:
  - 'does not promise permanent erasure'. textContent does not match /permanent erasure|one-click deletion|purges all historical data/i
  - 'describes the reset that exists'. getByText(/delete all your financial data from your profile/i)
  - Footer render (new Footer.test.tsx in the same folder, following the HomeFAQ.test.tsx pattern): queryByRole('link',{name:/UK GDPR data policies/i}) is null

### 7. T7. Home SecurityPrivacySection: honest diagram and pillar (H1, H2) (effort S, needs decision)

- Files: `apps/marketing/src/components/SecurityPrivacySection.tsx`, `apps/marketing/src/components/SecurityPrivacySection.test.tsx (new)`, `apps/marketing/src/components/SecurityPrivacySection.stories.tsx`
- Tests:
  - 'makes no regulatory or protocol claims'. textContent does not match /FCA|AISP|PISP|PKCE|TLS 1\.3|AES-256-GCM data at rest/i
  - 'keeps the no-data-selling pillar'. getByText('Zero data selling')
  - HomePage.test.tsx:47 getByTestId('security-privacy-section') still passes

### 8. T8. HomeFAQ and ComparisonMatrix: remove the FCA tick and answer, and fix the free tier question (H4, H5, H6) (effort S, needs decision)

- Files: `apps/marketing/src/components/HomeFAQ.tsx`, `apps/marketing/src/components/HomeFAQ.test.tsx`, `apps/marketing/src/components/ComparisonMatrix.tsx`, `apps/marketing/src/pages/HomePage.test.tsx`
- Tests:
  - HomeFAQ.test: the existing toggle assertions still pass (the question text is unchanged). Add: the first answer matches getByText(/no feature to make payments/i), and queryByText(/Financial Conduct Authority/i) is null
  - HomeFAQ.test: getByRole('button',{name:/Is Flump free\?/i}) exists (under D2 a)
  - HomePage.test: queryByText(/FCA Open Banking read-only sync/i) is null, and getByText('Built for UK rules, not spreadsheets') still passes

### 9. T9. Footer and Header: badge, links, regulatory notice, company line (H7, H8, H9, H10, H11) (effort S, needs decision)

- Files: `apps/marketing/src/components/Footer.tsx`, `apps/marketing/src/components/Footer.test.tsx (new or extended from T6)`, `apps/marketing/src/components/Header.tsx`, `apps/marketing/src/components/Header.test.tsx`
- Depends on: T6
- Tests:
  - Footer.test: textContent does not match /256-bit AES|FCA AISP|regulated Open Banking/i, and getByText(/not authorised by the Financial Conduct Authority/i) is present
  - Footer.test: the company line equals the D6-approved text (no 'Registered in England & Wales' without a company number)
  - Header.test: after opening the mobile menu, queryByText('FCA AISP') is null. The pricing link assertions at :26 and :100-106 still pass under D2 a

### 10. T10. Pricing page: single free plan, no prices, trial or Pro claims (P1-P8, D2 option a) (effort S, needs decision)

- Files: `apps/marketing/src/pages/PricingPage.tsx`, `apps/marketing/src/pages/PricingPage.test.tsx`, `apps/marketing/src/pages/PricingPage.stories.tsx (new, Light and Dark)`
- Tests:
  - Replace 'renders both tiers ...' with 'renders one free plan with an honest sign-up link'. getByText('Get started free').closest('a').href ends with '/signUp' with no plan parameter, and queryByText(/Pro/) is null
  - Replace 'toggles between monthly and annual pricing' with 'shows no prices or trial'. queryByText(/£7\.99|£9\.99|£95\.88|14-day|Save 20%/) is null, and queryByLabelText('Toggle annual billing') is null
  - 'claims only shipped features'. textContent does not match /CSV|auto-categorisation|FCA|real-time/i, and getByText(/Section 24/) is listed as included

### 11. T11. MCP marketing: preview label, remove npx and remote instructions, fix the PII wording (A1-A4, D5 c, D7 a) (effort S, needs decision)

- Files: `apps/marketing/src/pages/McpPage/McpPage.tsx`, `apps/marketing/src/pages/McpPage/McpPage.test.tsx`, `apps/marketing/src/pages/McpPage/McpPage.stories.tsx`, `apps/marketing/src/components/McpSpotlightSection/McpSpotlightSection.tsx`, `apps/marketing/src/components/McpSpotlightSection/McpSpotlightSection.test.tsx`, `apps/marketing/src/components/McpSpotlightSection/McpSpotlightSection.stories.tsx`
- Tests:
  - McpPage.test: queryByText(/npx @flump\/mcp/) is null, and textContent does not contain 'the MCP host' or 'oauth-protected-resource'
  - McpPage.test: queryByTestId('setup-tab-remote') is null (replacing the :40-41 remote-tab clicks), and the 8 tool testids at :25-32 still pass
  - McpPage.test: replace 'Strict PII anonymisation' (:21) with getByText(/Institution names are replaced with generic labels/i), and change 'How to set up Flump MCP in 2 minutes' (:22) to the approved heading
  - McpSpotlightSection.test: replace /Strict PII anonymisation:/ (:16) and assert queryByText(/npx/) is null. The stories' play() assertions at :21-26 keep the heading and tool name

### 12. T12. Web app mirrors: public home and in-app copy (W1-W7) (effort M, needs decision)

- Files: `apps/web/app/components/home/HomeHero.tsx`, `apps/web/app/components/home/HomeHero.test.tsx`, `apps/web/app/components/home/HomeCTA.tsx`, `apps/web/app/components/home/HomeFAQ.tsx`, `apps/web/app/components/home/SecurityPrivacySection.tsx`, `apps/web/app/components/dialogs/addEditAccountsDialog/AddEditAccountsDialog.tsx`, `apps/web/app/components/setup/SetupChecklist.tsx`, `apps/web/app/features/ai-connections/components/McpConnectionCard/McpConnectionCard.tsx`, `apps/web/app/features/ai-connections/components/McpConnectionCard/McpConnectionCard.test.tsx`, `apps/web/app/features/ai-connections/components/McpConnectionCard/McpConnectionCard.stories.tsx`
- Depends on: T7, T8, T11
- Tests:
  - HomeHero.test.tsx:36: replace the FCA assertion with the approved trust-bar text, and assert queryByText(/FCA/) is null
  - LoggedOutHome.test.tsx:92 (FAQ question) still passes. Add an assertion that the FAQ answer does not match /Financial Conduct Authority/
  - McpConnectionCard.test.tsx:40-43: under D5 c, the Remote MCP tab is absent (queryByRole('tab',{name:/Remote MCP/}) is null), and the snippet does not contain 'npx'
  - SetupChecklist and AddEditAccountsDialog: the existing tests still pass, and a new assertion checks that queryByText(/FCA regulated/i) is null

### 13. T13. Copy style guide: claims rule and the fixed replacement (effort S, needs decision)

- Files: `docs/copy-style-guide.md`
- Tests:
  - No code. Line 116 replacement becomes 'Encrypted bank connection tokens'. Add a 'Claims' rule: no regulatory, security, pricing or feature claim without a file:line or host evidence, and an approver listed in the E7 register

### 14. T14. Claims regression guard (lands last) (effort S, needs decision)

- Files: `apps/marketing/src/claims.test.ts (new)`, `apps/web/app/claims.test.ts (new)`
- Interfaces: Use node:fs and node:path with a recursive readdir. The phrase list is a const array with a comment linking each phrase to its register row. Under D1 option c (keeping FCA wording) the FCA phrase is dropped.
- Depends on: T4, T5, T6, T7, T8, T9, T10, T11, T12
- Tests:
  - For each banned phrase, the test reads every .tsx under src (marketing) and app (web), excluding *.test.* and *.stories.*, and asserts no file matches. Phrases: /TLS 1\.3/, /HSTS preload/i, /permanent erasure/i, /1 business day/i, /14-day/, /npx @flump\/mcp/, /mcp\.flump\.co\.uk/, /FCA-regulated|regulated by the Financial Conduct Authority|AISP regulations/i, /£9\.99|£7\.99/
  - The failure message names the file and phrase, so a reintroduced claim fails CI with a pointer to the register

## Can start without any decision

- T1 (claim register doc for sign-off)
- T2 (remove the fake enquiry form, the 'Enquiry sent' text and the '1 business day' promise; no wording is added, so this needs only the owner's nod)
- Drafting the T4-T12 branches and tests behind review, without merging, so the owner reviews real diffs rather than prose

## Review focus

- Helmet title and meta strings carry claims (SecurityPage.tsx:85-88, PricingPage.tsx:44-47, McpPage.tsx:164) but are invisible in screen tests. Assert them through a HelmetProvider context, or check the SSR output.
- Copy duplicated across the two public homes. Every marketing component has a web twin under apps/web/app/components/home. A fix in one app only leaves the claim live at the web app root (routes/_index.tsx:357).
- Removing false claims must not add new unverified positive ones. Examples: 'not authorised by the FCA', erasure-by-email, 'database encrypted at rest', or a response-time promise all need the D0 legal path.
- 'Read-only' wording: the code has no payment methods (provider.interface.ts:25-33), but a pasted Monzo or Starling token may carry write scopes. Say 'Flump has no feature to move money', not 'the token is read-only'.
- Removing the modal must not leave dead imports or unused styles; Biome will fail. Watch the state hooks, FiMail, FiSend, FiX, flex, stack and modalOverlayStyle.
- Any new element (contact link, beta badge, single pricing card) must use semantic tokens. Do not copy the raw hex in the surrounding code (SecurityPage.tsx:103,146; PricingPage.tsx:109,286). If a price ever remains, it needs tabular-nums.
- Story and axe checks: the new SecurityPage and PricingPage stories must render in Light and Dark with zero a11y violations. The existing pages may already fail contrast because of the raw hex. Record any pre-existing violation; do not silently widen scope.
- Changing the PricingPage test assertions (PricingPage.test.tsx:23,37-43) must not just delete coverage. Replace them with absence assertions for prices, trial and toggle.
- MCP: removing the remote tab must keep the tab keyboard pattern valid with two tabs (aria-selected and roving focus in McpPage and McpConnectionCard).
- The claims guard test must exclude test and story files and node_modules. It must not match legitimate uses, such as 'FCA regulatory reforms' in tools.$slug.tsx:262 and 'not authorised ... FCA' in HomeFooter.tsx:226, so patterns must be specific.
- The /security footer links all point to the same page. After renaming, check that there is no duplicate link text pointing to the same URL; that is an a11y and SEO smell.

## Risks

- Legal exposure while waiting. The FCA, erasure and pricing claims are live now. If D0 stalls, ship at least T2 (no decision) and the pure removals (S8, P3, P8, H6) on owner approval alone.
- The facts may move again. E6 (bank OAuth callback), the E1 stdio PAT ticket and any MCP deployment would make 'coming soon' or 'preview' wording stale. Each of those epics must update the register and the T14 guard list.
- Out-of-repo facts are unknown. A regulated partner, company registration, host TLS version or database-at-rest encryption may exist outside the repo; this plan treats them as unverified. The owner may supply evidence that changes verdicts S1, S5 and H10.
- Search engines and link previews cache the old titles and descriptions for weeks after the SSR copy changes.
- Editing legacy flat files leaves them non-colocated and full of raw hex. That is a deliberate trade-off to keep the legal diff readable; the restructure belongs to the design-system epic.
- GDPR requests currently go nowhere. Removing the form (T2) without a replacement inbox (T3) leaves no channel for data subject requests, and a privacy notice must name one. T3 should follow quickly.
- Under D2 option c (removing /pricing), the Header tests and footer links change, and inbound links to /pricing fall to the catch-all route (App.tsx:20), which renders HomePage with a 200 status.

## Rollout

These are copy-only changes with no flags or migrations.

**Order:**
1. T1 and T2 first. They are the highest-liability, no-decision items.
2. One PR per surface, so legal can review each diff against the register:
   - Security page: T4, T5, T6.
   - Home sections: T7, T8, T9.
   - Pricing: T10.
   - MCP: T11.
   - Web app: T12.
3. T13 and T14 last. T14 then guards against regressions.

**Merge rules:**
- Each PR body links to the register rows it changes and records the approver per row.
- O+L rows do not merge without written legal sign-off. Removal-only rows can merge on owner approval (D0 option a).

**Before each PR:** run the four gates from AGENTS.md section 5: `bun run lint`, `bun run check-types`, `bun run test`, `bun run build`. Per the E3 notes, `bun run lint` reformats unrelated CHANGELOG.md files; restore them with `git checkout --`.

**Before merge:** check the marketing pages in Storybook in Light and Dark with the a11y addon.

**After deploy:**
- Fetch /, /security, /pricing and /mcp from production and grep the SSR HTML for the banned phrases. This catches Helmet meta, which unit tests miss.
- Request recrawl in Search Console.

**Follow-up tickets (not E7):**
- Account deletion and export (D3 b).
- A legally drafted privacy policy page with controller details.
- MCP stdio PAT 401 on context-pack (E1 ledger).
- MCP npm publish and remote host deployment, plus MCP OAuth.
- Bank OAuth callback route (E6, I-08).
- Billing and plan hand-off, if Pro is ever built.
- ConnectBankWizard 'AISP token' wording (E6).

## Facts (as cited by the planner)

- The security enquiry form sends nothing. handleSubmitInquiry calls preventDefault, sets submitted and closes the modal after 2.5 s. There is no fetch call. (`apps/marketing/src/pages/SecurityPage.tsx:72-80`)
- The form's success state says 'Enquiry sent' and 'Our compliance team will respond within 1 business day.' (`apps/marketing/src/pages/SecurityPage.tsx:462-469`)
- The form offers a 'UK GDPR / data subject request' enquiry type, so data subject requests are being silently dropped. (`apps/marketing/src/pages/SecurityPage.tsx:552-555`)
- The marketing server has no POST route and no body parser. It has a header middleware, static/vite middleware and one catch-all SSR handler. (`apps/marketing/server.ts:15,71-81`)
- HSTS is set without the preload directive. The TLS version is not set anywhere in the app. (`apps/marketing/server.ts:16`)
- The production CSP allows form-action 'self' and connect-src 'self' https:. A same-origin POST or fetch would be allowed. A mailto anchor is not affected. (`apps/marketing/server.ts:30,34`)
- sirv serves dist/client with only the extensions option set (no dotfiles option), so a /.well-known/security.txt file may not be served without a config change. (`apps/marketing/server.ts:74-77`)
- The marketing app has no privacy policy route. The routes are /, /tools, /tools/:slug, /pricing, /security, /mcp and a catch-all. (`apps/marketing/src/App.tsx:14-20`)
- No contact email address (security@, support@ or mailto) exists anywhere in the marketing source or the web home components. (`apps/marketing/src (grep for mailto and @flump found only package imports)`)
- The Security page title and meta claim 'FCA AISP compliance' and 'FCA-regulated read-only Open Banking, 256-bit encryption, strict UK GDPR compliance'. (`apps/marketing/src/pages/SecurityPage.tsx:85-88`)
- The Security page hero claims 'AES-256-GCM encryption at rest, TLS 1.3 in transit, and absolute user ownership'. (`apps/marketing/src/pages/SecurityPage.tsx:126-127`)
- A Security page card claims 'Flump operates strictly under Account Information Service Provider (AISP) regulations'. (`apps/marketing/src/pages/SecurityPage.tsx:157-162`)
- A Security page card claims 'All sensitive personal financial records are encrypted using 256-bit ... AES-GCM at rest ... forced over TLS 1.3 with HSTS preloading'. (`apps/marketing/src/pages/SecurityPage.tsx:183-188`)
- The Security page's manual mode card promises CSV imports. (`apps/marketing/src/pages/SecurityPage.tsx:210-214`)
- The Security page promises 'one-click permanent erasure: deleting your account permanently purges all historical data from our storage'. (`apps/marketing/src/pages/SecurityPage.tsx:235-240`)
- The 'FCA regulatory permissions ledger' table claims a 'Formal breakdown of what Flump is technically and legally authorised to perform'. Its rows include 'Permitted (Read-Only)' under AISP and 'Prohibited (OAuth 2.0 PKCE)' for storing credentials. (`apps/marketing/src/pages/SecurityPage.tsx:244-409`)
- AES-256-GCM is used only by the banking token helpers (encryptBankingToken / safeDecryptBankingToken). Its only callers are the banking adapters and orchestrator, not general financial records. (`packages/banking/src/server/crypto.ts:3,52; packages/banking/src/server/orchestrator.ts; packages/banking/src/server/adapters/{csv,plaid,sandbox}.ts`)
- After E3, the banking key is required (at least 32 characters) outside development and test, so the committed default key cannot be used in production. Bank tokens are encrypted with a real key. (`packages/banking/src/server/crypto.ts:18-29`)
- After E3, bank connection responses are mapped through toPublicConnection, so tokens are no longer returned to clients. (`apps/backend/src/finance.service.ts:133,185`)
- After E1, the backend AuthGuard verifies bearer tokens with the WorkOS JWT verifier. Per-user scoping is now real, so the old 'unsigned JWT' contradiction in M-09 no longer holds. (`apps/backend/src/auth/auth.guard.ts:14-29; apps/backend/src/auth/workos-jwt.verifier.ts:34`)
- Bank connection works in two ways. (1) The user pastes a provider token, which is encrypted and stored, then accounts are synced. (2) OAuth redirects to `${BACKEND_URL}/bank-connections/callback`, but no controller route with that path exists. (`apps/backend/src/finance.service.ts:142-215; apps/backend/src/finance.controller.ts:155-171`)
- Registered providers are Monzo, Starling, Trading 212 and a generic Open Banking Standard provider for a hard-coded list of bank endpoints (for example Chase). Nothing in the repo names a regulated AISP partner or an FRN. (`apps/backend/src/providers/provider.registry.ts:15-27; apps/backend/src/providers/open-banking-standard.provider.ts:60-66`)
- The provider OAuth URLs have no PKCE parameters (no code_challenge). (`apps/backend/src/providers/monzo.provider.ts:11-18; apps/backend/src/providers/open-banking-standard.provider.ts:73-82`)
- The provider interface has only getAuthUrl, exchangeCode, fetchAccounts and fetchTransactions. No payment or transfer method exists, so 'Flump cannot move money' is true in code. (`apps/backend/src/providers/provider.interface.ts:25-33`)
- Sync only runs on demand. No scheduler exists in the backend (no @Cron or setInterval). (`apps/backend/src/finance.controller.ts:165-166`)
- The only bulk deletion is POST user-profile/reset-financial-data. It deletes account details, transactions, accounts, bank connections, budget entries and tax records, and blanks the profile fields. It keeps the user_profile row and MCP tokens, and does not touch the WorkOS identity. No account deletion or data export route exists. (`apps/backend/src/user-profile.controller.ts:60-98; apps/backend/src/user-profile.service.ts:329-385`)
- Backend @Delete routes cover only budget entries, single accounts, bank connections, MCP tokens and tax records. (`apps/backend/src/budget.controller.ts:339; apps/backend/src/finance.controller.ts:140,171; apps/backend/src/mcp.controller.ts:70; apps/backend/src/tax.controller.ts:825`)
- The web Profile panel offers only 'Danger Zone: Reset Financial Data'. There is no delete-account control. (`apps/web/app/components/budget/UserProfilePanel.tsx:902-959`)
- The Pricing page shows a monthly/annual toggle '(Save 20%)', £7.99/£9.99 and 'billed £95.88/yr'. (`apps/marketing/src/pages/PricingPage.tsx:89-141,329-332`)
- The Pricing page lists 'CSV transaction and balance imports' (free), 'FCA Open Banking auto-sync', 'Regulated FCA Open Banking sync (all UK banks)' and 'Daily transaction auto-categorisation'. (`apps/marketing/src/pages/PricingPage.tsx:233,253,357-358,404`)
- The Pricing page's 'Start 14-day free Pro trial' links to /signUp?plan=pro, and the free CTA links to /signUp?plan=free. (`apps/marketing/src/pages/PricingPage.tsx:268,409-415`)
- The web sign-up loader never reads plan. It always calls getSignUpUrl('/app'). (`apps/web/app/routes/signUp._index.tsx:5-17`)
- No billing, subscription, Stripe or entitlement code exists in the backend or web. The only grep hits are seed data and a test category name. (`apps/backend/src/tax.controller.ts:682 (seed string only)`)
- No CSV import route or UI exists. The CSV parser exists only in the banking package. (`packages/banking/src/server/adapters/csv.ts; apps/web/app/components/home/WebHowItWorksSection.tsx:98 is the only csv hit in web`)
- The Pro-only features named on Pricing (the £100k tax trap and Section 24 tools) are offered free as public tools. (`apps/marketing/src/pages/ToolsIndexPage.tsx:95; apps/marketing/src/pages/PricingPage.tsx:263,369,381`)
- @flump/mcp is private and depends on workspace:* @flump/finance-engine, so `npx @flump/mcp` cannot work as configured. (`packages/mcp/package.json:2-4,35-36`)
- The marketing pages instruct `npx -y @flump/mcp` with FLUMP_API_URL the default audience string (now `flump-mcp`). (`apps/marketing/src/pages/McpPage/McpPage.tsx:117-147,262-264; apps/marketing/src/components/McpSpotlightSection/McpSpotlightSection.tsx:87`)
- the MCP host appears only as a default audience string. No deploy config exists for an MCP host; the only tracked Dockerfiles are for backend, web and marketing. (`apps/backend/src/mcp.service.ts:59; packages/mcp/src/auth/token-verifier.ts:57; git ls-files Dockerfiles`)
- Changed by E1: the .well-known/oauth-protected-resource route was removed and MCP OAuth is off (PAT only). The remote 'OAuth 2.1' instructions and the advertised metadata URL are therefore now false. (`apps/backend/src/mcp.controller.ts:20; docs/audit/plans/E1-auth-design.md:23,64`)
- The stdio CLI fetches `${apiUrl}/mcp-tokens/context-pack` with the PAT. That route is behind AuthGuard, which accepts only WorkOS JWTs, so the call returns 401. The CLI then silently falls back to default baseline data. The E1 ledger records this as needing its own ticket. (`packages/mcp/src/transports/stdio.ts:8-40; apps/backend/src/mcp.controller.ts:79-80; docs/audit/plans/E1-auth-ledger.md:76`)
- The home SecurityPrivacySection diagram labels are 'FCA Open Banking Architecture', 'AISP Read-Only', 'Open Banking OAuth 2.0 PKCE Handshake', 'TLS 1.3', 'PISP Blocked' and 'AES-256-GCM data at rest'. The pillar reads 'Optional live account sync operates through FCA-regulated Open Banking APIs'. (`apps/marketing/src/components/SecurityPrivacySection.tsx:85,99,120,124,139,173,191,280-291`)
- A home FAQ answer claims read-only AISP 'regulated by the Financial Conduct Authority'. Another says 'Is there a free tier? ... free baseline tier', which implies tiers that do not exist. (`apps/marketing/src/components/HomeFAQ.tsx:43,58-59`)
- The comparison matrix ticks 'FCA Open Banking read-only sync (UK banks and cards)' for Flump. (`apps/marketing/src/components/ComparisonMatrix.tsx:77-80`)
- The footer has a '256-bit AES encryption' badge, the links 'FCA AISP read-only scope' and 'UK GDPR data policies' (both to /security), a notice that Flump 'connects ... via regulated Open Banking Account Information Services (AISP)', and '© Flump Technologies Ltd ... Registered in England & Wales' with no company number. (`apps/marketing/src/components/Footer.tsx:81,133,136,158-168,173`)
- The mobile navigation sub-label for Security reads 'FCA AISP'. (`apps/marketing/src/components/Header.tsx:326`)
- The web public home (LoggedOutHome, served at /) repeats the claims. The web footer, by contrast, says 'Flump is not an authorised or regulated financial advisory firm under the FCA' and '© Flump. Open-source personal finance platform', which conflicts with the marketing footer. (`apps/web/app/routes/_index.tsx:7,357; apps/web/app/components/home/HomeHero.tsx:242; HomeCTA.tsx:79; HomeFAQ.tsx:79; SecurityPrivacySection.tsx:138-147; HomeFooter.tsx:224-232`)
- In-app web copy repeats the claims: 'FCA regulated Open Banking. 256-bit encrypted read-only connection.', 'Sync via FCA read-only Open Banking', the npx snippet, the remote URL and 'OAuth 2.1 PKCE'. (`apps/web/app/components/dialogs/addEditAccountsDialog/AddEditAccountsDialog.tsx:494; apps/web/app/components/setup/SetupChecklist.tsx:66; apps/web/app/features/ai-connections/components/McpConnectionCard/McpConnectionCard.tsx:68,98-103,745`)
- The copy style guide recommends '256-bit AES encryption' as the replacement wording. That wording itself encodes the overstated claim. (`docs/copy-style-guide.md:116`)
- Marketing has no third-party analytics or ad scripts. index.html loads only an inline theme script and the client entry, so 'zero ads / no data selling' is consistent with the code. It remains a policy claim. (`apps/marketing/index.html:16,31`)
- These existing marketing tests assert copy that will change: PricingPage.test.tsx asserts 'Start 14-day free Pro trial →' with plan=pro, and £7.99/£9.99 with the 'Toggle annual billing' label. McpPage.test.tsx asserts 'Strict PII anonymisation', 'How to set up Flump MCP in 2 minutes' and the remote tab. McpSpotlightSection.test.tsx asserts 'Strict PII anonymisation:'. Header.test.tsx asserts the pricing links. HomePage.test.tsx asserts the matrix and security section titles. (`apps/marketing/src/pages/PricingPage.test.tsx:17-24,37-43; apps/marketing/src/pages/McpPage/McpPage.test.tsx:21-22,37-41; apps/marketing/src/components/McpSpotlightSection/McpSpotlightSection.test.tsx:16; apps/marketing/src/components/Header.test.tsx:26,100-106; apps/marketing/src/pages/HomePage.test.tsx:46-52`)
- Storybook play() tests assert MCP copy: the spotlight heading and tool name, and the MCP page hero. (`apps/marketing/src/components/McpSpotlightSection/McpSpotlightSection.stories.tsx:17-26; apps/marketing/src/pages/McpPage/McpPage.stories.tsx:25-29`)
- Web tests assert claim copy: HomeHero.test asserts 'FCA read-only Open Banking and 256-bit encryption', and McpConnectionCard.test asserts the Remote MCP tab and remote-mcp-url-box. (`apps/web/app/components/home/HomeHero.test.tsx:36; apps/web/app/features/ai-connections/components/McpConnectionCard/McpConnectionCard.test.tsx:40-43`)
- SecurityPage has no test or story. PricingPage has a test but no story. Both are flat legacy files with heavy raw hex styling. (`apps/marketing/src/pages/ (file list); apps/marketing/src/pages/SecurityPage.tsx:18-23,103,146`)

## Fact-check

53 claims checked; 18 not confirmed.

- **unclear**: No contact email address exists in marketing source or web home components — My grep for mailto/@flump/security@ errored under zsh glob (no matches found) in the first batch, and the marketing/web check was not completed; not independently verified.
- **unclear**: Card claims operates strictly under AISP regulations (157-162) — Not opened.
- **unclear**: Card claims 256-bit AES-GCM at rest, TLS 1.3, HSTS preloading (183-188) — Not opened; HSTS has no preload is confirmed.
- **unclear**: FCA regulatory permissions ledger table 244-409 — Not opened.
- **unclear**: AES-256-GCM used only by banking token helpers; callers are banking adapters/orchestrator — Caller grep failed on zsh glob; orchestrator uses BankSyncOrchestrator.encryptToken (finance.service.ts:~176) which is consistent, but adapter callers unverified.
- **unclear**: Pricing toggle, £7.99/£9.99, billed £95.88/yr — Not opened.
- **unclear**: Pricing lists CSV imports, FCA Open Banking auto-sync etc. — Not opened.
- **unclear**: Pro-only features named on Pricing are offered free as public tools — ToolsIndexPage.tsx:95 shows the £100k tax trap tool in TOOLS_CATALOG; Section 24 not opened.
- **unclear**: Marketing pages instruct npx -y @flump/mcp with FLUMP_API_URL the default audience string (now `flump-mcp`) — Not opened.
- **false**: the MCP host appears only as default audience; only tracked Dockerfiles are backend, web, marketing — git ls-files shows four Dockerfiles: apps/backend/Dockerfile, apps/marketing/Dockerfile, apps/web/.gitpod.Dockerfile, apps/web/Dockerfile (the extra is a Gitpod dev image, not an MCP deploy). Audience defaults confirmed at mcp.service.ts:59 and token-verifier.ts:57.
- **unclear**: Home SecurityPrivacySection diagram labels and pillar text — Not opened.
- **unclear**: Home FAQ claims AISP regulated by FCA; 'free baseline tier' — Not opened.
- **unclear**: Comparison matrix ticks FCA Open Banking read-only sync for Flump — Not opened.
- **unclear**: In-app web copy repeats the claims (AddEditAccountsDialog, SetupChecklist, McpConnectionCard) — Not opened.
- **unclear**: Copy style guide recommends '256-bit AES encryption' as replacement wording — docs/copy-style-guide.md:112-118 shows a banned-phrase table but line 116 is not the 256-bit row; claim not confirmed at the cited line.
- **unclear**: Existing marketing tests assert copy that will change (Pricing, Mcp, Spotlight, Header, HomePage tests) — Not opened; PricingPage.test.tsx exists and HomePage.test.tsx exists.
- **unclear**: Storybook play() tests assert MCP copy — Not opened.
- **unclear**: Web tests assert claim copy (HomeHero.test, McpConnectionCard.test) — Not opened.

Issues the checker says were missed:

- apps/marketing/server.ts:26 - prod CSP script-src allows 'https:' wholesale (and connect-src https: ws:), which weakens the 'no third-party scripts' policy claim; a policy statement about no data selling is not enforced by CSP, and any 'security' copy should not imply a strict CSP.
- apps/marketing/server.ts:76 - sirv option is extensions: [] (not unset); adding dotfiles:true for /.well-known/security.txt is a server change that also needs a publicly served file in dist/client (build copies from public/), which the plan should list.
- apps/backend/src/finance.service.ts:~196 (state = `${institutionId}:${userId}`) - the OAuth state is an unsigned userId, so even if a callback route were added, the OAuth path has no CSRF protection; any 'secure bank connection' wording should stay limited to the token-paste path.
- packages/mcp/src/transports/stdio.ts:9-12 - the CLI only calls the API if FLUMP_PAT is set and defaults the PAT to the literal 'flump_pat_local_cli'; on non-ok responses it falls back to baseline data with no warning, so the MCP 'your data' claims are false in both branches.
- apps/backend/src/app.module.ts:26 - AuthGuard is applied per controller (e.g. finance.controller.ts:57, user-profile.controller.ts:26) rather than globally (no APP_GUARD found), so the 'your data is visible only to your account' wording depends on every controller keeping @UseGuards; worth a verification step before the O-only S3 wording ships.
