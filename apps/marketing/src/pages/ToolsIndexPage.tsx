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

export const TOOLS_CATALOG = [
  {
    slug: "uk-100k-tax-trap-calculator",
    title: "£100k–£125k tax trap and childcare calculator",
    desc: "Model how the Personal Allowance taper creates an effective 60% marginal rate and calculate the exact pension salary sacrifice to reclaim your allowance and 30 hours free childcare.",
    icon: <FiPercent size={22} color="#6363f1" />,
    badge: "HMRC income tax",
  },
  {
    slug: "uk-debt-snowball-vs-avalanche-calculator",
    title: "Debt snowball vs avalanche payoff",
    desc: "Compare payoff speeds, interest savings, and debt-free dates between high-APR avalanche and balance-clearing snowball methods.",
    icon: <FiDollarSign size={22} color="#ef4444" />,
    badge: "Debt payoff",
  },
  {
    slug: "0-percent-balance-transfer-payoff-calculator",
    title: "0% balance transfer payoff calculator",
    desc: "Calculate the exact monthly repayment needed to clear transfer balances before your promotional 0% window ends and standard APR applies.",
    icon: <FiCreditCard size={22} color="#f59e0b" />,
    badge: "Credit cards",
  },
  {
    slug: "section-24-landlord-tax-calculator",
    title: "Section 24 buy-to-let landlord tax calculator",
    desc: "Model how mortgage interest relief restriction impacts higher-rate landlords and see how pension contributions restore basic tax bands.",
    icon: <FiHome size={22} color="#8b5cf6" />,
    badge: "Property tax",
  },
  {
    slug: "mortgage-overpayment-vs-isa-calculator",
    title: "Mortgage overpayment vs Stocks and Shares ISA",
    desc: "Compare the guaranteed return of paying down your UK mortgage against compounding equity market returns over 5–25 years.",
    icon: <FiTrendingUp size={22} color="#10b981" />,
    badge: "Mortgages and wealth",
  },
  {
    slug: "overdraft-cost-and-payoff-calculator",
    title: "Arranged overdraft cost and payoff modeller",
    desc: "Expose the compound cost of arranged UK overdrafts (often 39.9% EAR) and plan a clear exit strategy with regular payments.",
    icon: <FiDollarSign size={22} color="#ef4444" />,
    badge: "Banking fees",
  },
  {
    slug: "uk-student-loan-overpay-or-invest-calculator",
    title: "Student loan (Plan 2 / Plan 5) overpay or invest",
    desc: "Analyse whether treating your UK student loan as a graduate tax or paying it down is mathematically optimal based on salary growth.",
    icon: <FiPercent size={22} color="#06b6d4" />,
    badge: "Student finance",
  },
];

export const ToolsIndexPage: FC = () => {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Helmet>
        <title>Free UK financial and tax calculators | Flump</title>
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
                fontWeight: "600",
                letterSpacing: "0.01em",
                color: "#6363f1",
              }}
            >
              Public tools directory
            </span>
            <h1
              style={{
                fontSize: "clamp(2rem, 4vw, 3rem)",
                fontWeight: "800",
                color: "var(--colors-text-primary, #0f172a)",
                marginTop: "8px",
              }}
            >
              Free UK financial calculators
            </h1>
            <p
              style={{
                fontSize: "1.1rem",
                color: "var(--colors-text-muted, #64748b)",
                maxWidth: "600px",
                margin: "12px auto 0",
              }}
            >
              Fast calculators running directly in your browser. Answer specific UK tax, debt, and
              mortgage questions with zero sign-up required.
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
              {/* Coded UK Marginal Tax Rate Visualization */}
              <div
                style={{
                  height: "100%",
                  minHeight: "200px",
                  backgroundColor: "var(--colors-surface-subtle)",
                  borderRight: "1px solid var(--colors-border)",
                  padding: "24px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  gap: "12px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "11px",
                    color: "var(--colors-text-muted)",
                  }}
                >
                  <span>UK Marginal Income Tax Curve</span>
                  <span style={{ color: "var(--colors-status-danger-text)", fontWeight: "700" }}>
                    60% Peak Zone
                  </span>
                </div>
                <div
                  style={{ display: "flex", gap: "3px", height: "36px", alignItems: "flex-end" }}
                >
                  <div
                    style={{
                      flex: 2,
                      height: "40%",
                      backgroundColor: "#38bdf8",
                      borderRadius: "3px",
                    }}
                    title="20% Basic rate (£12,570–£50,270)"
                  />
                  <div
                    style={{
                      flex: 3,
                      height: "70%",
                      backgroundColor: "#6363f1",
                      borderRadius: "3px",
                    }}
                    title="40% Higher rate (£50,270–£100,000)"
                  />
                  <div
                    style={{
                      flex: 2,
                      height: "100%",
                      backgroundColor: "#ef4444",
                      borderRadius: "3px",
                    }}
                    title="60% Taper trap (£100,000–£125,140)"
                  />
                  <div
                    style={{
                      flex: 3,
                      height: "80%",
                      backgroundColor: "#4f46e5",
                      borderRadius: "3px",
                    }}
                    title="45% Additional rate (£125,140+)"
                  />
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "10px",
                    color: "var(--colors-text-muted)",
                  }}
                >
                  <span>£12.5k</span>
                  <span>£50.2k</span>
                  <span style={{ color: "var(--colors-status-danger-text)", fontWeight: "bold" }}>
                    £100k–£125k
                  </span>
                  <span>£125k+</span>
                </div>
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
                  <span className={badgeStyle}>Featured calculator</span>
                  <span
                    style={{ fontSize: "12px", color: "var(--colors-primary)", fontWeight: "700" }}
                  >
                    60% effective marginal rate
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
                  Bridge the £100k–£125k tax trap and protect childcare
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
                  loss creates a 60%+ marginal tax trap – and calculate the exact salary sacrifice
                  to bridge across it safely.
                </p>
                <div className={ctaLinkStyle} style={{ marginTop: "4px" }}>
                  Run £100k tax trap simulation <FiArrowRight />
                </div>
              </div>
            </div>
          </Link>

          <div className={grid({ columns: { base: 1, md: 2, lg: 3 }, gap: "6" })}>
            {TOOLS_CATALOG.filter((tool) => tool.slug !== "uk-100k-tax-trap-calculator").map(
              (tool) => (
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
                    Open calculator <FiArrowRight />
                  </div>
                </Link>
              ),
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};
