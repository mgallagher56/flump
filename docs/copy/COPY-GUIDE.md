# Flump copy guide

Version 1.0, 2026-11-14. This is the one guide for every word a person reads or hears from Flump: `apps/web` (including signed-out `/tools` and `/sandbox`), `apps/marketing`, `packages/ui`, strings from `packages/finance-engine` that reach a screen, and `packages/mcp` tool descriptions, prompts and results.

It replaces `docs/copy-style-guide.md` and section P7 of `docs/design/e16-polish/PLAN.md` as the place to look. It restates, and never loosens, the advice boundary policy (`docs/compliance/advice-boundary-policy.md`, rules R1 to R8) and the claims rule (E7). Where this guide and the policy seem to differ, the policy wins and this guide has a bug.

- Evidence: [COPY-RESEARCH.md](./COPY-RESEARCH.md) (sources, with what could and could not be verified).
- How a screen behaves (hierarchy, states, forms, destructive actions) is set by [`docs/ux/UX-GUIDELINES.md`](../ux/UX-GUIDELINES.md). That document decides the behaviour; this one decides the words.
- Current state of the product against this guide: [COPY-AUDIT.md](./COPY-AUDIT.md).
- Mechanical rules are enforced by `bun scripts/check-copy.ts` (section 8).

Section numbers are stable. The guard and the audit cite them ("guide 5.6").

## 1. Who reads our words

A typical UK household: someone renting, someone whose mortgage fix is ending, someone saving for a first home, someone getting to grips with a pension. They are not finance people. Many open the app with some dread.

What the evidence says about them (details and sources in COPY-RESEARCH.md):

- About 1 in 5 adults in England has low literacy (18%) and about 1 in 5 has low numeracy (21%) in the OECD's 2023 survey. Plain words are not a nicety. They decide whether a fifth of readers can use the screen at all.
- People scan screens. They read the first words of a line and skip the rest. Comprehension falls as sentences grow: the figures GOV.UK cites give about 90% at 14 words and under 10% at 43.
- Shame and worry make people avoid money information. Threatening or judging wording drives avoidance. Neutral facts and one clear next step keep people reading.
- A regulator's test is a good test for us too, although we apply it by choice: a communication should meet the reader's information needs, be likely to be understood, and equip them to decide for themselves (the FCA's consumer understanding outcome). Key facts come first, detail is layered behind, and anything that cuts against the headline is as prominent as the headline.

## 2. Voice and tone

### 2.1 Voice

Flump sounds like a calm, numerate friend who shows you the working. Four traits, always:

| Trait       | Means                                                              | Does not mean                        |
| ----------- | ------------------------------------------------------------------ | ------------------------------------ |
| Plain       | Everyday words, short sentences, the figure itself                 | Dumbed down, chatty or jokey         |
| Factual     | Says what a number is and what it assumes                          | Tells you what to do with your money |
| Even-handed | Describes every situation and every option with the same weight    | Cheerleading, warning or grading     |
| Honest      | Says "estimate" when it is one, and says what we do not know or do | Hedging every sentence with "may"    |

Write to "you". Call ourselves "Flump" or "we". Use contractions where they sound natural ("you'll", "we'll"), but not negative ones in instructions or errors ("do not", not "don't", when the "not" matters).

### 2.2 No hype

Say what a thing does, with the figure. No superlatives, no pseudo-engineering words, no promises. The guard blocks: supercharge, unlock, crush, effortless, magic, bank-grade, enterprise-grade, engineered for, zero-latency, air-gapped, radar, financial freedom, instant insights.

| Don't (from our screens)                                   | Do                                                         |
| ---------------------------------------------------------- | ---------------------------------------------------------- |
| "Widget unlocked on the dashboard"                         | "Now on your dashboard"                                    |
| "UK tax figures come from a deterministic engine"          | "Tax figures are calculated by Flump, not by the AI model" |
| "Your live financial snapshot across your active modules." | "Your figures in one place."                               |

### 2.3 No judgement (owner rule)

Copy never judges someone's situation and never ranks one situation above another. This is the owner's rule and it has no exceptions.

1. **No hierarchy.** Renting, paying a mortgage and living with family are all ordinary. Having debt or none, and small or large savings, are facts, not grades. A renter's screen gets the same care as a homeowner's.
2. **Describe what the person is doing or deciding**: "renting", "paying a mortgage", "saving for a deposit", "paying off a card", "building a buffer", "checking a pension".
3. **Never**: "only" or "just" before someone's money, "thin savings", "still renting", "struggling", "bad with money", "good debt", "bad debt", "overspending", "guilt-free", "get on the ladder" as a default aim, and "should".
4. **No deprivation statistics aimed at the reader** ("21% have under £1,000"). Prefer no population statistics at all. An illustrative figure carries the label "Example".
5. **No comparison with other people** ("people like you save more"). Social comparison can backfire and it reads as a grade.
6. **Flump sets no targets.** Where a figure has a target (months of cover, a savings goal), the person chooses it.
7. **No minimisers.** "Simply", "just add", "easy", "quick" tell a reader who finds it hard that the fault is theirs.
8. **No alarm for ordinary situations.** A negative net worth, a debt, a month where spending is more than income: state it in the same voice as a positive figure. Red, warning icons and the word "warning" are for errors and destructive actions (plan P7.2).
9. **Internal names stay neutral too**: persona and segment names in code and docs follow rule 2.

| Don't (from our screens)                                            | Do                                                                              |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| "high APR" (a badge on a debt)                                      | "24.9% APR"                                                                     |
| "Monthly deficit"                                                   | "Short each month" with the figure, in the usual colour                         |
| "Guilt-Free Cash Allowance"                                         | "Safe to spend"                                                                 |
| "£1,000,000: not reached in 60 years"                               | Remove. Show the person's own goal if they set one                              |
| "You are redirecting £515/month that used to service high-APR debt" | "£515 a month that went to card payments now goes into savings in this example" |

### 2.4 Tone by situation

The voice is constant. The tone moves with what the reader is doing.

| Situation                       | Reader is likely   | Tone                                    | Example                                                                 |
| ------------------------------- | ------------------ | --------------------------------------- | ----------------------------------------------------------------------- |
| Routine task, return visit      | Confident          | Brief                                   | "Saved"                                                                 |
| First use, empty page           | Unsure             | Patient, one step                       | "Add your first account to see what you own and what you owe."          |
| A result or forecast            | Curious or anxious | Exact, assumption beside it             | "Estimate: paid off in Mar 2030, if payments stay at £320 a month."     |
| A hard number (debt, shortfall) | Braced             | Level, no adjectives, same styling      | "You owe £8,420 across 3 debts."                                        |
| Our error                       | Frustrated         | Own it, say what to do                  | "We could not save that change. Your figures are unchanged. Try again." |
| Their input needs fixing        | Mid-task           | Specific, no blame                      | "Enter an interest rate between 0 and 100"                              |
| Deleting something              | Cautious           | Serious, names the thing and the effect | "Delete Barclaycard? Its balance history will be deleted too."          |
| Success                         | Relieved           | Proportionate, no celebration           | "Budget saved"                                                          |

We do not celebrate a person's money ("Congratulations, you're debt-free"). Paying off a debt is theirs to feel about. We confirm the fact.

## 3. Plain language

### 3.1 Targets

| Measure                 | Target                                                        |
| ----------------------- | ------------------------------------------------------------- |
| Reading age             | 9 to 11 for interface text; up to 13 for long guides and FAQs |
| Sentence length         | Average 15 words or fewer; no sentence over 25                |
| Words per button        | 1 to 3, at most 4                                             |
| Heading                 | 2 to 6 words, at most 40 characters                           |
| Error message           | At most 2 short sentences: what happened, what to do          |
| Tooltip or hint         | 1 sentence, at most 20 words                                  |
| Paragraph               | At most 3 sentences on a screen; at most 5 in a guide         |
| Figures in one sentence | At most 2                                                     |

Reading age is a rough check, not a goal in itself: a short sentence of jargon scores well and helps nobody. Check a long passage with a Flesch-Kincaid grade (aim for grade 5 to 7) and then read it aloud. The "reading age 9" figure is widely quoted for the UK but has weak provenance (see COPY-RESEARCH.md); the 25-word limit and the fall in comprehension with length are better supported.

### 3.2 Plain words

- Use the word a person would say at a kitchen table. If a finance term is unavoidable, it is in the glossary (section 6) with its one approved form, and it is explained in a hint the first time it appears on a page.
- One idea per sentence. Put the figure or the action first.
- Active voice, present tense. Passive is right in two cases: when the actor is unknown or unimportant ("Interest is added monthly"), and where the policy asks for it to avoid an imperative (R2).
- No Latin abbreviations: "for example", "that is", "and so on".
- Prefer: use (not utilise), help (not facilitate), about (not regarding), before (not prior to), start (not commence), end (not terminate), to (not in order to), buy (not purchase), need (not require), more (not additional), enough (not sufficient), show (not display), choose or select (not click).
- Never: leverage, holistic, robust, seamless, empower, streamline, going forward, deep dive, drill down, please note.

### 3.3 Structure

- Key fact first, detail behind. A page states its main figure, then the two or three figures that explain it, then "Show details".
- A line that qualifies a figure sits next to that figure and is as easy to read. Never put the catch in smaller, lighter text far from the claim.
- Lists for three or more parallel items. Tables for comparisons, with the same rows for every option (R1).
- Never rely on colour, bold or capitals to carry meaning.

### 3.4 British English and UK terms

en-GB spelling everywhere, including code-facing labels: optimise, categorise, analyse, visualise, modelling, enrol, enrolment, favourite, programme (but a computer program), licence (noun), license (verb), centre, cancelled, enquiry.

UK terms, never US ones: current account (not checking account), postcode, AER for savings (never APY), APR for borrowing, EAR for overdrafts, pension (never 401k), "a year" (not "annually" or "per annum").

## 4. Numbers, estimates, dates and uncertainty

Every number on a screen uses tabular numerals and UK formatting (`Intl.NumberFormat('en-GB')` or `useFormatCurrency()`; AGENTS.md section 2). Precision follows plan P8.

### 4.1 Money

- `£` directly before the figure, thousands separator, no space: "£1,250".
- Whole pounds wherever a figure is read. Pence only where a person types or reconciles an exact amount (tax records, edit forms).
- In a sentence, write the figure in full: "£45,000", not "£45k". "k" and "m" are for chart axes and chips with no room. Write "£1.2 million" in prose.
- Say the period in words: "a month", "a year", "a week". "/mo" and "/yr" are for chart axes and tight table cells only.
- A negative amount has a minus sign and the usual text colour: "−£250". Better, use a word that carries the sign: "short by £250", "you owe £8,420".
- Give money in the unit people budget in. Monthly for bills and pay; yearly for salary, allowances and tax. Never convert to "per day" to make a cost look small or a saving look large.
- Say whether a future amount is in today's money. Our projections are in today's money unless a line says otherwise.

### 4.2 Percentages and rates

- "%" directly after the number, at most 1 decimal place: "4.5%". A rate the person typed shows as typed, to at most 2 places.
- Always say what the percentage is of: "18% of your take-home pay", not "18%".
- A change between two percentages is in **percentage points**: "from 4.5% to 5.5%, 1 percentage point higher". Never "1% higher" for that.
- Where a percentage stands alone and matters, give the pounds too: "5% (£250 a month)". People with low numeracy handle amounts better than rates.
- For a share of people or cases, prefer a natural frequency with the same base: "1 in 5", "3 in 10". Do not mix bases ("1 in 5" beside "1 in 8").
- A rate always carries its type: "24.9% APR", "4.1% AER", "39.9% EAR". Never grade a rate ("high", "competitive", "low-yielding": R3).
- Growth over years is hard to judge by eye. Show the end amount, not only the rate: "£10,000 at 5% a year for 10 years: £16,289".

### 4.3 Dates and time

- Full date: "5 April 2027". No ordinal ("5th"), no numeric form ("05/04/27").
- Compact: "Apr 2027" for months, "2030" on chart axes (never "Year 5").
- Short months are always three letters: Jan, Feb, Mar, Apr, May, Jun, Jul, Aug, Sep, Oct, Nov, Dec. September is "Sep", never "Sept" (decided 2026-11-14). Three letters keep every month the same width in tables and on chart axes, and the browser's own en-GB short form changes between engines ("Sep" on some, "Sept" on others). So short dates come from `formatDate` and `formatMonthYear` in `@repo/format`, which build the month name by hand, and never from `Intl.DateTimeFormat` or `toLocaleDateString` with `month: "short"`.
- Tax year: "2026 to 2027 tax year" in a sentence; "2026/27" in a table, label or chart.
- Durations over 24 months read as years and months: "3 years 4 months". Under that: "18 months".
- Relative time only for recent events: "Updated 2 hours ago", then the date.
- Ranges in a sentence use "to": "£100,000 to £125,140", "5 to 25 years". An unspaced en dash is for chart labels and table cells only.

### 4.4 Estimates and uncertainty

This is where finance copy most often misleads. Rules:

1. **Say "estimate" for anything we computed about the future or about tax.** "Estimate" is the one approved word. Not "forecast" in a headline, not "projection" as a label on a figure, never "will". ("Projection" is fine in running text and in the name `ProjectionNotice`.)
2. **"Illustration"** is the one word for a what-if result in a `ScenarioZone`. "Illustration, not saved."
3. **Saved figures are stated flat.** "You owe £8,420." No "estimate" on a number the person entered.
4. **State the assumption beside the result**, in one line, with at most 2 figures: "Assumes 5% growth a year and contributions of £200 a month." The person can change every assumption we state.
5. **Prefer a range to a hedge word.** "Between £180,000 and £260,000" tells the reader more than "could be around £220,000", and research finds a numeric range costs little trust while vague hedges are read inconsistently. Do not stack hedges ("may potentially").
6. **No false precision.** A 30-year estimate is rounded: to the nearest £1,000 above £100,000, the nearest £100 above £10,000. A date decades away is a year, not a day.
7. **"Can", not "will".** "Estimate", not "will be". Never "guaranteed", "certain", "risk-free", "safe" about an outcome (existing guard).
8. **Every tax figure carries the one standard "Unverified estimate" notice** until the tax vectors are signed off (R6): the same wording, in sentence case, from its component or constant, once per surface. Never write it by hand inside a badge, heading or description.
9. **The hero holds a saved fact, never an estimate and never a what-if result** (AGENTS.md section 3; plan decision D2, ruled "no" on 2026-11-14). An estimate computed from saved figures is the first KPI, labelled "Estimate".
10. **Anchors.** A default or example value steers people. Defaults are neutral (the person's own saved figure, or empty), examples are labelled "Example", and a minimum payment is never shown as the suggested amount.

### 4.5 Comparisons

- Options sit side by side with the same fields, the same order and the same verbs (R1). The copy would read the same if the result were reversed.
- State both numbers and the difference. Do not say which is "better", "cheaper overall" or "wins". "Costs £1,240 less in interest" is a fact; "the better choice" is a recommendation.
- Never compare the reader with other people (2.3).

## 5. Patterns

### 5.1 Capitalisation and headings

- **Sentence case everywhere**: page titles, headings, buttons, tabs, navigation, labels, table headers, badges, tooltips, dialog titles, chart titles, `aria-label`s.
- No uppercase eyebrows or labels. No block capitals for emphasis.
- Capitals only for: the first word; proper nouns (Flump, Scotland, MoneyHelper); statutory names (National Insurance, Personal Allowance, Self Assessment, Income Tax, Capital Gains Tax, Section 24, Universal Credit, State Pension); wrappers and plans (Cash ISA, Stocks and Shares ISA, Lifetime ISA, Plan 2); acronyms (HMRC, PAYE, NI, ISA, SIPP, APR, AER, EAR, LTV, MCP).
- Lower case for: take-home pay, student loan, pension, mortgage, tax year, budget, net worth, savings account, credit card, overdraft, salary sacrifice, auto-enrolment, direct debit.
- Feature names are not proper nouns: "the debt page", "your budget", not "the Debt Module".

**Page headings.** The h1 names the thing in the reader's words: "Debt", "Your mortgage", "Take-home pay". A heading is a noun phrase or a plain question the page answers ("What you keep from a pay rise"). No heading is a slogan, an instruction about money, or a stage ("Stage 1: Stabilise").

**Saved and scenario zones** (unchanged from the scenario spec, `docs/design/e15/scenario-zone.md`):

| Element               | Approved copy                                                                          | Never                                  |
| --------------------- | -------------------------------------------------------------------------------------- | -------------------------------------- |
| Saved zone heading    | "Your mortgage", "Your pension" (plain, domain named)                                  | "Settings", "Inputs"                   |
| Saved zone state line | "Saved" plus the last-updated date, then an "Edit" button                              | "Synced", "Applied"                    |
| Scenario zone heading | "Model a change to your mortgage" / "debts" / "pension" / "savings" / "budget" / "pay" | "Sandbox", "Simulator", "Playground"   |
| Scenario badge        | "Illustration, not saved" (icon plus text)                                             | "Draft", "Preview"                     |
| Basis line            | "Starting from your figures: £182,400 at 4.5%, 22 years left"                          | A basis built from scenario values     |
| Reset button          | "Reset to saved figures"                                                               | "Reset", "Clear"                       |
| Footer link           | "Update your details" (opens the edit form with the saved values)                      | "Apply to my details", "Save scenario" |
| Cross-tool buttons    | "Model this in savings", "Model this in the pension forecaster"                        | "Apply", "Apply to ..."                |
| Announcements         | Prefix "Illustration:" ("Illustration: interest saved £3,800")                         | Unprefixed outcome announcements       |

### 5.2 Page introductions

One sentence under the h1 at most, and only if the heading alone does not say what the page is for. It describes the page, not the person: "What you owe, and when it would be paid off at your current payments."

### 5.3 Buttons and links

- A button is a verb and its object: "Add account", "Save budget", "Delete debt". 1 to 3 words.
- The label says what happens on this page in this state: "Edit budget" when one exists, not "Create budget" (P7.4). One primary button per page.
- Never "OK", "Submit", "Yes", "No", "Click here", "Learn more", "Read more". A link names where it goes: "How the estimate is worked out".
- "Select" or "choose", not "click" or "tap".
- An external link says so: "HMRC guidance on Self Assessment (opens in a new tab)". The MoneyHelper line keeps its own fixed wording (7.3).
- A button prompted by a computed result may say "Model this …". It never says "Apply" (R5). A pre-fill button says "Use" (rulings log).
- A pending state repeats the verb: "Saving…". Use the ellipsis character only for pending states and truncation.

### 5.4 Punctuation

- No exclamation marks.
- No em dashes. Do not use a dash for an aside: write two sentences or use a comma.
- "and", not "&", except in a registered name.
- No full stop on a heading, button, label or single-sentence tooltip. Full stops on body sentences, error messages and anything with two sentences.
- Straight quotes in code; in prose, quote a label exactly as it appears on screen, in double quotes.
- No "(s)": write the plural rule properly ("1 debt", "3 debts").
- No emoji.

### 5.5 Empty states

One heading, one sentence, one button (P12.2). The sentence says what will appear and what the person needs to do. It never implies the person is behind.

| Don't                                     | Do                                                                                          |
| ----------------------------------------- | ------------------------------------------------------------------------------------------- |
| "No widgets showing"                      | "Nothing to show yet"                                                                       |
| "You haven't added any debts yet!"        | "No debts added" / "Add a credit card, loan or overdraft to see when it would be paid off." |
| "Start your journey to financial freedom" | "Add your first account"                                                                    |

An empty state for "nothing owed" or "no debts" is a neutral fact, not a celebration and not a prompt to borrow.

### 5.6 Errors

Say what happened, in the reader's words, and what to do. Do not blame. Do not apologise at length. Never show a code alone.

- **Field errors** reuse the field's label and say what is needed: "Enter your yearly salary", "Interest rate must be between 0 and 100", "Enter a date in the future".
- **Our failures** say what did not happen, what state the data is in, and the next step: "We could not save your budget. Nothing has changed. Try again."
- **Connection**: "You are offline. Your changes will not be saved until you reconnect."
- **Not found**: "We cannot find that page." plus one way back.
- Never: "Something went wrong", "An error occurred", "Invalid", "Oops", "Whoops", "Uh oh", "Please try again later" with no cause, or a raw server message.
- "Sorry" is for when we lost someone's work or time. Once, not in every message.
- An error never states or implies anything about the person's finances.

### 5.7 Notices

- One notice per projection surface, from the canonical constant (R6). Never write a second disclaimer by hand, never reword one, and never shorten one. See section 7.3.
- A notice states a fact about the service. It never states regulatory status (E7).
- A sample-data surface says so, once, near the figures: "Sample data: illustrative figures, not yours."
- Do not use a notice to excuse copy. Copy that breaks R2 stays broken beside a notice.
- Information notices are quiet. The words "Warning" and "Important" and the danger style are for data loss and security only.

### 5.8 Tooltips and hint text

- A hint answers "what is this?" or "where do I find it?" in one sentence: "The rate on your latest mortgage statement."
- A term from the glossary gets a plain definition the first time it appears on a page: "APR: the yearly cost of borrowing, including fees."
- Nothing essential lives only in a tooltip. If people need it to fill in the field, it is hint text under the label.
- No placeholder text as a label or as the only instruction. A placeholder, if used, is a format example: "For example, 4.5".
- Hints are facts. A hint never suggests a value to enter or an action to take with money (R2).

### 5.9 Confirming a destructive action

- Title: the verb and the named thing, as a question. "Delete Barclaycard?"
- Body: what will be lost and whether it can be undone, in one or two sentences. "Its balance history will be deleted too. This cannot be undone."
- Buttons: the confirm button repeats the verb ("Delete debt"). The other is "Cancel". Never "Yes"/"No" or "OK".
- Deleting an account, all data or a bank connection says exactly what goes and what stays, and asks for a typed confirmation only where the loss is total.
- "Delete" removes for good. "Remove" takes something out of a list but keeps the data. "Disconnect" ends a bank or AI connection. "Reset" returns to saved or default values. "Clear" empties a field. Use each for one meaning only.

### 5.10 Success and status

- Past tense, the thing, no adjective: "Budget saved", "Account added", "Token copied".
- A toast is one line. If the person must read it to stay safe (a token shown once), it is not a toast: it stays on screen until dismissed.
- Status words: "Saved", "Not set", "Updated 3 Nov 2026", "Connected", "Not connected". "Not set" is neutral: never "Missing" or "Incomplete".

### 5.11 Forms

- A label is a noun phrase in the reader's words: "Yearly salary before tax", "Monthly payment", "Interest rate (APR)".
- Say the period and whether it is before or after tax in the label, not in a tooltip.
- Mark optional fields "(optional)". Do not mark required ones with an asterisk alone.
- Ask for what people can find: say where the number is ("on your payslip", "on your annual statement").
- A question is a question: "Do you pay into a pension?" with "Yes" and "No" as answers (the one place those words are right).

### 5.12 Loading and progress

- A skeleton needs no words. A long wait says what is happening: "Working out your estimate…".
- Steps are numbered in words people can follow: "Step 2 of 4". Never a percentage of setup complete, and never "profile strength".
- A setup checklist lists tasks about the app ("Add your pension"), never financial actions (R4).

### 5.13 Text for assistive technology

- Every control has an accessible name in sentence case that makes sense out of context: "Edit Barclaycard", not "Edit".
- A chart has a one-sentence summary with at most 2 figures (P10.1) and an `aria-label` that names what it shows.
- Live announcements of scenario results start "Illustration:".
- Alt text describes what the picture shows, or is empty for decoration.

### 5.14 MCP tool and prompt text

MCP text is read by a model first and a person second. The same rules apply (R7), plus:

- A tool description says what the tool calculates or returns, from what data, in one or two sentences. It asks for calculations and summaries. It never tells the model to recommend, rank, prioritise or advise.
- Use the glossary's words, so the model's answer uses them too: "debts", "what you own", "months of cover".
- Result keys are neutral (`projectedOutcome`, `monthlySetAsideEstimateGbp`). Never `recommendation`, `best*`, `guaranteed*`, `favoursOption`.
- Every result carries the notice and its assumptions. Parameter descriptions say the unit and the format: "Yearly amount in pounds", "Month in the form 2026-04".

## 6. Glossary

One approved word for each concept. Use it in headings, labels, hints, errors, MCP text and docs. The guard blocks the "never" column.

### 6.1 Approved terms

| Concept                                         | Approved                                                            | Never                                                                                                                   |
| ----------------------------------------------- | ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Everything owned minus everything owed          | net worth                                                           | wealth, balance sheet                                                                                                   |
| Things of value a person has                    | what you own; or name it (savings, home, pension)                   | assets                                                                                                                  |
| Money a person owes                             | debt, debts, what you owe                                           | liability, liabilities, "Liability 1"                                                                                   |
| Who a debt is owed to                           | lender                                                              | creditor                                                                                                                |
| Pay after tax, NI, pension and student loan     | take-home pay                                                       | net pay, net income, "Take-Home Pay" ("net pay arrangement" is fine: it is HMRC's name for a pension tax relief method) |
| Pay before deductions                           | salary before tax; pay before tax                                   | gross, gross salary (allowed once, in brackets, on a payslip-matching field)                                            |
| Income minus spending, positive                 | left over each month; "left over this month" for one named month    | surplus, monthly surplus, disposable income                                                                             |
| Income minus spending, negative                 | short each month                                                    | deficit, overspend, in the red                                                                                          |
| Spending a person can vary                      | flexible spending                                                   | discretionary, discretionary allowance                                                                                  |
| Spending a person cannot easily vary            | essential spending; bills                                           | fixed costs, non-discretionary                                                                                          |
| Money left this week after bills and saving     | safe to spend                                                       | guilt-free, allowance                                                                                                   |
| Cash divided by monthly essential spending      | months of cover                                                     | runway, emergency runway, survival                                                                                      |
| Money in current and instant-access accounts    | cash you can get at quickly                                         | liquid cash, liquidity                                                                                                  |
| How pay is split across tax, bills and the rest | where your pay goes                                                 | cashflow waterfall, allocation engine                                                                                   |
| Balance-weighted mean rate                      | average rate                                                        | weighted by balance, blended rate                                                                                       |
| Earnings used for auto-enrolment contributions  | pay that counts for your pension                                    | qualifying gross, qualifying earnings (allowed in a hint: "your scheme may call this qualifying earnings")              |
| A computed future or tax figure                 | estimate                                                            | forecast (as a label), prediction, will                                                                                 |
| A what-if result                                | illustration                                                        | simulation, draft, preview                                                                                              |
| Trying different inputs                         | model (verb): "Model a change to your mortgage"                     | simulate, optimise, play with                                                                                           |
| Putting two options side by side                | compare                                                             | choose between, which is better                                                                                         |
| The person's stored details                     | your figures; your details; saved                                   | baseline, profile data, inputs                                                                                          |
| The dashboard as a whole                        | your money (the page title); your picture; your figures             | snapshot, overview engine                                                                                               |
| The monthly saved record of net worth           | monthly check-in                                                    | snapshot                                                                                                                |
| A block on a page                               | section; or name it ("the debt section")                            | module, widget, card (in copy)                                                                                          |
| Finishing first-time setup                      | finish setting up                                                   | refine, drill down, complete your profile                                                                               |
| A linked bank                                   | connected bank; connected, updated                                  | synced, sync, bank feed, credentials                                                                                    |
| A linked AI client                              | AI connection                                                       | agent link, integration                                                                                                 |
| Paying a debt early                             | paid off; the date is the "debt-free date"                          | crushed, eliminated, cleared, escaped                                                                                   |
| Paying extra on a mortgage or loan              | overpayment, overpay                                                | prepayment                                                                                                              |
| How a loan balance falls over time              | repayment schedule                                                  | amortisation schedule (allowed once in a guide, defined)                                                                |
| Loan as a share of the home's value             | loan to value (LTV) on first use, then LTV                          | equity ratio                                                                                                            |
| End of a 0% or fixed deal                       | when the 0% deal ends; when your fixed rate ends                    | cliff, promotional cliff, rate shock                                                                                    |
| Debt methods                                    | highest rate first (avalanche); smallest balance first (snowball)   | mathematically optimal, psychological momentum                                                                          |
| Income between £100,000 and £125,140            | "above £100,000", "below £100,000", "the £100,000 to £125,140 band" | tax trap, 60% trap, escape, reclaim your allowance                                                                      |
| The tax return system                           | Self Assessment                                                     | self-assessment, SA                                                                                                     |
| Money HMRC expects                              | tax bill; tax to pay                                                | tax liability                                                                                                           |
| Pension paid in via salary                      | salary sacrifice                                                    | sacrifice (alone), salary exchange                                                                                      |
| Sample figures                                  | sample data; "Example" on a single figure                           | demo, dummy, fake, mock                                                                                                 |

Abbreviations: spell out on first use on a page unless it is one of APR, AER, ISA, NI, PAYE, HMRC, which most readers know. Always spell out LTV, EAR, SIPP, CGT, MCP on first use.

### 6.2 Words we never use

Plain-words list (from plan P7.1, unchanged) plus the feature names retired earlier:

module, widget, baseline, snapshot (for the dashboard), liability, assets, creditor, qualifying gross, weighted by balance, discretionary, liquid, runway, waterfall, engine, mathematically, psychological momentum, "high APR" or "high interest" as a label, sync, bank feed, balance feed, credentials, amortisation (in UI), net of, gross of, per annum.

Signed-out pages also never say "live", "syncs" or "monitors" about something the visitor's session does not do (E7).

### 6.3 Regulated words

These are banned by the advice boundary policy or the claims rule, not by taste. Do not look for a synonym: change the sentence to state a fact (section 7).

you should, we recommend, recommended, recommendation, best option (or choice, strategy, product, deal, move), optimal, optimise your pension (or ISA, savings, wealth, tax), maximise, actionable, highest-impact, top-tier, high-yield, low-yielding, guaranteed, risk-free, tax trap, escape, save tax, tax-efficient, tax saving, loophole, "move (or put, invest, switch) … into an ISA (or SIPP, pension, savings account)", FCA (owner-only wording), regulated, authorised, approved, certified, compliant, bank-grade.

## 7. Regulated wording

Flump shows people their own figures and lets them model changes. It does not give advice. The rules below restate the policy in copy terms. They are the working standard until a solicitor view (E29b) says otherwise. Nothing here loosens R1 to R8; cite the rule id in reviews.

### 7.1 The eight rules in one screen

| Rule | In copy terms                                                                                                                                                                                          |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| R1   | State the figure and its assumptions. Options side by side, same fields, same weight. The copy would read the same if the result were reversed.                                                        |
| R2   | No instruction or recommendation about money. Replace it with a fact about the person's figures, in the third person or passive.                                                                       |
| R3   | No quality word on a product type. No provider, fund or platform named as a suggestion. MoneyHelper is the one named service, in its one fixed line.                                                   |
| R4   | A computed segment only chooses which sections show. It never chooses a headline, a call to action or an order of things to do. Checklists are app housekeeping.                                       |
| R5   | A result may offer to "Model this". It never offers to "Apply". Pre-fill buttons say "Use". Saving is a separate step in the normal edit form.                                                         |
| R6   | Each surface carries its one notice from the canonical source. Tax outputs say "Unverified estimate".                                                                                                  |
| R7   | MCP descriptions, prompts and results obey R1 to R6 and are machine-checked.                                                                                                                           |
| R8   | Narrow allowed vocabulary: "optimise" only about the person's own app settings; "estimate" over "will"; "compare" over "choose"; "model" over "optimise"; "below £100,000" over "escape the tax trap". |

### 7.2 Turning advice into a fact

| Advice-shaped (never)                        | Fact (write this)                                                                                          | Rule |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ---- |
| "You should overpay your mortgage"           | "Overpaying £200 a month: estimate £14,300 less interest, paid off 4 years 2 months sooner"                | R2   |
| "Avalanche is mathematically optimal"        | "Highest rate first. Total interest: £1,940. Debt-free date: Mar 2030." (same fields for the other method) | R1   |
| "Maximise your ISA allowance before 5 April" | "£12,400 of this tax year's £20,000 ISA allowance is unused. The allowance resets on 6 April."             | R2   |
| "Move your cash to a high-yield account"     | "This account earns 1.2% AER, from the rate you entered."                                                  | R3   |
| "Escape the £100k tax trap"                  | "Adjusted net income is £104,000, in the £100,000 to £125,140 band where the Personal Allowance reduces."  | R8   |
| "Apply this contribution"                    | "Model this contribution"                                                                                  | R5   |
| "Next step: pay off your credit card first"  | "£3,200 of your debt is at 24.9% APR."                                                                     | R4   |
| "Save £1,200 in tax"                         | "Estimate: £1,200 less Income Tax in this illustration."                                                   | R8   |

The £100,000 threshold never leads a page: no banner, no headline, no heading of its own. It is one factual line, shown only when adjusted net income is between £90,000 and £125,140, and any button beside it says "Model this contribution" (R5, the E31 ruling, P7.5).

### 7.3 Wording nobody rewrites

These strings are fixed. A copy change to any of them needs the owner, and for the notices the solicitor view. The audit never proposes replacements for them.

| String                                                                                      | Where                                                 | Owner                |
| ------------------------------------------------------------------------------------------- | ----------------------------------------------------- | -------------------- |
| `PROJECTION_NOTICE_TEXT`                                                                    | `packages/ui/src/patterns/ProjectionNotice`           | Owner and solicitor  |
| `MCP_NOTICE`, `BETA_NOTICE`                                                                 | the canonical disclaimers source (E29-T7)             | Owner and solicitor  |
| "Unverified estimate" on tax outputs                                                        | tax surfaces, UI and MCP                              | Owner (E25 sign-off) |
| "Free, impartial debt help is available from MoneyHelper"                                   | `DebtHelpLink`: same line, same place, for every user | Owner (R3 exception) |
| Any sentence about FCA status, authorisation, regulation, security certification or pricing | marketing and legal pages                             | Owner (E7)           |
| Privacy policy, terms and cookie text                                                       | legal pages                                           | Owner and solicitor  |

### 7.4 Claims (E7)

- No claim of a feature, a certification or a regulatory status the product does not have. If a feature is behind an allowlist or not built, the copy does not describe it in the present tense.
- Every regulatory, security, pricing or feature claim needs evidence (a file and line, or a host) and an approver in the E7 claim register (`docs/audit/plans/E7-claims-design.md`).
- No "bank-level", "military-grade", "secure" as a bare adjective, "trusted by", "award-winning", user counts or testimonials without evidence.
- "Free" is written as "free during the beta", and only while the code has no payment path. Never a bare "free" in a heading or button.
- Signed-out pages never show sample figures as if they were the visitor's.
- **A page may only describe what the tool on that page does today.** A title, description, meta description, catalogue entry or callout names the inputs the tool has and the outputs it shows, nothing more. If the calculator has no pension input, the description does not mention pensions. Check the tool before writing about it.
- No verb that claims a connection or automation the visitor's session does not have: "syncs", "automatically monitors", "tracks live", "files your return".
- No scare words and no promise of money: "dangerous", "stealth", "hidden", "trap", "guaranteed", "Save £…" as a headline. State the cost or the difference as an estimate with its assumption.
- An example in a callout uses the figures the person entered, or is labelled "Example". It never shows a fixed figure as if it were theirs.

| Claim (from our pages)                                                               | Why it fails                                                          | Write                                                                                                                                     |
| ------------------------------------------------------------------------------------ | --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| "Flump syncs your live balance and monitors fixed-rate renewal dates automatically"  | No bank connection; figures are typed in                              | "Enter your balance and rate to see the estimate."                                                                                        |
| "Overdraft cost and payoff modeller … how regular payments change the time to clear" | The calculator shows yearly cost only                                 | "Overdraft cost calculator. See what an overdraft costs over a year at a given EAR."                                                      |
| "Student loan overpayment comparison, using salary growth assumptions"               | No overpay-or-invest comparison and no salary growth                  | "See yearly repayments on a Plan 1, 2, 4 or 5 student loan and whether the balance is repaid before it is written off, in this estimate." |
| "See how pension contributions change the taxable bands" (Section 24)                | There is no pension input                                             | "See how the mortgage interest restriction changes the tax on rental profit."                                                             |
| "Why overdrafts are dangerous", "stealth annual fee"                                 | Scare words (2.3) and a judgement of a product type (R3)              | "What an overdraft costs over a year"                                                                                                     |
| "Clearing a £1,200 overdraft delivers an immediate guaranteed 39.9% tax-free return" | "Guaranteed", a fixed example shown as theirs, and advice-shaped (R2) | "At {rate}% EAR, a {balance} overdraft costs an estimated {cost} a year."                                                                 |
| "Save £36,349"                                                                       | A promise of money as a headline (R8)                                 | "Estimate: £36,349 less interest over the term, if the rate stays at 4.5%."                                                               |

### 7.5 Benefits and debt help

Flump does not model benefits. If a surface mentions them, it signposts only, with no eligibility or amount estimate. Debt help is the one MoneyHelper line, unchanged for every user, never triggered or moved by balances or arrears (R3, R4).

## 8. The guard

`bun scripts/check-copy.ts` runs in `bun run check:laws` and in CI. It reads every user-facing string in `apps/web/app`, `apps/marketing/src`, `packages/ui/src`, `packages/mcp/src`, `packages/finance-engine/src` and the locale file, and applies the mechanical rules: exclamation marks, Title Case, block capitals, em dashes, ampersands, the never-use list (6.2), plain words (3.2), hype (2.2), minimisers and judgement words (2.3), vague errors (5.6), "click here" links (5.3), Latin abbreviations and en-US spelling (3.4).

- It is a ratchet. Existing hits sit in `scripts/copy-baseline.json`. A file may never gain hits.
- When you fix copy, the baseline goes stale and the check fails until you run `bun scripts/check-copy.ts --write-baseline` and commit the file.
- `bun scripts/check-copy.ts --list apps/web/app/features/debt` prints every hit under a path, with the guide section and what to write instead.
- `bun scripts/check-copy.ts --inventory <dir>` writes every user-facing string, one file per polish PR, with hits marked. The audit is built from it.
- A false positive is fixed by adding the phrase to `ALLOWED_PHRASES` in `scripts/lib/copy-rules.ts` with a reason, never by loosening a pattern.

The guard does not replace the advice guard (`apps/web/app/copy-guard.test.ts` with `advice-lexicon.ts` and `advice-allowlist.ts`), the claims tests (`claims.test.ts` in both apps) or the MCP policy tests. Those keep R1 to R8 and E7. The copy guard covers the words a reviewer should not have to catch by eye; tone, structure and truth still need a person.

## 9. Reviewer checklist

Read the screen aloud once, then check:

1. **Plain.** Would someone who has never read a finance page understand every word? No word from 6.2. No sentence over 25 words.
2. **First thing first.** Is the main figure or action in the first line? Is anything that qualifies it right beside it?
3. **Fact, not advice.** Does any sentence tell the person what to do with money, rank options, or grade a product? (R1 to R4; cite the id.)
4. **Estimate.** Is every computed future or tax figure called an estimate, with its assumption beside it? Is every what-if marked "Illustration"?
5. **No judgement.** Would this read as neutral to someone renting, in debt, or with little saved? No red, no "only", no comparison with others.
6. **Numbers.** Pounds whole, period in words, percentage says "of what", dates as "5 April 2027" or "Apr 2027".
7. **Case and marks.** Sentence case. No exclamation marks, em dashes, ampersands or block capitals.
8. **Buttons.** Verb and object, true for this page state. Result buttons say "Model", never "Apply".
9. **Errors and empty states.** Each says what happened or what will appear, and one next step. No "Something went wrong".
10. **Notices and claims.** One notice, from the constant, unedited. No claim without evidence in the E7 register. Fixed wording (7.3) untouched.
11. **Glossary.** One word per concept, the approved one.
12. **Guard.** `bun run check:laws` passes, and the baseline shrank or stayed the same.

## 10. What changed in other documents

| Document                                                                | Change                                                                                                                                                                       |
| ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docs/copy-style-guide.md`                                              | Replaced by this guide. The file stays as a short pointer so old links work.                                                                                                 |
| Old guide, section 5 (capitalisation)                                   | "Take-Home Pay" and "Student Loans" were capitalised. Now lower case (5.1). Statutory names keep capitals.                                                                   |
| Old guide, section 6 (punctuation)                                      | Spaced en dashes for asides were allowed. Now no dashes for asides (5.4, matching plan P7.3). Ranges in prose use "to"; the en dash is for chart labels and table cells.     |
| Old guide, section 6 (currency)                                         | "£45k" and "/mo" were allowed in any constrained component. Now only chart axes, chips and tight table cells; prose writes the figure and "a month" (4.1, matching plan P8). |
| Old guide, section 7 (replacements)                                     | Suggested "Pay off debt faster / Clear your debt" and "Avoid high revert rates". Both are imperatives about money (R2). Removed; see 7.2.                                    |
| Old guide, section 4 (feature names)                                    | "60-second baseline" and "Cashflow allocation" were canonical. "Baseline" is banned by plan P7.1; now "your figures" and "where your pay goes" (6.1).                        |
| Old guide, section 3 ("HMRC: Her Majesty's")                            | Corrected to His Majesty's Revenue and Customs; in copy always "HMRC".                                                                                                       |
| Old guide, section 8                                                    | Held an absolute path on one machine. Removed.                                                                                                                               |
| `docs/design/e16-polish/PLAN.md` P7                                     | Unchanged in substance. A pointer says this guide now holds the list (6.2) and adds to it.                                                                                   |
| `docs/compliance/advice-boundary-policy.md`                             | No rule changed. Two cross-references ("copy guide 7b", `docs/copy-style-guide.md`) now point here.                                                                          |
| `docs/compliance/consumer-duty-principles.md`                           | The "Plain English" row cites this guide and the guard.                                                                                                                      |
| `AGENTS.md`                                                             | New section 10 (copy law) pointing here; `check:laws` description includes the copy guard.                                                                                   |
| `docs/agents/component-guidelines.md`, `.agents/rules/project_rules.md` | Pointers updated to this guide.                                                                                                                                              |

Two conflicts are left for the owner rather than settled here: see "Needs the owner" in COPY-AUDIT.md.
