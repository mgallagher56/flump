# E28. Making Tax Digital for Income Tax: discovery

Decisions: accepted on 21 November 2026

> Owner, 2026-11-21: "Accept the other decisions". The section 5 recommendation is accepted: path (c) now, the wording rule held, a decision on a narrow path (a) by February 2027, and (b) ruled out for 2027-28. Not yet answered: whether and when to run the five interviews (item 2). Items 3 to 6 arise only if (a) or (b) is later chosen. Nothing is built from this document.

Status: desk research done on 2026-11-18 against `origin/main` at `3ff28a0e`. User evidence (five beta users) is still to gather. This is not legal or tax advice. Every fact in section 1 cites a source in the list at the end, read on 2026-11-18. "Not confirmed" means no primary source confirmed it.

## 1. What MTD for Income Tax requires

**Who is in scope.** Sole traders and landlords whose qualifying income is over a threshold [S1]:

| Qualifying income | Measured in tax year | MTD applies from | HMRC count       |
| ----------------- | -------------------- | ---------------- | ---------------- |
| Over £50,000      | 2024-25              | 6 April 2026     | 864,000 [S2]     |
| Over £30,000      | 2025-26              | 6 April 2027     | 1,077,000 more [S3] |
| Over £20,000      | 2026-27              | 6 April 2028     | 970,000 more [S4] |

- Qualifying income is self-employment plus property turnover, before expenses, combined across sources. Salary, dividends, pensions and partnership shares do not count [S5].
- For jointly owned property, only the person's own share counts [S5].
- The law is the Income Tax (Digital Obligations) Regulations 2026, SI 2026/336 [S6]. Its made and in-force dates are not confirmed.
- **Press figures conflict.** The 436,000 in an HMRC headline counts people who had sent a first quarterly update, not people in scope [S7]. The primary scope figure for April 2026 is 864,000 [S2]. The 118,000 landlords figure in trade press is not confirmed. HMRC publishes no split between sole traders and landlords that we found.

**Quarterly updates** [S8]. Category totals per business, cumulative from 6 April, with no receipts. Standard periods end 5 July, 5 October, 5 January and 5 April, due on 7 August, 7 November, 7 February and 7 May. A calendar-quarter option keeps the same deadlines. Errors are fixed in the records and flow into the next update.

**End of year** [S9, S10]. Adjustments such as allowances and capital allowances follow the fourth update. The return goes through MTD software by 31 January; the first, for 2026-27, is due 31 January 2028 [S2]. The end of period statement no longer appears in the regulations; a direct source for its removal is not confirmed.

**Digital records** [S11, S12]. Each record holds an amount, a date and a category. Below £90,000 turnover for a source, income and expenses alone are enough, with residential finance costs kept separate. How this works across several sources is not confirmed.

**Digital links** [S11]. Records moving between products must move digitally, never retyped or cut and pasted. CSV import and export, linked cells and API transfer all count. A soft landing for digital links is not confirmed.

**Exemptions** [S13]. Some are automatic, for example trusts and personal representatives. People can apply for digital exclusion on grounds of age, health, disability, religion or no internet access. Partnerships are deferred. ICAEW reports four more exempt groups from Budget 2026 [S14]; gov.uk wording is not confirmed.

**Penalties** [S15]. One point per missed deadline; four points bring a £200 penalty. There are no points for late quarterly updates in 2026-27 [S7, S15]. ICAEW reports the same for April 2027 joiners in 2027-28 [S14]; gov.uk wording is not confirmed.

## 2. What each path means for Flump

**Flump today.** Tax records live in `apps/backend/src/entities/tax-record.entity.ts`. Each has a type, a source (`paye`, `self-employed`, `rental`, `savings`) and a category. It also has an amount, a frequency (`one-off`, `monthly`, `annual`), a date and an optional receipt. Categories live in `packages/finance-engine/src/tax-calculator.ts`. The engine estimates a yearly position (`uk-self-assessment.ts`). There is no quarter logic. There is one self-employed and one rental source, with no business or property id. The account export (`apps/backend/src/modules/privacy/account-export.service.ts`, `csv-export.ts`) writes raw rows per table, built for data portability.

**Category gap.** Flump has 9 self-employment expense categories against HMRC's 15, with no disallowable split [S16]. Repairs, business entertainment, loan interest, finance charges, bad debts and depreciation have no Flump category. Flump's staff category merges HMRC's wages and subcontractor fields, and its workwear category has no HMRC match. Property maps more closely [S17], but premiums, travel and reverse premiums are missing. Replacing household items is an adjustment, not a quarterly category.

### (a) Records and quarterly estimates, with export to bridging software

- **Export must contain:** per business and tax year, cumulative totals per HMRC category from 6 April to the period end, with period dates. Residential finance costs separate. A per-record CSV (date, amount, category) for tools that import transactions.
- **Bridging products** (public docs only): TaxCalc Quarterly Filer maps any spreadsheet with a cell selector [S18]. Tax Optimiser takes xlsx or CSV templates with saved cell mapping [S19]. IRIS Personal Tax imports dated transactions by CSV [S20]. Exact columns are not confirmed for any; BrightBooks and GoFile pages were not readable.
- **Gap from today:** HMRC category mapping, a business id, cumulative quarter totals and a purpose-built export. Monthly and annual records would need expanding into dated entries; whether a repeating entry counts as a digital record is not confirmed.
- **Effort: M.** An engine function, a mapping table, an export endpoint and a page section; no outside integration.
- **Recurring owner work:** keep the mapping in step with HMRC categories, about yearly.
- **Security and data:** nothing leaves Flump unless the user downloads a file. No new storage.
- **Risks:** the export alone does not make a set-up compliant; retyping figures breaks the digital link. Bridging templates can change without notice.

### (b) HMRC-recognised submission software

- **Recognition** [S21]: build in the Developer Hub sandbox and test every minimum-standard endpoint with fraud-prevention headers. Then send the app id to HMRC, return the Production Approvals Checklist, then HMRC reviews logs. Standards cover updates for every source, adjustments, losses and the return, or signposts to other products.
- **Market window:** closed for new 2026-27 quarterly products [S22]. The 2027-28 window is not confirmed.
- **Fraud-prevention headers** are a legal duty [S23, S24]. A web app sends 16, including device id, public IP, screen sizes and user ids [S25]. A sandbox validator exists [S26].
- **Sign-in:** OAuth; access tokens last 4 hours, refresh tokens 18 months [S27].
- **Terms of use** [S28]: encrypt tokens and personal data, report breaches to HMRC within 72 hours, penetration testing. Never "approved" or "accredited".
- **Data leaving Flump:** to HMRC, the National Insurance number, category totals, adjustments, the declaration and header data on every call. Flump would newly hold HMRC tokens, NI numbers, device and IP data, and submission receipts.
- **Effort: L.** Five or more HMRC APIs, OAuth, headers, losses, adjustments and an HMRC review cycle.
- **Recurring owner work:** API deprecations (about six months' notice on stable APIs [S21]), yearly rule changes, credentials, failed-submission support, penetration tests.
- **Security:** a new class of sensitive data and an outside data flow; the DPIA and privacy notice need new sections.
- **Risks:** crowded, cheap market; harm if a submission is wrong; dependence on HMRC's window and review.

### (c) Do nothing

- Users in scope would keep records and send updates in other software, or use a bridging product with their own spreadsheet.
- Flump stays a planning tool. Copy must never imply it meets MTD.
- **Effort: S** (copy guard only). No recurring work, no new data. Risk: users in the April 2027 cohort may leave if records must be kept twice.

## 3. Wording rule

**May say today:** "keep a record of your income and costs", "estimate", "export your records as a spreadsheet", "Flump does not send anything to HMRC".

**May not say:** "MTD-compliant", "MTD-ready", "works with Making Tax Digital", "HMRC-recognised", "approved" or "accredited" by HMRC, "submit to HMRC", or "compatible with" any named product. "MTD-compliant" needs, at least, digital links end to end and fraud-prevention headers. "HMRC recognised" needs the formal process [S28].

**Current copy.** A search of `apps/web`, `apps/marketing` and `apps/mobile` on 2026-11-18 for "MTD", "Making Tax Digital", "HMRC-recognised", "bridging" and "quarterly update" found no claims. E37 (`docs/audit/plans/E37-self-employed-invoicing-plan.md`) already bans "MTD-compliant".

## 4. User evidence still needed

Interview five beta users who are self-employed, landlords or both. Thirty minutes, recorded with consent, no figures written down.

1. How do you keep track of business or rental income and costs today?
2. Walk me through the last time you did your tax return.
3. Have you heard from HMRC about Making Tax Digital? What did it say?
4. What, if anything, have you set up for it so far?
5. Which software or spreadsheets do you use for this now?
6. If Flump held these records, what would you do with them at the end of a quarter?
7. Is there anything you would not want Flump to hold or send?
8. What would you expect to pay for the tools you use for this?

Do not ask about income levels, explain MTD, or describe any Flump plan before question 6.

**Answers that favour each path:**

- **(a)** They use spreadsheets or no software, and would export to a bridging tool.
- **(b)** They want one place to keep records and send updates, and would trust Flump to connect to HMRC.
- **(c)** They already use an accountant or bookkeeping software, or are not in scope before 2028.

## 5. Recommendation for the owner to accept or reject

**Recommendation:** take path (c) now and hold the wording rule. Decide on a narrow path (a) by February 2027 after the five interviews, and rule out (b) for 2027-28.

Reasons:

- (b) is large, the 2026-27 window is closed and the 2027-28 one is not confirmed. It adds HMRC tokens, NI numbers and device data to Flump's storage.
- (a) is medium effort, adds no outside data flow, and serves the April 2027 cohort if users keep records in Flump.
- No direct demand has been found yet, and the market is crowded. Five interviews are cheap and decide (a).

**Owner decisions left open:**

1. Accept, change or reject the recommendation.
2. Whether to run the five interviews, and by when. Recordings and notes are personal data: they need consent, a place to keep them and a deletion date.
3. If (a): which bridging products to test against. Each is a named outside service.
4. If (a): whether to add a business or property id and new categories to tax records. This changes stored data.
5. If (b) is ever chosen: registering with HMRC's Developer Hub (outside service), and storing HMRC tokens, NI numbers and fraud-header data (data storage and security).
6. Whether foreign property is in scope for Flump.

## Sources

All read on 2026-11-18.

- S1. https://www.gov.uk/guidance/check-if-youre-eligible-for-making-tax-digital-for-income-tax
- S2. https://www.gov.uk/government/news/act-now-864000-sole-traders-and-landlords-face-new-tax-rules-in-two-months
- S3. https://www.gov.uk/government/news/sole-traders-and-landlords-earning-more-than-30000-urged-to-act-now
- S4. https://www.gov.uk/government/publications/making-tax-digital-for-income-tax-self-assessment-reducing-the-mandation-threshold-from-30000-to-20000-from-april-2028/reduction-of-the-mandation-threshold-from-30000-to-20000-from-april-2028
- S5. https://www.gov.uk/guidance/work-out-your-qualifying-income-for-making-tax-digital-for-income-tax
- S6. https://www.legislation.gov.uk/uksi/2026/336/contents/made
- S7. https://www.gov.uk/government/news/436000-sole-traders-and-landlords-make-their-tax-digital
- S8. https://www.gov.uk/guidance/use-making-tax-digital-for-income-tax/send-quarterly-updates
- S9. https://www.gov.uk/guidance/use-making-tax-digital-for-income-tax/adjust-your-self-employment-and-property-income
- S10. https://www.gov.uk/guidance/use-making-tax-digital-for-income-tax/submit-your-tax-return
- S11. https://www.gov.uk/guidance/use-making-tax-digital-for-income-tax/create-digital-records
- S12. https://www.gov.uk/government/publications/digital-record-keeping-notice-for-making-tax-digital-for-income-tax/making-tax-digital-for-income-tax-digital-record-keeping-notice
- S13. https://www.gov.uk/guidance/find-out-if-you-can-get-an-exemption-from-making-tax-digital-for-income-tax
- S14. https://www.icaew.com/insights/tax-news/2026/oct-2026/budget-mtd-penalty-soft-landing-and-exclusions (ICAEW; gov.uk Budget text gives no detail: https://www.gov.uk/government/publications/budget-2026-document/budget-2026-html)
- S15. https://www.gov.uk/guidance/penalties-for-making-tax-digital-for-income-tax
- S16. https://developer.service.hmrc.gov.uk/api-documentation/docs/api/download/self-employment-business-api/5.0/schemas/createAmendCumulativePeriodSummary/request.json
- S17. https://developer.service.hmrc.gov.uk/api-documentation/docs/api/download/property-business-api/6.0/examples/uk_property_cumulative_summary_create_and_amend/def1/request.json
- S18. https://www.taxcalc.com/products/mtd-quarterly-filer-for-business
- S19. https://www.taxoptimiser.co.uk/help/article/mtditsa-digital-records
- S20. https://www.iris.co.uk/support/knowledgebase/kb/mtd-quarters-how-to-import-data-per-quarter/
- S21. https://developer.service.hmrc.gov.uk/guides/income-tax-mtd-end-to-end-service-guide/documentation/how-to-integrate.html
- S22. https://developer.service.hmrc.gov.uk/guides/income-tax-mtd-end-to-end-service-guide/
- S23. https://developer.service.hmrc.gov.uk/guides/fraud-prevention/
- S24. https://www.legislation.gov.uk/uksi/2019/360/made
- S25. https://developer.service.hmrc.gov.uk/guides/fraud-prevention/connection-method/web-app-via-server/
- S26. https://developer.service.hmrc.gov.uk/api-documentation/docs/api/service/txm-fph-validator-api
- S27. https://developer.service.hmrc.gov.uk/api-documentation/docs/authorisation/user-restricted-endpoints
- S28. https://developer.service.hmrc.gov.uk/api-documentation/docs/terms-of-use

**Not confirmed:** SI 2026/336 dates; Budget 2026 wording on the 2027-28 penalty easement and the four exempt groups; a direct source for dropping the end of period statement; any digital-links soft landing; the 118,000 landlords figure; the 2027-28 production window; how a product joins the gov.uk software finder; the number of listed products; whether HMRC sign-in uses Government Gateway or One Login; foreign property fields; bridging products' exact import columns.
