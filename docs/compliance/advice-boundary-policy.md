# Advice boundary policy (E29-T1)

> **APPROVED by the owner on 2026-11-13. Not legal advice.**
> Version 1.0, 2026-11-13 (drafted by an agent as v0.1 on 2026-11-12). A later solicitor view (E29b) may supersede this document.

This is the single numbered rule set for how Flump words and presents anything that could be read as a personal recommendation. The advice-language guard (E29-T3), the MCP output policy (E29-T6), the E25 tax copy, the E26 tools and every copy review cite these rules by id (R1 to R8) instead of inventing ad-hoc wording.

The rules are deliberately stricter than the likely legal line. Loosening a rule later is cheap. Walking back a shipped nudge is not.

**Status of the rules.** The owner approved this policy on 2026-11-13 (v1.0); sign-off is recorded in the table at the end. The rules are the working standard for agents. A solicitor view (E29b) may supersede them later.

**Scope.** Every surface that shows a computed result or explanatory text to a user: `apps/web`, `apps/marketing`, `packages/ui`, `packages/finance-engine` (strings that flow into the UI, the context pack and MCP), `packages/mcp` (tool descriptions, prompts, results), the AI context pack, emails and any future agent. Tax-rule explanations are in scope for R2 and R6 treated here as in scope for wording, pending E29b, because the wording reaches the same reader.

**Line references** below were checked against `origin/main` at `5cfe3ef0` on 2026-11-12. They will drift. The T3 guard allow-list (once it lands) is the live source of truth, and `advice-copy-inventory.md` (T2) is the dated snapshot.

## Rule summary

| Id  | Rule                                                             | Short form                                                                                          |
| --- | ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| R1  | Guidance framing                                                 | Show the user's own figures, neutrally, options side by side                                        |
| R2  | No personal recommendations or imperatives                       | No "you should", "we recommend", "best", "optimal", "move/invest/put your ... into"                 |
| R3  | No product types with qualitative judgements, no named providers | No "top-tier Cash ISA", no brand names                                                              |
| R4  | No segment-based nudges                                          | A computed segment may only pick default modules, never action text, a call to action or priorities |
| R5  | No one-click data-changing action prompted by a computed outcome | "Model this" pre-fills a what-if and never saves                                                    |
| R6  | Required notices                                                 | `ProjectionNotice`, the MCP notice, "unverified" on tax outputs                                     |
| R7  | MCP output policy                                                | Same language rules for tool results, descriptions and prompts, machine-checked                     |
| R8  | Allowed vocabulary                                               | Narrow, explicit exceptions                                                                         |

## R1. Guidance framing

**Rule.** Show results computed from the user's own figures, neutrally, with the alternatives side by side and the same weight. State what the number is and the assumptions behind it. Do not rank the alternatives for the user and do not tell them which to take.

Neutral means the copy would read the same if the result were reversed. Both outcomes are described with the same verbs and the same tone.

**Before and after.**

| Before (source)                                                                                                         | After                                                                                                                                   |
| ----------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/finance-engine/src/ai-context-pack.ts:367` renders `Recommendation: CONSIDER_OVERPAYING` for the student loan | "Projected outcome: balance repaid before write-off" or "Projected outcome: balance written off first", with the assumptions listed     |
| `apps/web/app/routes/tools.$slug.tsx:94` "Should you overpay your UK mortgage or invest ...?"                           | "Compare interest saved by overpaying a mortgage with a projected investment return over 5 to 25 years, using your own figures."        |
| `apps/web/app/components/debt/PayoffStrategySwitcher.tsx:303` "Mathematically optimal" next to Avalanche                | "Pays the highest interest rate first. Total interest: £X. Debt-free date: DD Month YYYY." Show the Snowball card with the same fields. |

## R2. No personal recommendations or imperatives

**Rule.** No personal recommendation or imperative about investments, pensions, mortgages, savings or debt. The following are banned in any user-visible or model-visible string, whatever the surrounding sentence:

- "you should", "we recommend", "recommended", "recommendation" (as advice)
- "best option", "best choice", "best strategy", "best product", "best deal", "best move"
- "optimal", "optimise your pension / ISA / savings / wealth / tax"
- "maximise" as a goal for the user
- "actionable" (as in "actionable optimisation")
- an instruction of the form "move / put / invest / switch ... into an ISA / SIPP / pension / savings account"
- "highest-impact" or "top-impact" actions

Replace the instruction with a statement of fact about the user's figures, in the third person or passive voice.

**Before and after.**

| Before (source)                                                                                                                                         | After                                                                                                |
| ------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `packages/finance-engine/src/health-score.ts:59-61` "Prioritize high-interest cards and overdrafts with Avalanche strategy to eliminate interest burn." | "£X of unsecured debt is at an APR above 20%."                                                       |
| `packages/finance-engine/src/health-score.ts:166` "Maximize remaining £20,000 UK ISA allowance before 5 April."                                         | "£X of this tax year's £20,000 ISA allowance is unused. The allowance resets on 6 April."            |
| `packages/finance-engine/src/health-score.ts:174-176` "Sacrifice £X into pension to reclaim your £12,570 personal allowance."                           | "Adjusted net income is £X, in the £100,000 to £125,140 band where the personal allowance tapers."   |
| `packages/mcp/src/prompts/uk-advisor.prompts.ts:28` "Recommend the top 3 highest-impact mathematical actions ..."                                       | "Summarise the three largest figures in my net worth, runway and debt, and state the assumptions."   |
| `apps/web/app/routes/tools.$slug.tsx:279` "Find out whether you should ever make voluntary overpayments ..."                                            | "See how a Plan 1, 2, 4 or 5 student loan balance develops with and without voluntary overpayments." |

## R3. No product types with qualitative judgements, and no named providers

**Rule.** Do not attach a quality or ranking word to a product type ("top-tier", "high-yield", "best-buy", "low-yielding"). Do not name any provider, brand, fund or platform as a suggestion. Neutral product names used to describe an input the user entered, or a legal wrapper that the rule itself defines, are fine ("Cash ISA", "workplace pension"). A provider name is allowed only where the user has connected or entered that provider themselves (for example a bank connection card), and never in advice-shaped copy.

**Before and after.**

| Before (source)                                                                                                                                     | After                                                                                                                                                                   |
| --------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/finance-engine/src/health-score.ts:137-138` "Move low-yielding current account cash to a top-tier Cash ISA or high-yield notice account." | "Liquid savings earn 1.2% AER on this account. The figure comes from the rate you entered."                                                                             |
| `apps/web/app/components/dialogs/addEditAccountsDialog/AddEditAccountsDialog.tsx:51` "Invest, Stocks ISA & CFD sync"                                | Reword to describe the connection ("Syncs a Trading 212 account's cash balance") and drop the product promotion. Name only because it is an integration the user picks. |

**Exception: MoneyHelper debt advice (owner decision, 2026-11-13, E31).** The debt page shows one neutral line, "Free, impartial debt help is available from MoneyHelper", linking to MoneyHelper's debt advice locator with an external-link cue (`apps/web/app/features/debt/components/DebtHelpLink`). Conditions:

- MoneyHelper is the only named service. No other debt-advice provider, charity or commercial firm is named anywhere.
- Every user sees the same line in the same place, with or without debts. It is never triggered, moved, reworded or emphasised by balances, arrears, missed payments, APRs or any other signal (R4). The component takes no props so it cannot be.
- The wording is a factual signpost, not a recommendation (R2) and not a judgement (copy guide 7b).

**Universal Credit and other benefits (owner decision, 2026-11-13, E31).** Flump does not model benefits. If a surface mentions them, it signposts only, with no eligibility or amount estimate.

## R4. No segment-based nudges

**Rule.** A computed segment (lifecycle stage, persona, income band, debt status) may only choose **which modules or widgets show by default**. It never selects:

- action text,
- a call to action,
- a priority order of what to do next, or
- a headline that frames the user's situation as a stage to be moved through.

CoachCard content is limited to app-housekeeping tasks, such as "add an APR to this debt" or "set your region". It never suggests a financial action.

The basis is the targeted support boundary: the FCA regime for targeted support went live on 6 April 2026, and segment-driven suggestions are the thing it regulates. This is a working assumption pending the E29b view.

The internal stage enums (`packages/finance-engine/src/types.ts:2-4`) are stored data and may remain, used only for layout defaults (decision E29 OD2, option A).

**Before and after.**

| Before (source)                                                                                                                                         | After                                                                                                                  |
| ------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `packages/finance-engine/src/health-score.ts:317` subline "Amplify compound wealth, optimize pensions, and eliminate mortgage interest." (stage 3 copy) | "No unsecured debt" as a factual label, with no subline                                                                |
| `apps/web/app/components/dashboard/HomeDashboard.tsx:524` hero "Stage 1: Stabilize & Clear"                                                             | Show the figure (unsecured debt total) with a neutral label. No stage title and no action.                             |
| A stage-3 user sees a "Boost your pension" card by default                                                                                              | Stage 3 users see the pension and tax modules in the default layout. The module's content is identical for every user. |

## R5. No one-click data-changing action prompted by a computed outcome

**Rule.** A computed outcome may offer to **model** a figure. It must never offer to **apply** one. A button prompted by a result ("Model this contribution") pre-fills a what-if form and changes nothing stored. Saving is a separate, deliberate step by the user in the normal edit flow. No computed outcome opens a confirmation dialog that saves.

This is decision E29 OD1, option A.

**Before and after.**

| Before (source)                                                                                                                                                                                                                      | After                                                                                                                                             |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/web/app/containers/pension/PensionContainer.tsx:455-457` button "Reclaim Allowance (SIPP £X) →" whose handler `handleOptimizeTaxTrap` (`:366-376`) calls `handleSyncContributions` and **saves a new contribution percentage** | Button "Model this contribution". It pre-fills the what-if with £X, and nothing is saved. A test asserts `handleSyncContributions` is not called. |
| `PensionContainer.tsx:447-452` "Actionable optimisation: Increase pension contributions or make a SIPP contribution of £X to recover ..."                                                                                            | "Adjusted net income above £100,000 reduces the personal allowance. A contribution of £X would bring it to £100,000 in this estimate."            |

## R6. Required notices

**Rule.** Each surface carries its notice, from one canonical source once `disclaimers.ts` exists (E29-T7). Until then use the existing wording.

| Surface                                                                                            | Notice                                                           | Source today                                                                                                      |
| -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Any projection surface (debt, mortgage, pension, savings, tax, budget runway, sandbox, tool pages) | `ProjectionNotice`                                               | `packages/ui/src/patterns/ProjectionNotice/ProjectionNotice.tsx:9-10` (`PROJECTION_NOTICE_TEXT`, interim wording) |
| Every MCP tool result                                                                              | A `notice` string, `MCP_NOTICE`                                  | Planned in E29-T7, carried by the E17-N8 envelope                                                                 |
| Every tax output (UI and MCP)                                                                      | The word "unverified" until the tax vectors are signed off       | E17 decision D4-B; E25 sign-off                                                                                   |
| Friends beta                                                                                       | `BETA_NOTICE`: guidance and calculations, not advice, unreviewed | Planned in E29-T7                                                                                                 |

Notices state facts about the service. They never state regulatory status. Statements about FCA authorisation are owner-only wording (E7) and are held by the claims guard.

A notice never excuses a rule break. Copy that breaks R2 stays broken beside a notice.

## R7. MCP output policy

**Rule.** MCP is the same product reaching the user through a third-party model, so every tool **result**, **description** and **prompt** obeys R1 to R6. In addition:

- Result keys must not be advice-shaped: `recommendation`, `recommendedX`, `favoursOption` and `favorsOption`, `best*`, `guaranteed*`. Neutral keys such as `projectedOutcome` or `monthlySetAsideEstimateGbp` are fine.
- Tool descriptions and prompts must not instruct the model to recommend, rank or "crush" anything. They ask for calculations and summaries.
- Every result carries the notice (R6) and states its assumptions.
- No provider names appear in outputs.
- Free-text user notes are excluded from tool output by default.
- Compliance is machine-checked (`assertToolOutputPolicy`, `assertDescriptionPolicy`, E29-T6). A violation fails a test, and a shrinking allow-list tracks current ones.

**Before and after.**

| Before (source)                                                                                                                       | After                                                                                                      |
| ------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `packages/mcp/src/tools/mortgage-isa.tool.ts:88` key `recommendation` ("Not applicable ... not advice")                               | key `note`, plain statement: "No active mortgage balance was found, so there is nothing to compare."       |
| `packages/mcp/src/tools/mortgage-isa.tool.ts:132` `guaranteedInterestSavedGbp`                                                        | `interestSavedGbp`, with the assumption stated beside it                                                   |
| `packages/mcp/src/tools/mortgage-isa.tool.ts:143-146` `favorsOption: "TAX_FREE_ISA_COMPOUNDING" or "GUARANTEED_MORTGAGE_OVERPAYMENT"` | Remove the key. Return both projected end values and the difference, and let the user read the comparison. |
| `packages/mcp/src/tools/uk-tax-trap.tool.ts:53` "Simulates optimal pension salary sacrifice ..."                                      | "Calculates income tax and National Insurance at a given pension contribution."                            |
| `packages/mcp/src/tools/financial-audit.tool.ts:113` `recommendations: healthScore.topRecommendations`                                | `observations: healthScore.observations`                                                                   |

Status: every row above is resolved. `mortgage-isa.tool.ts` and `financial-audit.tool.ts` were deleted by E17-N11, whose replacement tools use neutral keys (`interestSavedGbp`, `projectedOutcome`) and no `favorsOption`. `recommendedMonthlyTaxSetAsideGbp` is now `monthlySetAsideEstimateGbp` in the section 24 tool and the permanent allow-list is gone.

## R8. Allowed vocabulary

**Rule.** The guard bans advice **contexts**, not words, because the house spelling is "optimise" (`docs/copy-style-guide.md`). The exceptions are narrow and need a reason in the allow-list.

Allowed:

- **"optimise" as a neutral technical verb about the user's own settings**, for example a heading "Optimise display settings", where R2 is otherwise met. It is never used about pensions, ISAs, savings, wealth or tax.
- **"Recommended" for a product or technical setting that is not a financial action**, for example `McpConnectionCard.tsx:581` "90 Days (Recommended)" for token expiry and `ConnectBankWizard.tsx:575` "Personal Access Token (Recommended)". These stay on the permanent allow-list with a reason. Where an alternative is simple, prefer it. Status (2026-11-13): both examples were reworded ("90 days (default)", "Personal Access Token") and their allow-list entries removed, so no "Recommended" label remains in the app.
- **A disclaimer that tells the reader to consult a professional**, for example `packages/finance-engine/src/tax-rules.ts:52`. This is not a recommendation by Flump about a product.
- Code identifiers, comments and the word "optimistic" in an interest-rate scenario (`debtSummary.ts`, `DebtContainer.tsx`).

Preferred:

- **"Below £100,000" over "escape the tax trap".** "Escape" reads as an outcome promise. Use a threshold statement in the neutral voice.
- "Estimate" over "will" and "can" over "will".
- "Compare" over "choose" and "model" over "optimise".

## Using these rules

- **Reviewing copy.** Cite the rule id in the review comment ("R2: imperative").
- **Writing the guard.** Each `ADVICE_PATTERNS` entry in `advice-lexicon.ts` carries a `rule` field set to one of these ids.
- **Adding an allow-list entry.** The `reason` must name the sub-bullet in R8 that applies. A temporary entry names the owning ticket.
- **A new surface.** Run through R1 to R8 before the first merge. If a rule does not fit, raise it with the owner. Do not stretch a rule to make copy pass.

## Exceptions and rulings log

Cases the rules do not settle on their own. Each was ruled on by a fable decider subagent during the E29 copy sweep (2026-11-13). The rulings are **pending owner approval** as a v1.0 amendment. Until then they are the working reading for agents.

| Date       | Rule | Ruling                                                                                                                                                                                                                                                                                                                                                                             | Status                                    |
| ---------- | ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| 2026-11-13 | R2   | A neutral list of tax rules on a public guide is allowed where each item states the rule and its costs or conditions, with no "mitigation", "strategy" or "save tax" framing. Applied to the Section 24 guide (`apps/web/app/routes/tools.$slug.tsx`, "Other rules that affect the figures"). If a list sits directly under the user's own computed tax figure, remove it instead. | Pending owner; on the E29b solicitor list |
| 2026-11-13 | R5   | Copying a figure from the user's own profile into an unsaved edit form is a pre-fill, not an apply. The button says "Use", never "Apply". Applied to the budget setup wizard's take-home callout.                                                                                                                                                                                  | Pending owner                             |
| 2026-11-13 | R4   | A card shown only for a computed segment is allowed when its content is the same factual summary for everyone, with plain navigation links and no action button. It is not a CoachCard, because R4 keeps CoachCard to app housekeeping. Applied to the dashboard's unsecured debt card (`StageCoachCard`). No exception to R4 is created.                                          | Working reading (no amendment needed)     |

## Open points for the owner and solicitor

1. Whether the targeted-support regime applies to segment-driven layout defaults at all (R4 assumes the strict reading).
2. Whether "guidance" framing plus a notice is enough where R1 to R5 are all met (the solicitor view, E29b).
3. The final wording of `ProjectionNotice` and `BETA_NOTICE` (owner and solicitor).
4. Whether "Recommended" on a purely technical setting is acceptable long term, or should be removed everywhere to make the guard simpler.
5. Whether the public calculator guides may list tax rules that reduce tax at all (the Section 24 ruling in the log above), or whether the solicitor prefers those lists removed.

## Sign-off

| Role                     | Name  | Date       | Notes         |
| ------------------------ | ----- | ---------- | ------------- |
| Owner                    | Owner | 2026-11-13 | Approved v1.0 |
| Solicitor (E29b, launch) |       |            |               |
