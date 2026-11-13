import { ProjectionNotice } from "@repo/ui";
import { css } from "@repo/ui/styled-system/css";
import type { FC } from "react";
import { FiArrowLeft, FiChevronRight } from "react-icons/fi";
import {
  type LoaderFunctionArgs,
  type MetaFunction,
  Link as RouterLink,
  useLoaderData,
} from "react-router";
import FLPHeading from "~/components/core/typography/FLPHeading";
import FLPText from "~/components/core/typography/FLPText";
import HomeFooter from "~/components/home/HomeFooter";
import DebtSnowballVsAvalancheTool from "~/components/tools/DebtSnowballVsAvalancheTool";
import MortgageVsIsaTool from "~/components/tools/MortgageVsIsaTool";
import OverdraftCostTool from "~/components/tools/OverdraftCostTool";
import Section24Tool from "~/components/tools/Section24Tool";
import StudentLoanOverpayTool from "~/components/tools/StudentLoanOverpayTool";
import TaxTrapCalculatorTool from "~/components/tools/TaxTrapCalculatorTool";
import ZeroPercentCliffTool from "~/components/tools/ZeroPercentCliffTool";

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
      "Calculate your marginal tax rate between £100,000 and £125,140, personal allowance loss, and exact pension sacrifice required to reclaim allowance and free childcare.",
    title: "UK £100k–£125k Tax Trap & Childcare Escape Calculator",
    subtitle:
      "Model how HMRC's Personal Allowance taper creates an effective 60% marginal tax rate on income between £100,000 and £125,140, and calculate the exact pension contribution to reclaim it.",
    category: "UK Tax & Salary Sacrifice",
    component: "tax-trap",
    guideSections: [
      {
        heading: "What is the UK £100,000 Tax Trap?",
        body: [
          "In the UK, once your adjusted net income crosses £100,000, your tax-free Personal Allowance (£12,570 in 2026/27) is withdrawn at a rate of £1 for every £2 of income earned above £100,000.",
          "Because you are paying 40% higher-rate tax on the additional income plus losing allowance that would otherwise have been tax-free (taxed at 40%), your effective marginal income tax rate on this £25,140 band jumps to 60%. When you add 2% Employee National Insurance, your true marginal deduction rate reaches 62%.",
        ],
      },
      {
        heading: "The 15–30 Hours Free Childcare Cliff Edge",
        body: [
          "For families with young children in the UK, earning £100,001 is a catastrophic financial cliff edge. If either parent has an adjusted net income of even £1 over £100,000, eligibility for 15 to 30 hours of government-funded childcare and Tax-Free Childcare (£2,000 per child/year) is abruptly eliminated.",
          "A parent receiving an annual bonus taking them from £99,000 to £102,000 can lose £5,000 to £8,000 in childcare subsidies, resulting in a net negative income from working harder.",
        ],
      },
      {
        heading: "How to Reclaim Your Allowance via Pension Contributions",
        body: [
          "HMRC calculates the Personal Allowance taper based on 'Adjusted Net Income'. Gross pension contributions (via workplace salary sacrifice or personal SIPP contributions grossed up by 20% basic rate relief) directly reduce your adjusted net income pound-for-pound.",
          "For example, if you earn £110,000 gross and contribute £10,000 into a qualifying pension, your adjusted net income drops to exactly £100,000. You restore 100% of your £12,570 personal allowance, save £4,000 in higher-rate income tax and £2,000 in reclaimed allowance tax, plus you preserve full entitlement to funded childcare.",
        ],
      },
    ],
    faqs: [
      {
        q: "What counts toward Adjusted Net Income?",
        a: "Adjusted Net Income includes gross salary, bonuses, taxable benefits in kind (e.g., company car, private healthcare), savings interest, dividends, and net rental profits. It is reduced by gross pension contributions and Gift Aid donations.",
      },
      {
        q: "Is workplace salary sacrifice better than paying into a SIPP?",
        a: "Salary sacrifice is usually superior because it also saves Employee National Insurance (2%) and often Employer National Insurance (up to 13.8% or 15%), which some employers pass back to you as an additional pension booster.",
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
    title: "Mortgage Overpayment vs. Stocks & Shares ISA Calculator",
    subtitle:
      "A mathematical and psychological comparison: compare the interest saved by overpaying a mortgage with the possible tax-free growth of global equities inside a UK ISA.",
    category: "Mortgages & Investing",
    component: "mortgage-isa",
    guideSections: [
      {
        heading: "The Great Debate: Paying Down Debt vs. Compounding in an ISA",
        body: [
          "Deciding whether to overpay a mortgage or invest spare monthly cash into a Stocks & Shares ISA is one of the most significant wealth decisions a UK homeowner faces.",
          "Overpaying a mortgage reduces the interest you pay, which works out like a return equal to your mortgage rate (check for early repayment charges first). For example, overpaying on a 4.5% mortgage avoids interest at 4.5%. Investing in a global index fund inside an ISA may grow by more or less than that, and gains and income inside an ISA are free of UK tax. Past performance is not a guide to the future and your capital is at risk.",
        ],
      },
      {
        heading: "Liquidity vs. Illiquid Brick-and-Mortar Equity",
        body: [
          "Money paid into your mortgage disappears into home equity. Unless you sell the property or remortgage, accessing that capital during an emergency or job loss can be difficult or impossible.",
          "Funds held in an ISA remain 100% liquid. Flexible ISAs also allow you to withdraw and replace cash within the same tax year without consuming your annual £20,000 ISA allowance.",
        ],
      },
      {
        heading: "LTV Milestones and Remortgage Protection",
        body: [
          "Overpaying can be exceptionally powerful if it moves you across key Loan-to-Value (LTV) boundaries (such as 80%, 75%, or 60% LTV) right before a fixed deal expires, qualifying you for significantly lower lender rates across your entire remaining loan balance.",
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
        a: "Yes. Many prudent UK homeowners split their surplus cash 50/50: half directed into monthly mortgage overpayments for psychological peace of mind, and half into a Stocks & Shares ISA for liquid wealth growth.",
      },
    ],
  },
  "section-24-landlord-calculator": {
    slug: "section-24-landlord-calculator",
    metaTitle: "UK Section 24 Landlord Tax Calculator (Mortgage Interest Relief) | Flump",
    metaDescription:
      "Model the exact impact of HMRC Section 24 mortgage interest relief restriction on your buy-to-let properties. Calculate phantom taxable profit, 20% basic rate credit, and effective tax liability.",
    title: "Section 24 Landlord Mortgage Relief & Tax Calculator",
    subtitle:
      "See how the Section 24 finance restriction taxes landlords on rental turnover rather than true profit, and calculate your effective tax burden under current HMRC rules.",
    category: "Property & Buy-to-Let Tax",
    component: "section-24",
    guideSections: [
      {
        heading: "Understanding HMRC Section 24 Restrictions",
        body: [
          "Prior to Section 24 (Finance (No. 2) Act 2015), landlords could deduct 100% of their mortgage interest and financing fees from rental turnover as an allowable business expense before calculating taxable profit.",
          "Under Section 24, financing costs are no longer deductible from property income. Instead, landlords pay income tax on total rental turnover (less allowable running costs), and receive a flat 20% basic-rate tax reduction on their finance costs at the end.",
        ],
      },
      {
        heading: "The Danger of 'Phantom Profits' for Higher-Rate Taxpayers",
        body: [
          "Because mortgage interest is excluded from initial expenses, your declared taxable income increases dramatically. This frequently pushes basic-rate earners into the 40% higher-rate bracket or triggers the £100,000 Personal Allowance trap.",
          "In extreme cases where mortgage rates rise to 5% or 6%, higher-rate landlords find that tax owed to HMRC exceeds their entire net cash flow, resulting in an effective tax rate over 100% of real profits.",
        ],
      },
      {
        heading: "Mitigation Strategies for UK Property Investors",
        body: [
          "1. **Pension Contributions / SIPP:** Making gross pension contributions expands your basic-rate tax band, offsetting higher-rate property tax and preserving your personal allowance.",
          "2. **Spousal Beneficial Interest (Form 17):** If your spouse or civil partner pays a lower marginal tax rate, transferring beneficial ownership of the property can shift income into a 20% basic-rate tier.",
          "3. **Limited Company (SPV) Structures:** Limited company property purchases are exempt from Section 24, allowing 100% of mortgage interest to be deducted against Corporation Tax.",
        ],
      },
    ],
    faqs: [
      {
        q: "Does Section 24 apply to commercial property or furnished holiday lets?",
        a: "Section 24 strictly targets residential buy-to-let property held by individuals, partnerships, and trusts. Commercial properties and limited company special purpose vehicles (SPVs) are exempt.",
      },
      {
        q: "What expenses can I still deduct against rental income?",
        a: "Allowable expenses include letting agent fees, landlord insurance, council tax/utilities (if paid by landlord), repairs and maintenance (not capital improvements), ground rent, and cleaning/gardening costs.",
      },
      {
        q: "How does Section 24 interact with Payments on Account?",
        a: "Because Section 24 inflates your self-assessment tax bill, HMRC often requires you to make advance Payments on Account in January and July (each 50% of your prior year's tax liability).",
      },
    ],
  },
  "uk-debt-snowball-vs-avalanche-calculator": {
    slug: "uk-debt-snowball-vs-avalanche-calculator",
    metaTitle: "UK Debt Snowball vs Avalanche Calculator (Interest Saved & Exit Date) | Flump",
    metaDescription:
      "Compare Debt Avalanche and Debt Snowball payoff orders for UK credit cards, personal loans, and overdrafts.",
    title: "UK Debt Snowball vs. Avalanche Payoff Calculator",
    subtitle:
      "Model how allocating spare cash into high-APR debts (Avalanche) vs smallest balances (Snowball) changes your debt-free date and total interest paid.",
    category: "UK Debt Management",
    component: "debt-snowball",
    guideSections: [
      {
        heading: "Avalanche vs. Snowball: Which UK Payoff Method is Superior?",
        body: [
          "The Debt Avalanche strategy targets the account with the highest APR first while paying minimums on the rest. On the figures you enter, it results in the least total interest paid and the shortest time to clear the debts, if you keep to the plan.",
          "The Debt Snowball strategy targets the smallest balance first regardless of interest rate. While it costs slightly more in overall interest, it delivers quick psychological wins that keep borrowers committed to their repayment plans.",
        ],
      },
      {
        heading: "The Power of the 'Extra £50' Surplus",
        body: [
          "UK credit card minimum repayments are typically calculated as 1% to 2.5% of the outstanding balance plus interest. Paying only minimums keeps borrowers in compounding debt for 15 to 25 years.",
          "Adding even a fixed £50 to £100 per month above minimums collapses repayment timelines by years and saves thousands of pounds in compounding bank interest.",
        ],
      },
    ],
    faqs: [
      {
        q: "Should I include my mortgage in the debt snowball?",
        a: "No. Low-interest secured borrowing like UK mortgages should be kept separate from high-cost unsecured consumer debt.",
      },
      {
        q: "What if I have a 0% balance transfer card?",
        a: "During the 0% window, the APR is zero, so Avalanche orders it last. However, you must ensure it is cleared before the promotional revert APR triggers.",
      },
    ],
  },
  "0-percent-balance-transfer-payoff-calculator": {
    slug: "0-percent-balance-transfer-payoff-calculator",
    metaTitle: "0% Balance Transfer Card Payoff & Cliff Calculator | Flump",
    metaDescription:
      "Avoid credit card promotional cliffs. Calculate the exact monthly payment to clear your 0% balance transfer before the 24.9%+ revert rate slams shut.",
    title: "0% Balance Transfer Payoff & Revert Cliff Calculator",
    subtitle:
      "Avoid the high-interest revert trap: calculate your mandatory monthly repayment to extinguish balances before 0% promotional windows expire.",
    category: "UK Credit Cards",
    component: "zero-percent-cliff",
    guideSections: [
      {
        heading: "Understanding the UK 0% Balance Transfer Cliff",
        body: [
          "A 0% balance transfer credit card is one of the most effective UK borrowing tools, but banks rely on consumers failing to clear the balance before the promotional term ends.",
          "When the promotional window closes, remaining balances immediately jump to standard revert APRs, often 24.9% to 29.9% EAR, wiping out previous interest savings within months.",
        ],
      },
    ],
    faqs: [
      {
        q: "Can I transfer the remaining balance to another 0% card when it expires?",
        a: "Yes, provided your credit score remains intact and a suitable deal is available. However, transfer fees (typically 2% to 3.5%) apply each time.",
      },
    ],
  },
  "overdraft-cost-and-payoff-calculator": {
    slug: "overdraft-cost-and-payoff-calculator",
    metaTitle: "UK Arranged Overdraft Cost & EAR Calculator (~39.9% Rate) | Flump",
    metaDescription:
      "Living in your bank overdraft? Calculate the true annual pound cost of ~39.9% EAR interest and find out how much you save by clearing it.",
    title: "UK Arranged Overdraft Cost & Payoff Calculator",
    subtitle:
      "Calculate the stealth annual pound cost of living in an arranged overdraft charged at UK banks' standard 35%–39.9% EAR.",
    category: "UK Banking & Overdrafts",
    component: "overdraft-cost",
    guideSections: [
      {
        heading: "The True Cost of a 39.9% EAR Bank Overdraft",
        body: [
          "Most major UK banks now charge a single interest rate on arranged overdrafts, commonly around 39.9% EAR. Check your own bank's rate.",
          "Living continuously in a £1,000 overdraft costs approximately £399 per year in stealth interest deducted directly from your wages.",
        ],
      },
    ],
    faqs: [
      {
        q: "Is an arranged overdraft considered high-priority debt?",
        a: "It is often one of the most expensive debts people hold. At an EAR of around 40%, paying off an overdraft avoids interest at that rate, which is usually higher than savings rates.",
      },
    ],
  },
  "uk-student-loan-overpay-or-invest-calculator": {
    slug: "uk-student-loan-overpay-or-invest-calculator",
    metaTitle: "UK Student Loan Overpayment Calculator (Plan 1, 2, 4 & 5) | Flump",
    metaDescription:
      "See whether a UK student loan balance is projected to be repaid or written off first, for Plan 1, Plan 2, Plan 4, or Plan 5.",
    title: "UK Student Loan: Overpay or Invest? (Graduate Tax Calculator)",
    subtitle:
      "Evaluate whether voluntary student loan overpayments save you money or act as a needless donation to HM Treasury before statutory cancellation.",
    category: "UK Student Finance",
    component: "student-loan",
    guideSections: [
      {
        heading: "Why UK Student Loans Function Like a Graduate Tax",
        body: [
          "UK student loans do not behave like commercial loans. Repayments are strictly linked to income (9% above statutory thresholds) regardless of your balance, and uncollected debt is completely wiped after 25 to 40 years.",
          "For the vast majority of Plan 2 and Plan 5 graduates, the interest rate does not determine total lifetime repayments—only your career salary trajectory does.",
        ],
      },
    ],
    faqs: [
      {
        q: "Who should consider overpaying a UK student loan?",
        a: "Only very high earners in early-career positions (e.g. corporate law, investment banking, software engineering on £80k+ rising quickly) who will mathematically clear the balance before write-off.",
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

const pageContainerStyle = css({
  maxWidth: "5xl",
  margin: "0 auto",
  padding: { base: "24px 16px", md: "48px 24px" },
});

const breadcrumbsStyle = css({
  display: "flex",
  alignItems: "center",
  gap: "6px",
  fontSize: "13px",
  color: "text.muted",
  marginBottom: "24px",
});

const guideContainerStyle = css({
  marginTop: "48px",
  marginBottom: "48px",
  paddingTop: "36px",
  borderTop: "1px solid",
  borderColor: "border",
});

const faqContainerStyle = css({
  marginTop: "36px",
  marginBottom: "48px",
});

const faqCardStyle = css({
  backgroundColor: "surface",
  border: "1px solid",
  borderColor: "border",
  borderRadius: "xl",
  padding: "20px",
  marginBottom: "16px",
});

export const ToolDetailPage: FC = () => {
  const { tool } = useLoaderData<typeof loader>();

  if (!tool) return null;

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <div className={pageContainerStyle} style={{ flex: 1 }}>
        {/* Breadcrumbs */}
        <div className={breadcrumbsStyle}>
          <RouterLink
            style={{
              color: "inherit",
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
            to="/tools"
          >
            <FiArrowLeft size={13} /> All Calculators
          </RouterLink>
          <FiChevronRight size={13} />
          <span>{tool.category}</span>
          <FiChevronRight size={13} />
          <span style={{ color: "var(--colors-text-primary)", fontWeight: 500 }}>{tool.title}</span>
        </div>

        {/* Page Header */}
        <div style={{ marginBottom: "24px", maxWidth: "800px" }}>
          <ProjectionNotice />
        </div>
        <div style={{ marginBottom: "32px", maxWidth: "800px" }}>
          <span
            style={{
              padding: "4px 10px",
              borderRadius: "full",
              backgroundColor: "color-mix(in srgb, var(--colors-primary) 12%, transparent)",
              color: "var(--colors-primary)",
              fontSize: "12px",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              display: "inline-block",
              marginBottom: "10px",
            }}
          >
            {tool.category}
          </span>
          <FLPHeading as="h1" color="text.primary" mb={3} size="3xl">
            {tool.title}
          </FLPHeading>
          <FLPText color="text.muted" fontSize="md" lineHeight="1.6">
            {tool.subtitle}
          </FLPText>
        </div>

        {/* Interactive Tool Widget */}
        {tool.component === "tax-trap" && <TaxTrapCalculatorTool />}
        {tool.component === "mortgage-isa" && <MortgageVsIsaTool />}
        {tool.component === "section-24" && <Section24Tool />}
        {tool.component === "debt-snowball" && <DebtSnowballVsAvalancheTool />}
        {tool.component === "zero-percent-cliff" && <ZeroPercentCliffTool />}
        {tool.component === "overdraft-cost" && <OverdraftCostTool />}
        {tool.component === "student-loan" && <StudentLoanOverpayTool />}

        {/* SEO In-Depth Guide */}
        <div className={guideContainerStyle}>
          <FLPHeading as="h2" color="text.primary" mb={4} size="2xl">
            Expert Analysis & UK Tax Rules Guide
          </FLPHeading>

          <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
            {tool.guideSections.map((section, idx) => (
              <div key={idx}>
                <FLPHeading as="h3" color="text.primary" mb={2} size="lg">
                  {section.heading}
                </FLPHeading>
                {section.body.map((paragraph, pIdx) => (
                  <FLPText
                    color="text.muted"
                    fontSize="sm"
                    key={pIdx}
                    lineHeight="1.7"
                    style={{ marginBottom: "12px" }}
                  >
                    {paragraph}
                  </FLPText>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Frequently Asked Questions */}
        <div className={faqContainerStyle}>
          <FLPHeading as="h2" color="text.primary" mb={4} size="xl">
            Frequently Asked Questions
          </FLPHeading>
          {tool.faqs.map((faq, idx) => (
            <div className={faqCardStyle} key={idx}>
              <FLPHeading as="h4" color="text.primary" mb={2} size="md">
                {faq.q}
              </FLPHeading>
              <FLPText color="text.muted" fontSize="sm" lineHeight="1.6">
                {faq.a}
              </FLPText>
            </div>
          ))}
        </div>
      </div>

      <HomeFooter />
    </div>
  );
};

export default ToolDetailPage;
