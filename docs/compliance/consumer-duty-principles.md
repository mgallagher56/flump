# Consumer Duty voluntary principles (E29-T10)

> **DRAFT, agent-drafted, unreviewed, not legal advice; owner reviews and signs later.**
> Version 0.1, 2026-11-12.

## Purpose and status

The FCA Consumer Duty sets four outcomes for regulated firms: products and services, price and value, consumer understanding, and consumer support. Flump adopts these four outcomes **voluntarily**, as a design standard for how it treats the people who use it. Adopting them is a product choice. It is not a claim about regulatory status and it does not create any obligation under FCA rules.

**Regulatory-status sentence (held for the owner).** The statement of Flump's regulatory position, and that adoption of the Duty is voluntary, is owner-only wording (E7). It is a placeholder here and must not be copied into any user-facing surface until the owner writes it:

> `[OWNER WORDING REQUIRED: statement that Flump is not FCA-authorised and that applying the Duty principles is voluntary]`

The claims guards (`apps/marketing/src/claims.test.ts`, `apps/web/app/copy-guard.test.ts`) scan `.ts` and `.tsx` source only, so this Markdown file is not scanned. The wording still needs the owner before it goes anywhere that a guard does scan.

This document supports, and does not replace, the rules in [advice-boundary-policy.md](advice-boundary-policy.md) (R1 to R8) and the gate in [E29-gate.md](E29-gate.md).

## How to read the mapping

Each outcome lists the Flump practice that supports it, the evidence (a rule, a document or a code path), and its state. States are:

- **In place:** exists on `origin/main` at `5cfe3ef0`.
- **Planned:** has a ticket in the E29 plan or another epic, but is not merged.
- **Owner:** needs a decision or wording from the owner.

Where a path is cited it was checked on 2026-11-12.

## Outcome 1: Products and services

Aim: what Flump offers is designed to meet the needs of people who use it, and does not steer them.

| Practice                                                                                     | Evidence                                                                              | State                                                          |
| -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Results are guidance computed from the user's own figures, shown neutrally and side by side  | R1 in [advice-boundary-policy.md](advice-boundary-policy.md)                          | Planned (rules drafted; copy rewrite is E29-T4 and E29-T5)     |
| No personal recommendations or imperatives about investments, pensions, mortgages or debt    | R2                                                                                    | Planned (guard: E29-T3)                                        |
| No product judgements and no provider names                                                  | R3                                                                                    | Planned                                                        |
| A computed segment only chooses default layout, never action text                            | R4                                                                                    | Planned (engine labels: E29-T5; dashboard banner: E15 handoff) |
| A computed outcome never triggers a one-click save                                           | R5; `PensionContainer.tsx:366-376` is the current exception                           | Planned (E29-T4)                                               |
| No bank data or MCP access for people outside the owner's allowlist until the DPIA is signed | `apps/backend/src/bank-connections.access.ts` for bank connection; MCP gate is E29-T8 | In place (bank), Planned (MCP)                                 |
| No advice-style recommendations from a third-party model that uses Flump's calculations      | R7; output policy is E29-T6                                                           | Planned                                                        |

## Outcome 2: Price and value

Aim: if Flump ever charges, the price is clear, fair and not hidden in a way that harms people.

| Practice                                                                      | Evidence                                             | State    |
| ----------------------------------------------------------------------------- | ---------------------------------------------------- | -------- |
| Flump is free, with no pricing set                                            | E7 decision; marketing claims register               | In place |
| Pricing and charging copy stays as placeholders until the owner decides       | E7; E24                                              | Owner    |
| Charging starting is a trigger for a separate written FCA opinion             | [E29-gate.md](E29-gate.md), written-opinion triggers | Planned  |
| No affiliate links, referrals or paid placement; no commission on any product | E19 perimeter facts (fact 6); R3                     | In place |

## Outcome 3: Consumer understanding

Aim: communications help people understand what they are looking at and decide for themselves.

| Practice                                                                             | Evidence                                                                                                          | State                                                                 |
| ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Assumptions are visible and editable beside every result                             | Product principle; tools show inputs and assumptions beside outputs                                               | In place for the calculators, Planned as a rule for new surfaces (R1) |
| "Guidance, not advice" notice on projection surfaces                                 | `packages/ui/src/patterns/ProjectionNotice/ProjectionNotice.tsx:9-10` (`PROJECTION_NOTICE_TEXT`, interim wording) | In place (interim wording; owner and solicitor own the final text)    |
| A notice in every MCP result                                                         | R6; `MCP_NOTICE` in E29-T7, envelope in E17-N8                                                                    | Planned                                                               |
| "Unverified" on tax outputs until vectors are signed                                 | R6; E17 decision D4-B; E25 sign-off                                                                               | Planned                                                               |
| Beta notice: "guidance and calculations, not advice; unreviewed"                     | `BETA_NOTICE` in E29-T7; E19 C1 and C2                                                                            | Planned; Owner to publish                                             |
| Plain English in en-GB, with consistent house vocabulary                             | `docs/copy-style-guide.md`; R8                                                                                    | In place                                                              |
| No claim that a regulator, solicitor or accountant has reviewed anything unless true | `apps/marketing/src/claims.test.ts`                                                                               | In place                                                              |

## Outcome 4: Consumer support

Aim: people can get help, complain, and leave, including people who may be vulnerable.

| Practice                                                                                                                                                                | Evidence                                         | State                                          |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ | ---------------------------------------------- |
| Monitored support, privacy and security mailboxes                                                                                                                       | E19 6.12; E24-T7                                 | Planned; Owner (domain and mailboxes)          |
| A complaints route with acknowledgement within 30 days                                                                                                                  | E19 6.12                                         | Planned; Owner                                 |
| Vulnerability handling in support: a short written procedure for a person who discloses a vulnerability (signpost, do not advise, slow down account actions on request) | E19 6.12; to be written with the support runbook | Planned                                        |
| Signposting for people in debt (StepChange, National Debtline, Citizens Advice)                                                                                         | Links in `BudgetDashboard.tsx` (E19 6.12)        | In place                                       |
| Deletion and export: immediate hard delete everywhere, with a JSON export                                                                                               | DECISIONS round 3 item 10                        | Planned (manual runbook is enough for friends) |
| Revoking access is always possible: listing and deleting MCP tokens stays open to every user                                                                            | E29-T8 design (`GET` and `DELETE` stay open)     | Planned                                        |

## What this document does not do

- It does not say Flump is regulated or exempt. That question is the perimeter work in E29b and the Hub enquiry (see [`docs/legal/fca-perimeter-brief.md`](../legal/fca-perimeter-brief.md) and [`docs/legal/fca-innovation-hub-enquiry.md`](../legal/fca-innovation-hub-enquiry.md) once those land).
- It does not create a commitment to any user. Nothing here is published.
- It is not a Consumer Duty compliance assessment, which applies to firms that owe the Duty.

## Review

| Role                                                 | Name | Date | Notes |
| ---------------------------------------------------- | ---- | ---- | ----- |
| Owner (including the held regulatory-status wording) |      |      |       |
| Solicitor (E29b, launch)                             |      |      |       |
