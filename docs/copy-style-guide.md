# Flump Copy Style Guide

This style guide defines the standards for all copy across Flump, including the marketing site, web application, tool pages, onboarding flows, and documentation.

---

## 1. Core Voice and Tone

Flump's voice is **direct, grounded, and pragmatic** – inspired by the best of UK fintech (such as Monzo and Wise).

### Principles

1. **Clarity over cleverness**: Say exactly what something does. Never make users decode metaphors or marketing jargon.
2. **Concrete numbers over hype**: State the maths, timelines, and UK statutory thresholds directly (Personal Allowance, 40% higher rate, student loan thresholds) rather than relying on superlative claims.
3. **Active, human voice**: Use clean, active sentences. Address the user directly as "you", and refer to Flump as "Flump" or "we".
4. **No pseudo-engineering buzzwords**: Flump is a financial decision tool, not a defence contractor or high-frequency trading platform. Avoid terms like "zero-latency", "air-gapped", "cryptographic vault", "engineered for", "enterprise-grade", or "radar".
5. **Accurate UI descriptions**: Always describe interactive controls accurately. If an interface uses compact numeric inputs, never refer to "sliders". If a feature is manual, explain it simply without claiming it is "air-gapped".

---

## 2. Language and Spelling: Strict British English (en-GB)

All copy must strictly adhere to standard British English spelling and usage. Never use American English variants.

### Canonical Spelling Table

| Use (en-GB)                         | Do Not Use (en-US)          | Notes                                           |
| :---------------------------------- | :-------------------------- | :---------------------------------------------- |
| **optimise / optimisation**         | optimize / optimization     | Applies to headings, buttons, and code labels   |
| **amortise / amortisation**         | amortize / amortization     | In mortgage calculations and schedules          |
| **model / modelling / modelled**    | model / modeling / modeled  | Double 'l' in inflected forms                   |
| **categorise / categorisation**     | categorize / categorization | In budget and transaction tracking              |
| **visualise / visualising**         | visualize / visualizing     | In charts and diagrams                          |
| **enrol / enrolment**               | enroll / enrollment         | Workplace pension auto-enrolment                |
| **enquiry / enquiries**             | inquiry / inquiries         | For support, security, and contact requests     |
| **monetise / monetisation**         | monetize / monetization     | In privacy and GDPR statements                  |
| **favourite**                       | favorite                    | Across all settings and bookmarks               |
| **analyse / analysing**             | analyze / analyzing         | In financial breakdowns and tools               |
| **programme**                       | program                     | Except when referring strictly to computer code |
| **licence (noun) / license (verb)** | license (noun)              | e.g. "under an FCA licence"                     |
| **centre**                          | center                      | In alignment or layout descriptions             |

---

## 3. UK Financial Terminology

Flump is engineered specifically for UK taxpayers and personal finance rules. Always use official UK statutory terms and financial abbreviations.

### Terminology Rules

- **AER (Annual Equivalent Rate)**: Use for savings accounts, cash ISAs, and interest earned. Never use the US term "APY" for UK savings.
- **APR (Annual Percentage Rate)**: Use for consumer borrowing, loans, and credit cards.
- **EAR (Equivalent Annual Rate)**: Use for arranged and unarranged bank overdrafts (e.g. "39.9% EAR").
- **HMRC**: Her Majesty's / His Majesty's Revenue and Customs. Always all-caps.
- **PAYE**: Pay As You Earn. Always all-caps.
- **National Insurance (NI)**: Capitalise National Insurance. Abbreviate to NI when space is constrained.
- **Personal Allowance**: Capitalise both words when referring to the UK statutory income tax allowance.
- **ISA / Stocks and Shares ISA / Cash ISA**: Individual Savings Account. Always capitalise ISA and formal types.
- **SIPP**: Self-Invested Personal Pension. Always all-caps.
- **Section 24**: Capitalise Section 24 when referencing residential landlord mortgage interest tax restriction.
- **Self Assessment**: Two words, no hyphen, both capitalised when referring to the UK tax return system.
- **Take-Home Pay**: Hyphenated when used as a compound noun or modifier.
- **Student Loans**: Specify the plan explicitly (Plan 1, Plan 2, Plan 4, Plan 5, Postgraduate Loan).

---

## 4. Canonical Feature and Module Names

Replace outdated or melodramatic names with clear, professional names:

| Canonical Name               | Deprecated / Gimmicky Name                 | Description                                                                |
| :--------------------------- | :----------------------------------------- | :------------------------------------------------------------------------- |
| **60-second baseline**       | 60-Second Wealth Engine / Baseline Station | The 6-figure setup that produces the initial financial picture             |
| **Debt payoff**              | Debt Crusher / Debt Elimination Engine     | The module comparing avalanche and snowball payoff schedules               |
| **Months of cover**          | Emergency runway / Survival Runway / Gauge | Liquid cash divided by monthly essential outgoings                         |
| **Safe to spend**            | Safe-to-Spend / Guilt-Free Cash Allowance  | Weekly discretionary cash buffer after ring-fencing obligations            |
| **Cashflow allocation**      | Cashflow Waterfall / Dynamic Cash Engine   | Proportional breakdown of tax, fixed bills, flexible spending, and surplus |
| **Promotional expiry alert** | Promotional Cliff / 0% Cliff Alert         | Clear notice when a 0% credit card or transfer rate is ending              |

### Saved details and scenarios

Saved facts and what-if tools are kept apart on every page (spec: `docs/design/e15/scenario-zone.md`).

| Element               | Canonical copy                                                                                                    | Never                                      |
| :-------------------- | :---------------------------------------------------------------------------------------------------------------- | :----------------------------------------- |
| Saved zone heading    | _Your mortgage_, _Your pension_ (plain, domain named)                                                             | _Settings_, _Inputs_                       |
| Saved zone state line | _Saved_ plus the last-updated date, then an _Edit_ button                                                         | _Synced_, _Applied_                        |
| Scenario zone heading | _Model a change_; per page _Model a change to your mortgage_ / _debts_ / _pension_ / _savings_ / _budget_ / _pay_ | _Sandbox_ (belongs to the signed-out demo) |
| Scenario badge        | _Illustration, not saved_ (icon plus text, never colour alone)                                                    | _Draft_, _Preview_                         |
| Basis line            | _Starting from your figures: £182,400 at 4.5%, 22 years left_                                                     | A basis built from scenario values         |
| Reset button          | _Reset to saved figures_                                                                                          | _Reset_, _Clear_                           |
| Footer link           | _Update your details_ (opens the edit form with the saved values)                                                 | _Apply to my details_, _Save scenario_     |
| Cross-tool buttons    | _Model this in Savings_, _Model this in the pension forecaster_                                                   | _Apply_, _Apply to ..._                    |
| Announcements         | Prefix _Illustration:_ (for example _Illustration: interest saved £3,800_)                                        | Unprefixed outcome announcements           |

---

## 5. Capitalisation Rules

Flump uses **sentence case** across all user-facing copy:

- **Page headings (H1, H2, H3)**: Sentence case (e.g. _See where you stand each month_, _What you keep from a pay rise_).
- **Eyebrows and badges**: Sentence case (e.g. _How it works_, _Why Flump_, _Core tools_, _Security and privacy_, _Live calculator_).
- **Buttons and interactive links**: Sentence case (e.g. _Get your free baseline_, _Start free baseline_, _Add account_, _Save this plan_).
- **Navigation items**: Single words or sentence case (e.g. _Dashboard_, _Budget_, _Accounts_, _Debt_, _Savings_, _Pension_, _Mortgage_, _Forecast_, _Tax_, _Profile_).
- **Table headers and form labels**: Sentence case (e.g. _Remaining mortgage balance_, _Annual gross salary_, _Monthly payment_).
- **Exceptions (Title Case / All-Caps)**:
  - Proper nouns (_Flump_, _England_, _Scotland_).
  - Recognised UK acronyms and statutes (_HMRC_, _FCA_, _PAYE_, _NI_, _ISA_, _SIPP_, _GDPR_, _AER_, _APR_, _Section 24_).

---

## 6. Punctuation and Formatting

- **En-dashes (`–`) for parenthetical breaks**: Use a spaced en-dash (`–`) with a space on either side. Never use unspaced em-dashes (`—`) or double hyphens (`--`).
- **Closed en-dashes (`–`) for ranges**: Use an unspaced en-dash for numeric or currency ranges (e.g. `£100k–£125k`, `10–30 years`, `3–5 days`).
- **Currency formatting**:
  - Always use `£` directly before the number with no space (e.g. `£1,250`, `£45k`).
  - Use `k` for thousands in constrained UI components (e.g. `£100k`).
  - Use `/mo` and `/wk` for recurring rates in compact badges, or spell out "per month" / "per week" in body copy.
- **Ellipses**: Avoid trailing ellipses (`...`) in normal copy or button labels unless an asynchronous background action is currently pending (e.g. _Saving..._).
- **No exclamation marks**: Avoid exclamation marks in headings, confirmation messages, and banners. Confidence is conveyed through precise facts and clean typography.

---

## 7. Banned Words and AI Slop

The following words and phrases must be removed or rewritten:

| Banned Phrase                                  | Preferred Replacement                                   |
| :--------------------------------------------- | :------------------------------------------------------ |
| _Engineered for UK rules_                      | Built for UK rules / Designed for HMRC thresholds       |
| _Zero-latency_                                 | Instant / fast                                          |
| _Air-gapped privacy mode_                      | Manual mode / Private manual entry                      |
| _Cryptographic bank-grade vault_               | Encrypted bank connection tokens                        |
| _Crush your debt_                              | Pay off debt faster / Clear your debt                   |
| _Defuse promotional cliffs_                    | Avoid high revert rates / Clear balances before 0% ends |
| _Unlock instant insights_                      | See your numbers immediately                            |
| _Delve into / Tapestry / Beacon / Supercharge_ | Explain, show, calculate, review                        |
| _Inquiry dispatched_                           | Enquiry sent                                            |
| _Get out of the red. Build into the black._    | See where you stand each month.                         |
| _01 // HOW IT WORKS_                           | How it works                                            |
| _02 // FOUR PILLARS_                           | Core tools                                              |
| _03 // LIVE HMRC SIMULATOR_                    | Live calculator                                         |
| _04 // WHY FLUMP_                              | Why Flump                                               |
| _05 // TRUST & SECURITY_                       | Security and privacy                                    |
| _06 // FAQ_                                    | Frequently asked questions                              |

---

## 7a. Claims

No regulatory, security, pricing or feature claim may appear in copy without file:line or host evidence, and an approver listed in the E7 claim register ([docs/audit/plans/E7-claims-design.md](./audit/plans/E7-claims-design.md)). Regulatory statements (FCA, UK GDPR) are only added with the owner's explicit wording. Placeholder values come from `apps/marketing/src/utils/placeholders.ts`.

---

## 7b. No finance shaming

Owner requirement (E31). Copy never judges someone's situation or ranks one situation above another.

1. **No hierarchy.** Renting, paying a mortgage and living with family are all normal housing situations. Having debt or none, and small or large savings, are facts, not grades. Renters get the same quality of tooling and the same visual weight as mortgage holders.
2. **Describe what the person is doing or deciding**: "renting", "paying a mortgage", "saving for a deposit", "paying off a card", "building a buffer", "checking a pension".
3. **Banned framings**: "thin savings", "only" or "just" about someone's money, "still renting", "struggling", "bad with money", "should", and "get on the ladder" as a default aspiration.
4. **No deprivation statistics at the reader** (for example "21% have under £1,000"). Prefer no statistics at all; illustrative figures carry an "Example" label.
5. **People-first, second person, matter-of-fact.** Flump does not set targets for people. Where a figure has a target (months of cover), the person chooses it.
6. **Internal persona names stay neutral too**: "renting", "mortgage coming up for renewal", "saving for a first home", "getting to grips with a pension".

---

## 8. Maintenance Rule

Whenever new features, pages, modals, or documentation are added to Flump, agents and developers must:

1. Review this document ([docs/copy-style-guide.md](file:///Users/marcgallagher/personal/flump/docs/copy-style-guide.md)).
2. Apply strict British English (en-GB) and sentence case formatting.
3. Update this guide if new domain concepts or canonical terms are introduced.
