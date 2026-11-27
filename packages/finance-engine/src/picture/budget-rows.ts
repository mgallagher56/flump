import type { BudgetEntryItem } from "../ai-context-pack.js";
import { budgetRowLinkOf } from "./selectors/linked-budget-rows.js";

/**
 * Saved budget rows as any caller holds them, mapped to the engine's budget item. In their own
 * module (E12 S5b) so the mobile app's strip entry can map rows without the whole picture;
 * `build.ts` re-exports them.
 */

/** A budget row as any caller holds it: API JSON, a TypeORM entity or a fixture. */
export interface BudgetRowLike {
  id?: unknown;
  category?: unknown;
  name?: unknown;
  amount?: unknown;
  frequency?: unknown;
  isIncome?: unknown;
  isEssential?: unknown;
  ownership?: unknown;
  sharePercent?: unknown;
  linkKind?: unknown;
  linkAccountId?: unknown;
}

/** A stored share (1-100), or null when missing or unreadable. */
function shareFromRow(value: unknown): number | null {
  const n = typeof value === "string" && value !== "" ? Number(value) : value;
  return typeof n === "number" && Number.isFinite(n) ? n : null;
}

/** Maps one budget row. Unreadable amounts become 0; a missing frequency means monthly. */
export function budgetEntryFromRow(row: BudgetRowLike, index = 0): BudgetEntryItem {
  const amount = Number(row.amount);
  return {
    id: typeof row.id === "string" && row.id !== "" ? row.id : `budget-${index}`,
    category: typeof row.category === "string" ? row.category : "",
    name: typeof row.name === "string" ? row.name : "",
    amount: Number.isFinite(amount) ? amount : 0,
    frequency:
      typeof row.frequency === "string" && row.frequency !== "" ? row.frequency : "monthly",
    isIncome: row.isIncome === true,
    isEssential: row.isEssential === true,
    ownership: row.ownership === "joint" ? "joint" : "sole",
    sharePercent: shareFromRow(row.sharePercent),
    // A linked row's stored amount is never read: the linked-rows selector resolves it.
    ...(budgetRowLinkOf(row.linkKind) ? { linkKind: budgetRowLinkOf(row.linkKind) } : {}),
    // The account a savings or debt line reads; null once that account is deleted.
    ...(typeof row.linkAccountId === "string" && row.linkAccountId !== ""
      ? { linkAccountId: row.linkAccountId }
      : {}),
  };
}
