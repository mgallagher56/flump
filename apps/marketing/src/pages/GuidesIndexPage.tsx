import { css } from "@repo/ui/styled-system/css";
import { grid } from "@repo/ui/styled-system/patterns";
import type { FC } from "react";
import { Helmet } from "react-helmet-async";
import { FiArrowRight } from "react-icons/fi";
import { Link } from "react-router-dom";
import { Footer } from "../components/Footer";
import { Header } from "../components/Header";

const containerStyle = css({
  maxWidth: "6xl",
  mx: "auto",
  py: "16",
  px: "4",
});

const guideCardStyle = css({
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

const badgeStyle = css({
  fontSize: "11px",
  fontWeight: "700",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  backgroundColor: { base: "#e0e7ff", _dark: "rgba(99, 102, 241, 0.18)" },
  color: { base: "#4338ca", _dark: "#a5b4fc" },
  border: "1px solid",
  borderColor: { base: "transparent", _dark: "rgba(99, 102, 241, 0.3)" },
  padding: "3px 10px",
  borderRadius: "full",
});

const guideTitleStyle = css({
  fontSize: "1.3rem",
  fontWeight: "700",
  color: { base: "slate.900", _dark: "#ffffff" },
  marginBottom: "8px",
  lineHeight: "1.3",
});

const guideSummaryStyle = css({
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

export const GUIDES_DATA = [
  {
    slug: "how-to-escape-the-60-percent-tax-trap",
    title: "How to Escape the UK 60% Marginal Tax Trap",
    category: "Income Tax & Childcare",
    readTime: "6 min read",
    summary:
      "A complete guide to HMRC's Personal Allowance clawback between £100,000 and £125,140, preserving 30 hours free childcare, and utilizing salary sacrifice.",
  },
  {
    slug: "snowball-vs-avalanche-uk-overdrafts-cards",
    title: "Snowball vs. Avalanche for UK Overdrafts & Cards",
    category: "Debt Elimination",
    readTime: "8 min read",
    summary:
      "Why arranged bank overdrafts at 39.9% EAR should take priority, and how the mathematical Avalanche method builds into an emergency fund bridge.",
  },
  {
    slug: "section-24-landlord-tax-survival",
    title: "Section 24 Landlord Tax Survival Guide",
    category: "Property & Landlords",
    readTime: "7 min read",
    summary:
      "Understand why mortgage finance costs are no longer deductible from rental income and explore offset strategies using personal pensions.",
  },
  {
    slug: "mortgage-fix-ending-overpay-vs-invest",
    title: "Mortgage Fix Ending: Should You Overpay or Invest in an ISA?",
    category: "Mortgages & Wealth",
    readTime: "5 min read",
    summary:
      "A decision framework for homeowners facing higher interest rates: comparing the guaranteed risk-free return of overpaying against compounding global equities.",
  },
];

export const GuidesIndexPage: FC = () => {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Helmet>
        <title>UK Personal Finance Playbooks & Guides | Flump</title>
        <meta
          name="description"
          content="Actionable guides on navigating the UK tax system, escaping high marginal rates, eliminating debt, and building long-term wealth."
        />
        <link rel="canonical" href="https://flump.co.uk/guides" />
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
              Actionable Knowledge
            </span>
            <h1
              style={{
                fontSize: "clamp(2rem, 4vw, 3rem)",
                fontWeight: "800",
                color: "var(--colors-text-primary, #0f172a)",
                marginTop: "8px",
              }}
            >
              UK Financial Playbooks
            </h1>
            <p
              style={{
                fontSize: "1.1rem",
                color: "var(--colors-text-muted, #64748b)",
                maxWidth: "600px",
                margin: "12px auto 0",
              }}
            >
              Practical strategies tied directly to UK tax laws, interest rate regimes, and wealth
              milestones.
            </p>
          </div>

          <div className={grid({ columns: { base: 1, md: 2 }, gap: "6" })}>
            {GUIDES_DATA.map((guide) => (
              <Link key={guide.slug} to={`/guides/${guide.slug}`} className={guideCardStyle}>
                <div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "12px",
                    }}
                  >
                    <span className={badgeStyle}>{guide.category}</span>
                    <span style={{ fontSize: "12px", color: "var(--colors-text-muted, #94a3b8)" }}>
                      {guide.readTime}
                    </span>
                  </div>

                  <h3 className={guideTitleStyle}>{guide.title}</h3>
                  <p className={guideSummaryStyle}>{guide.summary}</p>
                </div>

                <div className={ctaLinkStyle}>
                  Read Playbook <FiArrowRight />
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
