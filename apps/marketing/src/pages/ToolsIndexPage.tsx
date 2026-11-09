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
  fontWeight: "700",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
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

          {/* Featured Spotlight: 100k Tax Cliff Bridge */}
          <Link
            to="/tools/uk-100k-tax-trap-calculator"
            style={{
              textDecoration: "none",
              color: "inherit",
              display: "block",
              marginBottom: "32px",
            }}
          >
            <div
              className={css({
                backgroundColor: "card",
                border: "1px solid",
                borderColor: "border",
                borderRadius: "2xl",
                overflow: "hidden",
                display: "grid",
                gridTemplateColumns: { base: "1fr", md: "5fr 7fr" },
                boxShadow: "card",
                transition: "all 0.2s ease",
                _hover: {
                  transform: "translateY(-3px)",
                  borderColor: "primary",
                  boxShadow: "cardHover",
                },
              })}
            >
              <div style={{ height: "100%", minHeight: "200px", maxHeight: "260px" }}>
                <img
                  src="/illustrations/tax-bridge.jpg"
                  alt="3D UK Tax Cliff Bridge visualising Personal Allowance taper"
                  loading="lazy"
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                />
              </div>
              <div
                style={{
                  padding: "24px 28px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  gap: "10px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span className={badgeStyle}>FEATURED CALCULATOR</span>
                  <span
                    style={{ fontSize: "12px", color: "var(--colors-primary)", fontWeight: "700" }}
                  >
                    60% Effective Marginal Rate
                  </span>
                </div>
                <h2
                  style={{
                    fontFamily: "var(--fonts-display)",
                    fontSize: "1.35rem",
                    fontWeight: "700",
                    margin: 0,
                    color: "var(--colors-text-primary)",
                  }}
                >
                  Bridge the £100k–£125k Tax Trap & Childcare Cliff
                </h2>
                <p
                  style={{
                    fontSize: "14px",
                    color: "var(--colors-text-secondary)",
                    margin: 0,
                    lineHeight: "1.5",
                  }}
                >
                  Model how Personal Allowance reduction combined with student loan and childcare
                  loss creates a 60%+ marginal tax trap—and compute the exact salary sacrifice to
                  bridge across it safely.
                </p>
                <div className={ctaLinkStyle} style={{ marginTop: "4px" }}>
                  Run £100k Tax Trap Simulation <FiArrowRight />
                </div>
              </div>
            </div>
          </Link>

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
