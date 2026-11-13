import { PageHeader, ProjectionNotice, StatusBadge } from "@repo/ui";
import type { FC } from "react";
import { type LoaderFunctionArgs, type MetaFunction, useLoaderData } from "react-router";
import DebtSnowballVsAvalancheTool from "~/components/tools/DebtSnowballVsAvalancheTool";
import MortgageVsIsaTool from "~/components/tools/MortgageVsIsaTool";
import OverdraftCostTool from "~/components/tools/OverdraftCostTool";
import Section24Tool from "~/components/tools/Section24Tool";
import StudentLoanOverpayTool from "~/components/tools/StudentLoanOverpayTool";
import TaxTrapCalculatorTool from "~/components/tools/TaxTrapCalculatorTool";
import ZeroPercentCliffTool from "~/components/tools/ZeroPercentCliffTool";
import { SampleDataNote } from "~/features/signed-out/components/SampleDataNote";
import { SignedOutPage } from "~/features/signed-out/components/SignedOutPage";
import { ToolBreadcrumbs } from "~/features/signed-out/components/ToolBreadcrumbs";
import { ToolGuide } from "~/features/signed-out/components/ToolGuide";

interface ToolContent {
  slug: string;
  metaTitle: string;
  metaDescription: string;
  title: string;
  subtitle: string;
  category: string;
  component:
    | "tax-trap"
    | "mortgage-isa"
    | "section-24"
    | "debt-snowball"
    | "zero-percent-cliff"
    | "overdraft-cost"
    | "student-loan";
  guideSections: { heading: string; body: string[] }[];
  faqs: { q: string; a: string }[];
}

const TOOLS_DATA: Record<string, ToolContent> = {
  "uk-100k-tax-trap-calculator": {
    slug: "uk-100k-tax-trap-calculator",
    metaTitle: "UK £100k–£125k Tax Trap Calculator (60% Marginal Rate) | Flump",
    metaDescription:
      "Calculate your marginal tax rate between £100,000 and £125,140, personal allowance loss, and the pension contribution that would bring adjusted net income to £100,000, with the effect on allowance and free childcare.",
    title: "UK £100k–£125k tax trap and childcare threshold calculator",
    subtitle:
      "Model how HMRC's Personal Allowance taper creates an effective 60% marginal tax rate on income between £100,000 and £125,140, and the pension contribution that would bring adjusted net income back to £100,000. Unverified estimate.",
    category: "UK tax and salary sacrifice",
    component: "tax-trap",
    guideSections: [
      {
        heading: "What is the UK £100,000 tax trap?",
        body: [
          "In the UK, once your adjusted net income crosses £100,000, your tax-free Personal Allowance (£12,570 in 2026/27) is withdrawn at a rate of £1 for every £2 of income earned above £100,000.",
          "Because you are paying 40% higher-rate tax on the additional income plus losing allowance that would otherwise have been tax-free (taxed at 40%), your effective marginal income tax rate on this £25,140 band jumps to 60%. When you add 2% Employee National Insurance, your marginal deduction rate reaches 62%.",
        ],
      },
      {
        heading: "Funded childcare and the £100,000 limit",
        body: [
          "In England, working parents of children aged 9 months to 4 years can get up to 30 hours of funded childcare a week. A family is not eligible if either parent expects adjusted net income over £100,000 for the tax year. The same limit applies across the UK to Tax-Free Childcare, which tops up childcare costs by up to £2,000 per child a year (£4,000 for a disabled child). In England, the 15 hours a week available for all 3 and 4 year olds does not depend on income. Funded hours work differently in Scotland, Wales and Northern Ireland; check GOV.UK for current eligibility.",
          "Because the limit is a single figure, a small change in income near £100,000, such as a bonus, can change eligibility for both schemes. The value of that support depends on the number of children, their ages and childcare costs.",
        ],
      },
      {
        heading: "How pension contributions affect the Personal Allowance",
        body: [
          "HMRC calculates the Personal Allowance taper based on 'Adjusted Net Income'. Gross pension contributions (via workplace salary sacrifice or personal SIPP contributions grossed up by 20% basic rate relief) directly reduce your adjusted net income pound-for-pound.",
          "Example: on £110,000 of income, a £10,000 gross pension contribution brings adjusted net income to £100,000. The full £12,570 personal allowance applies, and income tax is about £6,000 lower than without the contribution (£4,000 of higher-rate tax and £2,000 from the restored allowance). Adjusted net income is then within the childcare limit.",
        ],
      },
    ],
    faqs: [
      {
        q: "What counts toward Adjusted Net Income?",
        a: "Adjusted Net Income includes gross salary, bonuses, taxable benefits in kind (e.g., company car, private healthcare), savings interest, dividends, and net rental profits. It is reduced by gross pension contributions and Gift Aid donations.",
      },
      {
        q: "How does salary sacrifice differ from a personal SIPP contribution for National Insurance?",
        a: "Both reduce adjusted net income. Salary sacrifice also reduces employee National Insurance (2% above the upper earnings limit) and employer National Insurance (15% in 2026/27); a personal SIPP contribution does not.",
      },
      {
        q: "Can I contribute more than £60,000 into my pension?",
        a: "The standard UK Pension Annual Allowance is £60,000 per tax year. If you have unused allowance from the previous three tax years, you can carry forward unused allowances provided you have sufficient UK relevant earnings.",
      },
    ],
  },
  "mortgage-overpay-vs-isa": {
    slug: "mortgage-overpay-vs-isa",
    metaTitle: "UK Mortgage Overpayment vs Stocks & Shares ISA Calculator | Flump",
    metaDescription:
      "Compare interest saved by overpaying a UK mortgage with a projected Stocks & Shares ISA balance over 5 to 25 years.",
    title: "Mortgage overpayment vs stocks and shares ISA calculator",
    subtitle:
      "Compare the interest saved by overpaying a mortgage with a projected Stocks & Shares ISA balance, using your own figures.",
    category: "Mortgages and investing",
    component: "mortgage-isa",
    guideSections: [
      {
        heading: "Overpaying a mortgage vs investing in an ISA",
        body: [
          "Spare monthly money can go towards mortgage overpayments, into a Stocks & Shares ISA, or elsewhere. This calculator puts the two side by side for the figures you enter.",
          "Overpaying a mortgage reduces the interest you pay, which works out like a return equal to your mortgage rate (check for early repayment charges first). For example, overpaying on a 4.5% mortgage avoids interest at 4.5%. Investing in a global index fund inside an ISA may grow by more or less than that, and gains and income inside an ISA are free of UK tax. Past performance is not a guide to the future and your capital is at risk.",
        ],
      },
      {
        heading: "Access to the money",
        body: [
          "Money paid off a mortgage becomes home equity. It can usually only be accessed by selling, remortgaging or borrowing against the property, and some mortgages allow overpayments to be drawn back.",
          "Money in a Stocks & Shares ISA can usually be withdrawn, although its value may be lower than was paid in. A flexible ISA lets you withdraw and replace money in the same tax year without using more of the £20,000 annual allowance.",
        ],
      },
      {
        heading: "Loan-to-value bands at remortgage",
        body: [
          "Lenders price mortgages in Loan-to-Value (LTV) bands, such as 80%, 75% or 60%. A lower balance when a fixed rate ends can move a mortgage into a lower band, where rates offered are often lower. Rates depend on the lender and your circumstances.",
        ],
      },
    ],
    faqs: [
      {
        q: "Are mortgage overpayments subject to lender penalties?",
        a: "Most UK lenders permit up to 10% of the outstanding balance to be overpaid per 12-month period without Early Repayment Charges (ERC). Always check your mortgage offer document before making large lump-sum payments.",
      },
      {
        q: "Can money in a Stocks & Shares ISA lose value?",
        a: "Yes. Stocks & Shares ISAs involve investment risk. Values can fall as well as rise, and you may get back less than you put in.",
      },
      {
        q: "Can I do both?",
        a: "Yes. This calculator compares putting the full monthly amount into mortgage overpayments with putting the full amount into a Stocks & Shares ISA. It does not model a split between the two.",
      },
    ],
  },
  "section-24-landlord-calculator": {
    slug: "section-24-landlord-calculator",
    metaTitle: "UK Section 24 Landlord Tax Calculator (Mortgage Interest Relief) | Flump",
    metaDescription:
      "Estimate how the Section 24 restriction on mortgage interest relief affects tax on buy-to-let income: taxable profit, the 20% basic rate credit and the tax due.",
    title: "Section 24 landlord mortgage relief and tax calculator",
    subtitle:
      "See how the Section 24 finance cost restriction changes the tax on rental income, using current HMRC rules. Unverified estimate.",
    category: "Property and buy-to-let tax",
    component: "section-24",
    guideSections: [
      {
        heading: "Understanding HMRC Section 24 restrictions",
        body: [
          "Prior to Section 24 (Finance (No. 2) Act 2015), landlords could deduct 100% of their mortgage interest and financing fees from rental turnover as an allowable business expense before calculating taxable profit.",
          "Under Section 24, financing costs are no longer deductible from property income. Instead, landlords pay income tax on total rental turnover (less allowable running costs), and receive a flat 20% basic-rate tax reduction on their finance costs at the end.",
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
          "1. **Pension contributions:** personal pension contributions extend the basic-rate band and reduce adjusted net income. The money is normally not accessible until minimum pension age, and the annual allowance limits tax relief.",
          "2. **Joint ownership (Form 17):** married couples and civil partners who own a property jointly are taxed 50:50 on the income by default. Form 17 lets them be taxed on their actual shares of beneficial ownership. It applies only where the beneficial shares are actually unequal.",
          "3. **Limited companies:** Section 24 does not apply to companies, which deduct finance costs for Corporation Tax. Companies have different tax on profits taken out, and moving a property into one can trigger Capital Gains Tax and Stamp Duty Land Tax (or the Scottish or Welsh equivalent).",
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
        a: "Allowable expenses include letting agent fees, landlord insurance, council tax/utilities (if paid by landlord), repairs and maintenance (not capital improvements), ground rent, and cleaning/gardening costs.",
      },
      {
        q: "How does Section 24 interact with Payments on Account?",
        a: "Because Section 24 increases your self-assessment tax bill, HMRC often requires you to make advance Payments on Account in January and July (each 50% of your prior year's tax liability).",
      },
    ],
  },
  "uk-debt-snowball-vs-avalanche-calculator": {
    slug: "uk-debt-snowball-vs-avalanche-calculator",
    metaTitle: "UK Debt Snowball vs Avalanche Calculator (Interest Saved & Exit Date) | Flump",
    metaDescription:
      "Compare Debt Avalanche and Debt Snowball payoff orders for UK credit cards, personal loans, and overdrafts.",
    title: "UK debt snowball vs avalanche payoff calculator",
    subtitle:
      "Compare how paying extra towards the highest APR first (avalanche) or the smallest balance first (snowball) changes the debt-free date and total interest.",
    category: "UK debt management",
    component: "debt-snowball",
    guideSections: [
      {
        heading: "Avalanche vs snowball: how do the UK payoff methods compare?",
        body: [
          "The avalanche method pays extra towards the debt with the highest APR first and the minimum on the rest. With the same payments each month, it usually charges the least total interest.",
          "The snowball method pays extra towards the smallest balance first, whatever its rate. It can cost more interest overall, and it clears individual debts sooner, which some people find easier to keep going with. The calculator shows both for your figures.",
        ],
      },
      {
        heading: "Paying more than the minimum",
        body: [
          "UK credit card minimum repayments are often 1% to 2.5% of the balance plus interest. At the minimum, a large balance can take many years to clear.",
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
        a: "During the 0% window, the APR is zero, so Avalanche orders it last. The balance is charged the revert APR if it is not cleared before the promotional period ends.",
      },
    ],
  },
  "0-percent-balance-transfer-payoff-calculator": {
    slug: "0-percent-balance-transfer-payoff-calculator",
    metaTitle: "0% Balance Transfer Card Payoff & Cliff Calculator | Flump",
    metaDescription:
      "Model the monthly payment that would clear a 0% balance transfer before the promotional period ends and the card's revert rate applies.",
    title: "0% balance transfer payoff and revert cliff calculator",
    subtitle:
      "Model the monthly repayment that clears a balance before a 0% promotional period expires and the revert rate applies.",
    category: "UK credit cards",
    component: "zero-percent-cliff",
    guideSections: [
      {
        heading: "When a 0% balance transfer period ends",
        body: [
          "A 0% balance transfer card charges no interest on the transferred balance for a set period. A transfer fee is often charged at the start.",
          "When the period ends, any balance left is charged the card's standard rate, often 24.9% to 29.9% APR. The calculator shows the monthly payment that clears the balance before then.",
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
    slug: "overdraft-cost-and-payoff-calculator",
    metaTitle: "UK Arranged Overdraft Cost & EAR Calculator (~39.9% Rate) | Flump",
    metaDescription:
      "Estimate the yearly interest on an arranged overdraft at around 39.9% EAR, and how it changes as the balance falls.",
    title: "UK arranged overdraft cost and payoff calculator",
    subtitle:
      "Calculate the annual pound cost of staying in an arranged overdraft charged at UK banks' standard 35%–39.9% EAR.",
    category: "UK banking and overdrafts",
    component: "overdraft-cost",
    guideSections: [
      {
        heading: "What a 39.9% EAR overdraft costs",
        body: [
          "Most major UK banks now charge a single interest rate on arranged overdrafts, commonly around 39.9% EAR. Check your own bank's rate.",
          "A £1,000 overdraft balance held all year at 39.9% EAR costs about £399 in interest.",
        ],
      },
    ],
    faqs: [
      {
        q: "How does an arranged overdraft rate compare with other borrowing?",
        a: "At an EAR of around 40%, an arranged overdraft costs more than most other borrowing. Each pound repaid avoids interest at that rate, which is usually higher than savings rates.",
      },
    ],
  },
  "uk-student-loan-overpay-or-invest-calculator": {
    slug: "uk-student-loan-overpay-or-invest-calculator",
    metaTitle: "UK Student Loan Overpayment Calculator (Plan 1, 2, 4 & 5) | Flump",
    metaDescription:
      "See whether a UK student loan balance is projected to be repaid or written off first, for Plan 1, Plan 2, Plan 4, or Plan 5.",
    title: "UK student loan overpayment calculator (graduate tax)",
    subtitle:
      "Model whether the projected repayments clear a student loan balance before statutory cancellation.",
    category: "UK student finance",
    component: "student-loan",
    guideSections: [
      {
        heading: "Why UK student loans function like a graduate tax",
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
};

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  if (!data?.tool) {
    return [{ title: "Tool Not Found | Flump" }];
  }
  return [
    { title: data.tool.metaTitle },
    { name: "description", content: data.tool.metaDescription },
  ];
};

export const loader = async ({ params }: LoaderFunctionArgs) => {
  const slug = params.slug || "";
  const tool = TOOLS_DATA[slug] || null;

  if (!tool) {
    throw new Response("Calculator Not Found", { status: 404 });
  }

  return { tool };
};

export const ToolDetailPage: FC = () => {
  const { tool } = useLoaderData<typeof loader>();

  if (!tool) return null;

  return (
    <SignedOutPage>
      <ToolBreadcrumbs category={tool.category} title={tool.title} />
      <ProjectionNotice />
      <PageHeader
        badge={<StatusBadge variant="neutral">{tool.category}</StatusBadge>}
        description={tool.subtitle}
        title={tool.title}
      />
      <SampleDataNote id="tool-sample-data-label">
        Illustration only: the calculator starts with example figures, not yours, and nothing you
        enter is saved.
      </SampleDataNote>

      {/* The calculator's outputs are worked from example figures, so the region points at the note. */}
      <section aria-describedby="tool-sample-data-label" aria-label="Calculator, illustration">
        {tool.component === "tax-trap" && <TaxTrapCalculatorTool />}
        {tool.component === "mortgage-isa" && <MortgageVsIsaTool />}
        {tool.component === "section-24" && <Section24Tool />}
        {tool.component === "debt-snowball" && <DebtSnowballVsAvalancheTool />}
        {tool.component === "zero-percent-cliff" && <ZeroPercentCliffTool />}
        {tool.component === "overdraft-cost" && <OverdraftCostTool />}
        {tool.component === "student-loan" && <StudentLoanOverpayTool />}
      </section>

      <ToolGuide faqs={tool.faqs} guideSections={tool.guideSections} />
    </SignedOutPage>
  );
};

export default ToolDetailPage;
