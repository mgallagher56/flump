import { applyAccountShare, resolveAccountSharePercent } from "./joint-share.js";

/**
 * The joint marker on a budget entry (E34 C1). Mirrors accounts: `ownership` "sole" (default) or
 * "joint", and `sharePercent` 1-100, where a joint entry without one counts at 50%.
 */
export interface BudgetEntryShareInput {
  ownership?: string | null;
  sharePercent?: number | string | null;
}

/**
 * Only the marker is passed on: the account helpers read a name or type to refuse joint ISAs and
 * pensions, a rule that does not apply to budget entries ("ISA / Investments" can be shared).
 */
function shareOnly(entry: BudgetEntryShareInput) {
  return { ownership: entry.ownership ?? null, sharePercent: entry.sharePercent ?? null };
}

/** The share (0-100) of a budget entry that counts in the user's figures, as for accounts. */
export function resolveBudgetEntrySharePercent(entry: BudgetEntryShareInput): number {
  return resolveAccountSharePercent(shareOnly(entry));
}

/** An amount scaled by the entry's share, rounded to the penny; a sole entry is unchanged. */
export function applyBudgetEntryShare(amount: number, entry: BudgetEntryShareInput): number {
  return applyAccountShare(amount, shareOnly(entry));
}
