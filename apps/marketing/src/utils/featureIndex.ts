import { AI_CONNECTION, MONEY_AREAS, type MoneyAreaKey } from "./featureAreas";

/**
 * The grouped index on /features (owner, 26 November 2026, option A): every feature the app offers
 * as one line, grouped by the app's areas in its navigation order. Pure data (no React).
 *
 * One source of truth: each line names where it lives in the app as a page (and section) of the
 * functionality map (`docs/system/functionality-map/pages/web/`), which `check:laws` ties to the
 * app's routes. `featureIndex.test.ts` fails when a signed-in page in that map is neither listed
 * here nor in `PAGES_NOT_LISTED`, when a line points at a page or section the map no longer has,
 * or when a page is missing from `docs/pages_and_features.md`.
 *
 * Features behind an off switch (households, connected banks) are not listed (owner, same day).
 */

/** A quiet label on a line that is a preview or off until switched on. */
export type FeatureTag = "preview" | "off-by-default";

export const FEATURE_TAG_LABELS: Record<FeatureTag, string> = {
  preview: "In testing",
  "off-by-default": "Off by default",
};

/** Where a line lives in the app: a functionality map page id, and a section id inside it. */
type AppPlace = { page: string; section?: string } | { appWide: "theme" };

export interface FeatureLine {
  /** The line's anchor on /features (`/features#<id>`), unique on the page. */
  id: string;
  name: string;
  /** What the reader does with it, in sentence case with no full stop, 13 words at most (the approved features prototype, 27 Nov 2026). */
  line: string;
  /** Two or three sentences, shown when the line is opened. */
  detail: readonly string[];
  app: AppPlace;
  /** The page (and section) on this site that says more. */
  more?: { href: string; page: string };
  tag?: FeatureTag;
}

export interface FeatureGroup {
  key: MoneyAreaKey | "home" | "ai-connection" | "settings";
  name: string;
  lines: readonly FeatureLine[];
}

const area = (key: MoneyAreaKey) => {
  const found = MONEY_AREAS.find((a) => a.key === key);
  if (!found) throw new Error(`Unknown area ${key}`);
  return found;
};

const areaLink = (key: MoneyAreaKey, anchor: string) => ({
  href: `${area(key).path}#${anchor}`,
  page: area(key).name,
});

const AI_PAGE = { page: AI_CONNECTION.name };

export const FEATURE_GROUPS: readonly FeatureGroup[] = [
  {
    key: "home",
    name: "Home and setup",
    lines: [
      {
        id: "guided-setup",
        name: "Guided setup",
        line: "Add your figures in four short steps",
        detail: [
          "Enter your income, housing, savings and any debts in four steps. Rough figures are enough.",
          "You can save and come back to it later.",
        ],
        app: { page: "onboarding" },
        more: { href: "/#rough-figures", page: "Home" },
      },
      {
        id: "home-page",
        name: "Your money",
        line: "See all your figures on one page",
        detail: [
          "Your net worth at the top, with a short summary of each area you use underneath.",
          "It also shows when your monthly check-in is due.",
        ],
        app: { page: "dashboard" },
        more: { href: "/preview#preview-section-dashboard-title", page: "Interactive preview" },
      },
      {
        id: "choose-sections",
        name: "Choose your sections",
        line: "Choose which sections you see, and their order",
        detail: [
          "Pick which sections appear on your Home page, and in what order.",
          "Turn areas you do not use off in Settings, and back on at any time.",
        ],
        app: { page: "dashboard", section: "visibility-sheet" },
      },
    ],
  },
  {
    key: "accounts",
    name: area("accounts").name,
    lines: [
      {
        id: "accounts-list",
        name: "Accounts list",
        line: "List what you own and what you owe",
        detail: [
          "Add current accounts, savings, pensions, property, cards and loans, each with its balance.",
          "You type the figures in yourself, so no bank login is needed.",
        ],
        app: { page: "accounts", section: "accounts-lists" },
        more: areaLink("accounts", "what-you-see"),
      },
      {
        id: "net-worth",
        name: "Net worth",
        line: "See everything you own, less what you owe",
        detail: [
          "Flump adds up what you own and takes away what you owe.",
          "The result is your net worth, shown at the top of your Home page.",
        ],
        app: { page: "accounts", section: "net-worth-summary" },
        more: areaLink("accounts", "what-you-see"),
      },
      {
        id: "monthly-check-in",
        name: "Monthly check-in",
        line: "Update your balances once a month",
        detail: [
          "Once a month, a short check-in asks for each account's new balance.",
          "Afterwards you see a brief summary of the month. You choose the day it is due.",
        ],
        app: { page: "accounts", section: "check-in-sheet" },
        more: { href: "/preview#preview-section-checkin-title", page: "Interactive preview" },
      },
      {
        id: "net-worth-history",
        name: "Net worth history",
        line: "Track how your net worth changes, month by month",
        detail: [
          "A chart of your net worth across the months you have checked in.",
          "See which accounts changed and by how much. You can add earlier months too.",
        ],
        app: { page: "history" },
        more: areaLink("accounts", "what-you-see"),
      },
      {
        id: "account-goals",
        name: "Account goals",
        line: "Set a target for any account",
        detail: [
          "Set a goal on an account, such as a savings target, and see how far along it is.",
          "Update a balance in a moment from the account's own page.",
        ],
        app: { page: "account-detail", section: "goal-section" },
      },
      {
        id: "joint-accounts",
        name: "Joint accounts",
        line: "Count only your share of a joint account",
        detail: [
          "Switch on Partner mode in Settings, then mark an account as joint and enter your share.",
          "Your net worth then counts your share, and the account page shows the whole value too.",
        ],
        app: { page: "accounts", section: "add-account-dialog" },
        more: areaLink("accounts", "more-detail"),
      },
      {
        id: "net-worth-choices",
        name: "What counts in your net worth",
        line: "Choose whether your home and student loan count",
        detail: [
          "Decide whether property you own, less its mortgage, counts towards your net worth, and whether your student loan counts as a debt.",
          "Change it in Settings, and every page follows.",
        ],
        app: { page: "settings", section: "net-worth-choices" },
        more: areaLink("accounts", "more-detail"),
      },
    ],
  },
  {
    key: "budget",
    name: area("budget").name,
    lines: [
      {
        id: "income-and-spending",
        name: "Income and spending",
        line: "List what comes in and what goes out",
        detail: [
          "List your income and your regular spending by category, such as housing and bills.",
          "Rent and mortgage payments are counted the same way. Rough totals are enough to start.",
        ],
        app: { page: "budget", section: "category-list" },
        more: areaLink("budget", "what-you-see"),
      },
      {
        id: "left-over",
        name: "Left over each month",
        line: "See what is left over each month, or how much you are short",
        detail: [
          "Flump takes your spending from your income.",
          "It shows what is left over each month, or how much you are short.",
        ],
        app: { page: "budget", section: "overview" },
        more: areaLink("budget", "what-you-see"),
      },
      {
        id: "breathing-room",
        name: "Breathing room",
        line: "Find out how long your savings would cover the essentials",
        detail: [
          "Breathing room is how long your savings would cover the essentials.",
          "It divides the cash you can get at quickly by your essential spending each month.",
        ],
        app: { page: "budget", section: "breathing-room" },
        more: areaLink("budget", "see-it"),
      },
      {
        id: "essential-and-flexible",
        name: "Essential and flexible",
        line: "Mark which costs are essential",
        detail: [
          "Tag each spending line as essential or flexible.",
          "Breathing room uses the essential lines only.",
        ],
        app: { page: "budget", section: "editor" },
        more: areaLink("budget", "more-detail"),
      },
      {
        id: "income-stopping",
        name: "If your income stopped",
        line: "Check how long your savings would last",
        detail: [
          "Model a pause in your income and see how long your savings would last.",
          "It is an illustration only and changes none of your saved figures.",
        ],
        app: { page: "budget", section: "runway-calculator" },
        more: areaLink("budget", "more-detail"),
      },
      {
        id: "linked-figures",
        name: "Enter each figure once",
        line: "Change your pay or housing in one place and your budget follows",
        detail: [
          "Your take-home pay, housing cost and savings payments feed your budget from where you saved them.",
          "Change one and your budget follows.",
        ],
        app: { page: "budget", section: "link-notice" },
        more: areaLink("budget", "more-detail"),
      },
    ],
  },
  {
    key: "pay",
    name: area("pay").name,
    lines: [
      {
        id: "take-home-pay",
        name: "Take-home pay",
        line: "See an estimate of your take-home pay",
        detail: [
          "Enter your salary to see an estimate of your take-home pay under UK rules.",
          "It shows Income Tax, National Insurance, pension and student loan line by line.",
        ],
        app: { page: "take-home" },
        more: areaLink("pay", "what-you-see"),
      },
      {
        id: "pay-rise",
        name: "Pay rise",
        line: "Work out how much of a pay rise you would keep",
        detail: [
          "Model a pay rise to see how much more you would take home each month.",
          "It is an illustration and does not change your saved salary.",
        ],
        app: { page: "take-home", section: "scenario-zone" },
        more: areaLink("pay", "try-it"),
      },
      {
        id: "self-assessment",
        name: "Self Assessment",
        line: "See an estimate of your tax bill",
        detail: [
          "For self-employment, letting property or other income outside PAYE.",
          "Keep income and costs for each tax year and see an estimate of your tax bill. Flump does not file anything with HMRC.",
        ],
        app: { page: "self-assessment" },
        more: areaLink("pay", "what-you-see"),
        tag: "off-by-default",
      },
      {
        id: "income-by-source",
        name: "Income sources",
        line: "Keep each kind of income in its own records",
        detail: [
          "Self-employment, rental, savings and PAYE income each have their own records.",
          "Rental records can include your share of a property and your mortgage interest.",
        ],
        app: { page: "self-assessment-source" },
        more: areaLink("pay", "more-detail"),
        tag: "off-by-default",
      },
      {
        id: "receipts",
        name: "Receipts",
        line: "Attach each receipt to its record",
        detail: [
          "Attach a photo or PDF of a receipt to the record it belongs to.",
          "Open it again from the same record when you need it.",
        ],
        app: { page: "self-assessment-source", section: "records-section" },
        more: areaLink("pay", "more-detail"),
        tag: "off-by-default",
      },
      {
        id: "payments-on-account",
        name: "Payments on account",
        line: "See an estimate of your advance tax payments",
        detail: [
          "Payments on account are advance payments towards next year's tax bill.",
          "Flump shows an estimate of them beside your tax bill.",
        ],
        app: { page: "self-assessment", section: "calculated-figures" },
        more: areaLink("pay", "more-detail"),
        tag: "off-by-default",
      },
      {
        id: "compare-tax-years",
        name: "Compare tax years",
        line: "Compare one tax year with another",
        detail: [
          "See this tax year's figures beside last year's.",
          "Copy recurring records into a new tax year instead of typing them again.",
        ],
        app: { page: "self-assessment", section: "records-and-years-drawers" },
        more: areaLink("pay", "more-detail"),
        tag: "off-by-default",
      },
    ],
  },
  {
    key: "savings-and-pension",
    name: area("savings-and-pension").name,
    lines: [
      {
        id: "savings-accounts",
        name: "Savings accounts",
        line: "Check each account's balance, rate and interest",
        detail: [
          "Each savings account with its balance and interest rate (AER).",
          "See an estimate of the interest over the next 12 months.",
        ],
        app: { page: "savings", section: "accounts-list" },
        more: areaLink("savings-and-pension", "what-you-see"),
      },
      {
        id: "isa-allowance",
        name: "ISA allowance",
        line: "Track an estimate of the ISA allowance you have used",
        detail: [
          "See an estimate of how much of this tax year's ISA allowance you have used.",
          "It counts your saved monthly amount into each ISA for every month since 6 April.",
        ],
        app: { page: "savings", section: "hero-and-kpis" },
        more: areaLink("savings-and-pension", "more-detail"),
      },
      {
        id: "savings-growth",
        name: "How savings could grow",
        line: "See an estimate of how your savings could grow",
        detail: [
          "See an estimate of how your savings could grow at their rates.",
          "Model a different monthly amount. It is an illustration, and the assumptions are shown.",
        ],
        app: { page: "savings", section: "scenario-zone" },
        more: areaLink("savings-and-pension", "what-you-see"),
      },
      {
        id: "time-to-target",
        name: "Time to a target",
        line: "Find out when your savings could reach a target",
        detail: [
          "Enter a target, such as a deposit, and see an estimate of when your savings could reach it.",
          "Change the monthly amount to see how the date moves.",
        ],
        app: { page: "savings", section: "scenario-zone" },
        more: areaLink("savings-and-pension", "more-detail"),
      },
      {
        id: "investment-returns",
        name: "Investment returns",
        line: "See an estimate of what your investments returned",
        detail: [
          "Flump estimates what your investments returned from the balances you record each month.",
          "It allows for what you pay in, and sits beside your savings.",
        ],
        app: { page: "savings", section: "investment-returns" },
        more: areaLink("savings-and-pension", "more-detail"),
      },
      {
        id: "pension-pots",
        name: "Pension pots",
        line: "Keep your pots and what goes into them in one place",
        detail: [
          "Add your pension pots with their values.",
          "See what you and your employer pay in each month.",
        ],
        app: { page: "pension" },
        more: areaLink("savings-and-pension", "what-you-see"),
      },
      {
        id: "pension-contributions",
        name: "Contribution changes",
        line: "Work out what a change would do to your take-home pay",
        detail: [
          "Model a change to what you pay into your pension, including salary sacrifice.",
          "See what it would do to your take-home pay. Nothing is saved.",
        ],
        app: { page: "pension", section: "scenario-zone" },
        more: areaLink("savings-and-pension", "what-you-see"),
      },
      {
        id: "retirement-plan",
        name: "Retirement plan",
        line: "Plan with an estimate of your income in retirement",
        detail: [
          "Set a target of your own and see an estimate of your yearly income in retirement, in today's prices.",
          "The assumptions are listed, and you can change them.",
        ],
        app: { page: "retirement" },
        more: areaLink("savings-and-pension", "retirement"),
      },
    ],
  },
  {
    key: "debt-and-borrowing",
    name: area("debt-and-borrowing").name,
    lines: [
      {
        id: "cards-and-loans",
        name: "Cards and loans",
        line: "List every debt with its rate",
        detail: [
          "List your credit cards, loans and overdrafts with their balances and rates.",
          "See an estimate of your debt-free date, and when any 0% deal ends.",
        ],
        app: { page: "debt", section: "debts-list" },
        more: areaLink("debt-and-borrowing", "what-you-see"),
      },
      {
        id: "pay-extra",
        name: "Which debt to pay first",
        line: "Compare paying the highest rate first with the smallest balance first",
        detail: [
          "Model paying a bit extra each month.",
          "Compare paying the highest rate first with paying the smallest balance first, and the interest for each.",
        ],
        app: { page: "debt", section: "scenario-zone" },
        more: areaLink("debt-and-borrowing", "try-debt-payoff"),
      },
      {
        id: "uk-debt-tools",
        name: "Other debt estimates",
        line: "See estimates for 0% deals, overdrafts, car finance and student loans",
        detail: [
          "Estimates for a 0% balance transfer, an arranged overdraft, a car finance final payment and a student loan.",
          "Each uses UK rules.",
        ],
        app: { page: "debt", section: "uk-debt-calculators" },
        more: areaLink("debt-and-borrowing", "what-you-see"),
      },
      {
        id: "mortgage",
        name: "Mortgage",
        line: "Track your balance, rate and repayment schedule",
        detail: [
          "See your remaining balance, monthly payment, rate and years left.",
          "The repayment schedule shows how the balance falls over time.",
        ],
        app: { page: "mortgage" },
        more: areaLink("debt-and-borrowing", "what-you-see"),
      },
      {
        id: "overpayment",
        name: "Overpayments",
        line: "Find out what paying extra could save",
        detail: [
          "Model an overpayment and see an estimate of the interest and time it could save.",
          "It is an illustration and changes none of your saved figures.",
        ],
        app: { page: "mortgage", section: "scenario-zone" },
        more: areaLink("debt-and-borrowing", "what-you-see"),
      },
      {
        id: "fixed-rate-end",
        name: "When a fixed rate ends",
        line: "See an estimate of your payment afterwards",
        detail: [
          "See an estimate of your monthly payment when your fixed rate ends.",
          "Try a higher or lower rate to see the difference.",
        ],
        app: { page: "mortgage", section: "scenario-zone" },
        more: areaLink("debt-and-borrowing", "more-detail"),
      },
      {
        id: "overpay-or-save",
        name: "Overpay or save",
        line: "Compare an overpayment with saving in an ISA",
        detail: [
          "Compare the interest an overpayment could save with what the same money could grow to in an ISA.",
          "You choose the ISA rate.",
        ],
        app: { page: "mortgage", section: "scenario-zone" },
        more: areaLink("debt-and-borrowing", "try-mortgage-isa"),
      },
      {
        id: "loan-to-value",
        name: "Loan to value",
        line: "Check your mortgage against your home's value",
        detail: [
          "Loan to value (LTV) is your mortgage as a share of your home's value.",
          "Flump shows your LTV against common bands, and how much less you would need to owe to reach each.",
        ],
        app: { page: "mortgage", section: "hero-and-kpis" },
        more: areaLink("debt-and-borrowing", "more-detail"),
      },
      {
        id: "buy-to-let",
        name: "Buy to let",
        line: "Keep a rental mortgage beside your own, with its yield",
        detail: [
          "Keep a buy-to-let mortgage beside your own home's.",
          "See its yield, using the rent from your Self Assessment records.",
        ],
        app: { page: "mortgage", section: "btl-overview" },
      },
      {
        id: "mortgage-estimates",
        name: "Mortgage estimates",
        line: "Work out estimated loan sizes from your figures",
        detail: [
          "See what is left each month before housing, from your saved pay and budget.",
          "Then see estimated loan sizes from a monthly payment or an income multiple, and an estimate of Stamp Duty.",
        ],
        app: { page: "mortgage-estimates" },
      },
    ],
  },
  {
    key: "ai-connection",
    name: AI_CONNECTION.name,
    lines: [
      {
        id: "ask-ai",
        name: "Ask an AI assistant",
        line: "Ask about your saved figures in your own words",
        detail: [
          "Connect an AI assistant such as Claude Desktop and ask about your figures in your own words.",
          "Tax and debt figures are calculated by Flump, not by the AI model. It is switched on for an account on request during testing.",
        ],
        app: { page: "settings", section: "ai-connections" },
        more: { href: `${AI_CONNECTION.path}#setup`, ...AI_PAGE },
        tag: "preview",
      },
      {
        id: "ai-imports",
        name: "Imports to review",
        line: "Check suggested balances before anything is saved",
        detail: [
          "An assistant can suggest new balances for you, if you allow it. This is off by default.",
          "Nothing is saved until you review the changes and confirm them, and you can undo an import.",
        ],
        app: { page: "imports" },
        more: { href: `${AI_CONNECTION.path}#more-detail`, ...AI_PAGE },
        tag: "preview",
      },
    ],
  },
  {
    key: "settings",
    name: "Settings and your data",
    lines: [
      {
        id: "download-data",
        name: "Download your data",
        line: "Download everything you have saved as one file",
        detail: [
          "Download everything you have saved in Flump as one file, from Settings.",
          "You can do this at any time.",
        ],
        app: { page: "settings", section: "data-export" },
        more: { href: "/security#download-figures", page: "Security" },
      },
      {
        id: "reset-data",
        name: "Start again",
        line: "Delete your figures and keep your login",
        detail: [
          "Delete all your saved figures and start again with an empty account.",
          "Your login stays. This cannot be undone.",
        ],
        app: { page: "settings", section: "reset-financial-data" },
      },
      {
        id: "delete-account",
        name: "Delete your account",
        line: "Close your account and delete your saved data",
        detail: [
          "Delete your account and your saved data from Settings.",
          "This cannot be undone.",
        ],
        app: { page: "settings", section: "delete-account" },
        more: { href: "/security#delete-account", page: "Security" },
      },
      {
        id: "light-and-dark",
        name: "Light and dark",
        line: "Choose a light or a dark look",
        detail: [
          "Use Flump in a light or a dark theme, or let it follow your device.",
          "The switch is in the header, here and in the app.",
        ],
        app: { appWide: "theme" },
        more: { href: "/accessibility", page: "Accessibility" },
      },
    ],
  },
];

/**
 * Signed-in pages in the functionality map that have no line, and why. The test fails on any
 * signed-in page that is in neither list, so a new page cannot slip past the index.
 */
export const PAGES_NOT_LISTED: Readonly<Record<string, string>> = {
  "import-review": "Part of 'Imports to review': the page that opens one import.",
  invoicing: "Reached only by its address today; no page in the app links to it.",
  "terms-acceptance": "Agreeing to the terms, not a feature.",
  "household-join": "Households are behind an off switch (owner, 26 November 2026: not listed).",
};

/** "Start here": a few goals in plain words, each pointing at the lines it involves. */
export const START_HERE: readonly { goal: string; lines: readonly string[] }[] = [
  {
    goal: "See your net worth",
    lines: ["accounts-list", "net-worth", "monthly-check-in", "net-worth-history"],
  },
  {
    goal: "See what is left over each month",
    lines: ["income-and-spending", "left-over", "breathing-room"],
  },
  { goal: "Understand your pay", lines: ["take-home-pay", "pay-rise", "self-assessment"] },
  {
    goal: "See when debts could be paid off",
    lines: ["cards-and-loans", "pay-extra", "overpayment"],
  },
];

export const ALL_FEATURE_LINES: readonly FeatureLine[] = FEATURE_GROUPS.flatMap((g) => g.lines);
