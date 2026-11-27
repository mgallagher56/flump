/**
 * The Budget tab's words (E12 S10, plan 9.10b), copied from web's Budget page so both apps say the
 * same: `BudgetContainer`, `BudgetOverview`, `BudgetCategoryList`, `linkedEntries`,
 * `BreathingRoom`, `BreathingRoomBasis`, `RunwayCalculator`, `ScenarioZone`, `ProjectionNotice`,
 * `DebtHelpLink`, `BudgetEntryDialog` and `BudgetEditor`. Web's `budgetCopyParity.test.tsx` pins each
 * one to web's own. Where a web link opens a page the app does not have yet, the words say "on the
 * website" after web's own.
 *
 * Copy guide rules: plain en-GB, sentence case, no exclamation marks or em dashes. A shortfall says
 * so plainly and nothing grades the figures or the person (advice policy R1). The figures come from
 * the engine; these functions only put them into words.
 */
import type { BreathingRoomFixedReason, LinkedBudgetSource } from "@flump/finance-engine/budget";
import { formatCurrency } from "@flump/format";

/** Whole pounds, as web's `formatCurrency` with no pence: "£1,960". */
const pounds = (value: number) => formatCurrency(value);

export const BUDGET = {
  /** Web's `PageHeader` title and subtitle. */
  title: "Your budget",
  subtitle: "Your income, spending and how long your money lasts.",
  loading: "Loading your budget",
  /** When the page's facts cannot be read (the app and Flump out of step). Mobile only. */
  loadErrorHeading: "We could not show your budget",
} as const;

/** Web's empty budget (`EmptyState` in `BudgetContainer`). The wizard is on the website until S15. */
export const EMPTY = {
  title: "No budget yet",
  description:
    "Add your income and what you spend each month to see what is left over and how long your money lasts.",
  /** Web's "Add common budget items", saying it opens the website. */
  action: "Add common budget items on the website",
} as const;

/** Web's `BudgetOverview`. */
export const OVERVIEW = {
  leftOver: "Left over each month",
  short: "Short each month",
  /** The hero's prompt with no income row. */
  emptyPrompt: "Add your income to see what is left over each month.",
  takeHomeNotSet: "Your take-home pay is not set, so what is left over is unknown.",
  /**
   * Web's housing prompt's first sentence; web's second points at the housing details below,
   * which are on the website for now, so the link says so instead.
   */
  housingNotSet: "Your housing payment is not set, so what is left over is unknown.",
  /** Web's "Add your salary" link, saying it opens the website. */
  addSalary: "Add your salary on the website",
  /** Web's link to the housing details, which are on the website for now (S11). */
  addHousing: "Add your housing payment on the website",
  addSalaryLine: "Add your salary to see what you have each month after essential spending.",
  addEssentialsLine: "Add your essential spending to see what you have after it each month.",
  moneyIn: "Money in each month",
  moneyInCaption: "After tax",
  goingOut: "Going out each month",
  goingOutCaption: "Bills, spending and savings",
  /** Web's `KpiStrip` prompt when both figures are unknown. */
  supportingPrompt: "Add your income and spending to see money in and going out",
  equationMoneyIn: "Money in",
  equationGoingOut: "Going out",
  equationLeftOver: "Left over",
  equationShort: "Short",
} as const;

/** Web's safe-to-spend sub-line, with the monthly figure. */
export function safeToSpendLine(monthly: number): string {
  return `Safe to spend before flexible spending: ${pounds(monthly)} a month, after essential spending, debt payments and savings.`;
}

/** The equation line as it shows: "Money in − Going out = Left over" (web's minus sign). */
export function equationShown(isShort: boolean): string {
  return `${OVERVIEW.equationMoneyIn} − ${OVERVIEW.equationGoingOut} = ${isShort ? OVERVIEW.equationShort : OVERVIEW.equationLeftOver}`;
}

/** What a screen reader hears for it, as web's hidden " minus " and " equals ". */
export function equationSpoken(isShort: boolean): string {
  return `${OVERVIEW.equationMoneyIn} minus ${OVERVIEW.equationGoingOut} equals ${isShort ? OVERVIEW.equationShort : OVERVIEW.equationLeftOver}`;
}

/** Web's `BudgetCategoryList`. */
export const CATEGORIES = {
  title: "Where your money goes",
  description:
    "Your regular monthly spending, by category (not one-off purchases). Open one to see its entries.",
  /** Web's "Edit budget", the page's one edit action. */
  editBudget: "Edit budget",
  /** Read after a row's figure when it opens the website (web: "open the mortgage page"). */
  aMonth: "a month",
  /** A linked or joint entry is changed on the website for now (S11, S12). Mobile only. */
  changeOnWebsite: "Change it on the website",
} as const;

/** Web's `BASE_CATEGORY_LABELS`, else the name with a capital (`getCategoryLabel`). */
const BASE_CATEGORY_LABELS: Record<string, string> = {
  housing: "Housing",
  bills: "Bills",
  expenses: "Expenses",
  savings: "Savings",
  income: "Income",
};

export function categoryLabel(category: string): string {
  return BASE_CATEGORY_LABELS[category] ?? category.charAt(0).toUpperCase() + category.slice(1);
}

/** Web's `housingTenureLabel`: how the person pays for housing, under the housing row. */
export function housingTenureLabel(status: string | null | undefined): string | undefined {
  switch (status) {
    case "renting":
      return "Renting";
    case "mortgage":
      return "Mortgage";
    case "own_outright":
      return "Own outright";
    case "living_with_family":
      return "Living with family or friends";
    default:
      return undefined;
  }
}

/** Web's `linkedSourceText`: where a linked line's figure comes from, or why it has none. */
export function linkedSourceText(source: LinkedBudgetSource | null): string | undefined {
  if (!source) return undefined;
  if (source.kind === "housingNotSet")
    return "Linked to your saved housing payment, which is not set";
  if (source.kind === "accountGone") return "The account this line used was removed or changed";
  const what = source.link === "savings" ? "monthly saving" : "monthly payment";
  return source.kind === "accountNotSet"
    ? `Linked to ${source.accountName}, which has no ${what} saved`
    : `From ${source.accountName}`;
}

/** A mortgage holder's housing row opens web's mortgage page (web's `hrefFor`). */
export const MORTGAGE_PAGE = "mortgage page on the website";

/** What a screen reader hears after a row that opens another page: ", open the mortgage page". */
export const openPage = (page: string) => `open the ${page}`;

/** Web's breathing room words (`utils/breathingRoom.ts`, `BreathingRoom`). */
export const BREATHING_ROOM = {
  label: "Breathing room",
  description: "How long your savings would cover the essentials.",
  /** Behind web's info tip; the app shows it under the description. */
  detail:
    "Savings means the accounts you can draw on: your current and savings accounts. The essentials are your essential spending and minimum debt payments.",
  emptyPrompt: "Add your essential spending to see this.",
  /** Opens the app's own Accounts tab, where the savings accounts are listed (S6). */
  viewSavings: "View your savings accounts",
  moneyToDrawOn: "Money to draw on",
} as const;

/** Web's source line under the figure. */
export function breathingRoomSource(liquidCash: number, monthlyEssentials: number): string {
  return `From your savings of ${pounds(liquidCash)} and essentials of ${pounds(monthlyEssentials)} a month.`;
}

/** Web's `BreathingRoomBasis`. */
export const BASIS = {
  title: "What Breathing room counts",
  closed: "Show what counts",
  open: "Hide what counts",
  intro:
    "Breathing room is the money in these accounts over the spending switched on here. A switch sets whether that entry is essential in your budget.",
  accountsHeading: "Accounts it draws on",
  noAccounts: "No current or savings accounts yet.",
  notCounted: "Investments and pensions are not counted.",
  /** Opens the app's own Accounts tab (S6). */
  viewOrUpdate: "View or update your savings accounts",
  spendingHeading: "Spending it covers",
  noSpending: "No spending entries yet.",
} as const;

/** Web's `FIXED_REASON`: why a row always counts. */
const FIXED_REASON: Record<BreathingRoomFixedReason, string> = {
  housing: "From your housing details, always counted",
  debt: "Debt payments are always counted",
};

/** Web's drawer subtitle: "2 accounts, 7 of 11 spending entries". */
export function basisSubtitle(accounts: number, counted: number, spending: number): string {
  return `${accounts} ${accounts === 1 ? "account" : "accounts"}, ${counted} of ${spending} spending entries`;
}

/** Web's switch hint: "Bills, £115 a month", with the reason when the row always counts. */
export function spendingHint(
  category: string,
  monthly: number,
  reason: BreathingRoomFixedReason | null,
): string {
  const base = `${categoryLabel(category)}, ${pounds(monthly)} a month`;
  return reason ? `${base}. ${FIXED_REASON[reason]}` : base;
}

/** Web's `ScenarioZone` defaults and `ProjectionNotice` text. */
export const SCENARIO = {
  badge: "Illustration, not saved",
  reset: "Reset to saved figures",
  announcementPrefix: "Illustration:",
  hide: "Hide what-if",
  notice:
    "Guidance, not advice. Flump works from the figures you enter and shows estimates, which can differ from what happens in practice. It is not financial, tax, investment or debt advice.",
} as const;

/** Web's `RunwayCalculator`. */
export const RUNWAY = {
  title: "Model a change to your budget",
  show: "Show what-if: redundancy pay, a spending cut",
  basisSaved: "Starting from your saved budget and accounts.",
  basisUnsaved: "Starting from your budget. Breathing room shows once it has essential spending.",
  summaryUnsaved: "Starts from your budget. Breathing room shows once it has essential spending.",
  lump: "Redundancy pay or lump sum",
  lumpHint: "Added to what you can draw on.",
  cut: "Spending you would cut each month",
  options: "Accounts and income in this illustration",
  accounts: "Accounts to draw on",
  income: "Income you would keep",
  result: "Breathing room in this illustration",
  noEndDate: "No end date",
  notSet: "Not set",
} as const;

/** Web's closed summary with a saved figure and nothing changed. */
export function runwaySummarySaved(liquidCash: number, monthlyEssentials: number): string {
  return `Starts from your savings of ${pounds(liquidCash)} and essentials of ${pounds(monthlyEssentials)} a month.`;
}

/** Web's closed summary once an input changed: "Your illustration: Breathing room, about 2 months." */
export function runwaySummaryModified(cover: string): string {
  return `Your illustration: Breathing room, ${cover}.`;
}

/** Web's announcement once an input changed; the zone puts "Illustration:" before it. */
export function runwayAnnouncement(cover: string): string {
  return `Breathing room, ${cover}`;
}

/** Web's `DebtHelpLink`: the same line for everyone, never triggered by figures (R3, R4). */
export const DEBT_HELP = {
  label: "Debt advice",
  lead: "Free, impartial debt help is available from",
  link: "MoneyHelper",
  url: "https://www.moneyhelper.org.uk/en/money-troubles/dealing-with-debt/debt-advice-locator",
} as const;

/** The editor: web's `BudgetEditor` and `BudgetEntryDialog` words. */
export const EDITOR = {
  heading: "Edit your budget",
  finish: "Finish editing",
  /** Web's section label for income. */
  moneyIn: "Money in",
  noEntries: "No entries added",
  addIncome: "Add income",
  editTitle: "Edit entry",
  name: "Name",
  amount: "Amount",
  frequency: "How often",
  /** Mobile only: the existing category an entry sits in. */
  category: "Category",
  essential: "Essential spending",
  save: "Save",
  cancel: "Cancel",
  deleteEntry: "Delete entry",
  saved: "Saved",
  deleted: "Entry deleted",
  /** Field errors (copy guide 5.6): the label and what is needed. Mobile only. */
  nameMissing: "Enter a name",
  amountMissing: "Enter an amount",
  /** The contract's money limit, in the account form's words (S8 device check). */
  amountTooLarge: "Enter an amount below £10,000,000,000.",
  addFailed: "We could not add that entry. Nothing has changed. Try again.",
  saveFailed: "We could not save your changes. Nothing has changed. Try again.",
  deleteFailed: "We could not delete that entry. Nothing has changed. Try again.",
  /** Web's `CONFLICT_MESSAGE`. */
  conflict:
    "We did not save this because it was changed somewhere else. The latest version is now loaded. Check it and save again.",
} as const;

/** Web's "Add to bills": the add button and the add form's title. */
export function addToLabel(category: string): string {
  return category === "income"
    ? EDITOR.addIncome
    : `Add to ${categoryLabel(category).toLowerCase()}`;
}

/** The dialog's frequency names (`BudgetEntryDialog`), in its order. */
export const FREQUENCY_OPTIONS = [
  { value: "monthly", label: "Monthly" },
  { value: "annual", label: "Yearly" },
  { value: "weekly", label: "Weekly" },
] as const;

/** The editor's "a month", "a year", "a week" after a figure (`BudgetEditor`). */
export function perFrequency(frequency: string): string {
  if (frequency === "annual") return "a year";
  if (frequency === "weekly") return "a week";
  return "a month";
}

/** Web's delete confirmation title: "Delete Rent?". */
export function deleteTitle(name: string): string {
  return `Delete ${name}?`;
}

/** Web's delete confirmation body: "Rent, £950 a month, will be deleted from your budget. ..." */
export function deleteMessage(name: string, amount: number, frequency: string): string {
  return `${name}, ${pounds(amount)} ${perFrequency(frequency)}, will be deleted from your budget. This cannot be undone.`;
}

/** An illustration switch's hint: "£8,200" for a balance, "£150 a month" for income. */
export function optionHint(amount: number, perMonth: boolean): string {
  return perMonth ? `${pounds(amount)} a month` : pounds(amount);
}

/** The illustration's outcome as one spoken item: its label, figure and money to draw on. */
export function runwayResultSpoken(figure: string, pool: number): string {
  return `${RUNWAY.result}, ${figure}, ${BREATHING_ROOM.moneyToDrawOn} ${pounds(pool)}`;
}
