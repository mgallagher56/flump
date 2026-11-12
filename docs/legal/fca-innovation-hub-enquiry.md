# FCA Innovation Hub enquiry (draft for the owner to send)

> **DRAFT, agent-drafted, unreviewed, not legal advice; owner reviews and signs later.**
> Version 0.1, 2026-11-12. An agent wrote this text. **Nothing has been sent.** Agents never contact third parties. The owner reviews, edits, sends it from their own account, and records the send date in [`docs/compliance/E29-gate.md`](../compliance/E29-gate.md) (that date starts the 8-week clock for E26).

Everything above this line and the notes at the end are for the owner and are not part of the message. The message is the section between the two rules. It is written to fit about one and a half pages. Code facts that sit behind each statement, with path and line, are in [fca-perimeter-brief.md](fca-perimeter-brief.md).

---

**Subject: Innovation Hub enquiry: UK personal finance calculators, bank data and AI-assistant access (pre-incorporation sole trader)**

Dear Innovation Hub team,

I am an individual (not yet incorporated) building Flump, a UK personal finance web application. I would like your view on where it sits relative to the regulatory perimeter, and on whether a pre-incorporation sole trader is eligible for Innovation Hub support. I would be grateful for any steer, and for a pointer to the right FCA contact if the Hub is not.

**What Flump is today.** It is free, in a closed test with a handful of invited people, and not yet public. Users enter their own figures (accounts, debts, income, mortgage, pension) and see net worth, debt and tax estimates and projections computed from those figures. It has no payments or money movement, names no providers or products, and has no affiliate links, referrals or advertising. It describes its output as guidance and calculations, not advice.

**1. Bank data through personal access tokens.** A user can paste their own Monzo or Starling personal access token, or a Trading 212 key, so Flump can read their balances and pots and show them with manually entered accounts. Flump does not initiate payments. This is currently limited to the owner's own account by an allowlist. Question: does reading a person's own account data in this way, with a token that the user generates, make Flump an account information service provider, and does that change if it is used only by the owner, by a few invited people free of charge, or by the public?

**2. Where guidance could become advice.** Flump produces user-specific outputs, and I would like to know where you see the line:

- a debt payoff order (avalanche or snowball) computed from the user's own debts (RAO article 39E, debt counselling);
- a comparison of overpaying a mortgage with investing in an ISA, shown as two projected outcomes (articles 53 and 53A);
- pension contribution and tax-relief estimates, including salary-sacrifice outputs and the point at which a contribution brings adjusted net income to £100,000 (the personal allowance taper);
- marginal-rate projections;
- content that varies by a computed segment of the user, such as how much debt they have. My working assumption, which I would like to test, is that a segment may only change which modules appear by default and never the action text, under the targeted support rules in force from April 2026.

I have adopted written internal rules for this (no "you should" or "best" wording, no product or provider names, both options shown side by side, no one-click save prompted by a result, a notice on every projection) and an automated check on the text. Question: are those the right design constraints, and is there anything you would add?

**3. Answers from third-party AI assistants.** A user can give their own AI assistant read-only access to their Flump figures through a connection (the Model Context Protocol). The assistant calls Flump's calculators and then writes its own reply. Flump does not control that reply. Question: where does responsibility sit if an assistant turns Flump's calculations into a personal recommendation, and what should Flump's tool outputs and terms say to stay on the right side of the line? Access to this is currently limited to the owner.

**What I am not asking.** I am not asking for authorisation or for a formal opinion at this stage. I understand any reply is informal.

**Eligibility.** Flump is currently run by me as an individual. I plan to incorporate before opening to the public or charging. Is that stage within the Hub's remit?

I can share the design rules, example screens and tool descriptions on request.

Kind regards,

`[OWNER NAME, CONTACT DETAILS]`

---

## Notes for the owner (not part of the message)

1. **Check every statement is true on the day you send it.** In particular "closed test", "handful of invited people", "limited to the owner's own account" and "MCP access limited to the owner". Bank connect is owner-allowlisted in code today (`apps/backend/src/bank-connections.access.ts:16-31`). The MCP allowlist (E29-T8) had not landed at `5cfe3ef0` (`apps/backend/src/mcp.controller.ts:49-51,80-86` have `AuthGuard` only), so do not send the sentence about MCP being limited to the owner until it has, or until you have confirmed no other user holds a token.
2. **Wording about regulatory status.** The message makes no statement that Flump is or is not authorised, deliberately. If you add one, it is owner-only wording (E7).
3. **After sending:** record the date in `E29-gate.md`, file the reply there, and note whether it is adverse (an adverse reply is a trigger for a separate written FCA opinion).
4. **Attachments** are optional. The T1 rules ([advice-boundary-policy.md](../compliance/advice-boundary-policy.md)) are the document most worth offering.
5. **Do not paste personal data** of any user into the message.
