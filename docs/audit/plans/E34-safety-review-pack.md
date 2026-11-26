# E34. Shared finances for couples: safety review pack

Decisions: open. This pack asks questions; it answers none of them.

> **Status: draft, 25 November 2026. Not sent to anyone.** Written by Claude Fable (an AI model) from the plan [`E34-shared-finances-research.md`](E34-shared-finances-research.md). No charity has seen or reviewed it. Choosing whom to ask, and making contact, is the owner's alone. On 25 November 2026 the owner chose "Build it gated now": C3 is being built in another lane behind a switch that is off by default. The switch stays off until the charity review, the signed DPIA and the approved help line wording exist, and only the owner turns it on. Nobody can use any of it.

**Who this is for.** A specialist in economic abuse who has agreed to look at a feature before anyone can use it. It needs no knowledge of the code. Reading time is about ten minutes.

## 1. What Flump is

Flump is a UK personal finance web app in a closed test with invited people. A person types in their own figures (accounts, debts, mortgage, pension, a budget) and sees their net worth, a monthly check-in and some calculators. Flump holds no money, moves no money and gives no advice. It is run by one developer.

## 2. What the feature would do

Two people who share some of their finances could link their Flump accounts into a "household" and see chosen items together.

- Each person keeps their own login and their own data.
- Nothing is shared until its owner turns sharing on, item by item.
- An item its owner marks as joint with the household, such as a joint mortgage, is seen and edited by both. Joining does not do this by itself.
- Either person can stop sharing or leave at any time, alone.
- Tax, ISAs and pensions are always worked out per person.

Today only the first step exists: one person can mark an item as joint and record their share, with no second person involved. The household, the invitation and all sharing are being built behind a switch that is off. Nobody can use them, and the switch stays off until this review has happened.

## 3. The ten safety rules

These are requirements in our plan. Each answers a way the feature could be used to watch, control or trap someone.

| #   | Rule                                                                                                                                         | Meant to prevent                                |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| G1  | Each person has their own login. No shared login, and no way to set up an account for someone else                                           | One person holding all access                   |
| G2  | Nothing is shared by default. Sharing is per item, and only the item's owner can share it                                                    | Watching by default                             |
| G3  | The other person cannot tell that unshared items exist: no counts, no "hidden" placeholders, no totals that give them away                   | Pressure to "show everything"                   |
| G4  | No feed of the other person's activity: no sign-in times, no record of who changed what, no alerts about what they did                       | Monitoring                                      |
| G5  | Either person can stop sharing an item or leave the household at once, alone, with no approval step. Flump sends the other person no message | Being held in; retaliation prompted by an alert |
| G6  | Members are equal. There is no owner or administrator. Nobody can remove the other's data, change their settings or close their account      | Lock-out                                        |
| G7  | Leaving never costs a person their own data. Each keeps a copy of joint items with their history                                             | Losing your records when you leave              |
| G8  | An invitation carries no figures. The person invited sees exactly what joining shares, which at first is nothing                             | Coerced or uninformed joining                   |
| G9  | A person's shared items never reach the other person's AI assistant connection unless the item's owner switches that on                      | Disclosure to a third party through a partner   |
| G10 | One neutral line on the sharing screen, the same for everyone, naming one service for help with economic abuse                               | Having no route to help                         |

We know these reduce risk and do not remove it. A person can still be made to share, or to hand over a phone.

## 4. The screens, in words

**Inviting.** In Settings, a person chooses "Make a link". Flump shows a link that works once and expires after 48 hours. The person sends it however they like. Flump sends no email or message, and the link carries no names or figures.

**Joining.** The invited person opens the link and signs in with their own account. One screen says: joining shares nothing by itself; you choose what to share, item by item; either of you can stop sharing or leave at any time, and Flump will not announce it. They accept, or close the page. Not accepting sends no message; the link simply expires.

**What I share.** A list of my own items, each with a switch that is off to begin with. An item can also be marked "joint with this household", which lets the other person see and edit it; that too is off until its owner chooses it, even if they had called the item joint before the household existed. The single help line (rule G10) sits on this screen, in the same place for everyone.

**Household view.** A "Me / Household" switch appears for members. "Household" shows joint items in full and whatever each person has shared, with combined totals. There is no view of the other person alone. An item the other person has not shared does not appear in any form.

**Stopping sharing.** I turn an item's switch off. It leaves the other person's view straight away. Nothing is sent to them.

**Leaving.** In Settings, "Leave household", with one confirmation step for me and none for anyone else. My shared items leave the other person's view. We each keep our own copy of joint items. Nothing is sent. The same happens if I delete my account.

**What the first version shows (slice C3, built behind a switch that is off).** The first version is narrower than the screens above. "What I share" has a single switch, off to begin with: show the accounts I have marked joint in a read-only household summary (name, type and whole balance). The household summary lists the joint accounts each person chose to show and who added each one, with no totals; an account both people added appears twice until a later slice can pair the two copies. There is no "Me / Household" switch, no per-item sharing, no editing by the other person and no household name yet. The invited person sees nothing about the inviter before accepting; once they accept, the screen says at once who the household is with (their first name, else their display name, or "the other person") and how to leave. The switch stays off until your review, the owner's signature on the privacy assessment and the owner's approval of the help line wording exist, and only the owner turns it on.

**What the other person can notice.** We send no message, but they can see, next time they look, that items have gone or that the "Household" switch is no longer there.

## 5. What we would like to know

The questions we most need answered are first.

1. **Should this be built at all** by a small product with no support team? Is there a version you would call safe enough?
2. **Leaving and un-sharing are silent but not invisible** (section 4, last paragraph). Is an instant change the safest behaviour, or would something else be safer, for example a delay, or keeping a last-seen figure in the other person's view?
3. **The joining screen.** Does telling both people "either of you can leave and Flump will not announce it" help, or does it hand a controlling partner a warning?
4. **Hiding that unshared items exist (G3).** Is it right that nothing shows what is held back? Could it backfire if a partner already knows an account exists and sees it missing?
5. **The help line (G10).** Should there be one? Does a line about economic abuse on a screen both partners can see put anyone at risk? Should it name your service, another service, or none? What wording would you use, and should it use the words "economic abuse"? Our three draft lines are below; none is approved or shown anywhere.
   - A: "Surviving Economic Abuse has information about economic abuse and where to find support." The charity's name links to its "I need help" page.
   - B: "Sharing money is always your choice. Surviving Economic Abuse explains what to do if it does not feel that way." The same link.
   - C: "The National Domestic Abuse Helpline is free and open 24 hours a day." The helpline's name links to its website.
   - In each, the link opens in a new browser tab, and Flump keeps no record of it being used. Is a new tab, which stays in the browser's history, the right choice?
6. **Joint items can be edited by either person.** Could one person use that to distort or destroy the other's records? We propose that deleting a joint item leaves the other person a copy. Is that enough?
7. **A person holding the other's unlocked phone** sees everything, including the "What I share" screen. Is there anything a product like this should do about that, such as a quick way to leave the screen?
8. **Invitations.** Is a link that the inviter sends themselves safer than an email from Flump, as we assume? Should declining be possible in a way the inviter cannot distinguish from "not opened yet"? Should the joining screen show the inviter's name? After someone leaves, the other person can make a new link and send it again; should anything limit that?
9. **AI assistant connections (G9).** A person can connect an AI assistant to read their own Flump data. We plan that a partner's shared items reach it only if the item's owner switches that on. Is "off by default, owner's switch" enough, or should it not be offered?
10. **Words.** We call it a "household" and the people "members", and we avoid any word that ranks them. Are there words here that you know cause harm or confusion?
11. **Free text.** We have left out a household name for now. Joint items have names that both people see, and in a later version either could change them. Could that be used to send unwanted messages, and should we remove it?
12. **Records.** To avoid monitoring we plan to keep almost no record of who shared what and when. That also means we could not investigate a complaint afterwards. Is that the right balance?
13. **Requests for data.** Each person can ask us for a copy of their data. We plan never to include, confirm or deny anything about the other person. Do you see such requests used to probe a partner, and is there anything else to guard?
14. **One developer** runs Flump and can read the database. Does that change your view of whether this should be offered?
15. **What have we missed?** In particular: after separation, and where children or other family members are involved.

## 6. What we would change on your advice

- **Any rule, screen or word in this pack.** None of it is in use, and all of it can still change.
- **Whether the feature goes ahead.** If the advice is that it should not be built, or not by a product of this size, the plan already names stopping at today's one-person "joint" marker as a defensible outcome.
- **The help line:** whether it exists, which service it names and every word of it. We would not name a service that did not want to be named.
- **Timing and visibility of leaving and un-sharing** (question 2).
- **What is offered at all:** the AI connection for shared items, editing of joint items by both, a household name (none in the first version).

What would be hard to change: each person having their own login, and tax being worked out per person. Both follow from how the product and UK tax work.

## 7. What we will record

Advice received, from whom (with their permission), the date, and each change made or not made with the reason, in this file under a new heading. We will not say or imply that any organisation has reviewed, approved or endorsed Flump unless it has said so in writing and agreed to the words.

## 8. Background we have read

Domestic Abuse Act 2021, section 1(4); the FCA's guidance on the fair treatment of vulnerable customers (FG21/1); the UK Finance Financial Abuse Code (third version, April 2025). We could not read Surviving Economic Abuse's good practice guide for financial services (October 2025) in full, and would welcome being pointed to the parts that matter most here. Flump is not a signatory to any code and is not regulated by the FCA.

## AI review record

| Reviewer                                                                        | Date       | Verdict                                                                                                             |
| ------------------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------- |
| Claude Fable (an AI model), a separate decider that wrote none of this document | 2026-11-25 | Ready once the listed changes are made. Four changes were required and are made in this version; see the note below |

The AI reviewer required: joint items not to be shared by joining; an answer on whether sharing actions are logged; the wording options in this pack itself; and this record filled in. It suggested questions 11 to 14 and the additions to question 8. On a second look the same day it found all four closed and gave the verdict "Ready for the owner to send, once the AI review record is removed".

An AI review is not a specialist's review and is never described as one. **Remove this section before the pack is sent to anyone.**
