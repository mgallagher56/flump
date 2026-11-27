import {
  FEATURE_GROUPS,
  type FeatureGroup,
  type FeatureLine,
  START_HERE,
} from "../../src/utils/featureIndex";

/*
 * Proposed copy for the features page (owner review of 27 November 2026: "very plain and the copy
 * doesn't seem to fit with any of our other copy"). Prototype only: production's
 * `utils/featureIndex.ts` is untouched; this file lays new names and one-liners over it by line
 * id, so the ids, details, app places, tags and links stay production's own.
 *
 * Voice: every one-liner is the voice of the Start here goals ("See what is left over each month",
 * "Understand your pay"): it starts with what the reader does, in sentence case, no full stop.
 * Estimates stay "an estimate". Where a new name comes from the app's own label it says so.
 */

export const ALL_FEATURES_LABEL = "All features";
export const ALL_FEATURES_MENU_DESCRIPTION = "The full list, one line each";

export const FEATURES_PAGE = {
  title: "Everything Flump does",
  lead: "You add your figures once. Flump shows your net worth, what is left over each month, your pay, your savings and what you owe.",
  hint: "Select a line to read a little more.",
} as const;

type Change = { name?: string; line: string; nameFrom?: "app" };

export const LINE_CHANGES: Readonly<Record<string, Change>> = {
  // Home and setup
  "guided-setup": { line: "Add your figures in four short steps" },
  // The app's page is titled "Your money" (its nav says "Home"); "Home page" read as this site's.
  "home-page": { name: "Your money", nameFrom: "app", line: "See all your figures on one page" },
  "choose-sections": { line: "Choose which sections you see, and their order" },
  // Accounts
  "accounts-list": { line: "See what you own and what you owe" },
  "net-worth": { line: "See everything you own, less what you owe" },
  "monthly-check-in": { line: "Update your balances once a month" },
  "net-worth-history": { line: "See how your net worth changes, month by month" },
  "account-goals": { line: "Set a target for any account" },
  "joint-accounts": { line: "Count only your share of a joint account" },
  // The app's Settings section is titled "What counts in your net worth".
  "net-worth-choices": {
    name: "What counts in your net worth",
    nameFrom: "app",
    line: "Choose whether your home and student loan count",
  },
  // Budget
  "income-and-spending": { line: "List what comes in and what goes out" },
  "left-over": { line: "See what is left over each month, or how much you are short" },
  "breathing-room": { line: "See how long your savings would cover the essentials" },
  "essential-and-flexible": { line: "Mark which costs are essential" },
  "income-stopping": {
    name: "If your income stopped",
    line: "See how long your savings would last",
  },
  "linked-figures": {
    name: "A budget that keeps up",
    line: "Change your pay or housing once, and your budget follows",
  },
  // Pay
  "take-home-pay": { line: "See an estimate of your take-home pay" },
  "pay-rise": { line: "See how much of a pay rise you would keep" },
  "self-assessment": { line: "See an estimate of your tax bill" },
  // The app's page for one source is titled "Income source".
  "income-by-source": {
    name: "Income sources",
    line: "Keep each kind of income in its own records",
  },
  receipts: { line: "Keep each receipt with its record" },
  "payments-on-account": { line: "See an estimate of your advance tax payments" },
  "compare-tax-years": { line: "See one tax year beside another" },
  // Savings and pension
  "savings-accounts": { line: "See each account's balance, rate and interest" },
  "isa-allowance": { line: "See an estimate of the ISA allowance you have used" },
  "savings-growth": { line: "See an estimate of how your savings could grow" },
  "time-to-target": { line: "See when your savings could reach a target" },
  "investment-returns": { line: "See an estimate of what your investments returned" },
  "pension-pots": { line: "See your pots and what goes into them" },
  "pension-contributions": { line: "See what a change would do to your take-home pay" },
  "retirement-plan": { line: "See an estimate of your income in retirement" },
  // Debt and borrowing
  "cards-and-loans": { line: "See every debt with its rate" },
  // The site already calls the app's tool "the pay extra tool on Cards and loans" (TRY_IT).
  "pay-extra": {
    name: "Pay extra",
    line: "Compare paying the highest rate first with the smallest balance first",
  },
  "uk-debt-tools": {
    name: "Other debt estimates",
    line: "See estimates for 0% deals, overdrafts, car finance and student loans",
  },
  mortgage: { line: "See your balance, rate and repayment schedule" },
  overpayment: { line: "See what paying extra could save" },
  "fixed-rate-end": { line: "See an estimate of your payment afterwards" },
  "overpay-or-save": { line: "Compare an overpayment with saving in an ISA" },
  "loan-to-value": { line: "See your mortgage against your home's value" },
  "buy-to-let": { line: "See a rental mortgage beside your own, with its yield" },
  "mortgage-estimates": { line: "See estimated loan sizes from your figures" },
  // AI connection
  "ask-ai": { line: "Ask about your saved figures in your own words" },
  "ai-imports": { line: "Check suggested balances before anything is saved" },
  // Settings and your data
  "download-data": { line: "Get everything you have saved as one file" },
  "reset-data": { line: "Delete your figures and keep your login" },
  "delete-account": { line: "Delete your account and your saved data" },
  "light-and-dark": { line: "Choose a light or a dark look" },
};

const apply = (line: FeatureLine): FeatureLine => {
  const change = LINE_CHANGES[line.id];
  return change ? { ...line, name: change.name ?? line.name, line: change.line } : line;
};

/** The groups with the proposed names and one-liners; everything else is production's. */
export const PROTO_GROUPS: readonly FeatureGroup[] = FEATURE_GROUPS.map((group) => ({
  ...group,
  lines: group.lines.map(apply),
}));

const PROTO_LINES = PROTO_GROUPS.flatMap((group) => group.lines);

export const protoNameOf = (id: string) => PROTO_LINES.find((l) => l.id === id)?.name ?? id;

export { START_HERE };
