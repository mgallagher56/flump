import { css } from "@repo/ui/styled-system/css";
import { grid } from "@repo/ui/styled-system/patterns";
import type { FC } from "react";
import { Helmet } from "react-helmet-async";
import {
  FiArrowRight,
  FiCreditCard,
  FiDollarSign,
  FiHome,
  FiPercent,
  FiTrendingUp,
} from "react-icons/fi";
import { Link } from "react-router-dom";
import { Footer } from "../components/Footer";
import { Header } from "../components/Header";

const containerStyle = css({
  maxWidth: "6xl",
  mx: "auto",
  py: "16",
  px: "4",
});

const toolCardStyle = css({
  backgroundColor: { base: "#ffffff", _dark: "dark.surface" },
  border: "1px solid",
  borderColor: { base: "slate.200", _dark: "slate.800" },
  borderRadius: "2xl",
  p: "6",
  textDecoration: "none",
  color: "inherit",
  boxShadow: { base: "0 4px 16px rgba(0,0,0,0.03)", _dark: "0 4px 16px rgba(0,0,0,0.2)" },
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
  transition: "all 0.2s ease",
  _hover: {
    transform: "translateY(-4px)",
    borderColor: "indigo.500",
    boxShadow: {
      base: "0 12px 28px rgba(99, 102, 241, 0.1)",
      _dark: "0 12px 28px rgba(99, 102, 241, 0.25)",
    },
  },
});

const iconBoxStyle = css({
  padding: "10px",
  borderRadius: "12px",
  backgroundColor: { base: "slate.50", _dark: "dark.bg" },
  border: "1px solid",
  borderColor: { base: "slate.200", _dark: "slate.800" },
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
});

const badgeStyle = css({
  fontSize: "11px",
  fontWeight: "700",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  backgroundColor: { base: "#f1f5f9", _dark: "rgba(255, 255, 255, 0.08)" },
  color: { base: "slate.700", _dark: "slate.300" },
  border: "1px solid",
  borderColor: { base: "transparent", _dark: "rgba(255, 255, 255, 0.1)" },
  padding: "3px 10px",
  borderRadius: "full",
});

const toolTitleStyle = css({
  fontSize: "1.2rem",
  fontWeight: "700",
  color: { base: "slate.900", _dark: "#ffffff" },
  marginBottom: "8px",
  lineHeight: "1.3",
});

const toolDescStyle = css({
  fontSize: "14px",
  color: { base: "slate.600", _dark: "slate.300" },
  lineHeight: "1.6",
});

const ctaLinkStyle = css({
  display: "flex",
  alignItems: "center",
  gap: "6px",
  color: { base: "indigo.600", _dark: "indigo.400" },
  fontWeight: "600",
  fontSize: "14px",
  marginTop: "20px",
});

export const TOOLS_CATALOG = [
  {
    slug: "uk-100k-tax-trap-calculator",
    title: "£100k–£125k Tax Trap & Childcare Reclaim",
    desc: "Model how Personal Allowance taper creates an effective 60% marginal rate and compute the exact pension sacrifice to recover £12,570 and free childcare.",
    icon: <FiPercent size={22} color="#6363f1" />,
    badge: "HMRC Income Tax",
  },
  {
    slug: "uk-debt-snowball-vs-avalanche-calculator",
    title: "Debt Snowball vs. Avalanche Payoff",
    desc: "Compare payoff speeds, interest savings, and debt-free dates between high-APR Avalanche and momentum-building Snowball methods.",
    icon: <FiDollarSign size={22} color="#ef4444" />,
    badge: "Debt Freedom",
  },
  {
    slug: "0-percent-balance-transfer-payoff-calculator",
    title: "0% Balance Transfer Cliff Calculator",
    desc: "Calculate the exact monthly repayment needed to extinguish transfer balances before the promotional 0% window ends and 25%+ APR kicks in.",
    icon: <FiCreditCard size={22} color="#f59e0b" />,
    badge: "Credit Cards",
  },
  {
    slug: "section-24-landlord-tax-calculator",
    title: "Section 24 BTL Landlord Tax Calculator",
    desc: "Model how mortgage interest relief restriction impacts higher-rate landlords and see how pension contributions restore standard tax bands.",
    icon: <FiHome size={22} color="#8b5cf6" />,
    badge: "Property & BTL",
  },
  {
    slug: "mortgage-overpayment-vs-isa-calculator",
    title: "Mortgage Overpayment vs. Stocks & Shares ISA",
    desc: "Compare the guaranteed return of paying off your UK mortgage early against compounding equity market returns over 5–25 years.",
    icon: <FiTrendingUp size={22} color="#10b981" />,
    badge: "Mortgages & Wealth",
  },
  {
    slug: "overdraft-cost-and-payoff-calculator",
    title: "Arranged Overdraft Cost & Payoff Modeler",
    desc: "Expose the stealth compound cost of arranged UK overdrafts (often 39.9% EAR) and plan an exit strategy with small weekly payments.",
    icon: <FiDollarSign size={22} color="#ef4444" />,
    badge: "Banking Fees",
  },
  {
    slug: "uk-student-loan-overpay-or-invest-calculator",
    title: "Student Loan (Plan 2 / 5) Overpay or Invest",
    desc: "Analyze whether treating your UK student loan as a graduate tax or aggressively paying it off is mathematically optimal based on salary growth.",
    icon: <FiPercent size={22} color="#06b6d4" />,
    badge: "Student Finance",
  },
];

export const ToolsIndexPage: FC = () => {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Helmet>
        <title>Free UK Financial & Tax Calculators | Flump</title>
        <meta
          name="description"
          content="Free standalone UK personal finance calculators: £100k tax trap, debt avalanche vs snowball, Section 24 landlord tax, and mortgage vs ISA."
        />
        <link rel="canonical" href="https://flump.co.uk/tools" />
      </Helmet>

      <Header />

      <main style={{ flex: 1 }}>
        <section className={containerStyle}>
          <div style={{ textAlign: "center", marginBottom: "40px" }}>
            <span
              style={{
                fontSize: "12px",
                fontWeight: "700",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "#6363f1",
              }}
            >
              Public Tools Directory
            </span>
            <h1
              style={{
                fontSize: "clamp(2rem, 4vw, 3rem)",
                fontWeight: "800",
                color: "var(--colors-text-primary, #0f172a)",
                marginTop: "8px",
              }}
            >
              Engineered UK Financial Calculators
            </h1>
            <p
              style={{
                fontSize: "1.1rem",
                color: "var(--colors-text-muted, #64748b)",
                maxWidth: "600px",
                margin: "12px auto 0",
              }}
            >
              Fast, zero-latency calculators running 100% in your browser. Solve specific UK tax and
              debt questions with zero sign-up.
            </p>
          </div>

          <div className={grid({ columns: { base: 1, md: 2, lg: 3 }, gap: "6" })}>
            {TOOLS_CATALOG.map((tool) => (
              <Link key={tool.slug} to={`/tools/${tool.slug}`} className={toolCardStyle}>
                <div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "16px",
                    }}
                  >
                    <div className={iconBoxStyle}>{tool.icon}</div>
                    <span className={badgeStyle}>{tool.badge}</span>
                  </div>

                  <h3 className={toolTitleStyle}>{tool.title}</h3>
                  <p className={toolDescStyle}>{tool.desc}</p>
                </div>

                <div className={ctaLinkStyle}>
                  Open Calculator <FiArrowRight />
                </div>
              </Link>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};
