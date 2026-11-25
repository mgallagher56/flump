# E28. Making Tax Digital for Income Tax: rules, gap and change plan

Decisions: accepted on 2026-11-25 (decision 1, and decision 2 as the user's own recorded position; decisions 3 to 5 stay open)

> Owner, 25 November 2026: "accept the MTD recommendation and start the notice". Recorded in [DECISIONS.md](DECISIONS.md). Slice A3 (the notice) is built in the notice PR; slice A1 is the engine check it reads.

> Owner, 25 November 2026: "Research Making tax digital and work out the changes we would need to make to accommodate it." This plan answers that. It builds on [E28-mtd-discovery.md](E28-mtd-discovery.md) (accepted on 21 November 2026) and replaces its section 1 with facts re-read today. Nothing is built from this document until the owner answers section 6, except slices A1 and A2 (section 4.1): A1 is needed by both (a) and (b), and A2 enforces the wording rule accepted on 21 November. This is not legal or tax advice.

Status: written on 25 November 2026 against `main` at `a0805b08`. Every fact in section 1 carries a source from the list at the end, all read on 25 November 2026. **[U]** marks anything not confirmed in a primary source today. No user evidence exists yet: the five interviews proposed in the discovery note have not been run (section 5).

## Summary

- MTD for Income Tax is live. Sole traders and landlords with qualifying income over £50,000 joined on 6 April 2026; over £30,000 join on 6 April 2027; over £20,000 join on 6 April 2028 [R1, R3].
- They must keep digital records in software and send cumulative quarterly totals per income source through software, then file the tax return through software [R4, R6, R8].
- Flump keeps tax records and estimates a yearly position, but has no quarters, no HMRC categories one to one, no business ids and no HMRC connection (section 2).
- Three options are costed in section 3. A Fable decider recommends option (a) now: stay out, say so plainly, and tell users who may be mandated. Option (b), a record-keeping companion with a quarterly export, stays a February 2027 decision as accepted on 21 November. Option (c), filing through HMRC, is ruled out for 2027-28 as already accepted, and after that until the conditions in section 4 change.

## 1. The rules

### 1.1 Who must use it, and from when

| Qualifying income | Measured in tax year | Must use MTD from |
| --- | --- | --- |
| Over £50,000 | 2024-25 | 6 April 2026 |
| Over £30,000 | 2025-26 | 6 April 2027 |
| Over £20,000 | 2026-27 and later | 6 April 2028 |

- The thresholds are in law, regulation 27 of the Income Tax (Digital Obligations) Regulations 2026, SI 2026/336, in force 1 April 2026. It revokes SI 2021/1076 and SI 2024/167 [R3].
- The year measured is two years before the mandated year, from that year's Self Assessment return [R3].
- HMRC writes after reviewing a return; no letter does not remove the duty to check [R1]. From September 2026 HMRC began signing up people due for 2026-27 who had not signed up [R15].
- Sign-up is through HMRC, not software; sign-up by API "has been ruled out for security reasons" [H3].
- Once in, a person can leave only after three years in a row under the threshold [R2, R3].

### 1.2 Qualifying income

- Self-employment plus property income before expenses (turnover), added across sources [R2, R3].
- Not counted: employment, a partner's profit share, dividends, pensions, transition profits, qualifying care relief receipts and some others [R2].
- A partner's profit share needs no digital records or quarterly updates, but goes in the MTD tax return [R2].
- Joint property: only the person's share counts [R2].
- Foreign property counts for UK residents [R2].

### 1.3 Digital records

- The law requires a record of each item's amount and date, kept in the form HMRC directs, made no later than the update or return that uses it [R3, regulations 15 and 17].
- Guidance: one record per transaction by default, with amount, date and a category that matches the Self Assessment categories, made "as close to the date of the transaction as possible" [R4].
- Simpler records: where a source's turnover is under £90,000, each record need only say income or expense; residential finance costs stay separate [R4]. The direction words this as below the VAT registration threshold [R5]. Whether the two always match is [U].
- Joint lets may use one income record per category per quarter and one expense record per category per year [R5].
- Estimates can be recorded and corrected later; part-private costs can be recorded in full and adjusted later [R4].
- **Digital links.** Where more than one product is used, data moves between them digitally, never retyped or cut and pasted. CSV or XML import and export, linked cells and APIs count [R4]. No soft landing period is stated: [U].
- Records are kept at least five years after the 31 January deadline [R4]. Joining mid-year means catching up from 6 April [R4].

### 1.4 Quarterly updates

- One update per business (each self-employment, UK property, foreign property) per period [R3, regulation 9].
- Standard periods end 5 July, 5 October, 5 January and 5 April. Deadlines are 7 August, 7 November, 7 February and 7 May. Calendar quarters (ending 30 June and so on) keep the same deadlines [R3, R6].
- Content, from guidance: year-to-date cumulative totals per Self Assessment category from 6 April, no receipts, no adjustments, sent even when nil [R6]. The law leaves the content to an HMRC direction whose text was not found: [U].
- Corrections go into the next update; corrections to period 4 are due by the return deadline [R3, R6].
- HMRC shows a tax estimate after each update [R6].

### 1.5 End of year

- Adjustments (capital allowances, accounting and tax adjustments, reliefs) are made in software after the fourth update [R7].
- The tax return must be sent through compatible software by 31 January, with all other income and gains added; amendments too [R3, regulations 8 and 16; R8].
- The first MTD return for April 2026 joiners is the 2026-27 return, due 31 January 2028 [R9].
- The end of period statement appears in neither the guidance nor SI 2026/336; an explicit statement that it is abolished is [U] [R8, R3].

### 1.6 Penalties

- One point per missed deadline; four points bring a £200 penalty, and £200 for each later miss [R10].
- Late payment: 3% at day 15 and 3% at day 30 plus 10% a year in 2026-27; 4%, 4% and 10% from 2027-28 [R10].
- No points for late quarterly updates in the first year: 2026-27 for April 2026 joiners, and 2027-28 for April 2027 joiners (page updated 19 November 2026; Budget 2026 paragraph 6.152) [R10, R12]. The legal instrument for the 2027-28 easement is [U].

### 1.7 Exemptions

- Automatic: income of £20,000 or less, no NI number, trusts, personal representatives and others. Temporary automatic exemptions to April 2027 cover averaging relief, qualifying care relief and some return pages [R11].
- On application: digital exclusion for age, health, disability, religion or no reasonable internet access [R11, R3].
- Deferred: partnerships, with no date [R11]. Budget 2026 defers "several taxpayer groups until further notice" without naming them: [U] [R12].

### 1.8 What software must do

- **Compatible software** keeps and corrects digital records, sends quarterly updates and corrections through HMRC's APIs, sends the return and receives HMRC information. Several programs count as one set if data recorded once can be used in the others without re-entry [R3, regulation 3; R13].
- **Bridging software** connects to records kept elsewhere, such as spreadsheets, and sends updates and the return [R13, H1].
- Records in one product plus a bridging product counts, if digital links are kept [R9, R4].
- Whether a product that only keeps records and calls no HMRC API needs recognition or listing is [U] [H1].
- All products on the GOV.UK finder have passed HMRC's recognition process; HMRC recommends none [R13, R14]. The vendor's step for getting listed is [U].
- Users must re-authorise their software every 18 months [R16].

### 1.9 The HMRC side, for a filing product

**APIs.** The minimum functionality standards name eight APIs, all in beta today [H2]: Business Details 2.0, Obligations 3.0, Self Employment Business 5.0, Property Business 6.0, Business Source Adjustable Summary 7.0, Individual Calculations 8.0 (9.0 is sandbox only), Individual Losses 7.0 and Individuals Tax Liability Adjustments 1.0 [H15]. Beta APIs can change on six weeks' notice; stable ones get about six months [H2]. Breaking releases are planned for December 2026 and March 2027 [H14]. Other income and the return can be sent through other software if the product signposts to it [H2].

**What a full product must do** [H2]: send fraud prevention headers; get a business id for each business; keep records or link digitally to a product that does, with export; send quarterly updates for every mandated source, including several businesses and foreign property; show a liability estimate or signpost to the HMRC account; adjust and finalise; handle losses; send or signpost the rest of the return. A product can be built and approved in stages [H2].

**Production approval** [H2, H4, H5]:

1. Register on the Developer Hub; create a sandbox application and test users.
2. Build.
3. Create a production application, subscribe to the APIs, agree the terms of use.
4. Test every endpoint of the eight APIs in the sandbox, with fraud prevention headers, and send HMRC the sandbox application id.
5. Complete HMRC's Production Approvals Checklist.
6. HMRC reviews the logs, including a specialist header check, then grants access or asks for more.

HMRC checks a production application in up to 10 working days [H4], and a request must finish within six months [H5]. **The market window is closed:** HMRC is "no longer accepting production credential access requests for new 2026–27 quarterly update products" [H1]. A 2027-28 window is [U]. A demo step, any fee and any certification such as ISO 27001 are [U].

**Terms of use** [H5]: test for vulnerabilities before go-live and run regular penetration tests; encrypt tokens and personal data at rest and in transit; keep customers' data apart; never store HMRC sign-in details; report a breach to HMRC at once and in full within 72 hours, with a named breach contact; publish a privacy policy and terms; meet WCAG AA; name a responsible individual. Never say "accredited", "approved" or "HMRC recognised" before recognition, and never claim to be ready or compatible before live access.

**Fraud prevention headers** [H6, H7, H8, H9, H10]. A legal duty under SI 2019/360, with a £3,000 penalty. A web app via server sends 16 headers, including a persistent device id, the user's public IP and port, screen and window sizes, timezone, a multi-factor record, user ids and the vendor's own IP and versions. HMRC monitors them in production. A sandbox validator API exists. Whether user consent is needed is [U]; on the face of SI 2019/360 it is a legal obligation.

**Sign-in** [H11, R16, H18]. OAuth 2.0 authorisation code, with optional PKCE (S256). Access tokens last 4 hours; refresh tokens are single use; authority ends after 18 months [H11]. Scopes `read:self-assessment` and `write:self-assessment` [H18]. Users sign in with "the user ID and password you used when you signed up" [R16]; whether that is always a Government Gateway ID, and whether GOV.UK One Login works in this journey, is [U]. The rate limit is 3 requests a second per application [H17].

**Sandbox** [H2, H12, H13]. Free to register as far as any page says (a "free" statement is [U]). Test users are generated; stateful data is deleted after seven days; idle sandbox applications are deleted.

## 2. Where Flump stands

| Requirement | What Flump has | Gap |
| --- | --- | --- |
| Digital record per transaction (amount, date, category) | `TaxRecord` rows with type, source, free-text category, amount, date, frequency (`apps/backend/src/entities/tax-record.entity.ts:30-51`) | Monthly records are one row repeated by the engine; annual records are one yearly figure (`packages/finance-engine/src/tax-calculator.ts:284-299`). Neither is a dated transaction. |
| Categories that match Self Assessment | 1 income and 9 expense categories for self-employment; 1 income and 7 expense for property (`tax-calculator.ts:100-154`, copied in `packages/api-contract/src/domains/tax.ts:68`) | No other income, repairs, entertainment, bad debts, depreciation or disallowable split; wages and subcontractors merged; property premiums, reverse premiums, other income, tax deducted and travel missing. HMRC's field lists were read on 18 November 2026, not today: [U]. |
| One update per business | One `self-employed` and one `rental` source; `accountId` points at a property or account, not a business (`tax-record.entity.ts:33`, `:78`) | No business or property-business id; no UK and foreign property split. |
| Quarterly periods and cumulative totals | Whole tax-year helpers (`packages/finance-engine/src/uk-tax-year.ts:110-189`); yearly estimate with payments on account (`packages/finance-engine/src/uk-self-assessment.ts:49-130`) | No quarter, obligation or deadline logic. |
| Supporting records | One encrypted receipt per record, AES-256-GCM, up to 5 MB (`tax-record.entity.ts:56-69`, `apps/backend/src/modules/tax/tax.service.ts:323`) | Enough for originals; MTD sends no receipts. |
| Income from invoices | Paid invoices sync to an income record on the paid date, before VAT (`apps/backend/src/modules/invoicing/invoicing.service.ts:904-963`) | **Bug found:** the sync writes category `"Freelance / Invoice"` (`:941`), which is not a category id, so the engine skips it (`tax-calculator.ts:618-640`) and synced invoice income is left out of the estimate. Fixed in PR #916. |
| Export through a digital link | Account export in JSON and CSV, raw rows per table (`apps/backend/src/modules/privacy/account-export.service.ts:68`, `:101`) | Built for portability. No per-period, per-category tax export. No tax record import (`apps/backend/src/modules/imports/imports.types.ts` stages accounts and balances only). |
| Correction trail | Records are edited in place | No lock or history for figures already exported or sent. |
| HMRC connection | None: no OAuth, no fraud headers, no NI number field | Everything in section 1.9. |
| Wording | No MTD, HMRC-submission or quarterly copy in `apps/web`, `apps/marketing` or `apps/mobile`; E37 bans "MTD-compliant" (`docs/audit/plans/E37-self-employed-invoicing-plan.md:11`) | Holds today. |
| AI tools | Read-only tax tools in `packages/mcp/src/tools/read/listTaxRecords.ts` and `getTaxYearPosition.ts` | Would need to read any new quarter figures from the engine. |
| Privacy | Every table in `apps/backend/src/modules/privacy/user-data-registry.ts` declares erasure, export columns and reset handling; tax records at `:623-660`, value map at `docs/system/value-map.yaml:1840` | New tables must join the registry and value map in the same PR. |

## 3. Options

The letters here follow the owner's task, not the discovery note: this plan's (a) is the discovery note's (c) "do nothing", (b) is its (a) "records and export", and (c) is its (b) "submission software".

Effort: S under a week of one developer's time, M two to four weeks, L two months or more. Running cost means outside spend, not hosting Flump already pays for.

### (a) Stay out, and say so

- **Code by package.** `apps/web`: a plain notice on the tax records and self assessment pages for users with self-employment or property records, and a help page. `packages/finance-engine`: one function that reads qualifying income (gross self-employment plus property) for a tax year and returns the MTD start date it implies, with hand-worked tests. `apps/mobile`: the same notice when tax pages ship there. No backend change.
- **Stored data.** None new. The notice reads existing records.
- **Outside dependencies.** None.
- **HMRC steps.** None.
- **Running cost.** None. Yearly check of thresholds and dates.
- **Owner must.** Approve the notice wording under E29a.
- **Users see.** "Flump does not send anything to HMRC. If your self-employment and property income is over £30,000 in 2025-26, HMRC expects you to use MTD software from 6 April 2027." Wording to be approved.
- **Effort and risk.** S. Risk: users in the April 2027 and 2028 groups keep records twice, or leave.

### (b) Record-keeping companion with a quarterly export

Flump keeps the digital records; the user files through their own bridging or compatible software, fed by a file Flump produces.

- **Code by package.**
  - `packages/finance-engine`: an HMRC category map for self-employment and UK property (new categories, a disallowable flag, residential finance costs kept apart); quarter periods (standard and calendar) and deadlines; cumulative year-to-date totals per business per category; the qualifying income check from (a). Tax maths, so hand-worked tests and Stryker.
  - `packages/api-contract`: the category and business types; the export contract.
  - `apps/backend`: a business entity (type self-employment, UK property or foreign property, name, start date); a business id on `TaxRecord`; a way to turn a repeating record into dated entries for MTD purposes; a period lock so exported totals cannot change silently; a CSV export of cumulative totals and a per-record CSV. The invoice sync category is fixed in PR #916.
  - `apps/web`: a business picker on tax records, a quarter view with deadlines, the export, the notice from (a).
  - `packages/mcp`: read tools return quarter figures from the engine.
  - `apps/mobile`: later, behind web.
- **Stored data.** A businesses table and a business id on tax records; optionally a period lock row per business per quarter. No NI number, no HMRC data. Each new table joins the user data registry (erased on account deletion, cleared on financial reset, exported) and the value map in the same PR. The DPIA and data map gain a line; no new outside data flow.
- **Outside dependencies.** None in code. The user's own bridging product reads the file. Testing the file against named products means using outside services: owner decision.
- **HMRC steps.** None if Flump calls no HMRC API. Whether a records-only product needs recognition or a listing is [U]; ask HMRC's SDS team in writing before claiming anything (owner step).
- **Running cost.** None outside. Yearly upkeep of the category map and dates.
- **Owner must.** Decide the new categories and the business id on stored data; choose which bridging products, if any, to test against; approve wording; decide whether to ask HMRC about records-only status.
- **Users see.** A business for each trade or property, categories that match their return, a quarter view with dates, and "Export for your MTD software". Never "MTD-compliant": the file is one link in the user's chain, and retyping figures breaks it.
- **Effort and risk.** M to L across slices. Risks: bridging import formats are not public and can change; a records product that is wrong leads to a wrong filing in someone else's software; repeating records may not satisfy "as close to the date as possible".

### (c) Full compatible software, filing through HMRC

- **Code by package.**
  - Everything in (b), plus foreign property, losses and adjustments in `packages/finance-engine`.
  - `apps/backend`: a new HMRC module: OAuth client with encrypted token storage and single-use refresh under a lock (the bank sync pattern in `BankConnectionSync` is the nearest model); clients for the eight APIs with HMRC's error handling; fraud prevention headers collected from the browser and the server, including Railway's edge as `Gov-Vendor-Forwarded`; obligations sync; submission records with HMRC receipts; 18-month re-authorisation reminders.
  - `apps/web`: connect to HMRC, obligations, review and submit each update, adjustments, losses, the calculation, the return or a signpost, and header collection (device id, screens, window size, timezone).
  - `packages/mcp`: read-only access to submission status; never submit.
- **Stored data.** HMRC access and refresh tokens (encrypted), NI number, HMRC business ids, obligations, submission payloads and receipts, and device id, IP and port data for headers. Submission receipts are tax records the user may need for five years, which pulls against erasure on request; the retention rule needs a decision. New DPIA section, privacy notice change, data map and registry entries.
- **Outside dependencies.** HMRC Developer Hub and APIs; an independent penetration tester; a breach process that reaches HMRC within 72 hours.
- **HMRC approval.** Sections 1.9 steps 1 to 6. The 2026-27 window is closed and the 2027-28 window is [U]. Beta APIs move on six weeks' notice.
- **Running cost.** Penetration testing at least yearly (price not researched: [U]); no HMRC fee is mentioned [U]; owner time for HMRC contact and support.
- **Owner must.** Register on the Developer Hub and hold the production credentials; agree HMRC's terms as the responsible individual; name a breach contact; buy penetration tests; decide token and NI number storage; decide where production credentials live, given there is no separate production environment and Railway's "production" environment is staging today; carry support for failed submissions.
- **Users see.** Connect to HMRC, quarterly submissions, an HMRC estimate, the return. Users also carry the risk of a wrong submission, which is theirs in law.
- **Effort and risk.** L, several months, then a permanent upkeep load. Risks: closed window; beta APIs; legal duties on one person; a wrong submission harms users; a crowded market with free products.

## 4. Recommendation

Given by a Fable decider on 25 November 2026, from sections 1 to 3 and the discovery note. It did not re-check the code references or the sources.

**Option (a) now. Decide (b) by February 2027, as already accepted. Rule out (c) for 2027-28, as already accepted, and keep it out until the conditions below change.**

Reasons:

- There is no demand evidence: the five interviews have not been run, and (b) is M to L for one developer.
- (b) changes stored data, and its core questions are [U]: bridging import formats, whether a records-only product needs recognition, and whether repeating records count as digital records.
- A wrong records product leads to a wrong filing in someone else's software: harm to users with no evidence of benefit yet.
- Waiting costs little. The first 2027-28 update is due 7 August 2027, with no late points that year, so a February decision can still serve the April 2027 group.
- (a) is honest, about a week, adds no data or outside service, and its engine function is reused by (b).
- (c) fails on facts: the window is closed, eight beta APIs, penetration tests, a 72-hour breach duty on one person, and no real production environment.

**Strongest argument against:** the April 2027 group chooses software in early 2027. A notice saying Flump does not do this may send them elsewhere for good.

**What would change the answer:**

- Two or more of five interviewees keep records in Flump or a spreadsheet and would export to a bridging tool: move to (b).
- A named bridging product publishes a stable import format: (b) gets cheaper and safer.
- HMRC's SDS team confirms in writing that records-only products need no recognition: one blocker on (b) goes.
- No beta user has self-employment or property income over £20,000: stay at (a).
- (c) only if HMRC opens a 2027-28 window and the owner sets up a real production environment and accepts the responsible-individual duties.

### 4.1 Slice plan for option (a)

| Slice | Scope | Needs from the owner | Stored data | Done when |
| --- | --- | --- | --- | --- |
| A1. Qualifying income check (can start now) | `packages/finance-engine`: a function that returns qualifying income (gross self-employment plus property) for a tax year and the MTD start date it implies, from the SI 2026/336 thresholds; `packages/api-contract` type | Nothing | None | The three thresholds and their boundary values pass hand-worked tests, Stryker survivors are killed or triaged, and a Fable sign-off of the figures is recorded |
| A2. Wording guard (can start now) | `scripts/check-copy.ts`: ban the discovery note's section 3 phrases ("MTD-compliant", "MTD-ready", "HMRC-recognised", "approved by HMRC", "submit to HMRC" and the rest) across `apps/web`, `apps/marketing` and `apps/mobile`; today the check has none of them | Nothing; a new required check or allow-list entry needs coordinator sign-off (AGENTS.md section 15) | None | A banned phrase in any of the three apps fails `check:laws` |
| A3. Notice in the web app | `apps/web`: a notice on the tax records and self assessment pages and a help page; reads A1 | Decisions 1 and 2 | None | The approved text shows to the decided audience, light and dark, with stories and tests. Relies on the invoice sync fix in PR #916, so synced invoice income is counted |
| A4. Interviews | Docs only: consent text, where notes live, a deletion date, the discovery note's section 4 script | Decision 3 | Interview notes are personal data, kept outside the app | Five interviews logged against the discovery note's "answers that favour each path" |
| A5. Mobile | `apps/mobile`: the same notice when tax pages ship there | None beyond A3 | None | Parity row in `docs/audit/plans/E12-mobile-parity-log.md` |

If (b) is chosen in February 2027, section 3 (b) is the starting scope; A1 carries over.

### 4.2 Reminder: decide option (b) by the end of February 2027

Decide records and a quarterly export, option (b), by 28 February 2027, against the conditions in section 4. The first 2027-28 update is due 7 August 2027. The same reminder is in [`docs/technology-watch.md`](../../technology-watch.md).

## 5. Evidence still missing

- **How many beta users are in scope.** An aggregate count of users with self-employment or rental records, or ask the friends directly. No figures per person.
- **What they would do with records at quarter end.** The five 30-minute interviews in the discovery note, never run.
- **Bridging import columns.** Read the public import documents for TaxCalc, Tax Optimiser and IRIS; no accounts needed.
- **Records-only recognition.** One written question to HMRC's SDS team.

Nothing in this plan is designed around interview answers.

## 6. Owner decisions

1. **Accepted on 25 November 2026.** Accept option (a) now, with (b) decided by February 2027 and (c) ruled out for 2027-28 and until the section 4 conditions change. The owner said: "accept the MTD recommendation and start the notice".
2. **Answered on 25 November 2026.** The notice states the user's own recorded position against the rule, never that they are mandated: income recorded "is over" the figure and the rules "may apply" from the date, with HMRC deciding from the return. The test is strictly more than the threshold, so exactly £50,000 is not over. Wording approved by the coordinator at the owner's delegation; the line is permanent and quiet, with nothing to dismiss and nothing stored.
3. Open. Run the five interviews: yes or no, by when, where notes live and when they are deleted.
4. Open. Whether to write to HMRC's SDS team about records-only status.
5. Open. Whether foreign property is in scope (still open from the discovery note).

**Owner-only steps under (a):** contacting beta users for interviews, and sending any HMRC enquiry. No cost, no accounts, no outside service.

**Owner-only steps if (c) were ever chosen:** Developer Hub registration and production credentials; agreeing HMRC's terms as the responsible individual; a named breach contact; buying penetration tests; deciding token, NI number and header data storage; a real production environment; support for failed submissions.

## Sources

All read on 25 November 2026.

- R1. https://www.gov.uk/guidance/check-if-youre-eligible-for-making-tax-digital-for-income-tax
- R2. https://www.gov.uk/guidance/work-out-your-qualifying-income-for-making-tax-digital-for-income-tax
- R3. https://www.legislation.gov.uk/uksi/2026/336/made
- R4. https://www.gov.uk/guidance/use-making-tax-digital-for-income-tax/create-digital-records
- R5. https://www.gov.uk/government/publications/digital-record-keeping-notice-for-making-tax-digital-for-income-tax/making-tax-digital-for-income-tax-digital-record-keeping-notice (now titled a direction, last updated 27 March 2026)
- R6. https://www.gov.uk/guidance/use-making-tax-digital-for-income-tax/send-quarterly-updates
- R7. https://www.gov.uk/guidance/use-making-tax-digital-for-income-tax/adjust-your-self-employment-and-property-income
- R8. https://www.gov.uk/guidance/use-making-tax-digital-for-income-tax/submit-your-tax-return
- R9. https://www.gov.uk/guidance/use-making-tax-digital-for-income-tax/using-making-tax-digital-for-income-tax-for-the-first-time
- R10. https://www.gov.uk/guidance/penalties-for-making-tax-digital-for-income-tax
- R11. https://www.gov.uk/guidance/find-out-if-you-can-get-an-exemption-from-making-tax-digital-for-income-tax
- R12. https://assets.publishing.service.gov.uk/media/6ae20b85460c1346f7be784e/E03668986_HMT_Budget_2026_ELAY__2_.pdf (paragraph 6.152)
- R13. https://www.gov.uk/guidance/choose-the-right-software-for-making-tax-digital-for-income-tax
- R14. https://www.gov.uk/guidance/find-software-that-works-with-making-tax-digital-for-income-tax
- R15. https://www.gov.uk/guidance/sign-up-for-making-tax-digital-for-income-tax
- R16. https://www.gov.uk/guidance/use-making-tax-digital-for-income-tax/get-your-software-ready
- H1. https://developer.service.hmrc.gov.uk/guides/income-tax-mtd-end-to-end-service-guide/
- H2. https://developer.service.hmrc.gov.uk/guides/income-tax-mtd-end-to-end-service-guide/documentation/how-to-integrate.html
- H3. https://developer.service.hmrc.gov.uk/guides/income-tax-mtd-end-to-end-service-guide/documentation/prepare-for-mtd.html
- H4. https://developer.service.hmrc.gov.uk/api-documentation/docs/using-the-hub
- H5. https://developer.service.hmrc.gov.uk/api-documentation/docs/terms-of-use
- H6. https://developer.service.hmrc.gov.uk/guides/fraud-prevention/
- H7. https://developer.service.hmrc.gov.uk/guides/fraud-prevention/connection-method/web-app-via-server/
- H8. https://developer.service.hmrc.gov.uk/guides/fraud-prevention/getting-it-right/
- H9. https://www.legislation.gov.uk/uksi/2019/360/made
- H10. https://developer.service.hmrc.gov.uk/api-documentation/docs/api/service/txm-fph-validator-api
- H11. https://developer.service.hmrc.gov.uk/api-documentation/docs/authorisation/user-restricted-endpoints
- H12. https://developer.service.hmrc.gov.uk/api-documentation/docs/testing
- H13. https://developer.service.hmrc.gov.uk/api-documentation/docs/testing/test-users-test-data-stateful-behaviour
- H14. https://developer.service.hmrc.gov.uk/roadmaps/mtd-itsa-vendors-roadmap/documentation/apis.html
- H15. https://developer.service.hmrc.gov.uk/api-documentation/docs/api?filter=income-tax-mtd
- H16. https://developer.service.hmrc.gov.uk/api-documentation/docs/api/service/self-employment-business-api/5.0
- H17. https://developer.service.hmrc.gov.uk/api-documentation/docs/reference-guide
- H18. https://developer.service.hmrc.gov.uk/api-documentation/docs/api/download/self-employment-business-api/5.0/application.yaml

**[U] today:** a digital links soft landing; the groups Budget 2026 defers; the instrument for the 2027-28 easement; an explicit end of the end of period statement; the quarterly update direction text; whether the £90,000 and VAT threshold wordings always match; today's HMRC category field lists; the 2027-28 market window; a demo step, fee or certification in approval; One Login in the MTD sign-in; consent for header data; how a vendor gets listed; whether a free version is mandatory (only "strongly encouraged" [H1]); whether a records-only product needs recognition; when Individual Calculations 9.0 reaches production; penetration test prices.
