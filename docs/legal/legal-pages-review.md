# Legal pages: review record

Status: version 0.1 of the terms, cookies and accessibility pages and version 0.2 of the privacy notice, 25 November 2026.

- **Written by:** Claude Fable (an AI model), from the code, the hosting settings and primary legal sources read that day.
- **Approved by:** a separate Claude Fable reviewer that wrote none of the pages (owner decision, 25 November 2026: "use fable to write and approve the legal pages").
- **Not reviewed by a solicitor, and not signed by the owner.** Neither review is legal advice. Every page says so under its title.

Decisions: open. The owner steps and the solicitor list below are not answered here.

## The pages

| Page                        | Route            | Source                                                             | Verdict                     |
| --------------------------- | ---------------- | ------------------------------------------------------------------ | --------------------------- |
| Privacy notice              | `/privacy`       | `apps/marketing/src/pages/PrivacyPage/PrivacyPage.tsx`             | 0.3 approved in round 7     |
| Terms of use                | `/terms`         | `apps/marketing/src/pages/TermsPage/TermsPage.tsx`                 | Approved on the second look |
| Cookies and browser storage | `/cookies`       | `apps/marketing/src/pages/CookiesPage/CookiesPage.tsx`             | Approved on the first look  |
| Accessibility statement     | `/accessibility` | `apps/marketing/src/pages/AccessibilityPage/AccessibilityPage.tsx` | Approved on the second look |

Names, paths and version lines live in `packages/business-details/src/index.ts` (`LEGAL_PAGES`). Change a page's wording and its version together, and add a row to "Review rounds".

**Approval is of the wording, on two conditions the reviewer set before real people are pointed at the pages:** owner step 1 (the provider contracts) and owner step 2 (a monitored mailbox and the real controller name). Until then the transfer safeguard and the contact route the notice describes are not in place.

## Review rounds

### Round 1: changes required on three pages

Cookies approved. Eight blocking findings on the others, all fixed:

1. **Transfers.** The notice said Flump relies on each provider's data processing agreement. Untrue while Railway's is unsigned or Sentry's not accepted. Replaced with wording that names the two possible safeguards and invites the reader to ask which applies.
2. **Client details.** "The AI connection cannot read them" and "deleted when you delete the invoice" were too broad. A paid invoice added to tax records copies the client's name into that record's name (`invoicing.service.ts`), which the AI tool returns when names are included; only draft invoices can be deleted. Both pages now say so.
3. **Invite retention.** A used invite stays while the person is a member (`apps/backend/src/jobs/retention.ts`). Reworded.
4. **Other retention lines.** Permission records have no purge; removed AI connections, import batches (30 days) and rollback copies (90 days) were missing. Added.
5. **Backups.** See round 2.
6. **AI imports.** The security page says the AI connection can stage imports; the notice and terms described reading only. One sentence added to each.
7. **Processor terms.** The client-details section lacked several Article 28(3) terms. Added: instructions, telling the user about an unlawful instruction, security suited to the risk, responsibility for providers, help with security and breach duties, download and reasonable checks, and the scope sentence.
8. **Accessibility.** "No known failures on the pages they cover" claimed more than the baseline file shows. Replaced with "our list of known failures from the page checks is empty".

Advisory points applied: the AI log's contents, network logs and internet addresses, the export description, the session cookie's lifetime, the onboarding seed's lifetime, and emailing people about any change to the terms beyond a wording fix.

### Round 2: three approved, one sentence on privacy

- **Backups.** "Kept for 35 days at most" has nothing behind it: no backup service or bucket exists, Railway's own retention is unknown, and manual dumps have no expiry. Replaced, word for word, with: "any backup of the database is kept for a limited period. Deleted data can stay in a backup until it expires. We will state the period here once scheduled backups are running."
- **Timed retention lines with no retention job deployed: accepted for now.** The Railway project was created on 3 November 2026, so no period can lapse before 3 December 2026. If the retention service is not running by then, the 30-day, 90-day, 13-month and 24-month lines become untrue and must be reworded.
- The reviewer's corrections to `ropa.md` were applied.

### Round 3: privacy approved

- The backup sentence is in word for word. **Privacy notice: approved.**
- A subsection added after round 2 at the coordinator's request, "Accounts and costs you share with someone" (joint items and partner mode: one person records a joint item and their share; no second person is identified, linked or invited), was checked against the entities and found true. The reviewer's one omission in the docs (`property_ownership_share`) was added to `ropa.md` and `data-map.md`.
- Not verified in this round: that every joint figure is counted at the user's share.

### Round 4: sentence splits

Seven sentences were split after approval to meet the 25-word copy law (three in the terms, one in the accessibility statement, three in the privacy notice). The reviewer read each new form as quoted to it, without re-opening the files, and approved all seven: no meaning changed and no protection is weaker.

### Round 5: after the rebase onto main

Main gained two stored items. A started monthly check-in is now stored (#922), so the privacy notice's list of what you enter gained one line: "the months in which you started or finished a monthly check-in". The reviewer checked it against the entity and the registry. A migration's rollback table of tax record ids (#916, kept 90 days) is already covered by the notice's line on copies kept to undo an update; it was added to `ropa.md` and `data-map.md`.

**Verdict: approved**, the new line and both doc entries. The reviewer agreed that the rollback table needs no new notice text.

### Round 6: terms acceptance at sign-up (privacy notice 0.2)

Terms acceptance was built (the follow-up below). A separate Fable decider, recorded as `fable-decider`, signed the plan and its wording on 25 November 2026: approved with four changes, all applied. Fable is an AI model, not a solicitor.

- **Framing.** The terms of use are a contract the person agrees to ("Agree and continue", with the line "By selecting Agree and continue, you agree to the terms of use" and the terms linked). The privacy notice is information they are shown, never agreed or consented to; a change to it alone asks them to read it and select "Continue". No checkbox, nothing pre-ticked, no marketing consent.
- **Notice period.** Each page carries a version history with the date each version applies from (`LEGAL_PAGES`). A new terms version normally applies 14 days after it is published, as the terms promise; until then people may agree early or carry on.
- **Privacy notice 0.2** adds one item under "Security records": "Which version of the terms you agreed to, which version of this notice we showed you, and when. We keep this until your account is deleted. Lawful basis: our legitimate interest in keeping a record of the agreement between us."
- `ropa.md` and `data-map.md` gained the record.

### Round 7: the retention purge runs in the backend (privacy notice 0.3)

D5 was revised so the backend runs the retention purge itself (`docs/audit/plans/DECISIONS.md`, 25 November 2026). An independent Fable decider, signed `fable-decider`, checked the timed lines against it. With the purge live, one line was not strictly true: a request counter can outlive its one-day window by up to 15 minutes before the sweep removes it, or longer after a failed check. "Request counters: one day at most." became "Request counters: each lasts one day at most and is removed shortly after." Privacy notice version 0.3. Not legal advice; Fable is not a solicitor.

## Judgement calls the reviewer made

- **Controller and processor for client details:** the user as controller and Flump as processor is the right split.
- **Responsibility section (Consumer Rights Act 2015, Part 2):** fair and transparent in its reading; nothing found that is likely to be unenforceable. There is no cap, so a sole trader carries unlimited foreseeable loss.
- **Acceptance of the terms:** recorded at sign-up since round 6, before onboarding and again when a version changes.
- **No cookie banner:** correct. Sign-in, invite, theme, the opt-out record and the onboarding seed are strictly necessary (PECR Schedule A1 paragraph 4). The three optional sessionStorage keys rest on paragraph 6 and the switch is a sufficient simple, free means of objecting, on both sites.
- **No regulatory-status sentence in the terms:** acceptable for the beta (that wording is the owner's, E7). A launch risk the owner must decide, because users may assume complaint and compensation schemes apply.

## What could not be verified

- Whether the Railway DPA is signed and the Sentry DPA accepted; either company's Data Privacy Framework listing; Sentry's storage region.
- Railway's backup behaviour, what its logs hold and for how long; Sentry's retention period.
- That the request counters are swept without the retention job.
- That the session cookie is renewed on use ("up to 14 days after you last used Flump" holds as an upper bound either way).
- What cookies WorkOS's hosted sign-in pages set.
- Whether work log entries on issued invoices can be deleted.
- An accessibility gate run covering the four new routes (it runs on the pull request, and is advisory).
- The deployed state of AI imports.
- Whether "Ltd" in the placeholder legal name is lawful for a sole trader.
- The ICO fee tiers and amounts (the ICO page read gave the duty, not the figures) and whether the fee is paid.

## Sources read on 25 November 2026

- legislation.gov.uk, latest revised text: PECR 2003 regulation 6, 6A and Schedule A1 (substituted 5 February 2026); Data Protection Act 2018 section 164A (fully in force 19 June 2026); UK GDPR Articles 13 and 14; Consumer Rights Act 2015 sections 33, 46, 48, 49, 57, 62, 64, 65, 68, 71 and Schedule 2; Equality Act 2010 sections 20 and 29; the Public Sector Bodies (Websites and Mobile Applications) (No. 2) Accessibility Regulations 2018, regulation 3.
- ico.org.uk: "What privacy information should we provide?"; the guidance on storage and access technologies (final, 29 April 2026) and its exceptions page; the data protection fee page.
- The providers' own data processing terms: Railway, WorkOS and Sentry.
- Not read: UK GDPR Articles 4 and 28 on legislation.gov.uk (Article 28(3) was applied from the reviewer's knowledge); the ICO's complaints guidance (the address tried returned 404).

## Placeholders the owner fills

All in `packages/business-details/src/index.ts`. The repository is public, so none is filled here. Each page prints a notice while any of the first three is a placeholder, and the launch guard refuses a public launch while any remains.

| Field              | Shown as                                    | Used on                                                         |
| ------------------ | ------------------------------------------- | --------------------------------------------------------------- |
| `legalName`        | "Flump Finance Ltd"                         | Controller name in the privacy notice and the terms; footers    |
| `registeredOffice` | "Registered office address to be confirmed" | Controller address in the privacy notice and the terms; footers |
| `supportEmail`     | `support@example.invalid`                   | Every contact, rights, complaint and accessibility link         |
| `companyNumber`    | "00000000"                                  | Footers only, not the legal pages                               |
| `securityContact`  | `security@example.invalid`                  | The security page only                                          |

The stand-in name ends in "Ltd" and comes with a company number, while the trading form is a sole trader for now. The owner should replace both with what is true.

## Steps only the owner can take

1. **Before pointing real people at the pages:** sign the Railway DPA (DocuSign), accept the Sentry DPA, and check both companies' Data Privacy Framework listings. Record the dates in `ropa.md`.
2. **Before pointing real people at the pages:** fill the controller's name and address and a mailbox that is read. UK GDPR Article 13 and section 164A are not met while the address is unmonitored.
3. Register with the ICO and pay the data protection fee, if not done.
4. **By 3 December 2026:** confirm the first retention run after the deploy that schedules it in the backend (D5 revised on 25 November 2026; the Railway cron service is now optional). Then the backup job and its bucket rule, and state the backup period in the privacy notice.
5. Decide the regulatory-status wording for the terms before a public launch.
6. Decide whether to move hosting to EU West (`docs/runbooks/region-move.md`). The privacy notice and `ropa.md` change with it.
7. Delete the `TERMS_VERSION` variable from the Railway backend service if it is set. The backend no longer reads it (terms versions come from `LEGAL_PAGES`) and logs one warning at boot while it is there.
8. Email testers when the terms change by more than a wording fix, and 30 days before ending an account or the test phase. The terms promise both, and nothing in the app sends email.
9. Answer privacy requests within one month and acknowledge complaints within 30 days.

## For a solicitor before public launch

Open items for the owner from the terms acceptance decider (round 6):

- Whether "agree or lose access" when the terms change is fair under the Consumer Rights Act 2015.
- No record of acceptance survives account deletion, so there is no evidence of what a deleted account agreed to.
- Nothing confirms that a person is 18 or over and lives in the UK, which the terms require.
- Whether a wording-only fix to the terms could skip asking everyone to agree again (today every new version asks).

**Owner decision, 25 November 2026:** the owner accepted these four points for the beta ("approve the points in terms of use", said to the coordinator session). This is the owner's decision to go ahead with them as they are during the test phase, not a solicitor's review. They stay on this list for a solicitor before public launch.

Earlier items:

- The financial regulation perimeter and the status wording.
- Uncapped responsibility for loss, and the trading form.
- The processor terms for client details, a transfer risk assessment and a data protection impact assessment.
- How the terms are incorporated, including gratuitous contracts in Scotland.
- The information duties that apply once Flump charges.
- The legitimate interest assessments behind the privacy notice.

## Follow-ups for engineering

- Remove the four terms-acceptance entries from `packages/api-contract/openapi-breaking-allowlist.json` in the first PR after terms acceptance merges; the checker fails on unused entries.
- The mobile app must handle 403 `terms_not_accepted` with its own acceptance screen before it is released (E12 parity log, 25 November 2026).

- Add the legal routes' visual baselines from the pull request's CI run.
- Add a row to this file, and bump the page's version, with every later change to the wording.
