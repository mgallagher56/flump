# E35. Making Flump feel warmer: engagement options

> **Status: options for owner approval. No code.** Written 2026-11-15 against `origin/main` at `8e08f0c8`. Facts marked **[U]** were not confirmed in a primary source today.

**Summary.** The owner wants finance to feel less cold, dull and bland, and suggested gamifying things across the site. The evidence says game mechanics change behaviour, and that is the problem as well as the promise: the FCA found that points, leaderboards and notifications in trading apps changed how people traded and how much risk they took, and research on streaks shows a broken one makes people give up. So this document draws one line and offers three sets of options on the safe side of it. Flump may mark something the user did (a check-in finished, a setup step done, a goal they set themselves reached). Flump never scores, ranks, compares or judges their money, and never marks that something has not happened. The three sets run from light (small moments of delight) through personal milestones to a monthly rhythm with shared goals for couples. The recommended first step is the lightest set, with one switch to turn it off and a plain way to tell whether it helps.

## 1. What the evidence says

| Source | Finding | What it means for Flump |
| --- | --- | --- |
| FCA, "Gaming trading: how trading apps could be engaging consumers for the worse", November 2022 | Survey of over 3,000 users of four trading apps. Features such as celebratory messages and falling confetti after a trade were associated with riskier investing and behaviours linked to problem gambling. The FCA said the link was an association, not proof of cause, and that game-like design can also engage people well | Never celebrate a financial decision or outcome. A moment follows an action in Flump, not a move of money |
| FCA research note, "Digital engagement practices: a trading apps experiment", 20 June 2024 | Experiment with over 9,000 people testing flashing prices, push notifications, a leaderboard, and points with a prize draw. These changed how often people traded and the risk they took, with some evidence of larger effects for people with lower financial literacy, women and people aged 18 to 34 | No leaderboards, points or prizes. Notifications are the riskiest tool and need their own decision |
| FCA Consumer Duty guidance FG22/5, July 2022 | Firms should not exploit behavioural biases and should help customers make informed decisions | Flump is not authorised, so the Duty does not bind it, but `docs/compliance/consumer-duty-principles.md` adopts the principles. Loss-framed or pressuring mechanics fail them |
| Silverman and Barasch, Journal of Consumer Research, 2023 | Seven studies. A logged streak becomes a goal in itself; a broken streak lowers later engagement, most when the person blames themselves, less when it can be repaired | A streak punishes the month someone could not face their money. E30 rule D11 (no streaks) is right |
| Etkin, Journal of Consumer Research, 2016 | Six experiments. Measuring an enjoyable activity raised output but could make it feel like work and reduce enjoyment and later engagement; the effect faded when people had a reason to measure | Counting how often someone uses Flump adds nothing. Show their finances, not their attendance |
| Patel and others, Annals of Internal Medicine, 2016 | 281 people. Money framed as a loss raised days meeting a step goal (45% against 30% with no incentive); the effect did not last once incentives stopped | Loss framing works and does not last. It is also the kind of pressure the tone rule forbids |
| Koivisto and Hamari, review of 819 gamification studies, 2019 | Results lean positive but many are mixed; points, badges and leaderboards are the most common mechanics | No strong evidence that badges help. Nothing found today tests them in a budgeting or net worth app (**[U]**) |

## 2. The line

| Flump may | Flump never |
| --- | --- |
| Mark an action the user just took in Flump: a check-in finished, a setup step done, the first account added | Score, grade or rate anyone's finances |
| State, once and in plain facts, that a goal the user set was reached | Compare a user with other users, averages or national figures |
| Use the same moment whatever the figures show | Celebrate a figure going up, or a financial decision such as an overpayment (R1, R2) |
| Use warmth: illustration, motion, friendly plain words | Count attendance: streaks, "3 months in a row", points, levels, badge collections |
| Stay silent when something has not happened | Mark an absence: "missed", "overdue", "behind", a passed date with a balance left, a broken chain |
| Let the user switch all of it off in one place | Use loss framing, countdowns, prize draws or surprise rewards |

Two existing rules already sit here: E30 D11 ("No streaks, no badges, no 'overdue' language") and UX guideline T2 (no design element judges, no comparison with others as a headline). Nothing in this document asks to loosen either.

## 3. Three option sets

The approved micro-animations and illustrations in `docs/design/e17-options/` were **not on main** when this was written, so Set 1 names moments, not specific animations. It should be matched to that folder once it lands.

### Set 1. Moments (light)

Small acknowledgements at the point an action finishes. No new data, no new screens.

| Moment | On-screen wording | Motion |
| --- | --- | --- |
| Check-in finished | "November is checked in." followed by the existing neutral line, "Net worth changed by +£1,150 since October 2026." | One short animation on the summary card, the same whichever way the figure moved |
| Setup step finished | "Budget added. 3 of 5 setup steps done." | The checklist row ticks |
| Setup complete | "Setup is finished. Everything on your dashboard now uses your own figures." | One illustration, shown once |
| First account added | "Your first account is in." | A brief settle on the new row |
| Empty states | Friendly illustration and one plain sentence | None |

- **Data:** none new. `snapshot_checkins` and the setup checklist state already exist (`features/dashboard/components/SetupChecklist`, `features/snapshot/components/CheckInSummary`).
- **Turning it off:** one switch in Settings, "Animations and celebrations". The device's reduced-motion setting is always honoured and swaps motion for a still.
- **Risks:** it may feel slight. A moment beside a figure that fell must not read as cheering the fall, which is why the wording names the action and the motion never changes with the number.

### Set 2. Personal milestones (middle)

The user sets goals of their own; Flump records the date each was reached and keeps a list of things they have done.

| Feature | On-screen wording |
| --- | --- |
| A goal the user sets on an account | "Goal: £0 on this card by March 2027." |
| Goal reached, shown once, dismissible | "Balance £0. You set this goal for March 2027." |
| Deposit or savings goal reached (builds on `deposit-timeline.ts`) | "£30,000 saved. You set this goal in January 2026." |
| Milestones list in Settings | Dated facts, newest first: "14 November 2026: mortgage added." |

- **Data:** a new goals table (target figure, optional date, account), and a dated record of reached goals. Both in export and deletion.
- **Turning it off:** goals are optional. A reached goal is one plain dated line, with no animation or illustration, so there is nothing to switch off.
- **Risks:** a goal not reached is judged by silence, however carefully Flump says nothing. A passed date gets no message, no colour and no "missed". The milestones list gives dated facts and no totals. A goal is the user's own figure, so Flump never suggests one (R2, R4) and never offers to act on one (R5).

### Set 3. Monthly rhythm and shared goals (fuller)

A reason to enjoy the monthly visit, and something for couples to do together.

| Feature | On-screen wording |
| --- | --- |
| "Month in brief" after a check-in: three facts and an animated chart | "November in brief. Net worth changed by +£1,150. Debts changed by -£320. You added one account." |
| Opt-in reminder on the user's chosen day (email in E30 PR3, push on mobile) | "Your Flump check-in for November is ready." No figures |
| Shared goal for a household (needs E34) | "Holiday fund: £1,200 of £2,000. A goal you both set." |
| Shared goal reached | "Holiday fund: £2,000 reached. You set this goal together in June." |
| Seasonal illustration on the dashboard | No words |

- **Data:** Set 2's goals; household membership (E34); a reminder day and consent; a push token on mobile.
- **Turning it off:** each feature has its own switch; reminders are off until the user opts in and can be stopped from the message itself.
- **Risks:** notifications are the mechanic with the strongest evidence of changing behaviour, so they stay figure-free and opt-in. A shared goal shows the total only and never who paid in what, or it becomes a way to watch a partner (E34 rule G4). "Month in brief" uses the same words whichever way a figure moved (E30 D6).

## 4. Mobile and notifications

- The mobile plan (`docs/audit/plans/E12-mobile-rebuild-plan.md`, decision O3) has push notifications off at launch by default, with one opt-in check-in reminder as option B. Nothing here changes that default.
- Set 1 carries over as a short haptic and the same animation, from the shared tokens. The reduced-motion and switch rules are the same on every platform (`docs/ux/CROSS-PLATFORM.md`).
- No number on the app icon. A red count is "overdue" language in another form.
- A notification never contains a figure, a goal's name or anything about another household member, because it can be read on a lock screen.
- Email reminders still wait for the provider choice and the PECR opinion (E30 PR3).

## 5. Recommended first step, and how to tell if it helps

**Build Set 1 only, after `docs/design/e17-options/` reaches main.** One PR: the four completion moments, the empty-state illustrations and the Settings switch. E30 D11 stands unchanged, with one clarifying line added: a one-off acknowledgement of a finished action is not a badge.

The beta is too small for a controlled test, so measure plainly, with records Flump already keeps and no new tracking:

| Measure | Source | Reading |
| --- | --- | --- |
| Share of people who checked in during their second and third month, before and after the change | `snapshot_checkins` | The direction only; small numbers prove little |
| How many switch it off | The new setting | More than a quarter means it is unwelcome: remove it |
| What people say | The existing feedback feature and five beta conversations | "Did this feel warmer, or in the way?" |

Flump never measures success by whether users' money changed. That would make the feature a nudge.

Move to Set 2 only if Set 1 is kept on by most people and nobody reports feeling judged. Set 3's shared goals wait for E34.

## 6. Strongest argument against

The feeling the owner describes may not be a mechanics problem. Finance apps feel cold because of jargon, judgement and dense screens, and Flump is already fixing those with plain copy, the no-judging rule and the E17 illustration and motion work. Evidence that game mechanics help in a budgeting app was not found, the evidence of harm in neighbouring products is strong, and any celebration implies that its absence is failure. On this view the right amount of gamification is none beyond good design, and Set 1 is simply good design under another name.

## 7. Decisions for the owner

| # | Decision | Options | Recommendation |
| --- | --- | --- | --- |
| G1 | First step | Set 1; Set 2; Set 3; nothing | **Set 1** |
| G2 | E30 D11, no streaks or badges | Keep; keep with a clarifying line; relax | **Keep with the clarifying line** |
| G3 | The off switch | On by default with one switch; off until switched on | **On by default**, reduced motion always honoured |
| G4 | Marking a reached goal (Set 2) | Never; a plain factual line shown once; a fuller celebration | **A plain factual line**, decided after Set 1 is measured |
| G5 | Counts of use ("11 check-ins this year") | Allow; never | **Never**; a count shows the gaps |
| G6 | Push notifications (E12 O3) | None at launch; one opt-in reminder; wider | **None at launch**, as on record |
| G7 | The word | "Gamification"; "moments" and "milestones" | **Avoid "gamification"** in the product and in plans; it invites the mechanics this document rules out |

## Sources (all read 2026-11-15)

- FCA, "Gaming trading: how trading apps could be engaging consumers for the worse", November 2022: <https://www.fca.org.uk/publications/research-articles/gaming-trading-how-trading-apps-could-be-engaging-consumers-worse>.
- FCA research note, "Digital engagement practices: a trading apps experiment", 20 June 2024: <https://www.fca.org.uk/publications/research-notes/research-note-digital-engagement-practices-trading-apps-experiment>.
- FCA FG22/5, final non-Handbook guidance on the Consumer Duty, July 2022: <https://www.fca.org.uk/publication/finalised-guidance/fg22-5.pdf> (through search extracts).
- Silverman and Barasch, "On or Off Track: How (Broken) Streaks Affect Consumer Decisions", Journal of Consumer Research 49(6), 2023: <https://www.colorado.edu/business/faculty-research/2023/04/19/or-track-how-broken-streaks-affect-consumer-decisions>.
- Etkin, "The Hidden Cost of Personal Quantification", Journal of Consumer Research 42(6), 2016, doi 10.1093/jcr/ucv095 (through the author's university summary).
- Patel and others, "Framing Financial Incentives to Increase Physical Activity Among Overweight and Obese Adults", Annals of Internal Medicine, 2016: <https://chibe.upenn.edu/publications/framing-financial-incentives-to-increase-physical-activity-among-overweight-and-obese-adults-a-randomized-controlled-trial/>.
- Koivisto and Hamari, "The rise of motivational information systems: a review of gamification research", 2019: <https://research.utu.fi/converis/portal/detail/Publication/39369087>.
