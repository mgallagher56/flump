import { ProjectionNotice } from "@repo/ui";
import {
  DebtSnowballCalculator,
  MortgageVsIsaCalculator,
  OverdraftCostCalculator,
  Section24Calculator,
  StudentLoanCalculator,
  TaxTrapCalculator,
  ZeroPercentCliffCalculator,
} from "@repo/ui/calculators";
import { css } from "@repo/ui/styled-system/css";
import type { FC } from "react";
import { FiArrowLeft } from "react-icons/fi";
import { Link, useParams } from "react-router-dom";
import { Footer } from "../components/Footer";
import { Header } from "../components/Header";
import { PageMeta } from "../components/PageMeta";
import { isKnownToolSlug, TOOL_SLUG_ALIASES } from "../utils/toolSlugs";
import { getAppUrl } from "../utils/url";
import { NotFoundPage } from "./NotFoundPage";
import { TOOLS_CATALOG } from "./ToolsIndexPage";

const containerStyle = css({
  maxWidth: "5xl",
  mx: "auto",
  py: "12",
  px: "4",
});

export const ToolPage: FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const appUrl = getAppUrl();
  const normalizedSlug = slug ? (TOOL_SLUG_ALIASES[slug] ?? slug) : slug;

  const toolMeta = TOOLS_CATALOG.find((t) => t.slug === normalizedSlug);
  if (!toolMeta || !isKnownToolSlug(slug)) {
    return <NotFoundPage />;
  }

  const handleContinue = () => {
    if (typeof window !== "undefined") {
      window.location.href = `${appUrl}/signUp`;
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <PageMeta
        title={`${toolMeta.title} | Free UK Calculator | Flump`}
        description={toolMeta.desc}
      />

      <Header />

      <main style={{ flex: 1 }}>
        <section className={containerStyle}>
          {/* Breadcrumb / Back Link */}
          <div style={{ marginBottom: "20px" }}>
            <Link
              to="/tools"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                color: "var(--colors-primary)",
                textDecoration: "none",
                fontSize: "14px",
                fontWeight: "600",
              }}
            >
              <FiArrowLeft /> All UK calculators
            </Link>
          </div>

          <div style={{ marginBottom: "24px" }}>
            <ProjectionNotice />
          </div>

          <div style={{ marginBottom: "32px" }}>
            <span
              style={{
                fontSize: "12px",
                fontWeight: "600",
                letterSpacing: "0.01em",
                backgroundColor: "var(--colors-surface-subtle)",
                color: "var(--colors-primary)",
                border: "1px solid var(--colors-border)",
                padding: "3px 10px",
                borderRadius: "9999px",
              }}
            >
              {toolMeta.badge}
            </span>
            <h1
              style={{
                fontSize: "clamp(2rem, 3.5vw, 2.75rem)",
                fontWeight: "800",
                color: "var(--colors-text-primary, #0f172a)",
                marginTop: "12px",
                marginBottom: "8px",
              }}
            >
              {toolMeta.title}
            </h1>
            <p
              style={{
                fontSize: "1.1rem",
                color: "var(--colors-text-muted, #64748b)",
                maxWidth: "750px",
                lineHeight: "1.6",
              }}
            >
              {toolMeta.desc}
            </p>
          </div>

          {/* Render Active Modular Calculator */}
          {normalizedSlug === "uk-100k-tax-trap-calculator" && (
            <TaxTrapCalculator
              ctaText="Open this calculation in your Flump workspace →"
              onSaveAndContinue={handleContinue}
            />
          )}

          {normalizedSlug === "uk-debt-snowball-vs-avalanche-calculator" && (
            <DebtSnowballCalculator
              ctaText="Open this calculation in your Flump workspace →"
              onSaveAndContinue={handleContinue}
            />
          )}

          {(normalizedSlug === "0-percent-balance-transfer-payoff-calculator" ||
            normalizedSlug === "zero-percent-balance-transfer-calculator") && (
            <ZeroPercentCliffCalculator
              ctaText="Open this calculation in your Flump workspace →"
              onSaveAndContinue={handleContinue}
            />
          )}

          {(normalizedSlug === "section-24-landlord-tax-calculator" ||
            normalizedSlug === "landlord-section-24-tax-calculator") && (
            <Section24Calculator
              ctaText="Open this calculation in your Flump workspace →"
              onSaveAndContinue={handleContinue}
            />
          )}

          {normalizedSlug === "mortgage-overpayment-vs-isa-calculator" && (
            <MortgageVsIsaCalculator
              ctaText="Open this calculation in your Flump workspace →"
              onSaveAndContinue={handleContinue}
            />
          )}

          {(normalizedSlug === "overdraft-cost-and-payoff-calculator" ||
            normalizedSlug === "overdraft-interest-calculator") && (
            <OverdraftCostCalculator
              ctaText="Open this calculation in your Flump workspace →"
              onSaveAndContinue={handleContinue}
            />
          )}

          {(normalizedSlug === "uk-student-loan-overpay-or-invest-calculator" ||
            normalizedSlug === "student-loan-plan-2-calculator") && (
            <StudentLoanCalculator
              ctaText="Open this calculation in your Flump workspace →"
              onSaveAndContinue={handleContinue}
            />
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default ToolPage;
