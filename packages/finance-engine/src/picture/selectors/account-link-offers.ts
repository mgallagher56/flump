import type { BudgetEntryItem } from "../../ai-context-pack.js";
import type { PortfolioSnapshot } from "../../portfolio.js";
import { budgetRowMonthly, DEBT_CATEGORY, SAVINGS_CATEGORY } from "./budget-totals.js";
import {
  accountFitsBudgetLink,
  type BudgetAccountLink,
  budgetLinkAccountMonthly,
} from "./linked-budget-rows.js";

/**
 * A budget row that looks like a copy of one account's monthly amount, so the page offers to link
 * it ("Link this line to Easy access ISA"). Nothing is linked until the person taps: a typed plan
 * figure is theirs (system audit decision 1, no automatic re-linking).
 */
export interface BudgetAccountLinkOffer {
  rowId: string;
  rowName: string;
  rowCategory: string;
  link: BudgetAccountLink;
  accountId: string;
  accountName: string;
  /** The row's monthly figure and the account's monthly amount at share, pounds (they are equal). */
  monthly: number;
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
  "into",
  "saving",
  "savings",
]);

/**
 * True when `needle` appears in `haystack` as a run of whole words and every other word is a
 * payment word. So "Car loan payment" names the account "Car loan", and "Car insurance" does not
 * name an account called "Car".
 */
function namesAccount(haystack: readonly string[], needle: readonly string[]): boolean {
  if (needle.length === 0 || needle.length > haystack.length) return false;
  for (let start = 0; start + needle.length <= haystack.length; start++) {
    if (!needle.every((word, i) => haystack[start + i] === word)) continue;
    const rest = [...haystack.slice(0, start), ...haystack.slice(start + needle.length)];
    if (rest.every((word) => PAYMENT_WORDS.has(word))) return true;
  }
  return false;
}

/** The words a plain savings row may be made of ("Savings", "My monthly saving"): no other pot. */
const PLAIN_SAVING_WORDS = new Set([
  "savings",
  "saving",
  "monthly",
  "my",
  "the",
  "into",
  "to",
  "for",
]);

const pence = (n: number): number => Math.round(n * 100);

interface Candidate {
  id: string;
  name: string;
  words: string[];
  link: BudgetAccountLink;
  monthly: number;
}

/**
 * Rows the Budget page offers to link to an account, one offer per row and per account, in budget
 * order. It only reports offers: it changes no figure. A row is offered when
 *
 * - it is not income and not already linked to anything;
 * - its monthly figure at the person's share equals the account's saved monthly amount at the
 *   person's share to the penny (an account with no saved amount, or £0, is never offered); and
 * - it sits where a linked line of that kind would: a savings account matches a row in the
 *   "savings" category whose name is the account's name or only general words ("Savings",
 *   "Monthly saving"), so a "Holiday fund" row is never offered for an ISA; a debt account
 *   matches a row in the "debt" category. A debt account also matches
 *   a row in another spending category (not savings) whose name is the account's name and nothing
 *   but payment words ("Car loan payment"), the copy safe to spend would otherwise count twice.
 *
 * When two accounts match one row, the one the row names wins; with no single winner the row is
 * not offered. An account already linked to a line, or taken by an earlier row, is not offered
 * again. Linking moves the row into the kind's category, so the figures count it once.
 */
export function findBudgetAccountLinkOffers(
  budget: readonly BudgetEntryItem[],
  snapshot: Pick<PortfolioSnapshot, "getResolvedAccounts">,
): BudgetAccountLinkOffer[] {
  const linkedAccountIds = new Set(
    budget.map((row) => row.linkAccountId).filter((id): id is string => typeof id === "string"),
  );
  const candidates: Candidate[] = [];
  for (const account of snapshot.getResolvedAccounts()) {
    if (linkedAccountIds.has(account.id)) continue;
    const link: BudgetAccountLink | null = accountFitsBudgetLink("savings", account.rawType)
      ? "savings"
      : accountFitsBudgetLink("debt", account.rawType)
        ? "debt"
        : null;
    const monthly = budgetLinkAccountMonthly(account);
    if (!link || monthly === null || !(monthly > 0)) continue;
    candidates.push({
      id: account.id,
      name: account.name,
      words: words(account.name),
      link,
      monthly,
    });
  }

  const taken = new Set<string>();
  const offers: BudgetAccountLinkOffer[] = [];
  for (const row of budget) {
    if (row.isIncome || row.linked || row.linkKind) continue;
    const monthly = budgetRowMonthly(row);
    if (!(monthly > 0)) continue;
    const rowWords = words(row.name);
    const matches = candidates.filter((c) => {
      if (taken.has(c.id) || pence(c.monthly) !== pence(monthly)) return false;
      // A savings row must name the account, or be a plain "Savings" or "Monthly saving" row:
      // "Holiday fund" at the ISA's £100 is a different pot, never offered.
      if (c.link === "savings") {
        return (
          row.category === SAVINGS_CATEGORY &&
          (namesAccount(rowWords, c.words) ||
            (rowWords.length > 0 && rowWords.every((word) => PLAIN_SAVING_WORDS.has(word))))
        );
      }
      if (row.category === DEBT_CATEGORY) return true;
      return row.category !== SAVINGS_CATEGORY && namesAccount(rowWords, c.words);
    });
    const named =
      matches.length > 1 ? matches.filter((c) => namesAccount(rowWords, c.words)) : matches;
    const account = named.length === 1 ? named[0] : undefined;
    if (!account) continue;
    taken.add(account.id);
    offers.push({
      rowId: row.id,
      rowName: row.name,
      rowCategory: row.category,
      link: account.link,
      accountId: account.id,
      accountName: account.name,
      monthly: Math.round(monthly * 100) / 100,
    });
  }
  return offers;
}
