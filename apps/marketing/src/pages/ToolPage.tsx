import {
  DebtSnowballCalculator,
  MarginalRateExplorerStandalone,
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
import { signupCta } from "../utils/site";
import { isKnownToolSlug, TOOL_SLUG_ALIASES } from "../utils/toolSlugs";
import { NotFoundPage } from "./NotFoundPage";
import { TOOLS_CATALOG } from "./ToolsIndexPage";

const containerStyle = css({
  maxWidth: "5xl",
  mx: "auto",
  py: "12",
  px: "4",
});

export const ToolPage: FC = () => {
  const { slug: rawSlug } = useParams<{ slug: string }>();
  const cta = signupCta();
  // Lower-cased like the router, the HTTP status and the canonical, so /tools/UK-… is the page,
  // not a "Page not found" served with 200.
  const slug = rawSlug?.toLowerCase();
  const normalizedSlug = slug ? (TOOL_SLUG_ALIASES[slug] ?? slug) : slug;

  const toolMeta = TOOLS_CATALOG.find((t) => t.slug === normalizedSlug);
  if (!toolMeta || !isKnownToolSlug(slug)) {
    return <NotFoundPage />;
  }

  // Invite-only: the button asks for an invite. Open: it hands the calculation to the web app.
  const ctaText = cta.external
    ? "Open this calculation in your Flump workspace →"
    : `${cta.label} →`;
  // Only hand figures to the web app when sign-up is open; an invite request has nowhere to restore them.
  const persistSeed = cta.external;

  const handleContinue = () => {
    if (typeof window !== "undefined") {
      window.location.href = cta.href;
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <PageMeta
        title={`${toolMeta.title} | Free UK Calculator | Flump`}
        description={toolMeta.desc}
      />

      <Header />

      <main style={{ flex: 1 }} id="main" tabIndex={-1}>
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

          {/* Every calculator carries its own single "Guidance, not advice" notice (E16 PR 10). */}
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
              ctaText={ctaText}
              onSaveAndContinue={handleContinue}
              persistSeed={persistSeed}
            />
          )}

          {normalizedSlug === "uk-debt-snowball-vs-avalanche-calculator" && (
            <DebtSnowballCalculator
              ctaText={ctaText}
              onSaveAndContinue={handleContinue}
              persistSeed={persistSeed}
            />
          )}

          {(normalizedSlug === "0-percent-balance-transfer-payoff-calculator" ||
            normalizedSlug === "zero-percent-balance-transfer-calculator") && (
            <ZeroPercentCliffCalculator
              ctaText={ctaText}
              onSaveAndContinue={handleContinue}
              persistSeed={persistSeed}
            />
          )}

          {(normalizedSlug === "section-24-landlord-tax-calculator" ||
            normalizedSlug === "landlord-section-24-tax-calculator") && (
            <Section24Calculator
              ctaText={ctaText}
              onSaveAndContinue={handleContinue}
              persistSeed={persistSeed}
            />
          )}

          {normalizedSlug === "mortgage-overpayment-vs-isa-calculator" && (
            <MortgageVsIsaCalculator
              ctaText={ctaText}
              onSaveAndContinue={handleContinue}
              persistSeed={persistSeed}
            />
          )}

          {(normalizedSlug === "overdraft-cost-and-payoff-calculator" ||
            normalizedSlug === "overdraft-interest-calculator") && (
            <OverdraftCostCalculator
              ctaText={ctaText}
              onSaveAndContinue={handleContinue}
              persistSeed={persistSeed}
            />
          )}

          {normalizedSlug === "uk-pay-rise-take-home-calculator" && (
            <MarginalRateExplorerStandalone headingLevel="h2" />
          )}

          {(normalizedSlug === "uk-student-loan-overpay-or-invest-calculator" ||
            normalizedSlug === "student-loan-plan-2-calculator") && (
            <StudentLoanCalculator
              ctaText={ctaText}
              onSaveAndContinue={handleContinue}
              persistSeed={persistSeed}
            />
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default ToolPage;
