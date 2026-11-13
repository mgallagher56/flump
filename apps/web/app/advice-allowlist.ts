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
];
