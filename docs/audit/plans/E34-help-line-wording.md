# E34 CD10: the help line on the sharing screen, wording for approval

Decisions: open. The owner approves the wording and the policy amendment below, or neither.

> **Status: proposal, 25 November 2026.** Written by Claude Fable (an AI model). Nothing here is shown in the product and the policy is not amended by this file. The owner accepted CD10 on 17 November 2026 ("amend the exception", wording to be approved). This is that wording, for approval.

## 1. What was checked, and one finding that changes the proposal

Read on 25 November 2026, each from the service's own website:

| Service                                          | Page read                                                                                                                                  | What it says                                                                                                                                                                                                               |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Surviving Economic Abuse (SEA)                   | <https://survivingeconomicabuse.org/>, <https://survivingeconomicabuse.org/contact-us/>, <https://survivingeconomicabuse.org/i-need-help/> | The name is "Surviving Economic Abuse". The contact page says: "SEA does not provide direct support or advice." Its "I need help" pages give information and point to other services. Every page has an "Exit Site" button |
| The helpline SEA points to                       | <https://survivingeconomicabuse.org/i-need-help/cedeas-helpline/>, <https://www.moneyadviceplus.org.uk/getting-advice-support/>            | A freephone helpline run by Money Advice Plus, 0808 196 8845. The two sites gave different Friday hours on the day read, so no hours are quoted here                                                                       |
| National Domestic Abuse Helpline (run by Refuge) | <https://www.nationaldahelpline.org.uk/>                                                                                                   | "The freephone, 24-hour National Domestic Abuse Helpline", 0808 2000 247. The site has a quick exit button and a warning about monitored devices                                                                           |

**Finding.** The plan proposed naming Surviving Economic Abuse "for help with economic abuse". SEA's own site says it gives no direct support or advice. A line that says help "is available from" SEA, in the pattern of the MoneyHelper debt line, would be untrue. SEA can be named honestly as a source of information that points to support; a helpline can be named honestly as a helpline. The options below keep to that.

## 2. Rules every option follows

- One line, on the "What I share" screen only, in the same place for every member.
- Never triggered, moved, reworded or emphasised by any figure, any sharing choice or any other signal (policy R4). The component takes no props.
- A muted note with an ordinary text link and the external-link cue. Not a button, card, banner or alert.
- One named service. The link opens in a new tab.
- No judgement of anyone and no suggestion that the reader is, or is with, an abuser.
- The link carries no referrer (`rel="noopener noreferrer"`), and Flump records no click, no view and no analytics event for it.
- No phone number in Flump's own text: numbers and hours change, and the service's page is their one home.

## 3. Options

| #   | Line as shown                                                                                                     | Link text and target                                                            | For                                                                                                           | Against                                                                                                         |
| --- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| A   | "Surviving Economic Abuse has information about economic abuse and where to find support."                        | "Surviving Economic Abuse" to <https://survivingeconomicabuse.org/i-need-help/> | The specialist service CD10 proposed. True to what SEA offers. The page has an exit button and urgent numbers | Uses the term "economic abuse", which some readers may not apply to themselves. One more step to reach a person |
| B   | "Sharing money is always your choice. Surviving Economic Abuse explains what to do if it does not feel that way." | As A                                                                            | Describes the situation in plain words before naming it                                                       | Two sentences. "Does not feel that way" is softer and vaguer. Closer to a nudge than a signpost                 |
| C   | "The National Domestic Abuse Helpline is free and open 24 hours a day."                                           | "National Domestic Abuse Helpline" to <https://www.nationaldahelpline.org.uk/>  | A person answers, at any hour. The best-known route                                                           | Not specific to money. "Domestic abuse" on a shared screen may read as heavier than the screen warrants         |

**Recommendation: A**, subject to the specialist charity's view (question 5 of [`E34-safety-review-pack.md`](E34-safety-review-pack.md)). It is the closest to what the owner accepted, and it is accurate. If the charity advises that a helpline with a person on it matters more than the specialism, C. The service named should be asked whether it is content to be named before the line ships.

## 4. The policy amendment, written out

To be added to `docs/compliance/advice-boundary-policy.md`, section R3, after the MoneyHelper pension guidance exception, **only when the owner approves**. The text assumes option A; for C, swap the service name, the line and the link.

> **Exception: Surviving Economic Abuse on the sharing screen (owner decision CD10, accepted 2026-11-17; wording approved [date]).** The "What I share" screen shows one quiet note, "Surviving Economic Abuse has information about economic abuse and where to find support.", in which the charity's name links to its "I need help" page, opening in a new tab with an external-link cue. Conditions:
>
> - Surviving Economic Abuse is the only named service on any sharing or household screen. No other charity, helpline, adviser or firm is named there.
> - Every household member sees the same note in the same place. It is never conditional, and never triggered, moved, reworded or emphasised by any figure, any sharing choice, any act of joining or leaving, or any other signal (R4). The component takes no props so it cannot be.
> - It is a muted note with an ordinary text link: not a button, card, banner or alert.
> - It never says or implies that the reader, or the person they share with, is in an abusive relationship. It is a factual signpost, not a recommendation (R2) and not a judgement (copy guide 2.3).
> - Flump records nothing about the link: no click, view or analytics event, and the link sends no referrer.
> - The note does not say that Surviving Economic Abuse gives direct support, because its website says it does not.

And the closing sentence of the exceptions changes from "These two MoneyHelper lines are the only named-service exceptions to R3." to:

> These three lines are the only named-service exceptions to R3.

## 5. What the owner is asked to approve

1. One option from section 3 (or none, which reverses CD10).
2. The amendment in section 4, with the approval date filled in.
3. Whether to wait for the specialist charity's view first. This proposal recommends waiting: the line is shown with C3 at the earliest, and C3's switch stays off until that review exists anyway (owner, "Build it gated now", 25 November 2026).
