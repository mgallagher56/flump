import { css } from "@repo/ui/styled-system/css";
import { grid } from "@repo/ui/styled-system/patterns";
import type { FC, ReactNode } from "react";
import {
  FiArrowRight,
  FiBookOpen,
  FiCreditCard,
  FiDollarSign,
  FiHome,
  FiPercent,
  FiTrendingUp,
} from "react-icons/fi";
import { Link } from "react-router-dom";
import { Footer } from "../components/Footer";
import { Header } from "../components/Header";
import { PageMeta } from "../components/PageMeta";
import { CANONICAL_TOOL_SLUGS } from "../utils/toolSlugs";

const containerStyle = css({
  maxWidth: "6xl",
  mx: "auto",
  py: "16",
  px: "4",
});

const toolCardStyle = css({
  backgroundColor: "card",
  border: "1px solid",
  borderColor: "border",
  borderRadius: "2xl",
  p: "6",
  textDecoration: "none",
  color: "inherit",
  boxShadow: "card",
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
  transition: "all 0.2s ease",
  _hover: {
    transform: "translateY(-4px)",
    borderColor: "primary",
    boxShadow: "cardHover",
  },
});

const iconBoxStyle = css({
  color: "primary",
  padding: "10px",
  borderRadius: "lg",
  backgroundColor: "surface.subtle",
  border: "1px solid",
  borderColor: "border",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
});

const badgeStyle = css({
  fontSize: "xs",
  fontWeight: "600",
  letterSpacing: "0.01em",
  backgroundColor: "surface.subtle",
  color: "text.secondary",
  border: "1px solid",
  borderColor: "border.subtle",
  padding: "3px 10px",
  borderRadius: "full",
});

const toolTitleStyle = css({
  fontFamily: "display",
  fontSize: "1.2rem",
  fontWeight: "700",
  color: "text.primary",
  marginBottom: "8px",
  lineHeight: "1.3",
});

const toolDescStyle = css({
  fontSize: "sm",
  color: "text.muted",
  lineHeight: "1.6",
});

const ctaLinkStyle = css({
  display: "flex",
  alignItems: "center",
  gap: "6px",
  color: "primary",
  fontWeight: "600",
  fontSize: "sm",
  marginTop: "20px",
});

const headerBlockStyle = css({ textAlign: "center", marginBottom: "10" });

const eyebrowStyle = css({
  fontSize: "xs",
  fontWeight: "semibold",
  letterSpacing: "0.01em",
  color: "primary",
});

const pageTitleStyle = css({
  fontFamily: "display",
  fontSize: "clamp(2rem, 4vw, 3rem)",
  fontWeight: "800",
  color: "text.primary",
  marginTop: "2",
});

const pageLeadStyle = css({
  fontSize: "lg",
  color: "text.secondary",
  maxWidth: "600px",
  marginTop: "3",
  marginX: "auto",
});

const toolListStyle = css({ listStyle: "none", padding: "0", margin: "0" });

const toolItemStyle = css({ display: "flex", "& > a": { flex: "1" } });

const cardHeadStyle = css({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "4",
});

export interface ToolCatalogEntry {
  slug: (typeof CANONICAL_TOOL_SLUGS)[number];
  title: string;
  desc: string;
  icon: ReactNode;
  badge: string;
}

const ENTRIES: Record<ToolCatalogEntry["slug"], Omit<ToolCatalogEntry, "slug">> = {
  "uk-debt-snowball-vs-avalanche-calculator": {
    title: "Debt snowball vs avalanche payoff",
    desc: "Compare paying the highest rate first with clearing the smallest balance first, and see estimated interest and payoff dates for each.",
    icon: <FiDollarSign size={22} aria-hidden="true" />,
    badge: "Debt payoff",
  },
  "0-percent-balance-transfer-payoff-calculator": {
    title: "0% balance transfer payoff calculator",
    desc: "Estimate the monthly payment that would clear a transferred balance before the promotional 0% window ends and the standard rate applies.",
    icon: <FiCreditCard size={22} aria-hidden="true" />,
    badge: "Credit cards",
  },
  "overdraft-cost-and-payoff-calculator": {
    title: "Arranged overdraft cost calculator",
    desc: "Estimate what an arranged UK overdraft costs in interest over a year, and roughly how much that is each month, at the EAR your bank charges.",
    icon: <FiDollarSign size={22} aria-hidden="true" />,
    badge: "Banking fees",
  },
  "mortgage-overpayment-vs-isa-calculator": {
    title: "Mortgage overpayment vs Stocks and Shares ISA",
    desc: "Compare the interest a monthly overpayment would save on your UK mortgage with what the same money might grow to in a Stocks and Shares ISA over the remaining term you set.",
    icon: <FiTrendingUp size={22} aria-hidden="true" />,
    badge: "Mortgages and wealth",
  },
  "uk-student-loan-overpay-or-invest-calculator": {
    title: "Student loan repayment and write-off estimate",
    desc: "Estimate the yearly repayment on each UK student loan plan from your salary, and whether a rough projection clears the balance before it is written off.",
    icon: <FiBookOpen size={22} aria-hidden="true" />,
    badge: "Student finance",
  },
  "uk-pay-rise-take-home-calculator": {
    title: "What you keep from a pay rise",
    desc: "Estimate how much of the next £1,000 of pay is take-home after Income Tax, National Insurance, student loan and the Child Benefit charge, with each threshold from £0 to £150,000 marked. Unverified estimate.",
    icon: <FiPercent size={22} aria-hidden="true" />,
    badge: "Income tax",
  },
  "uk-100k-tax-trap-calculator": {
    title: "£100k–£125k tax trap and childcare calculator",
    desc: "Estimate how a pension contribution changes adjusted net income, the Personal Allowance and take-home pay between £100,000 and £125,140, with the childcare income limit stated. Unverified estimate.",
    icon: <FiPercent size={22} aria-hidden="true" />,
    badge: "HMRC income tax",
  },
  "section-24-landlord-tax-calculator": {
    title: "Section 24 buy-to-let landlord tax calculator",
    desc: "Estimate the Income Tax on rental profit under the Section 24 finance cost restriction, with the 20% tax credit for mortgage interest, alongside your other income.",
    icon: <FiHome size={22} aria-hidden="true" />,
    badge: "Property tax",
  },
};

/** Ordered by CANONICAL_TOOL_SLUGS (E31): everyday money first, every tool with equal weight. */
export const TOOLS_CATALOG: ToolCatalogEntry[] = CANONICAL_TOOL_SLUGS.map((slug) => ({
  slug,
  ...ENTRIES[slug],
}));

export const ToolsIndexPage: FC = () => {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <PageMeta
        title="Free UK financial and tax calculators | Flump"
        description="Free UK personal finance calculators: debt payoff, 0% balance transfers, overdrafts, mortgage overpayments, student loans, income tax thresholds and Section 24."
      />

      <Header />

      <main style={{ flex: 1 }} id="main" tabIndex={-1}>
        <section className={containerStyle}>
          <div className={headerBlockStyle}>
            <span className={eyebrowStyle}>Public tools directory</span>
            <h1 className={pageTitleStyle}>Free UK financial calculators</h1>
            <p className={pageLeadStyle}>
              Calculators that run in your browser, with no sign-up. Each one answers a specific UK
              question about debt, mortgages, student loans or tax.
            </p>
          </div>

          <ul
            aria-label="UK calculators"
            className={`${grid({ columns: { base: 1, md: 2, lg: 3 }, gap: "6" })} ${toolListStyle}`}
          >
            {TOOLS_CATALOG.map((tool) => (
              <li key={tool.slug} className={toolItemStyle}>
                <Link to={`/tools/${tool.slug}`} className={toolCardStyle}>
                  <div>
                    <div className={cardHeadStyle}>
                      <div className={iconBoxStyle}>{tool.icon}</div>
                      <span className={badgeStyle}>{tool.badge}</span>
                    </div>

                    <h2 className={toolTitleStyle}>{tool.title}</h2>
                    <p className={toolDescStyle}>{tool.desc}</p>
                  </div>

                  <div className={ctaLinkStyle}>
                    Open calculator <FiArrowRight aria-hidden="true" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <Footer />
    </div>
  );
};
