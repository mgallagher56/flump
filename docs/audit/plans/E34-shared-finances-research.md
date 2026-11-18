# E34. Shared finances for couples: research and options

Decisions: accepted on 17 November 2026

> **Status: plan approved. The owner accepted decisions CD1 to CD10 as recommended on 2026-11-17.** Slices 1 and 2 are merged (#748, #757). Written 2026-11-15 against `origin/main` at `8e08f0c8`. Not legal advice. Facts marked **[U]** were not confirmed in a primary source today.

**Summary.** The owner wants couples to track finances together across the site, like co-op mode in a game. The safest shape is the one a co-op game uses: each player keeps their own inventory and chooses what goes in the shared stash. Each person keeps their own login and their own data. Nothing is shared until its owner shares it, either person can stop sharing or leave at once without the other's agreement, and nobody can lock the other out or delete their data. Tax is always worked out per person, because UK tax, ISAs and pensions are individual. The recommended first slice needs no second login at all: mark an account as joint with a share, so one person's picture stops counting the whole of a joint mortgage. The household, the invitation and the "Me / Household" switch follow in later slices. The largest risk is that any sharing feature can be used to watch or control a partner, so the safety rules in section 3 are requirements, not options.

## 1. How others do it

| Product | How sharing works | Lesson |
| --- | --- | --- |
| Monarch (US) | A household with a separate login per person. Every member sees every connected account and transaction; accounts cannot be hidden. Accounts can be labelled yours, mine or ours for filtered views. A person with an existing account cannot be invited without deleting it (help centre, read 2026-11-15) | Labels are useful. Full mutual visibility and "delete your account to join" are the two things not to copy |
| YNAB Together | One subscription shared with up to six people, separate logins. Each person keeps private plans and chooses which plans to share (ynab.com, read 2026-11-15) | Private by default, share by choice |
| Monzo joint account (UK) | Each person needs their own personal account first, then one invites the other to a joint account (monzo.com help) | Own identity first, the shared thing second |
| Honeydue (US) | Built for couples who keep money mostly separate and share bills (secondary sources only, **[U]**) | Many couples are "mostly separate"; do not assume pooled money |

Only one UK product was checked today, and it is a bank, so this table shows patterns, not the state of the UK market (**[U]**).

## 2. Tax and legal facts the engine must respect

| Fact | Source | Effect on Flump |
| --- | --- | --- |
| Income tax is charged per person. There is no joint assessment | General UK tax law (**[U]** not re-read) | Never compute tax on a couple's combined income. Compute per person, then add |
| Marriage Allowance: £1,260 of personal allowance can be transferred between spouses or civil partners | Secondary sources agree; GOV.UK not re-read (**[U]**) | `tax-rules.ts` already says the engine does not model it. One neutral line in "Assumptions and UK rules", the same for every user (R4); on the list for the solicitor (E29b) |
| "You cannot hold an ISA with someone else." £20,000 each in 2026/27 | GOV.UK, read 2026-11-15 | An ISA is never joint. Allowance figures are per person |
| Pensions and the State Pension are individual | General law (**[U]**) | Pension accounts are never joint. Retirement (E33) adds two people's estimates |
| High Income Child Benefit Charge: 1% of the benefit per £200 of adjusted net income above £60,000, all of it at £80,000, charged on the partner with the higher income, whoever claims | GOV.UK and LITRG | `uk-hicbc.ts` needs both incomes to say whose charge it is. It applies to partners living together, married or not (**[U]**) |
| Joint mortgage: each borrower is liable for the whole debt | General law (**[U]**) | A share is how a person chooses to count it, not a limit on what they owe. The copy says so once |
| Scottish income tax follows where each person lives | General law (**[U]**) | Region stays on each person's profile |
| Interest on a joint savings account is normally split equally for tax | HMRC practice (**[U]**) | Personal savings allowance per person; default split 50%, editable |
| Transfers between spouses and civil partners have tax treatment that unmarried partners do not get | General law (**[U]**) | Never assume marriage. Ask only where a rule needs it |

## 3. Safety, privacy and UK GDPR

**Economic abuse is in scope.** The Domestic Abuse Act 2021, section 1(4), defines it as behaviour with a substantial adverse effect on a person's ability to "acquire, use or maintain money or other property" or to "obtain goods or services". The FCA's vulnerable customers guidance (FG21/1, February 2021) treats domestic abuse including economic control as a driver of vulnerability. The UK Finance Financial Abuse Code (third version, 30 April 2025) and Surviving Economic Abuse's good practice guide for financial services (October 2025; the PDF could not be read in full today, **[U]** on detail) both ask firms to design abuse out of products. Flump is not a signatory and holds no money, but a tool that shows one partner the other's finances is exactly the kind of system these documents are about.

**Design requirements.** Each one answers a way the feature could be used to watch, control or trap someone.

| # | Requirement | Guards against |
| --- | --- | --- |
| G1 | Each person has their own login. Flump never offers a shared login or a way to set up an account for someone else | One person holding all access |
| G2 | Nothing is shared by default. Sharing is per item and only the item's owner can share it | Surveillance by default |
| G3 | The other person cannot see that unshared items exist: no counts, no "hidden" placeholders, no totals that reveal them | Pressure to "show everything" |
| G4 | No feed of the other person's activity: no sign-in times, no edit history by person, no alerts about what they did | Monitoring |
| G5 | Either person can stop sharing an item or leave the household at once, alone, with no approval step. Flump sends the other person no message about it | Being held in, and retaliation prompted by an alert |
| G6 | Members are equal. No owner or administrator role; nobody can remove the other's data, change their settings or end their account | Lock-out |
| G7 | Leaving never costs a person their own data, and each keeps a copy of joint items with their history | Losing your records when you leave |
| G8 | An invitation carries no figures and shows the invited person exactly what joining shares, which at first is nothing | Coerced or uninformed joining |
| G9 | A person's shared items never reach the other person's AI connection unless the owner switches that on for the household | Disclosure to a third party through a partner |
| G10 | One neutral line on the sharing screen, the same for everyone, naming one service for help with economic abuse (proposed: Surviving Economic Abuse), with an external-link cue | Never triggered by data (R4). Policy R3 allows one named service on the debt page only, so this needs decision CD10 |

These reduce risk; they do not remove it. A person can still be made to share, or to hand over a phone. The plan should be shown to a specialist charity before the invitation slice ships (decision CD7).

**UK GDPR.** Each person is a data subject in their own right, and Flump is the controller for both. Points to settle in a new DPIA (alongside `docs/legal/dpia-mcp.md`) and with the solicitor:

- A joint item is personal data of both people. Each has access and portability rights over it; erasure by one cannot remove the other's copy. (Articles 15, 17 and 20, **[U]** not re-read.)
- Today a single user may already enter a partner's details, for example a joint mortgage. The household makes that visible to the partner, which is better, but the data map (`docs/legal/data-map.md`) must record it.
- Export (`account-export.service.ts`) includes a person's own items and their copy of joint items, never the other person's shared items. Deletion (`account-deletion.service.ts`) removes the person, their items and their membership, and passes joint items to the remaining holder.

## 4. Data model options

Today every user-owned table has one `user_id` (`apps/backend/src/entities`), and WorkOS identifies one person.

| Option | Shape | For | Against |
| --- | --- | --- | --- |
| A. Private by default, share per item | `households` and `household_members`. Every row keeps exactly one owning `user_id`; a household never owns data. Items gain `ownership` (sole or joint), `share_pct` and `shared_with_household` (default false). A joint item gives the other member edit rights while both are members | Additive migration; clean export, deletion and separation; meets G1 to G9 | Every query gains a visibility rule, and a mistake leaks one user's data to another |
| B. Full mutual visibility (Monarch) | Members see everything | Simplest to build and explain | Fails G2, G3 and G5. Not recommended in any form |
| C. Summary only | No shared items. Each person opts single totals into a read-only household summary | Smallest attack surface; no shared editing | Not "together": no shared budget or check-in |

**Recommendation: A, reached in steps, with C's read-only summary as the first shared screen.**

**Separation or leaving.** Either person leaves from Settings. Their shared items vanish from the other's view; each keeps their own copy of joint items, which from then on are edited separately. A household with one member closes. Nothing is emailed. The same path covers account deletion.

## 5. Page by page: yours, mine, ours

A "Me / Household" switch appears only for household members. **Me** is my items plus my share of joint items. **Household** is joint items in full plus whatever each person has shared. There is no view of the other person alone.

| Page or feature | Me | Household | Notes |
| --- | --- | --- | --- |
| Dashboard | As today, with my share of joint items | Combined net worth and the shared widgets | One hero figure per view. Unshared items never affect a Household total the other can see |
| Accounts | My accounts; joint ones marked "Joint, 50%" | Joint and shared accounts, each with whose it is | Editing: owner only, or either person for joint items |
| History | My monthly series | Series of joint and shared accounts | Carry-forward marked as today |
| Monthly check-in | My accounts and joint ones | Not a separate flow | A joint balance confirmed by one person is confirmed for both. No record of who is "behind" |
| Budget | My entries and my share of joint entries | Joint entries in full plus shared ones | The setup wizard asks whether an entry is joint |
| Breathing room | My savings against my essentials | Shared savings against joint and shared essentials | Two figures can differ; each view says what it counts |
| Debt and borrowing | My debts and my share of joint ones | Joint and shared debts | One line: each borrower is liable for the whole of a joint debt. Payoff what-ifs stay in a scenario zone |
| Mortgage | Joint mortgage at my share | The whole mortgage | Property value follows the same share |
| Pension | Mine only | Each person's shared pensions side by side, never merged | Pensions are never joint |
| Savings | Mine and my share of joint savings | Joint and shared savings | ISA allowance shown per person |
| Take-home | Mine only | Not offered | Tax is individual; a combined take-home figure is the two added, shown on the Dashboard only |
| Self assessment | Mine only | Not offered | Rental income from jointly owned property already has a share field (`picture/input.ts`) |
| Net worth choices | My choices | The household has its own two choices, set by either person | Property and mortgage still count together or not at all |
| Retirement (E33) | My estimate and target | Two estimates added, against a household target the couple sets | State Pension per person |
| Settings | Profile, security, data, and "What I share" | Household name, members, leave | No administrator |
| MCP tokens | A token reads my data and joint items | A `household` scope the token's owner asks for, limited to items whose owner allowed it (G9) | Update the MCP DPIA |
| Public tool pages | No change | No change | No sign-in, no household |
| Mobile (E12) | Same rules through the same API | The switch in the same place | A notification never carries the other person's activity or any figure |

## 6. Sign-in and invitation with WorkOS

Flump uses WorkOS AuthKit with a JWT verifier (`apps/backend/src/auth/workos-jwt.verifier.ts`) and no WorkOS organisations.

| Option | How | View |
| --- | --- | --- |
| I1. WorkOS organisations and its Invitation API | A household is a WorkOS organisation; WorkOS emails an invitation to an address and creates a membership on acceptance (WorkOS docs, read 2026-11-15) | Puts household structure with a third party, brings roles Flump does not want (G6), and adds organisation context to every session |
| I2. Flump's own invitation | Flump stores a single-use code that expires in seven days. The inviter passes the link on themselves. The invited person signs in with their own login, sees what joining shares, and accepts | **Recommended.** No email provider is needed (still undecided, E30 PR3), no figures leave Flump, and WorkOS stays an identity provider only |

During the closed beta the invited person must also be on the allowlist (`apps/backend/src/auth/beta-access.ts`).

## 7. Migration from single-user data

- Additive only. New tables; new columns default to `ownership = sole`, `share_pct = 100`, `shared_with_household = false`. No existing figure changes, the rule used for net worth choices.
- The engine's picture stays per person. A household picture combines two person pictures and counts each joint item once. Tax selectors are never called on combined income.
- Authorisation moves to one function, "can this person read or edit this row", with table-level tests, before any shared screen ships. The backend law tests (`scripts/check-backend-laws.ts`) gain a rule that no query filters by household alone.

## 8. Slices

| Slice | Contents | Depends on |
| --- | --- | --- |
| C0 | Owner decisions; DPIA; questions for the solicitor | None |
| C1 | **Joint marker and share on accounts, budget entries and housing, for one user.** Net worth, debt, mortgage and Breathing room count my share. No second login | C0 |
| C2 | Engine: combine two person pictures; two-person HICBC; per-person tax test vectors | C1 |
| C3 | Household, invitation (I2), membership, leave, "What I share", the help line. The only shared screen is a read-only summary of joint items | C2; safety review |
| C4 | Per-item sharing and the Me / Household switch on Dashboard, Accounts and History | C3 |
| C5 | Shared budget, Breathing room and check-in for joint items | C4 |
| C6 | Retirement for two (E33 S9); the Child Benefit charge for two incomes | C4; E33 |
| C7 | MCP `household` scope; mobile parity | C4; E17; E12 |

**First slice: C1.** It is useful alone: a person with a joint mortgage sees figures that match their life, with no invitation and no new way to be watched. It also lays the ownership field every later slice needs.

## 9. Strongest argument against

Any sharing feature can be coerced, and Flump cannot tell a willing share from a demanded one. It is also the most invasive change the data model has had: one wrong visibility rule shows one user's finances to another, in a public repository, before launch, with one developer. There is no evidence yet that beta users want it. C1 gives most couples correct figures without any of that risk, and stopping there is a defensible outcome.

## 10. Decisions for the owner

**Accepted 2026-11-17.** The owner accepted the recommendation in every row, CD1 to CD10. For CD10 the help line wording still needs owner approval before it is shown.

| # | Decision | Options | Recommendation |
| --- | --- | --- | --- |
| CD1 | Data model | A private by default; B full visibility; C summary only | **A**, starting with C's summary |
| CD2 | First slice | Joint marker for one user; invitation and shared net worth; shared check-in | **Joint marker for one user** |
| CD3 | Invitation | I1 WorkOS organisations; I2 Flump's own link | **I2** |
| CD4 | Roles | Equal members; an owner who invites and removes | **Equal members** |
| CD5 | Size | Two people; up to six | **Two** for now; the schema allows more |
| CD6 | Leaving | Instant and unannounced; with a notice to the other person | **Instant and unannounced** |
| CD7 | Safety review | Ask a specialist charity to review before C3; rely on published guidance | **Ask for a review** |
| CD8 | AI connections | Shared items never reach a partner's token; allowed when the owner opts in | **Opt in, off by default** |
| CD9 | When | Slice C1 now and C3 onward after launch and the solicitor's view; or all of it after launch | **C1 now, the rest after launch** |
| CD10 | Help line on the sharing screen (G10) | Amend the policy's R3 exception to allow one named service there, wording owner-approved; or no named service | **Amend the exception** |

## Sources (all read 2026-11-15)

- Domestic Abuse Act 2021, section 1: <https://www.legislation.gov.uk/ukpga/2021/17/section/1>.
- FCA FG21/1, guidance on the fair treatment of vulnerable customers, February 2021: <https://www.fca.org.uk/publications/finalised-guidance/guidance-firms-fair-treatment-vulnerable-customers> (cited through secondary sources, **[U]**).
- UK Finance, Financial Abuse Code, third version, 30 April 2025: <https://www.ukfinance.org.uk/policy-and-guidance/reports-and-publications/financial-abuse-code>.
- Surviving Economic Abuse, good practice guide for financial services, October 2025: <https://survivingeconomicabuse.org/wp-content/uploads/2025/10/Good-practice-guide_Surviving_Economic_Abuse.pdf> (not readable in full, **[U]**).
- GOV.UK, Individual Savings Accounts: <https://www.gov.uk/individual-savings-accounts>.
- GOV.UK, High Income Child Benefit Charge: <https://www.gov.uk/child-benefit-tax-charge>; LITRG: <https://www.litrg.org.uk/tax-nic/income-tax/high-income-child-benefit-charge>.
- Monarch help centre, "Monarch for Couples and Households": <https://help.monarch.com/hc/en-us/articles/20926382202004-Monarch-for-Couples>; shared views: <https://www.monarch.com/blog/shared-views>.
- YNAB Together: <https://www.ynab.com/ynab-together>.
- Monzo joint accounts: <https://monzo.com/help/joint-accounts/set-up-joint-account>.
- WorkOS invitations: <https://workos.com/docs/authkit/invitations>.
