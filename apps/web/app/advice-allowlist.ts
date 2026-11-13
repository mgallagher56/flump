/**
 * Advice-language allow-list (E29-T3). A ratchet: `copy-guard.test.ts` fails on a new hit that is
 * not listed here AND on a stale entry whose hit has gone, so this list only ever shrinks.
 * `permanent` entries are legitimate uses with a reason. `temporary` entries name the ticket that
 * removes them. Paths are relative to the repo root. Marketing keeps its own list in
 * `apps/marketing/src/claims.test.ts`.
 */
export interface AdviceAllowEntry {
  file: string;
  /** The `ADVICE_PATTERNS` id (`packages/finance-engine/src/compliance/advice-lexicon.ts`). */
  patternId: string;
  kind: "permanent" | "temporary";
  reason: string;
  owner: string;
}

export const ADVICE_ALLOWLIST: AdviceAllowEntry[] = [
  // Permanent: legitimate uses.
  {
    file: "packages/finance-engine/src/tax-rules.ts",
    patternId: "you-should",
    kind: "permanent",
    reason: "Disclaimer: tells the user to consult a qualified adviser.",
    owner: "E29-T3",
  },
  {
    file: "apps/web/app/components/dialogs/connectBankWizard/ConnectBankWizard.tsx",
    patternId: "recommend",
    kind: "permanent",
    reason:
      "Technical choice ('Personal Access Token (Recommended)'), not a financial recommendation.",
    owner: "E29-T3",
  },
  {
    file: "apps/web/app/components/dialogs/addEditAccountsDialog/AddEditAccountsDialog.tsx",
    patternId: "move-into-wrapper",
    kind: "permanent",
    reason: "Account-type description ('Invest, Stocks ISA & CFD sync'), not an instruction.",
    owner: "E29-T3",
  },

  {
    file: "packages/mcp/src/evals/graders.ts",
    patternId: "recommend",
    kind: "permanent",
    reason: "Eval grader: the advice patterns it detects are written as regex source.",
    owner: "E17-N21",
  },
  {
    file: "packages/mcp/src/evals/graders.ts",
    patternId: "move-into-wrapper",
    kind: "permanent",
    reason: "Eval grader: the advice patterns it detects are written as regex source.",
    owner: "E17-N21",
  },
  {
    file: "packages/mcp/src/evals/golden-tasks.ts",
    patternId: "move-into-wrapper",
    kind: "permanent",
    reason:
      "Eval fixture: a user question ('put the money in my ISA') the model must not answer with a product recommendation.",
    owner: "E17-N21",
  },

  // Temporary: product setting that E17-N18 rewrites.
  {
    file: "apps/web/app/features/ai-connections/components/McpConnectionCard/McpConnectionCard.tsx",
    patternId: "recommend",
    kind: "temporary",
    reason: "'90 Days (Recommended)' token expiry label.",
    owner: "E17-N18",
  },

  // Temporary: E15 lanes (packages/ui; hand off, do not edit).
  {
    file: "packages/ui/src/calculators/DebtSnowballCalculator/DebtSnowballCalculator.tsx",
    patternId: "optimal",
    kind: "temporary",
    reason: "E15 lane (packages/ui).",
    owner: "E15",
  },
  {
    file: "packages/ui/src/calculators/StudentLoanCalculator/StudentLoanCalculator.tsx",
    patternId: "recommend",
    kind: "temporary",
    reason: "Reads the deprecated student-loan `recommendation` field (E15 migrates it after T5).",
    owner: "E15",
  },

  // Temporary: deprecated student-loan `recommendation` field (kept until E15 migrates
  // StudentLoanCalculator to `projectedOutcome`, then delete the field and these entries).
  ...["packages/finance-engine/src/types.ts", "packages/finance-engine/src/debt-payoff.ts"].map(
    (file): AdviceAllowEntry => ({
      file,
      patternId: "recommend",
      kind: "temporary",
      reason: "Deprecated `recommendation` field, superseded by `projectedOutcome` (E29-T5).",
      owner: "E15",
    }),
  ),

  // Temporary: MCP (E17 removes or rewrites; E29-T6 enforces the policy on the surface).
  {
    file: "packages/mcp/src/tools/uk-tax-trap.tool.ts",
    patternId: "optimal",
    kind: "temporary",
    reason: "'optimal pension salary sacrifice' in the tool description.",
    owner: "E17-N12",
  },
  ...["recommend", "high-impact", "optimal", "maximise"].map(
    (patternId): AdviceAllowEntry => ({
      file: "packages/mcp/src/prompts/uk-advisor.prompts.ts",
      patternId,
      kind: "temporary",
      reason: "Advice-style prompt text.",
      owner: "E17-N14",
    }),
  ),
];
