# DPIA: households and shared finances (E34, slices C3 to C5)

> **DRAFT v0.1, written by an AI model, not legal advice; for the owner to sign, then solicitor review.**
>
> This document was written on 25 November 2026 by Claude Fable (an AI model) from the plan [`E34-shared-finances-research.md`](../audit/plans/E34-shared-finances-research.md), [`data-map.md`](./data-map.md), [`ropa.md`](./ropa.md) and the legislation listed in section 13. It has not been reviewed by a solicitor, by a specialist charity or by the owner. A separate AI reviewer read it; its verdict is in section 12 and is not a legal opinion. **This draft was written from the plan, not from code.** On 25 November 2026 the owner chose "Build it gated now": C3 is being built in another lane behind a switch that is off by default. The switch stays off until the charity review, the signed DPIA and the approved help line wording exist, and only the owner turns it on. Every statement about how the feature works describes the plan, and must be re-checked against the code before this document is signed.

Decisions: open. The owner decisions in section 11 are not answered here.

## 0. Status and how to read this

| Item                    | State                                                                                               |
| ----------------------- | --------------------------------------------------------------------------------------------------- |
| Prepared                | 2026-11-25, AI draft                                                                                |
| Owner sign-off          | Not signed (section 12)                                                                             |
| Solicitor review        | Not done. Questions are in [`legal-pages-review.md`](./legal-pages-review.md), "E34 households"     |
| Specialist charity view | Not sought yet. The pack is [`E34-safety-review-pack.md`](../audit/plans/E34-safety-review-pack.md) |
| Evidence base           | The plan, not code. C3 is being built behind an off switch; no code was read                        |

What exists today (slice C1, merged): one person can mark an account, a debt or a budget entry as joint and record their own share. No second person is identified, linked or invited (`data-map.md`, "Joint items" row). Slice C2 is engine functions only and stores nothing. This DPIA covers what changes when a second person can join: C3 (household, invitation, leaving, "What I share", the help line), C4 (per-item sharing and the "Me / Household" switch) and C5 (shared budget, Breathing room and check-in). Section 7 covers a partner's AI connection (C7) because the plan asks this DPIA to settle the rule before anything is built.

The words "settled for this draft" mean the position this draft takes so that the build has one answer. Each is the AI drafter's reading of the law, open to the solicitor.

## 1. Screening: is a DPIA needed?

UK GDPR Article 35(1) requires an assessment before processing that "is likely to result in a high risk to the rights and freedoms of natural persons". The ICO's page "When do we need to do a DPIA?" (read 25 November 2026; the ICO says the page is under review) lists triggers and says a combination of two criteria indicates the need.

| Criterion                                               | Applies? | Why                                                                                                           |
| ------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------- |
| Financial data, or data people consider highly personal | Yes      | Balances, debts, income-related budget lines, mortgage and savings, now shown to a second person              |
| Data concerning vulnerable data subjects                | Yes      | Some users will be subject to economic abuse (Domestic Abuse Act 2021, section 1(4)). Flump cannot tell which |
| Risk of physical harm (ICO list, item 10)               | Yes      | A wrong disclosure to a partner, or a message that tells a partner someone left, could put a person at risk   |
| Matching or combining datasets                          | Yes      | Two people's records are combined into one household view                                                     |
| New technology or novel application                     | Partly   | Sharing is common in finance apps; per-item sharing with unannounced leaving is less so                       |
| Large scale                                             | No       | A closed beta of invited people                                                                               |

**Record:** a DPIA is needed. Four criteria apply. Whether it is strictly mandatory is a question for the solicitor, and does not change what this draft does.

## 2. Description of the processing

### 2.1 Purpose

To let two people who share some of their finances see joint and chosen items together, while each keeps their own login, their own data and their own figures. Tax is always worked out per person.

### 2.2 Data subjects

| Who                                    | Notes                                                                                                                                                    |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Member A and member B                  | Two adults, each with their own Flump account. Each is a data subject in their own right. A household has two people (CD5)                               |
| An invited person who has not accepted | Flump holds nothing about them until they sign in and open the link. The inviter passes the link on themselves; Flump is not given their name or address |
| A partner who never joins              | Unchanged from today: only what a user types into a name or a note (`data-map.md`, "Joint items" row)                                                    |

### 2.3 What Flump would newly store (planned; names are the plan's)

| Data                                                                            | Where (planned)                                 | Notes                                                                                              |
| ------------------------------------------------------------------------------- | ----------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| A household and an optional name                                                | `households`                                    | The name is free text chosen by a member. A household never owns data                              |
| Membership: which two accounts are linked                                       | `household_members`                             | The link itself is personal data of both: it records that two people have a financial relationship |
| An invitation: a single-use code, stored as a hash, and its expiry              | New table                                       | Expires after seven days. No email address, no name, no figures (G8, CD3)                          |
| Per item: whether its owner shares it with the household                        | `shared_with_household` on each shareable table | Default false (G2). The existing `ownership` and share columns stay                                |
| For a joint item: that the other member may edit it                             | Derived from `ownership` and membership         | No separate grant is stored in the plan                                                            |
| Whether a member lets their shared items reach the other member's AI connection | A per-member setting (C7)                       | Default off (G9, CD8)                                                                              |
| Household net worth choices                                                     | On the household                                | Two display choices set by either member                                                           |

Not stored, by design: a log of who signed in when, an edit history by person, who is "behind" on a check-in, any record of using the help line link, any reason for leaving (G4, G5, G10).

**The audit trail.** Flump has a sensitive-action audit trail (`audit_events` in `data-map.md`: action, actor, target id, no amounts or names, kept 13 months, exported to the person it is about). The plan does not say whether household actions are written to it. Settled for this draft, for the owner to decide (section 11, H6): turning sharing on or off for an item is **not** written; joining and leaving **are** written, on the actor's own trail only, with no identifier of the other member or the household. A person's own export then shows their own joining and leaving and nothing about the other person. The cost of writing so little: after a complaint or a leak there is no record of what was shared with whom, or when.

**An existing "joint" marker is not a share.** Since C1 a person can mark an item as joint without anyone else being involved, and the other holder may be a parent, a friend or a former partner, not the person they later form a household with. The plan's wording ("a joint item gives the other member edit rights while both are members") would show every such item to the new member on joining, with no switch, which breaks G2 and G8. Settled for this draft, for the owner to decide (section 11, H7): **joining shares nothing, joint items included.** The item's owner chooses, per item, "joint with this household". Only then does the other member see it, edit it and receive a copy on leaving. Wherever this document says "joint item" for two members, it means an item so marked.

### 2.4 Who sees what

- **Me view:** my items and my share of joint items. As today.
- **Household view:** joint items in full, plus items each member has chosen to share. There is no view of the other person alone.
- **Never visible to the other member:** an unshared item, its existence, a count of unshared items, or a total that reveals one (G3).
- **Editing:** an item's owner only; either member for a joint item.
- **Flump staff:** the owner is the only person with database access. Unchanged.
- **Processors:** Railway (hosting), WorkOS (sign-in), Sentry (errors), as in `ropa.md`. No new processor. WorkOS holds no household data: Flump stores its own invitation (CD3).

### 2.5 Flows

1. **Invite.** A creates a household and gets a link. A passes it on outside Flump. Flump sends nothing.
2. **Join.** B signs in with their own account, sees a screen saying exactly what joining shares (at first, nothing) and accepts. During the closed beta B must also be on the beta allowlist. The link carries no names, so what B is shown about who they are joining is not designed yet. Showing the inviter's display name helps B know what they are joining, and shows that name to whoever holds the link. This is a question in the charity pack.
3. **Share.** Each person turns sharing on per item, on a "What I share" screen. An item its owner has marked as joint with this household is seen and edited by both.
4. **Stop sharing.** The owner turns it off. The item leaves the other person's view at once. No message is sent.
5. **Leave.** Either person leaves from Settings, alone, with no approval step and no message to the other (CD6). Shared items vanish from the other's view. Each keeps their own copy of joint items with their history (G7). A household with one member closes.
6. **Delete account.** The same path as leaving, then the account deletion that exists today.

### 2.6 Necessity, proportionality and transfers

- **Why the one-person joint marker (C1) is not enough.** C1 gives one person correct figures for their share. It cannot give two people one view of the same joint item, a shared budget or a shared check-in, so each must keep a separate copy that drifts apart. That is the purpose in 2.1 and it needs a link between two accounts.
- **Alternatives rejected** (plan section 4): full mutual visibility, which shares everything and fails G2, G3 and G5; a shared login, which fails G1; and a summary of totals only, which is kept as the first shared screen but cannot carry a shared budget.
- **Kept to what the purpose needs:** two people only; nothing shared by default; no activity data; no email address or name collected for an invitation; no new processor; membership deleted on leaving.
- **Not building it is a real option.** The plan says stopping at C1 is defensible. This DPIA does not assume the feature must ship.
- **International transfers:** unchanged. No new recipient or processor; see `ropa.md`.

## 3. Roles

**Settled for this draft:**

- **Flump is the controller for both members**, separately, for all processing in the app. It decides the purposes and the means.
- **The two members are not joint controllers with Flump or with each other.** Article 26(1) applies where controllers "jointly determine the purposes and means of processing". A member decides what to share, but not how Flump processes it.
- **A member is not a controller of the other's shared items.** A person looking at their partner's balance in a household view acts "in the course of a purely personal or household activity" (Article 2(2)(a)), so the UK GDPR does not apply to that person. The exemption is the member's, not Flump's: Flump stays fully responsible for showing the data.
- **No processor relationship arises between members.** This differs from invoicing client details, where the user is the controller and Flump the processor (`legal-pages-review.md`).

For the solicitor: whether the household exemption holds for every use a member might make, for example a self-employed member's business items.

## 4. Lawful basis

For the solicitor to confirm. This draft's working position:

| Processing                                                   | Working basis                                                                      | Note                                                                                                                                      |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Storing the household, membership and sharing choices        | Article 6(1)(b), contract with each member                                         | Each member asked for the feature                                                                                                         |
| Showing A's shared item to B                                 | Article 6(1)(b), contract with A                                                   | A asked Flump to show it. B needs no basis of their own (section 3)                                                                       |
| Holding a joint item entered by A that is also B's data      | Article 6(1)(b) with A; legitimate interests (6(1)(f)) as regards B before B joins | The position today for any partner detail a single user enters. A legitimate interests assessment is owed (already on the solicitor list) |
| Sending a member's shared items to the other's AI connection | Open, as in `dpia-mcp.md` section 4                                                | Whatever basis the solicitor chooses there applies, with the item owner's opt-in on top                                                   |

**Consent is not relied on, and is not treated as a safety control.** A person under pressure can be made to tap "share". A consent that may not be freely given protects nobody, so the controls in section 9 are built to work even when sharing was demanded: the default is off, leaving is instant and silent, and nothing shows what is held back.

**Special category data.** Flump asks for none. A household link shows that two people have a relationship, and could, with names, suggest a person's sexual orientation. Flump stores no gender and makes no such inference. Free text (household name, item names, notes) can carry anything a person types. For the solicitor: whether the link itself needs an Article 9 condition.

## 5. The UK GDPR points the plan asked this DPIA to settle

### 5.1 A joint item is the personal data of both people

A joint mortgage balance says something about each borrower. Settled for this draft:

- While both are members, a joint item is **one row with one owning account** (the person who entered it), which the other member can see and edit.
- **Each member has the right of access to it** (Article 15). It appears in each member's export.
- **Portability** (Article 20) covers data a person "has provided to a controller". On a strict reading the member who did not enter a joint item has no portability right over it. Flump gives both members the same export anyway. That is a product choice, not a legal conclusion.
- **Erasure by one member cannot remove the other's copy.** Article 17 has no exception that names other people's data, so the design avoids the conflict instead of arguing it: before one member's rows are erased, the other member is given their own copy of each item marked as joint with this household (section 2.3), with its history, owned by them. An item one person marked joint for any other reason is never copied to anyone. Each person's erasure request is then met in full against rows that are theirs alone.

### 5.2 Access requests and the other person

Article 15(4) says the right to a copy "shall not adversely affect the rights and freedoms of others". The Data Protection Act 2018, Schedule 2, paragraph 16 lets a controller withhold information "relating to another individual who can be identified", unless that person consents or it is reasonable to disclose without consent. Settled for this draft:

| A member asks for                                                  | Answer                                                                                                                                                                                                             |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Their own items and their copy of joint items                      | Given, in the export                                                                                                                                                                                               |
| The other member's shared items (which they could see on screen)   | **Not given.** They are the other person's data. Seeing an item while it is shared is not a right to a permanent copy                                                                                              |
| What the other member has not shared, or how many items            | **Not given, and not confirmed or denied.** The reply must not reveal that unshared items exist (G3)                                                                                                               |
| When the other member joined, left, signed in or changed something | **Not given.** Flump keeps no feed of activity (G4). The dates someone joined and left sit only on that person's own audit trail (section 2.3) and are their data, not the requester's. Paragraph 16 is the ground |
| Whether the other member turned on AI access                       | **Not given**                                                                                                                                                                                                      |

These are working positions, not flat rules. Paragraph 16 is a test of what is reasonable in all the circumstances, applied request by request. A member's own joining and leaving dates are their own data and are given to them. A request by one member about the other is the case where a wrong answer can do the most harm, and a request can itself be used to probe a partner. The rule for the owner, who answers requests by hand: when in doubt, send the standard export and nothing else, and ask the solicitor before sending anything about the household.

### 5.3 Partner details a single user already enters

Today one person may record a joint mortgage, and so their partner's liability, without the partner knowing. `data-map.md` and `ropa.md` record this ("Joint items" rows). A household makes the same item visible to the partner, which is better for the partner. Whether a partner who never joins is owed a privacy notice of their own (Article 14) is on the solicitor list. When C3 ships, both documents must gain rows for the household, the membership link, the invitation and the sharing flag (section 10).

### 5.4 Export and deletion

- **Export** (`apps/backend/src/modules/privacy/account-export.service.ts`): a person's own items and joint items. Never the other member's shared items, never a field that says which of the other member's items exist.
- **Deletion** (`apps/backend/src/modules/privacy/account-deletion.service.ts`): removes the person, their items and their membership. For each joint item the person owned, the remaining member first receives their own copy. The household closes. No message is sent to the remaining member.
- **Registry.** Every new table and column goes into `USER_DATA_REGISTRY` (`apps/backend/src/modules/privacy/user-data-registry.ts`) and `docs/system/value-map.yaml` in the same PR, so the existing tests that tie export and deletion to the schema cover them.
- **A copy keeps no trace of the other person.** A copied joint item carries no name, account id or link to the member who left.

### 5.5 Leaving without telling the other person, and transparency

Flump tells nobody when a member leaves or stops sharing (CD6, G5). This is a deliberate limit on what the remaining member is told about processing that affects their view. Settled for this draft:

- It is fair because **both people are told in advance.** The joining screen and the privacy notice say, before anyone joins, that either person can stop sharing or leave at any time and that Flump will not announce it.
- The remaining member loses no data of their own. Only the other person's items leave their view.
- **Silent is not invisible.** The remaining member will see that items have gone, or that the "Me / Household" switch has gone, the next time they look. This draft does not claim otherwise and the product must never say "they will not know". Whether a slower or softer disappearance would be safer is a question for the specialist charity.

### 5.6 Retention (proposed; the owner decides)

| Data                              | Proposed retention                                                                    | Why                                                                                                                                                                                                                 |
| --------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| An unused invitation              | Deleted when it expires at seven days, by the daily retention job                     | Nothing to keep                                                                                                                                                                                                     |
| A used invitation                 | Deleted on acceptance                                                                 | The membership row replaces it                                                                                                                                                                                      |
| Membership                        | While the person is a member. **Deleted, not marked ended, when they leave**          | A kept "former member" row would record a past relationship for no purpose (Article 5(1)(e)). If H6 is accepted, the leaver's own audit trail holds a joining and a leaving event for 13 months, naming nobody else |
| The household row                 | Deleted when its last or second-last member leaves                                    | A household of one is not a household                                                                                                                                                                               |
| Sharing flags                     | Set to false on leaving                                                               | So re-joining any household starts from nothing shared (G2)                                                                                                                                                         |
| Each person's copy of joint items | As their other data: until they delete it or their account                            | G7                                                                                                                                                                                                                  |
| Backups                           | As the privacy notice says: a limited period, to be stated once scheduled backups run | A deleted membership can stay in a backup until it expires                                                                                                                                                          |

A restore from backup after someone has left could bring a membership back. The restore runbook must gain a step that checks this (section 10).

## 6. Security of the sharing rule

One wrong visibility rule shows one person's finances to another. Planned controls (plan section 7):

- One function answers "can this person read or edit this row", with table-level tests, before any shared screen ships.
- A backend law test that no query filters by household alone.
- Household totals are computed only from rows the viewer may read, so a total cannot leak an unshared item (G3).
- Error reports and logs carry ids and error classes, never another member's figures or names.
- Notifications, on web or mobile, never carry the other person's activity or any figure.

A leak between members is a personal data breach. The owner must assess it for an ICO report within 72 hours (Article 33) and for telling the affected person (Article 34). Telling one member about a breach that showed their data to the other needs care, and is a question for the solicitor.

## 7. What a partner's AI connection can reach

`dpia-mcp.md` covers the AI connection for one person. For a household:

- **Before C7, and by default after it:** a member's token reads only that member's own items. The other member's shared items never reach it (G9).
- **With C7:** a token's owner may ask for a `household` scope. It then reads only the items of the other member whose owner has switched on "let shared items reach my partner's AI connection". That switch is the item owner's, is off by default, and can be turned off at any time.
- **What cannot be undone:** data already sent to an AI client stays with that client and its provider (`dpia-mcp.md` section 2.5). Turning the switch off stops later reads only. The switch's own wording must say so.
- **Open point this draft found.** The plan's page table says a token "reads my data and joint items". A joint item that the other member entered would then reach my AI client without that member opting in. This draft's position: **a joint item entered by the other member reaches my token only if they have opted in**, the same as any shared item. The owner decides (section 11, H3). `dpia-mcp.md` must be updated when C7 is planned.

## 8. Rights of each person, in summary

| Right                      | Member's own items                           | Joint items                             | Other member's shared items |
| -------------------------- | -------------------------------------------- | --------------------------------------- | --------------------------- |
| Access (Article 15)        | Yes                                          | Yes, both                               | No (section 5.2)            |
| Rectification (Article 16) | Yes, by editing                              | Yes, either may edit                    | No; they can ask the owner  |
| Erasure (Article 17)       | Yes                                          | Their copy only; the other keeps theirs | No                          |
| Portability (Article 20)   | Yes                                          | Given to both by choice (section 5.1)   | No                          |
| Objection, restriction     | By hand, through the contact route, as today |                                         |                             |

## 9. Risks and controls

Likelihood and severity are the AI drafter's estimate on a low, medium, high scale, for the owner to challenge. Every control is **planned, and none was checked against code**. "Residual" is the risk left once the control works as designed.

| #   | Risk                                                                                                       | Likelihood | Severity | Control                                                                                                                                              | Residual                                                                                          |
| --- | ---------------------------------------------------------------------------------------------------------- | ---------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| H1  | One person holds all access: sets up or controls the other's account                                       | Medium     | High     | **G1** own login each; no shared login; no way to create an account for someone else                                                                 | Medium. Flump cannot stop someone knowing or demanding a password                                 |
| H2  | Sharing happens by default and becomes a way to watch a partner                                            | Low        | High     | **G2** nothing shared by default; per item; only the owner can share                                                                                 | Low                                                                                               |
| H3  | The other person learns that unshared items exist and presses to see them                                  | Medium     | High     | **G3** no counts, placeholders or revealing totals; access requests neither confirm nor deny (5.2)                                                   | Medium. A partner who knows of an account from elsewhere can see it is absent                     |
| H4  | The feature is used to monitor: sign-in times, edits, alerts                                               | Low        | High     | **G4** no activity feed, no edit history by person, no alerts about the other person                                                                 | Low. A changed joint figure is visible, without a name or time                                    |
| H5  | A person cannot get out, or leaving triggers a message that prompts retaliation                            | Low        | High     | **G5** stop sharing or leave at once, alone; Flump sends nothing                                                                                     | Medium. The change is visible when the other person next looks (5.5)                              |
| H6  | One member locks the other out, deletes their data or changes their settings                               | Low        | High     | **G6** equal members; no administrator; nobody can remove the other's data or end their account                                                      | Low for own items. See H11 for joint items                                                        |
| H7  | Leaving costs a person their records                                                                       | Low        | Medium   | **G7** each keeps their own data and a copy of joint items with history                                                                              | Low                                                                                               |
| H8  | Joining is coerced or uninformed; an invitation leaks figures                                              | Medium     | High     | **G8** the invitation carries no figures; the join screen says exactly what joining shares (nothing at first); an unanswered invitation just expires | Medium. Flump cannot tell a willing join from a demanded one                                      |
| H9  | A person's items reach a third party through the partner's AI connection                                   | Low        | High     | **G9** off by default; the item owner's switch; section 7                                                                                            | Medium once switched on: sent data cannot be recalled                                             |
| H10 | A person subject to economic abuse finds no route to help, or the route itself exposes them                | Medium     | High     | **G10** one neutral line, the same for everyone, never triggered by data; a plain link with no click record                                          | Medium. A line on a screen a partner may also see must not look like an accusation or a record    |
| H11 | One member edits or deletes a joint item and the other loses a record they rely on                         | Medium     | Medium   | Proposed, **not in the plan**: deleting a joint item removes it from the deleter's side only and leaves the other member a copy                      | Medium until the owner decides (section 11, H1)                                                   |
| H12 | A wrong visibility rule shows one member's unshared data to the other                                      | Low        | High     | Section 6: one authorisation function, table-level tests, the household-only query law, totals from readable rows only                               | Low to medium. The code is public and has one developer                                           |
| H13 | The owner answers an access request with the other person's data                                           | Low        | High     | Section 5.2 table; export is the standard answer; solicitor before anything else                                                                     | Low                                                                                               |
| H14 | A person with the other's unlocked phone sees everything, including the "What I share" screen              | Medium     | High     | None in Flump's power beyond normal session expiry                                                                                                   | **Not reduced.** Stated to the charity as an open question                                        |
| H15 | A backup restore brings back a membership or sharing choice that was ended                                 | Low        | High     | Restore runbook step (5.6)                                                                                                                           | Low once the step exists                                                                          |
| H16 | The household link or a household name reveals more than a member wants (relationship, orientation)        | Low        | Medium   | The link is seen only by the two members and the owner; no gender stored; the name is optional                                                       | Low                                                                                               |
| H17 | Coerced sharing: a person is made to share everything                                                      | Medium     | High     | No technical control removes this. G2 to G5 make refusing and undoing quiet; G10 gives a route to help                                               | **High for the people it affects.** This is the plan's own strongest argument against the feature |
| H18 | Joining exposes items a person marked "joint" before the household existed, perhaps held with someone else | Medium     | High     | Joining shares nothing, joint items included; "joint with this household" is the owner's choice per item (section 2.3)                               | Low if H7 is accepted. **High if the plan's wording is built as written**                         |
| H19 | Free text (a household name, a joint item's name) is used to send unwanted messages to the other member    | Low        | Medium   | None planned. A question in the charity pack                                                                                                         | Medium                                                                                            |
| H20 | After someone leaves, the other person invites them again and again                                        | Low        | Medium   | An invitation is only a link the inviter sends themselves; Flump shows the invited person nothing until they open it                                 | Low inside Flump; the pressure happens outside it                                                 |
| H21 | Nothing is logged, so a complaint or a leak between members cannot be investigated                         | Medium     | Medium   | Section 2.3: joining and leaving on the actor's own trail (H6)                                                                                       | Medium. Accepted as the price of G4                                                               |

## 10. What must exist before the switch is turned on

1. The specialist charity's view on the safety pack (CD7), and the changes it leads to, recorded in the pack.
2. The owner's approval of the help line wording and the policy amendment (CD10): [`E34-help-line-wording.md`](../audit/plans/E34-help-line-wording.md).
3. The solicitor's answers to the E34 questions, if the owner decides to wait for them (H4). The owner's three conditions for turning the switch on are items 1, 2 and 8; they do not name the solicitor.
4. The owner's decisions in section 11.
5. Privacy notice and terms updated for households (two data subjects, what the other person can see, silent leaving, the access request limits in 5.2), with a version bump and a review round.
6. `data-map.md`, `ropa.md`, `USER_DATA_REGISTRY` and the value map updated in the build PR.
7. The backup restore runbook step (5.6).
8. This document re-checked against the code, each "planned" replaced by a `path:line` reference, and signed.

## 11. Decisions for the owner

| #   | Question                                                                                                                                 | This draft's recommendation                                                                                |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| H1  | When one member deletes a joint item, does the other keep a copy?                                                                        | Yes (risk H11). The plan is silent                                                                         |
| H2  | Retention in section 5.6: delete membership and household rows on leaving, keeping no "former member" record                             | Yes                                                                                                        |
| H3  | Does a joint item the other member entered reach my AI connection without their opt-in?                                                  | No (section 7). This changes one line of the plan's page table                                             |
| H4  | Turn the switch on before the solicitor has answered, once the charity review, the signed DPIA and the approved help line wording exist? | The owner's call; CD9 says C3 onward comes after launch and the solicitor's view                           |
| H5  | Accept the residual risks in section 9, in particular H14 and H17, which no control removes                                              | The owner's call, after the charity's view                                                                 |
| H6  | Are household actions written to the audit trail (section 2.3)?                                                                          | Joining and leaving on the actor's own trail, naming nobody else; sharing switches not at all              |
| H7  | Does an item marked "joint" before or outside the household become visible on joining?                                                   | No. Joining shares nothing; "joint with this household" is chosen per item. This amends the plan's wording |

## 12. Residual risk and sign-off

**Residual risk (AI drafter's view):** medium overall, and high for a person who is being coerced (H17) or whose device is in someone else's hands (H14). The controls make the feature much safer than full mutual visibility, and they make refusing, undoing and leaving quiet. They do not make it safe for everyone. If the owner judges that the risk stays high after the charity's advice is applied, prior consultation with the ICO (Article 36) must be considered with the solicitor.

### Sign-off

| Role                                              | Name | Decision                              | Date | Notes |
| ------------------------------------------------- | ---- | ------------------------------------- | ---- | ----- |
| Owner (controller, sole trader)                   |      | Accept / Accept with changes / Reject |      |       |
| Solicitor                                         |      |                                       |      |       |
| Specialist charity (view on the safety pack, CD7) |      |                                       |      |       |

### AI review record

| Reviewer                                                                        | Date       | Verdict                                                               |
| ------------------------------------------------------------------------------- | ---------- | --------------------------------------------------------------------- |
| Claude Fable (an AI model), a separate decider that wrote none of this document | 2026-11-25 | Sound as a draft once the listed changes are made. See the note below |

The reviewer required four changes, all made in this version: an existing "joint" marker must not be shared by joining (sections 2.3 and 5.1, risk H18, decision H7); a statement on the audit trail (section 2.3, risk H21, decision H6); a necessity and proportionality section (2.6); and the charity pack made to stand alone. Its advisory points were also applied (5.2 as working positions, who a person is joining, CD9 in section 10, Article 14 for a partner who never joins). On a second look the same day the reviewer found all four closed and nothing new blocking, and gave the verdict "Sound as a draft for the owner to sign"; the first verdict is kept in the table because it is the one given on the text as first written. On that second look it did not re-read sections 5.2 and 5.6. The reviewer did not verify the legislation text, the ICO page or the charity websites; it relied on the drafter's quotations.

An AI review is not a legal opinion and does not stand in for any row of the sign-off table.

## 13. Sources read on 25 November 2026

- legislation.gov.uk, latest revised text: UK GDPR Articles 2, 15, 17, 20, 26 and 35; Data Protection Act 2018, Schedule 2, paragraph 16.
- ico.org.uk, "When do we need to do a DPIA?" (marked by the ICO as under review).
- Not re-read today, cited from the plan: Domestic Abuse Act 2021 section 1(4); FCA FG21/1; the UK Finance Financial Abuse Code; Surviving Economic Abuse's good practice guide. UK GDPR Articles 5, 6, 9, 13, 14, 16, 33, 34 and 36 were applied from the drafter's knowledge and not re-read.
