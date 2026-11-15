# E35. Encouragement and financial wellbeing: options

> **Status: options for owner approval. No code.** Written 2026-11-15 against `origin/main`, revised the same day after the owner clarified the aim. Facts marked **[U]** were not confirmed in a primary source today.

**Summary.** The owner used "gamification" as a catch-all for making people feel better about their money in a way that improves their financial health. The aim is a net positive for the person; app engagement is never a goal and never a measure of success. The owner also restated the rule that outranks everything here: never shame anyone about their finances. So this document starts with that rule as five pass or fail tests, applies them to every option, and offers three sets of options that pass: warm confirmations of things the user did, goals that are the user's own at any size, and a calmer month with shared goals for couples. A further section sets out how Flump stays a healthy and inclusive place beyond these features, with exact wording proposed for the copy guide and the UX guidelines. The recommended first step is the lightest set, judged by whether people say they feel more in control and whether anyone feels worse.

## 1. The aim and the hard constraint

**Aim (test W).** Every idea must be a net positive for the person's financial wellbeing: feeling secure and in control of their money (the Money and Pensions Service definition). An idea justified by retention, return visits or time in the app fails.

**The no-shaming rule.** Each option below is marked pass or fail against all five. One fail removes it.

| Test | Rule |
| --- | --- |
| N1 | No points, scores, grades, leagues or ranks for money |
| N2 | No comparison with other people, with averages or with "people like you" |
| N3 | No loss-framed or guilt-driven streaks. A missed month is never a failure and nothing is ever "lost" |
| N4 | Acknowledge the action, never the amount. No praise that implies a smaller number makes a lesser person |
| N5 | The same warmth for every starting point, including debt, renting and low or no savings |

These restate rules already in force: copy guide 2.3 ("Copy never judges someone's situation"), 2.4 ("We do not celebrate a person's money"), UX guidelines O6, O7 and T2, and E30 D11. Nothing here loosens any of them.

## 2. What the evidence says

| Source | Finding | What it means for Flump |
| --- | --- | --- |
| Gladstone, Jachimowicz and others, "Financial shame spirals", 2021 | Six studies, 9,110 people (**[U]**, read through summaries). Shame makes people withdraw from their finances, and withdrawal deepens hardship | Shame is not only unkind, it does harm. This is the evidence behind the hard constraint |
| Money and Pensions Service, UK Strategy for Financial Wellbeing | Financial wellbeing is "feeling secure and in control" | The outcome to aim for and to ask about |
| FCA, "Gaming trading", November 2022 | Survey of over 3,000 trading app users. Celebratory messages and confetti after a trade were associated with riskier investing; an association, not proof of cause | Never mark a financial decision or a figure. A confirmation follows an action in Flump |
| FCA research note, trading apps experiment, 20 June 2024 | Over 9,000 people. Push notifications, a leaderboard, and points with a prize draw changed how often people traded and the risk they took | Fails N1 and N2. Notifications need their own decision |
| FCA Consumer Duty guidance FG22/5, July 2022 | Do not exploit behavioural biases; help people make informed decisions | Not binding on Flump, adopted in `docs/compliance/consumer-duty-principles.md` |
| Silverman and Barasch, Journal of Consumer Research, 2023 | A broken streak lowers later engagement, most when people blame themselves | A streak punishes the month someone skipped. Fails N3 |
| Etkin, Journal of Consumer Research, 2016 | Measuring an activity can make it feel like work | Count nothing about how often someone uses Flump |
| Patel and others, Annals of Internal Medicine, 2016 | Loss framing raised step counts while it lasted, not after | Loss framing fails N3 whatever it achieves |
| Koivisto and Hamari, review of 819 studies, 2019 | Results on points, badges and leaderboards are mixed | No evidence found for them in a budgeting app (**[U]**) |

## 3. Three option sets

The E17 design decisions reached main on 15 November (`docs/design/e17-options/`, UX guidelines M5 and M7). M5 allows motion on two things that are not financial events: the confirmation that a save worked, and the setup checklist's finish scene, which may settle once. Set 1 stays inside that: every moment below is a save confirmation or the setup finish, and uses only motion from the approved list (STYLE-GUIDE 11.1).

### Set 1. Warm confirmations (light)

| Moment | On-screen wording | Benefit to the person |
| --- | --- | --- |
| Check-in finished | "November is checked in." then the existing line, "Net worth changed by +£1,150 since October 2026." | Their records are current, and the task feels finished |
| Setup step finished | "Budget added." The checklist row ticks | They can see what is left without a tour |
| Setup complete | "Setup is finished. Everything on your dashboard now uses your own figures." | Trust in the figures |
| First account added | "Your first account is in." | A plain sign that it worked |
| Empty states | A friendly illustration and one plain sentence | Less cold, nothing to decode |

- **Tests:** W pass. N1, N2, N3 pass (nothing is counted or compared). N4 pass only if the wording names the action and any motion is identical whichever way a figure moved. N5 pass: the same line for a first account that is a debt.
- **Data:** none new (`snapshot_checkins`, `SetupChecklist`, `CheckInSummary`).
- **Turning it off:** one switch in Settings, "Animations". The device's reduced-motion setting is always honoured.
- **Risks:** UX guidelines O7 and M5 ban confetti and celebratory animation on a financial event. The motion is the approved save confirmation, attached to the task and never to a number.

### Set 2. Goals that are the user's own (middle)

| Feature | On-screen wording | Benefit to the person |
| --- | --- | --- |
| A goal on an account, any size | "Goal: £50 in this account by June." | Research on goal-setting aside, the person asked for it; Flump holds it for them |
| Progress, led by what is done (O8) | "£1,800 paid off since January." beside the balance. A balance that rose reads "Balance changed by +£300 since January." in the same place and style | Progress is visible from any starting point |
| Goal reached, one plain dated line, no animation | "Balance £0. You set this goal for March 2027." | A fact they chose to track, confirmed |
| Changing or removing a goal | "Goal changed." No "are you sure you want to give up" | Goals can move with life |

- **Tests:** W pass. N1, N2 pass. N3 pass only if a passed date or an unreached goal changes nothing on screen: no message, no colour, no "missed". N4 pass: the reached line states the fact, with no adjective, and is the same for £50 and £50,000. N5 pass: a goal to pay off a card and a goal to save are worded alike.
- **Data:** a goals table (figure, optional date, account), in export and deletion.
- **Turning it off:** goals are optional. Nothing prompts a user to set one, and Flump never suggests a goal, an amount or a date (R2, R4).
- **Risks:** a goal not reached is felt even in silence. A list of reached goals could become a tally, so there is no count and no "year in review".

### Set 3. A calmer month, and shared goals (fuller)

| Feature | On-screen wording | Benefit to the person |
| --- | --- | --- |
| "Month in brief" after a check-in | "November in brief. Net worth changed by +£1,150. Debts changed by -£320. One account added." | Understanding what moved, in three facts |
| A reminder the user asked for, on their chosen day | "Your November balances are ready to update." No figures | Remembering a task they set themselves |
| Shared goal for a household (needs E34) | "Holiday fund: £1,200 of £2,000. A goal you both set." | A shared picture without comparing two people |

- **Tests:** W pass only if the reminder exists because the user asked for it, never to bring them back. N1, N2 pass. N3 pass: the reminder is sent once, a skipped month is never mentioned (O6), and there is no number on the app icon. N4 pass: the same words whichever way a figure moved (E30 D6). N5 pass.
- **Data:** goals; household membership; a reminder day and consent; a push token on mobile.
- **Turning it off:** each feature has its own switch. Reminders are off until asked for and can be stopped from the message.
- **Risks:** notifications have the strongest evidence of changing behaviour. A shared goal shows the total only, never who paid in what (E34 G4).

### Ideas that fail

| Idea | Fails |
| --- | --- |
| A financial health score or grade | N1, N5 |
| "You are in the top 20% of savers" or any average | N2 |
| "3 months in a row", "do not lose your streak" | N3 |
| "£10,000 club" or any badge for an amount | N4, N5 |
| Confetti when net worth rises | N4 |
| "Great job saving this month" | N4 |

## 4. Keeping Flump healthy and inclusive

Rules for every screen, not only the options above.

| Area | Rule | Example |
| --- | --- | --- |
| Wording | Name what the person did or the fact. No praise adjectives about money ("great", "healthy", "impressive", "on track") | "Budget saved", not "Great budgeting" |
| Defaults | No default assumes a situation. Housing, goals and targets start empty; no screen treats owning, saving or being debt-free as the expected state | The housing question lists its options with equal weight and no pre-selection |
| What is acknowledged | Actions in Flump and goals the user set. Never an amount, a rise or a financial decision | "November is checked in." |
| Goals | The user's own, any size, any kind, changed or removed without comment | A £50 goal gets the same sentence as a £50,000 one |
| A figure that moved | Whichever way a figure moved: what changed and by how much, then the same two ordinary links. Never why, and never what to do | "Net worth changed by -£2,300 since October 2026. Largest change: Stocks ISA, -£1,900." Then "Update a figure" and "Try a what-if", which also appear when the figure rose |
| A missed month | Nothing. The next check-in starts from where things are | "Balances for January", with December carried forward and marked |
| Opt-outs | Animations, goals and reminders each switch off in Settings, with no warning about what will be missed | "Animations: off" |
| Free help | One line, the same for every user, in the same place, never triggered by anyone's figures (UX guideline T9). Today policy R3 allows it on the debt page only | "Free, impartial debt help is available from MoneyHelper" |
| Reading and access | Reading age 9 to 11 for interface text (copy guide 3.1). No meaning carried by colour or motion alone. Every animation has a still | A confirmation is text first; the motion adds nothing a screen reader user loses |
| Couples (E34) | No screen sets one person's figures against the other's, shows who paid what into a shared goal, or shows who did or did not check in | "Holiday fund: £1,200 of £2,000" |

## 5. Proposed additions to the guides

Not applied in this PR. Exact wording for the owner to approve.

**`docs/copy/COPY-GUIDE.md`, new section 2.5, "Encouragement".**

1. Acknowledge what the person did, never the amount. "November is checked in", not "Great month".
2. Use the same words for every size. A goal of £50 and a goal of £50,000 get the same sentence.
3. Never mention a missed month, a passed date or a goal not reached. Nothing is "lost", "broken", "missed", "overdue" or "behind".
4. No praise adjectives about money: "great", "well done", "impressive", "healthy", "on track".
5. Whichever way a figure moved, say what changed and by how much. The same links appear either way. Do not say why, and do not say what to do.
6. Goals are the person's own words and numbers. Flump does not suggest one.

**`docs/copy/COPY-GUIDE.md`, section 2.4, the existing Success row.** Tone stays "Proportionate, no celebration". Add a second example beside "Budget saved": "November is checked in."

**`docs/ux/UX-GUIDELINES.md`, section 9.**

- O7, amended: "No streaks, points, scores, grades, ranks, badges, confetti, countdowns or leaderboards on anything financial. Progress is shown as the user's own figures over time."
- O11, new: "Every encouragement feature states its benefit to the person in its plan. None is justified or measured by visits, time in the app or retention."
- O12, new: "A finished action is acknowledged in words that name the action. Any motion is the approved save confirmation (M5, M7), identical whatever the figures show, and follows the reduced-motion setting and one Settings switch."
- O13, new: "Goals belong to the user. Flump never suggests a goal, an amount or a date, accepts any size without comment, and lets a goal be changed or removed without a question."
- O14, new: "An unreached goal or a passed date changes nothing on screen."

**`docs/ux/UX-GUIDELINES.md`, section 11.** T11, new: "In a household, no screen shows one person's figures against the other's, who paid what into a shared goal, or who did or did not check in."

## 6. Mobile and notifications

The mobile plan (E12, decision O3) has push notifications off at launch. Nothing here changes that. Set 1 carries over as the same animation and a short haptic. No number on the app icon. A notification never carries a figure, a goal's name or anything about another household member.

## 7. First step, and how to tell whether it helps the person

**Build Set 1 only, using the approved E17 motion.** E30 D11 stands, with one clarifying line: a one-off confirmation of a finished action is not a badge.

| Measure of benefit | How | Reading |
| --- | --- | --- |
| Do people feel more in control? | One optional question after a check-in, at most once a quarter: "After this check-in, how do you feel about your money?" with "More in control", "About the same", "More worried" | More "in control" than "worried" |
| Does anyone feel worse? | A second optional question: "Did anything here make you feel worse? Tell us what." | Every answer is read |
| Are records easier to keep current? | Check-ins completed, and the share of accounts with a figure entered or confirmed for the month, from `snapshot_checkins` and snapshot rows | Accurate figures are the benefit; visits and time in the app are not counted |
| Is debt being paid down, where that is the person's goal? (Set 2) | In aggregate only, for debts with a goal the user set: the change in balance since the goal was set | Direction only; never a target Flump sets |
| Do people reach goals they set? (Set 2) | In aggregate only: of goals whose date has passed, how many were reached. Never shown to a user and never used to message one | Direction only |
| Do people keep it on? | The Settings switch | See the stop rules |

**Stop rules.** A feature is paused for everyone and reviewed if one person says it made them feel judged or worse about their money. It is removed if "More worried" outnumbers "More in control" over a quarter, or if more than a quarter of people switch it off. Flump never records or targets sessions, visits, time in the app or retention for these features.

## 8. Strongest argument against

Finance apps feel cold because of jargon, judgement and dense screens, and Flump is already fixing those with plain copy, the no-judging rule and the E17 design work. Section 4 may be the whole answer, with no features at all. Any acknowledgement, however plain, tells a person who did not get there that something was withheld, and a two-question survey in a small beta cannot prove a benefit. On this view the safest way to keep the rule is to build nothing in section 3.

## 9. Decisions for the owner

| # | Decision | Options | Recommendation |
| --- | --- | --- | --- |
| W1 | The aim and tests W and N1 to N5 | Adopt as the hard constraint for all future work; keep as guidance for this document only | **Adopt** |
| W2 | First step | Set 1; Set 2; Set 3; section 4 only | **Set 1**, with section 4 either way |
| W3 | Guide additions in section 5 | Approve as written; approve with changes; not now | **Approve as written** |
| W4 | E30 D11, no streaks or badges | Keep; keep with the clarifying line; relax | **Keep with the clarifying line** |
| W5 | The two optional questions | Ask them; rely on conversations with beta users only | **Ask them**, at most once a quarter |
| W6 | A reached goal (Set 2) | No line; one plain dated line; anything more | **One plain dated line**, decided after Set 1 |
| W7 | Free help line beyond the debt page | Keep to the debt page (policy R3 today); one more place, such as Settings, the same for everyone | **Keep to the debt page** until the owner amends R3 |
| W8 | Push notifications (E12 O3) | None at launch; one reminder the user asks for | **None at launch**, as on record |
| W9 | Measures that use people's money or activity (check-ins completed, goals reached, debt paid down) | Keep them, in aggregate and only against goals people set themselves; or drop them and keep the two questions and the share of accounts kept current | **Keep, in aggregate.** The independent reviewer advised dropping them: counting check-ins is close to a usage measure, and counting debt paid down treats one outcome as the right one. The owner asked for benefit to be measured this way, so the choice is the owner's |

## Sources (all read 2026-11-15)

- Gladstone, Jachimowicz, Greenberg and Galinsky, "Financial shame spirals: how shame intensifies financial hardship", Organizational Behavior and Human Decision Processes 167, 2021, doi 10.1016/j.obhdp.2021.06.002 (through the authors' university summaries).
- Money and Pensions Service, UK Strategy for Financial Wellbeing, January 2020: <https://www.maps.org.uk/2020/01/21/uk-strategy-for-financial-wellbeing-sets-out-ten-year-vision-to-improve-millions-of-lives/> (through search extracts).
- FCA, "Gaming trading: how trading apps could be engaging consumers for the worse", November 2022: <https://www.fca.org.uk/publications/research-articles/gaming-trading-how-trading-apps-could-be-engaging-consumers-worse>.
- FCA research note, "Digital engagement practices: a trading apps experiment", 20 June 2024: <https://www.fca.org.uk/publications/research-notes/research-note-digital-engagement-practices-trading-apps-experiment>.
- FCA FG22/5, guidance on the Consumer Duty, July 2022: <https://www.fca.org.uk/publication/finalised-guidance/fg22-5.pdf> (through search extracts).
- Silverman and Barasch, "On or Off Track: How (Broken) Streaks Affect Consumer Decisions", Journal of Consumer Research 49(6), 2023.
- Etkin, "The Hidden Cost of Personal Quantification", Journal of Consumer Research 42(6), 2016, doi 10.1093/jcr/ucv095 (through the author's university summary).
- Patel and others, "Framing Financial Incentives to Increase Physical Activity Among Overweight and Obese Adults", Annals of Internal Medicine, 2016.
- Koivisto and Hamari, "The rise of motivational information systems: a review of gamification research", 2019.
