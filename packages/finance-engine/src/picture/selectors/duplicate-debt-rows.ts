import type { BudgetEntryItem } from "../../ai-context-pack.js";
import type { PortfolioSnapshot } from "../../portfolio.js";
import { budgetRowMonthly, DEBT_CATEGORY, SAVINGS_CATEGORY } from "./budget-totals.js";

/** A budget row that may be the same payment as a debt account's saved minimum. */
export interface PossibleDuplicateDebtRow {
  rowId: string;
  rowName: string;
  rowCategory: string;
  debtAccountId: string;
  debtAccountName: string;
  /** The row's amount and the debt's saved minimum payment, pounds a month (they are equal). */
  monthlyAmount: number;
}

/** Lower-case words of letters and digits, so "Car loan (HSBC)" is ["car", "loan", "hsbc"]. */
function words(text: string): string[] {
  return text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
}

/** Words a payment row may carry besides the account's name. Anything else is a different thing. */
const PAYMENT_WORDS = new Set([
  "payment",
  "payments",
  "repayment",
  "repayments",
  "minimum",
  "min",
  "monthly",
  "bill",
  "direct",
  "debit",
  "dd",
  "my",
  "the",
  "for",
  "to",
]);

/**
 * True when `needle` appears in `haystack` as a run of whole words and every other word is a
 * payment word. So "Car loan payment" names the debt "Car loan", and "Car insurance" does not
 * name a debt called "Car".
 */
function namesDebt(haystack: readonly string[], needle: readonly string[]): boolean {
  if (needle.length === 0 || needle.length > haystack.length) return false;
  for (let start = 0; start + needle.length <= haystack.length; start++) {
    if (!needle.every((word, i) => haystack[start + i] === word)) continue;
    const rest = [...haystack.slice(0, start), ...haystack.slice(start + needle.length)];
    if (rest.every((word) => PAYMENT_WORDS.has(word))) return true;
  }
  return false;
}

const pence = (n: number): number => Math.round(n * 100);

/**
 * Budget rows outside the "debt" category that look like a debt account's own payment, which
 * safe to spend and months of cover would then count twice (once as an essential, once as the
 * debt's minimum). It only reports candidates: it changes no total. A row is a candidate when
 *
 * - it is not income, not a savings row and not already in the "debt" category;
 * - its monthly amount equals the debt's saved minimum payment to the penny (an estimated
 *   minimum never matches, because nobody saved it); and
 * - its name contains the debt account's full name as whole words, ignoring case, and nothing
 *   else but payment words ("payment", "repayment", "monthly", "direct debit" and the like).
 *
 * A row is paired with one debt at most: the one with the longest matching name, and none at all
 * when two debts tie. The caller asks the person; on a yes it moves the row to the "debt"
 * category, which `essentialCommitments` already counts once.
 */
export function findPossibleDuplicateDebtRows(
  budget: readonly BudgetEntryItem[],
  snapshot: PortfolioSnapshot,
): PossibleDuplicateDebtRow[] {
  const debts = snapshot
    .toDebtItems()
    .filter((d) => d.minimumPaymentEstimated !== true && (d.minimumPayment ?? 0) > 0)
    .map((d) => ({ id: d.id, name: d.name, minimum: d.minimumPayment ?? 0, words: words(d.name) }))
    .filter((d) => d.words.length > 0);

  const found: PossibleDuplicateDebtRow[] = [];
  for (const row of budget) {
    if (row.isIncome || row.category === DEBT_CATEGORY || row.category === SAVINGS_CATEGORY) {
      continue;
    }
    const monthly = budgetRowMonthly(row);
    if (!(monthly > 0)) continue;
    const rowWords = words(row.name);
    const matches = debts.filter(
      (d) => pence(d.minimum) === pence(monthly) && namesDebt(rowWords, d.words),
    );
    if (matches.length === 0) continue;
    const longest = Math.max(...matches.map((d) => d.words.length));
    const best = matches.filter((d) => d.words.length === longest);
    const debt = best.length === 1 ? best[0] : undefined;
    if (!debt) continue;
    found.push({
      rowId: row.id,
      rowName: row.name,
      rowCategory: row.category,
      debtAccountId: debt.id,
      debtAccountName: debt.name,
      monthlyAmount: Math.round(monthly * 100) / 100,
    });
  }
  return found;
}
