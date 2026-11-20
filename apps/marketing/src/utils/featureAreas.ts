import { AI_STAGING_SENTENCE } from "./aiConnection";

/**
 * The marketing site's map of Flump (E42 S1): the five areas of the app, named and ordered as the
 * app's own navigation names them, plus the AI connection. Every feature page, the Features menu,
 * the footer and the "Part of one picture" strip read this one file, so they cannot drift apart.
 * Pure data (no React), so the Express server can read the paths.
 *
 * `featureAreas.test.ts` checks each area name against the web app's navigation labels.
 */

export type MoneyAreaKey =
  | "accounts"
  | "budget"
  | "pay"
  | "savings-and-pension"
  | "debt-and-borrowing";
type FeatureKey = MoneyAreaKey | "ai-connection";

/** Which sample the "See it" section shows. `none` shows an illustration in the hero instead. */
type FeatureSample = "dashboard" | "breathing-room" | "none";

export interface Feature {
  key: FeatureKey;
  /** The app's own name for the area, used as the small label, menu label and strip label. */
  name: string;
  path: `/features/${FeatureKey}`;
  /** One line under the name in the desktop Features menu. */
  menuDescription: string;
  h1: string;
  /** The one sentence under the h1 (copy guide 5.2). */
  lead: string;
  /** "What you see": three short facts, each a thing the app shows today. */
  facts: readonly [string, string, string];
  /** "More detail when you want it": deeper tools in the area. */
  depth: readonly string[];
  sample: FeatureSample;
  /** Where the hero's "Interactive preview" button goes. Left out where the preview shows none of it. */
  previewHref?: string;
  meta: { title: string; description: string };
}

export interface MoneyArea extends Feature {
  key: MoneyAreaKey;
  /** Key of the label in `apps/web/public/locales/en/common.json` the name must equal. */
  appLabelKey: string;
}

export const MONEY_AREAS: readonly MoneyArea[] = [
  {
    key: "accounts",
    appLabelKey: "accounts",
    name: "Accounts",
    path: "/features/accounts",
    menuDescription: "Every account and your net worth",
    h1: "Accounts and net worth",
    lead: "Every account in one list, added up into your net worth.",
    facts: [
      "Add what you own and what you owe, from current accounts and savings to pensions, cards and loans. Flump adds them up into your net worth.",
      "Once a month, a short check-in asks for the new balances. The history page shows how your net worth has changed, month by month.",
      "You type the figures in yourself, so no bank login is needed.",
    ],
    depth: [
      "Your share of a joint account",
      "Choose what counts towards net worth",
      "Changes by account",
    ],
    sample: "dashboard",
    previewHref: "/preview",
    meta: {
      title: "Accounts and net worth | Flump",
      description:
        "Every account in one list, your net worth, and a short monthly check-in that shows how it changes. You type the figures in; no bank login is needed.",
    },
  },
  {
    key: "budget",
    appLabelKey: "budget",
    name: "Budget",
    path: "/features/budget",
    menuDescription: "What is left over each month",
    h1: "Budget and breathing room",
    lead: "What comes in, what goes out and what is left over each month.",
    facts: [
      "List your income and your regular spending. Rent and mortgage payments are counted the same way.",
      "Flump shows what is left over each month, or how much you are short.",
      "It also shows your breathing room: how long your savings would cover the essentials. Rough totals are enough to start.",
    ],
    depth: [
      "Split spending into essential and flexible",
      "See an illustration of your income stopping",
      "Link your housing cost to your saved details",
    ],
    sample: "breathing-room",
    previewHref: "/preview#preview-section-breathing-room-title",
    meta: {
      title: "Budget and breathing room | Flump",
      description:
        "See what is left over each month and how long your savings would cover the essentials, whether you rent or pay a mortgage.",
    },
  },
  {
    key: "pay",
    appLabelKey: "taxAndPay",
    name: "Pay",
    path: "/features/pay",
    menuDescription: "Take-home pay and Self Assessment",
    h1: "Take-home pay and Self Assessment",
    lead: "Your take-home pay, and an estimate of what a change would do to it.",
    facts: [
      "Enter your salary to see your take-home pay after Income Tax, National Insurance, pension and student loan.",
      "Model a pay rise to see how much of it you would keep.",
      "If you are self-employed or let property, switch on Self Assessment. It keeps your income and costs for each tax year and shows an estimate of your tax bill.",
    ],
    depth: [
      "Payments on account",
      "Receipts kept with each record",
      "Compare one tax year with another",
    ],
    sample: "none",
    previewHref: "/preview",
    meta: {
      title: "Take-home pay and Self Assessment | Flump",
      description:
        "See your take-home pay under UK rules and how much of a pay rise you would keep. Self-employed or letting property: see an estimate of your tax bill.",
    },
  },
  {
    key: "savings-and-pension",
    appLabelKey: "savingsAndPension",
    name: "Savings and pension",
    path: "/features/savings-and-pension",
    menuDescription: "Savings, pension pots and contributions",
    h1: "Savings and pension",
    lead: "Your savings and pension, beside the rest of your figures.",
    facts: [
      "See each savings account with its interest rate (AER) and an estimate of how it could grow.",
      "Add your pension pots and what you and your employer pay in. See how a change to your contributions, including salary sacrifice, would change your take-home pay.",
      "Every future figure is an estimate, and the assumptions are shown.",
    ],
    depth: [
      "How much of this tax year's ISA allowance you have used",
      "A deposit timeline",
      "Investment returns",
    ],
    sample: "none",
    previewHref: "/preview",
    meta: {
      title: "Savings and pension | Flump",
      description:
        "Savings accounts with their rates and an estimate of growth, and your pension pots. See a retirement estimate against a target you set.",
    },
  },
  {
    key: "debt-and-borrowing",
    appLabelKey: "borrowing",
    name: "Debt and borrowing",
    path: "/features/debt-and-borrowing",
    menuDescription: "What you owe and when it could be paid off",
    h1: "Debt and borrowing",
    lead: "What you owe, and an estimate of when it could be paid off.",
    facts: [
      "List your cards, loans and overdrafts with their rates. Flump shows an estimate of when they could be paid off, and when any 0% deal ends.",
      "Compare paying the highest rate first with paying the smallest balance first.",
      "If you have a mortgage, see your repayment schedule and an estimate of what an overpayment would do.",
    ],
    depth: [
      "An estimate of your payment when your fixed rate ends",
      "Overpay or save, compared",
      "Loan to value (LTV) milestones",
    ],
    sample: "none",
    previewHref: "/preview",
    meta: {
      title: "Debt and borrowing: cards, loans and mortgage | Flump",
      description:
        "See an estimate of when your debts could be paid off, when a 0% deal ends, and what a mortgage overpayment would do.",
    },
  },
];

/**
 * The AI connection, presented like any other feature (owner, 20 November 2026). Access stays with
 * the accounts the owner switches on, so every line here is true for a tester whose account is not.
 */
export const AI_CONNECTION: Feature = {
  key: "ai-connection",
  name: "AI connection",
  path: "/features/ai-connection",
  menuDescription: "Ask an AI assistant about your saved figures",
  h1: "AI connection",
  lead: "Ask an AI assistant about the figures you have saved in Flump.",
  facts: [
    "Connect an AI assistant such as Claude Desktop to Flump and ask questions in your own words.",
    "Tax and debt figures are calculated by Flump, not by the AI model.",
    AI_STAGING_SENTENCE,
  ],
  depth: [],
  sample: "none",
  meta: {
    title: "AI connection | Flump",
    description:
      "Ask an AI assistant about the figures you have saved in Flump. Tax and debt figures are calculated by Flump, not by the AI model.",
  },
};

/** How a tester gets the AI connection: the tile wording the coordinator decided on 20 November 2026. */
export const AI_CONNECTION_ACCESS = "Switched on for an account on request during testing.";

/** The five areas, then the AI connection: the order of the Features menu and the features page. */
export const FEATURES: readonly Feature[] = [...MONEY_AREAS, AI_CONNECTION];

/** The "Flump features" page (D1: never "What Flump covers"). */
export const FEATURES_INDEX = {
  path: "/features",
  navLabel: "Features",
  title: "Flump features",
  lead: "Five areas, laid out the same way here and in the app.",
  intro: [
    "The five areas are accounts, budget, pay, savings and pension, and debt and borrowing. Use one area or all five.",
    "Each starts from a few rough figures. Each has more detail underneath for when you want it. Together they make one picture of your money, on your Home page.",
  ],
  meta: {
    title: "Flump features | Flump",
    description:
      "The five areas of Flump: accounts, budget, pay, savings and pension, and debt and borrowing. Start with rough figures and add detail when you want it.",
  },
} as const;

/**
 * The Retirement plan section on the Savings and pension page (E42 S6c). Retirement is open to
 * every tester and sits under Savings and pension in the app. Flump sets no target and suggests no
 * contribution (copy guide 2.3, advice boundary R1 to R8).
 */
export const RETIREMENT_SECTION = {
  title: "Retirement plan",
  body: [
    "Set a retirement target of your own. Flump shows an estimate of your yearly income in retirement, in today's prices and before tax, and which accounts count towards it.",
    "The assumptions are listed year by year and you can change them. It is an estimate from your figures, not a prediction.",
  ],
} as const;

/**
 * "Try it with your own numbers" (D9, plan section 4.4): the three kept calculators, each in a short
 * form on its area page. The names are the marketing site's own; the shared catalogue's do not
 * change. Each says in one line where the app does the same job with saved figures.
 */
export const TRY_IT = {
  title: "Try it with your own numbers",
  subtitle: "Nothing you enter here is saved. The starting figures are examples.",
  payRise: {
    inApp: "In the app, the pay rise tool on Take-home pay uses your saved salary.",
  },
  debtPayoff: {
    title: "Two ways to pay off debts",
    line: "Highest rate first or smallest balance first: see an estimate of when each clears the debts, and the interest for each.",
    inApp: "In the app, the pay extra tool on Cards and loans does this with your saved debts.",
  },
  mortgageIsa: {
    lead: "If you have a mortgage",
    title: "Mortgage overpayment or ISA, compared",
    line: "See the interest an overpayment could save beside what the same money could grow to in an ISA, at a rate you choose.",
    inApp: "In the app, the overpay or save comparison on Mortgage uses your saved mortgage.",
  },
} as const;
