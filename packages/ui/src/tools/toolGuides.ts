/**
 * The reading guide and FAQs under each public calculator, shared by the web app and marketing
 * (E16 PR 11, D11). Pure data with no React. Copy follows `docs/copy/COPY-AUDIT.md` (PR 11):
 * each section describes what the calculator does, with no figures it cannot source.
 */
import type { ToolSlug } from "./toolCatalog";

export interface ToolGuideSection {
  heading: string;
  body: readonly string[];
}

export interface ToolFaq {
  q: string;
  a: string;
}

export interface ToolGuideContent {
  guideSections: readonly ToolGuideSection[];
  faqs: readonly ToolFaq[];
}

export const TOOL_GUIDES: Readonly<Record<ToolSlug, ToolGuideContent>> = {
  "uk-debt-snowball-vs-avalanche-calculator": {
    guideSections: [
      {
        heading: "How the two methods compare",
        body: [
          "The avalanche method pays extra towards the debt with the highest APR first and the minimum on the rest. With the same payments each month, it usually charges the least total interest.",
          "The snowball method pays extra towards the smallest balance first, whatever its rate. It can cost more interest in total, and it pays off single debts sooner. The calculator shows both for the figures you enter.",
        ],
      },
      {
        heading: "Paying more than the minimum",
        body: [
          "A credit card's minimum payment is usually a small share of the balance plus interest. At the minimum, a balance can take many years to pay off.",
          "The calculator shows how a fixed extra amount each month, such as £50, changes the payoff date and the total interest for the balances you enter.",
        ],
      },
    ],
    faqs: [
      {
        q: "Is a mortgage included in the debt snowball?",
        a: "No. This calculator models one credit card and one personal loan. Mortgage overpayments are modelled separately, in the mortgage overpayment calculator.",
      },
      {
        q: "What if I have a 0% balance transfer card?",
        a: "While the 0% deal lasts, the rate is 0%, so highest rate first pays that card last. Any balance left when the 0% deal ends is charged the card's standard rate.",
      },
    ],
  },
  "0-percent-balance-transfer-payoff-calculator": {
    guideSections: [
      {
        heading: "When a 0% balance transfer period ends",
        body: [
          "A 0% balance transfer card charges no interest on the transferred balance for a set period. A transfer fee is often charged at the start.",
          "When the 0% deal ends, any balance left is charged the card's standard rate. The calculator estimates the monthly payment that pays off the balance before then.",
        ],
      },
    ],
    faqs: [
      {
        q: "Can I transfer the remaining balance to another 0% card when it expires?",
        a: "It may be possible, depending on the lender's checks and the cards available at the time. A transfer fee, often 2% to 3.5%, is usually charged each time.",
      },
    ],
  },
  "overdraft-cost-and-payoff-calculator": {
    guideSections: [
      {
        heading: "What overdraft interest costs",
        body: [
          "Banks charge one interest rate on an arranged overdraft, shown as an equivalent annual rate (EAR). Your bank's rate is in its app or on your statement.",
          "Example: £1,000 overdrawn all year at 39.9% EAR costs about £399 in interest.",
        ],
      },
    ],
    faqs: [
      {
        q: "How does an arranged overdraft rate compare with other borrowing?",
        a: "An overdraft rate is shown as an EAR and most other borrowing as an APR. Both are yearly rates.",
      },
    ],
  },
  "mortgage-overpayment-vs-isa-calculator": {
    guideSections: [
      {
        heading: "Overpaying a mortgage or investing in an ISA",
        body: [
          "Spare monthly money can go towards mortgage overpayments, into a Stocks and Shares ISA, or elsewhere. This calculator puts the two side by side for the figures you enter.",
          "Overpaying a mortgage reduces the interest charged. For example, an overpayment on a 4.5% mortgage avoids interest at 4.5%. Some mortgages have an early repayment charge on overpayments. Investments in a Stocks and Shares ISA can grow by more or less than that, and gains and income inside an ISA are free of UK tax. Past performance is not a guide to the future and your capital is at risk.",
        ],
      },
      {
        heading: "Access to the money",
        body: [
          "Money paid off a mortgage becomes home equity. It can usually only be accessed by selling, remortgaging or borrowing against the property, and some mortgages allow overpayments to be drawn back.",
          "Money in a Stocks and Shares ISA can usually be withdrawn, although its value may be lower than was paid in. A flexible ISA lets you withdraw and replace money in the same tax year without using more of the £20,000 annual allowance.",
        ],
      },
      {
        heading: "Loan to value bands when remortgaging",
        body: [
          "Lenders price mortgages in loan to value (LTV) bands, such as 80%, 75% or 60%. A lower balance when a fixed rate ends can move a mortgage into a lower band, where rates offered are often lower. Rates depend on the lender and your circumstances.",
        ],
      },
    ],
    faqs: [
      {
        q: "Do lenders charge for mortgage overpayments?",
        a: "Many lenders allow overpayments of up to 10% of the balance a year with no early repayment charge. The limit for a particular mortgage is in its offer document.",
      },
      {
        q: "Can money in a Stocks and Shares ISA lose value?",
        a: "Yes. Stocks and Shares ISAs involve investment risk. Values can fall as well as rise, and you may get back less than you put in.",
      },
      {
        q: "Can I do both?",
        a: "Yes. This calculator compares putting the full monthly amount into mortgage overpayments with putting the full amount into a Stocks and Shares ISA. It does not model a split between the two.",
      },
    ],
  },
  "uk-student-loan-overpay-or-invest-calculator": {
    guideSections: [
      {
        heading: "How student loan repayments work",
        body: [
          "UK student loans work differently from commercial loans. Repayments are 9% of income above a threshold, whatever the balance, and any balance left is written off after 25 to 40 years, depending on the plan.",
          "For many Plan 2 and Plan 5 borrowers whose balance is projected to be written off, total repayments depend on income over time more than on the interest rate.",
        ],
      },
    ],
    faqs: [
      {
        q: "When is a student loan repaid before write-off?",
        a: "When the repayments made before the write-off date add up to the balance plus the interest charged over that time. The calculator gives a simplified estimate for the figures you enter.",
      },
    ],
  },
  "uk-pay-rise-take-home-calculator": {
    guideSections: [
      {
        heading: "What the marginal rate means",
        body: [
          "The marginal rate is the share of the next pound of pay that goes in deductions. It can differ a lot from the average rate on the whole salary, because each deduction starts at its own threshold.",
          "The calculator adds Income Tax, employee National Insurance, student loan repayments and the High Income Child Benefit Charge at each salary, and marks where each one starts, changes or stops.",
        ],
      },
      {
        heading: "Where the marginal rate changes",
        body: [
          "Income Tax starts above the Personal Allowance (£12,570 in 2026/27) and rises at the higher-rate threshold. Between £100,000 and £125,140 the Personal Allowance goes down by £1 for every £2 of income, so more of each extra pound is taxed.",
          "Student loan repayments are 9% of income above the plan threshold (6% for a postgraduate loan). The High Income Child Benefit Charge applies to adjusted net income between £60,000 and £80,000 where someone in the household gets Child Benefit.",
        ],
      },
    ],
    faqs: [
      {
        q: "Does a pay rise ever reduce take-home pay?",
        a: "Income Tax and National Insurance alone take less than the whole of each extra pound, so take-home pay still rises. Other changes, such as losing eligibility for funded childcare or a benefit, are not part of this calculation.",
      },
      {
        q: "Does a pension contribution change the figures?",
        a: "Pension contributions through salary sacrifice or a personal pension reduce adjusted net income, which can change the Personal Allowance taper and the Child Benefit charge. The calculator includes a pension contribution input.",
      },
    ],
  },
  "section-24-landlord-tax-calculator": {
    guideSections: [
      {
        heading: "How Section 24 works",
        body: [
          "Before Section 24 (Finance (No. 2) Act 2015), landlords could deduct all mortgage interest and finance fees from rental income. Tax was worked out on the profit after those costs.",
          "Under Section 24, finance costs are not deducted from rental income. Landlords pay Income Tax on rent less allowable running costs, then get a tax reduction of 20% of their finance costs.",
        ],
      },
      {
        heading: "Taxable profit and higher-rate taxpayers",
        body: [
          "Because mortgage interest is not deducted as an expense, taxable rental profit is higher than the cash left after interest. That higher figure can take total income into the 40% higher-rate band, or above £100,000 where the Personal Allowance tapers.",
          "Where interest costs are high relative to rent, the tax due can be more than the cash left after interest, which is an effective rate above 100% of that cash.",
        ],
      },
      {
        heading: "Other rules that affect the figures",
        body: [
          "This calculator models property held by an individual. Some other rules change the tax on rental income, and each has its own costs and conditions:",
          "1. Pension contributions: personal pension contributions extend the basic-rate band and reduce adjusted net income. The money is normally not accessible until minimum pension age, and the annual allowance limits tax relief.",
          "2. Joint ownership (Form 17): married couples and civil partners who own a property jointly are taxed 50:50 on the income by default. Form 17 lets them be taxed on their actual shares of beneficial ownership. It applies only where the beneficial shares are actually unequal.",
          "3. Limited companies: Section 24 does not apply to companies, which deduct finance costs for Corporation Tax. Companies have different tax on profits taken out, and moving a property into one can trigger Capital Gains Tax and Stamp Duty Land Tax (or the Scottish or Welsh equivalent).",
          "A qualified tax adviser can explain how any of these apply to a particular case.",
        ],
      },
    ],
    faqs: [
      {
        q: "Does Section 24 apply to commercial property or furnished holiday lets?",
        a: "Section 24 applies to residential lettings held by individuals, partnerships and trusts. Since 6 April 2025 furnished holiday lets are treated like other residential lettings, so it applies to them too. It does not apply to commercial property or to companies.",
      },
      {
        q: "What expenses can I still deduct against rental income?",
        a: "Allowable expenses include letting agent fees, landlord insurance, council tax and utility bills the landlord pays, repairs and maintenance (not improvements), ground rent, cleaning and gardening.",
      },
      {
        q: "How does Section 24 interact with Payments on Account?",
        a: "Section 24 can make a Self Assessment tax bill larger. Above HMRC's limit, HMRC asks for two payments on account, in January and July. Each is half of the previous year's tax bill.",
      },
    ],
  },
  "uk-100k-tax-trap-calculator": {
    guideSections: [
      {
        heading: "What changes above £100,000",
        body: [
          "Once adjusted net income is over £100,000, the Personal Allowance (£12,570 in 2026/27) goes down by £1 for every £2 above it. It reaches £0 at £125,140.",
          "In this band, each extra £1 is taxed at 40% and also takes 50p off the allowance, which adds 20p of tax. That is 60p of Income Tax on each extra £1, or 62p with National Insurance at 2%.",
        ],
      },
      {
        heading: "Funded childcare and the £100,000 limit",
        body: [
          "In England, working parents of children aged 9 months to 4 years can get up to 30 hours of funded childcare a week. A family is not eligible if either parent expects adjusted net income over £100,000 for the tax year. The same limit applies across the UK to Tax-Free Childcare. That scheme pays up to £2,000 a year for each child (£4,000 for a disabled child). In England, the 15 hours a week available for all 3 and 4 year olds does not depend on income. Funded hours work differently in Scotland, Wales and Northern Ireland; check GOV.UK for current eligibility.",
          "Because the limit is a single figure, a small change in income near £100,000, such as a bonus, can change eligibility for both schemes. The value of that support depends on the number of children, their ages and childcare costs.",
        ],
      },
      {
        heading: "How pension contributions affect the Personal Allowance",
        body: [
          "The Personal Allowance is worked out from adjusted net income. A pension contribution lowers adjusted net income by the same amount. That covers salary sacrifice and payments into a personal pension, counted with the 20% tax relief added.",
          "Example: with £110,000 of income and a £10,000 pension contribution (tax relief included), adjusted net income is £100,000. The Personal Allowance is the full £12,570, and estimated Income Tax is about £6,000 less than with no contribution. The £10,000 is in the pension, normally not accessible until minimum pension age.",
        ],
      },
    ],
    faqs: [
      {
        q: "What counts towards adjusted net income?",
        a: "Adjusted net income includes salary before tax, bonuses, taxable benefits (for example a company car or private healthcare), savings interest, dividends and rental profit. Pension contributions (with tax relief added) and Gift Aid donations reduce it.",
      },
      {
        q: "Do salary sacrifice and a personal pension contribution change National Insurance in the same way?",
        a: "Both reduce adjusted net income. Salary sacrifice also reduces employee National Insurance (2% on pay above the upper earnings limit) and employer National Insurance (15% in 2026/27). A personal pension contribution does not.",
      },
      {
        q: "Can I contribute more than £60,000 into my pension?",
        a: "The standard pension annual allowance is £60,000 for a tax year. Unused allowance from the 3 tax years before can be carried forward, up to your UK earnings for the year.",
      },
    ],
  },
};

export const getToolGuide = (slug: ToolSlug): ToolGuideContent => TOOL_GUIDES[slug];
