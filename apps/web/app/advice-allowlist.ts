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

  // Temporary: web copy (E29-T4 rewrites).
  ...[
    [
      "apps/web/app/features/debt/components/PayoffStrategyControls/PayoffStrategyControls.tsx",
      "optimal",
    ],
    ["apps/web/app/components/debt/PayoffStrategySwitcher.tsx", "optimal"],
    ["apps/web/app/components/debt/UkDebtInstrumentsCard.tsx", "recommend"],
    ["apps/web/app/containers/debt/DebtContainer.tsx", "optimal"],
    ["apps/web/app/containers/pension/PensionContainer.tsx", "actionable"],
    ["apps/web/app/routes/tools.$slug.tsx", "move-into-wrapper"],
    ["apps/web/app/routes/tools.$slug.tsx", "optimal"],
    ["apps/web/app/routes/tools.$slug.tsx", "you-should"],
  ].map(
    ([file, patternId]): AdviceAllowEntry => ({
      file: file as string,
      patternId: patternId as string,
      kind: "temporary",
      reason: "Advice-style wording in the E29 inventory.",
      owner: "E29-T4",
    }),
  ),
  {
    file: "apps/web/app/routes/tools.$slug.tsx",
    patternId: "recommend",
    kind: "temporary",
    reason: "FAQ answer says 'not a recommendation'. Reword or keep as a permanent entry at T4.",
    owner: "E29-T4",
  },

  // Temporary: product setting that E17-N18 rewrites.
  {
    file: "apps/web/app/features/ai-connections/components/McpConnectionCard/McpConnectionCard.tsx",
    patternId: "recommend",
    kind: "temporary",
    reason: "'90 Days (Recommended)' token expiry label.",
    owner: "E17-N18",
  },

  // Temporary: E15 lanes (mortgage route and packages/ui; hand off, do not edit).
  {
    file: "apps/web/app/containers/mortgage/MortgageContainer.tsx",
    patternId: "optimise-product",
    kind: "temporary",
    reason: "'optimise your savings strategy' (E15 lane).",
    owner: "E15",
  },
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

  // Temporary: engine (E29-T5 rewrites).
  ...[
    ["packages/finance-engine/src/health-score.ts", "recommend"],
    ["packages/finance-engine/src/health-score.ts", "top-tier"],
    ["packages/finance-engine/src/health-score.ts", "maximise"],
    ["packages/finance-engine/src/health-score.ts", "optimise-product"],
    ["packages/finance-engine/src/types.ts", "recommend"],
    ["packages/finance-engine/src/debt-payoff.ts", "recommend"],
    ["packages/finance-engine/src/ai-context-pack.ts", "recommend"],
  ].map(
    ([file, patternId]): AdviceAllowEntry => ({
      file: file as string,
      patternId: patternId as string,
      kind: "temporary",
      reason: "Engine recommendation wording and fields (neutral observations replace them).",
      owner: "E29-T5",
    }),
  ),

  // Temporary: MCP (E17 removes or rewrites; E29-T6 enforces the policy on the surface).
  {
    file: "packages/mcp/src/tools/mortgage-isa.tool.ts",
    patternId: "recommend",
    kind: "temporary",
    reason: "`recommendation` output key.",
    owner: "E17-N11",
  },
  {
    file: "packages/mcp/src/tools/financial-audit.tool.ts",
    patternId: "recommend",
    kind: "temporary",
    reason: "Surfaces `topRecommendations` (line 113); N11 deletes the tool.",
    owner: "E17-N11",
  },
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
