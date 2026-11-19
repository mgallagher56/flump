# System audit, November 2026: summary for the owner

Audited: `origin/main` at `f5631d4f0`, 19 November 2026. Asked for by the owner on the same day.

## The state of the system in plain words

Your feeling is right, and the cause is narrower than it may seem.

The calculations are in good shape. One engine works out the headline figures, and most pages read them from one place. Net worth, total debts, the debt-free date and the check-in's calculated balance each come out the same wherever a page shows them.

The trouble is in the facts underneath. The same real-world fact is often stored in two or three places, and each page reads its own copy. A mortgage payment lives on the mortgage account, in the housing details and in a budget line. A salary lives on the profile and again as the budget's income line. Nothing keeps the copies in step, so two pages can disagree after one edit.

We wrote down 72 links a user would expect to hold, such as "a mortgage added in Accounts shows on the Mortgage page". The verdicts:

| Verdict | Links |
|---|---|
| Holds | 19 |
| Holds, with a manual step or a delay | 8 |
| Duplicated: two stores that can disagree | 14 |
| Broken | 31 |

Sixteen checks were run in a real browser on a local copy, covering 17 of the links. Every one matched what the code reading predicted.

Your two examples:

- **A mortgage added in Accounts and the Mortgage page.** A residential mortgage does reach the Mortgage page, but only its balance. Rate, term, payment and fix end date must be typed on the Mortgage page. A buy-to-let mortgage does not reach it at all: that tab reads seven old profile fields, not the account.
- **A buy-to-let mortgage and Self Assessment.** The account shows in the list of income sources by name only. Its balance, rate and share feed no tax figure. Rent, interest and the ownership share must all be typed again.

## The structural problems behind the symptoms

1. **The profile holds copies of facts that live elsewhere.** It has grown to about 60 fields. Buy-to-let value, balance, rate and rent, a "has a mortgage" flag, housing cost, a property share and a student loan plan all exist a second time as accounts, budget lines or tax records.
2. **Budget lines are loose copies.** The income line is copied from take-home once. The housing line, savings lines and debt lines repeat figures saved on accounts. A sync was built and then removed on 17 November, which left the copies with nothing joining them.
3. **A page shows your share and then treats it as the whole.** For a joint account, some pages put the share into an edit form and save it as the full balance. One confirmed case changes saved data: editing only the rate of a joint savings account on the Savings page halves its stored balance.
4. **More than one piece of code assembles the same figure.** The pages use the engine's picture. The AI tools, the AI context pack and parts of the Dashboard do their own sums. So the AI can state a different left over, a different Breathing room and a different tax estimate from the page.
5. **Defaults stand in for answers.** Pension rates default to 5% and 3%, so an unanswered question looks answered. With no salary saved, the AI works from an invented £45,000. The AI context pack always uses the 2025/26 tax year.
6. **Today's balance and the monthly history are two stores with gaps.** A new account gets no history point. Correcting last month does not correct today. Renaming an account hides the check-in reminder for the month.
7. **Kinds and links are missing.** A property is a home or a rental only by its name. A mortgage is not tied to its property. A tax record is not tied to the account it describes. Self Assessment takes no account of a Scottish tax region.
8. **The browser keeps its own copies.** The profile is held in memory and in loader data at once. A reset of financial data leaves browser storage behind.
9. **Dead weight.** Some profile fields, two tables and four endpoints are stored or exposed and used by nothing. Every page loads all accounts and their full history, even pages that show neither.
10. **Nothing stops the next duplicate.** The only "one engine" check covers tax rates. No check notices a second store or a second formula.

## Needs fixing now

These show a wrong number or change saved data today, and need no redesign. They are slice 2 of the plan.

- Editing a joint savings account on the Savings page cuts its saved balance to the share (SD-1, confirmed in a browser).
- The Self Assessment page and the Dashboard show different tax for a self-employed person with a saved salary: £15,132 against £6,872 in our check (SA-1).
- The Retirement page never loads budget lines, so "From budget lines" is always empty (PP-6).
- The AI works from an invented £45,000 salary when none is saved, and from last tax year (AI-1, AI-3).
- A second property with an ordinary name is counted as the home: loan to value fell from 60% to 36.5% in our check (HM-3).
- Renaming an account hides the monthly check-in reminder (CH-3).

## What is sound and should be left alone

- The engine and its picture: one builder, one row mapper, figures that say "unknown" when a fact is missing and never show a made-up zero.
- The tax calculator itself, the mortgage and debt payoff schedules, the savings interest estimate and the retirement projection.
- Net worth: one formula, the same on every page and in the AI snapshot, and it honours your net worth choices.
- The check-in: the server recomputes a calculated balance and refuses one that differs.
- The data export, erasure and reset registry: one list covers every table and every profile field.
- The rule that debts are stored negative, applied on every write.
- Database basics: every table has the indexes it needs, and no main page runs a repeated query per row. A page costs 5 to 10 small queries.

## The order to fix things in

Nine slices, each one pull request, none stacked. Details are in [PLAN.md](./PLAN.md).

1. **The value map and its checks.** Tooling only. Makes the map below a rule that CI enforces.
2. **Wrong numbers today.** The list above and about ten more, with no change to stored data. Runs alongside slice 1.
3. **One assembler.** The AI tools, the context pack and the Dashboard all read the engine's picture.
4. **Accounts as the home for homes and loans.** Property kind, a link from mortgage to property, buy to let on accounts, one account form.
5. **Budget lines linked to saved facts.** Income, housing, savings and debt lines follow the fact they repeat.
6. **Pay and pension answers.** "Not set" is stored as not set. One student loan plan.
7. **Self Assessment joined up.** Records linked to accounts, one share per property, buy-to-let interest offered as a calculated figure.
8. **Browser state.** One copy of saved data in the page.
9. **Database housekeeping.** Drop what is dead, and stop loading history where it is not shown.

Thirteen decisions are yours. They are numbered at the end of [PLAN.md](./PLAN.md), each with options and a recommendation. Eight of them change where or how user data is stored.

## The value map: where is this value used

The audit leaves behind a map of every stored fact and every shared figure: [docs/system/value-map.yaml](../../system/value-map.yaml). To answer "where is my salary stored, entered and used", open [the view by fact](../../system/generated/by-fact.md) and find Salary. To see what one page reads and writes, open [the view by page](../../system/generated/by-page.md). Diagrams are in [the connections view](../../system/generated/connections.md).

The views are built from the one data file by a script, so nobody edits them by hand. Slice 1 adds a CI check that fails when a stored value has no entry, or when an entry points at a file that has gone. A pull request that adds or moves a stored value updates the map in the same pull request.

## What was not verified

- AI tool output was read in code only, apart from one context pack preview.
- Onboarding in take-home mode, the staged import, reset and the phone layout were not run in a browser.
- Query counts come from one seeded persona on a small local database. They show shape, not speed under load.
- No tests were run. This audit changes no product code and no database.
