import { type AccountShareInput, resolveAccountOwnership } from "./joint-share.js";

/**
 * The household joint summary (E34 C3): the one shared figure list, read-only. It is the joint
 * accounts of each household member who chose to share them, the viewer included.
 *
 * - Joint only: an account counts when `resolveAccountOwnership` says "joint", so an ISA or pension
 *   marked joint by mistake never shows (it cannot be held jointly).
 * - The whole stored balance, as its owner holds it. No share is applied and no percentage is sent.
 * - Nothing from a member who does not share: no item, no count and no placeholder (G3), so "the
 *   other person shares nothing" and "the other person has no joint accounts" read the same.
 * - No total: an account both people added appears twice, once per record, until slice C2 pairs
 *   the two copies and counts it once.
 * - A stable order by name, then type (then balance, then whose record, only to break exact ties).
 *   Never grouped by person.
 */

/** One stored account, as the summary needs it. */
export interface JointSummaryAccount extends AccountShareInput {
  name: string;
  type: string;
  balance: number;
}

/** One household member's accounts and their own sharing choice. */
export interface JointSummarySource {
  addedBy: "you" | "other";
  sharesJointSummary: boolean;
  accounts: readonly JointSummaryAccount[];
}

/** One item in the summary, matching the contract's `HouseholdJointSummaryItem`. */
export interface JointSummaryItem {
  name: string;
  type: string;
  wholeBalance: number;
  addedBy: "you" | "other";
}

const byText = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

function compareItems(a: JointSummaryItem, b: JointSummaryItem): number {
  return (
    byText(a.name.toLocaleLowerCase("en-GB"), b.name.toLocaleLowerCase("en-GB")) ||
    byText(a.name, b.name) ||
    byText(a.type, b.type) ||
    a.wholeBalance - b.wholeBalance ||
    byText(a.addedBy, b.addedBy)
  );
}

/** The summary items from each member's accounts and sharing choice (see the comment above). */
export function selectJointSummaryItems(
  sources: readonly JointSummarySource[],
): JointSummaryItem[] {
  const items: JointSummaryItem[] = [];
  for (const source of sources) {
    if (source.sharesJointSummary !== true) continue;
    for (const account of source.accounts) {
      if (resolveAccountOwnership(account) !== "joint") continue;
      items.push({
        name: account.name,
        type: account.type,
        wholeBalance: account.balance,
        addedBy: source.addedBy,
      });
    }
  }
  return items.sort(compareItems);
}
