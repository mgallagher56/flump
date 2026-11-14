import { Icon } from "@repo/ui";
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
import { getToolEntry, getToolGuide, resolveToolSlug } from "@repo/ui/tools";
import { ToolGuide } from "@repo/ui/tools/guide";
import { ChevronRight } from "lucide-react";
import type { FC } from "react";
import { Link, useParams } from "react-router-dom";
import { Footer } from "../components/Footer";
import { Header } from "../components/Header";
import { PageMeta } from "../components/PageMeta";
import { signupCta } from "../utils/site";
import { isKnownToolSlug } from "../utils/toolSlugs";
import { NotFoundPage } from "./NotFoundPage";

const pageStyle = css({ minHeight: "100vh", display: "flex", flexDirection: "column" });

const mainStyle = css({ flex: "1" });

const containerStyle = css({ maxWidth: "5xl", mx: "auto", py: "8", px: "4" });

const crumbListStyle = css({
  listStyle: "none",
  padding: "0",
  margin: "0",
  marginBottom: "4",
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: "1.5",
  fontSize: "sm",
  color: "text.secondary",
});

const crumbItemStyle = css({ display: "inline-flex", alignItems: "center", gap: "1.5" });

const crumbLinkStyle = css({
  color: "primary",
  fontWeight: "600",
  textDecoration: "none",
  _hover: { textDecoration: "underline" },
  _focusVisible: { outline: "2px solid", outlineColor: "border.focusRing", outlineOffset: "2px" },
});

const headerBlockStyle = css({ marginBottom: "6" });

const titleStyle = css({
  fontFamily: "display",
  fontSize: "clamp(2rem, 3.5vw, 2.75rem)",
  fontWeight: "800",
  lineHeight: "1.15",
  color: "text.primary",
  marginBottom: "2",
});

const descriptionStyle = css({
  fontSize: "lg",
  color: "text.secondary",
  maxWidth: "3xl",
  lineHeight: "1.6",
});

const guideStyle = css({ marginTop: "10" });

/**
 * One public calculator: breadcrumb, h1, one line, the calculator (which carries the page's one
 * notice), then the shared guide and FAQ, collapsed (E16 PR 11, D11).
 */
export const ToolPage: FC = () => {
  const { slug: rawSlug } = useParams<{ slug: string }>();
  const cta = signupCta();
  // Lower-cased like the router, the HTTP status and the canonical, so /tools/UK-… is the page,
  // not a "Page not found" served with 200.
  const slug = rawSlug?.toLowerCase();
  const normalizedSlug = resolveToolSlug(slug);

  if (!normalizedSlug || !isKnownToolSlug(slug)) {
    return <NotFoundPage />;
  }
  const tool = getToolEntry(normalizedSlug);
  const guide = getToolGuide(normalizedSlug);

  // Invite-only: the button asks for an invite. Open: it hands the calculation to the web app.
  const ctaText = cta.external ? "Continue in Flump" : `${cta.label} →`;
  // Only hand figures to the web app when sign-up is open; an invite request has nowhere to restore them.
  const persistSeed = cta.external;

  const handleContinue = () => {
    if (typeof window !== "undefined") {
      window.location.href = cta.href;
    }
  };

  return (
    <div className={pageStyle}>
      <PageMeta title={`${tool.metaTitle} | Flump`} description={tool.description} />

      <Header />

      <main className={mainStyle} id="main" tabIndex={-1}>
        <section className={containerStyle}>
          <nav aria-label="Breadcrumb">
            <ol className={crumbListStyle}>
              <li className={crumbItemStyle}>
                <Link className={crumbLinkStyle} to="/tools">
                  All calculators
                </Link>
                <Icon icon={ChevronRight} size="sm" />
              </li>
              <li aria-current="page" className={crumbItemStyle}>
                {tool.title}
              </li>
            </ol>
          </nav>

          <div className={headerBlockStyle}>
            <h1 className={titleStyle}>{tool.title}</h1>
            <p className={descriptionStyle}>{tool.description}</p>
          </div>

          <section aria-label="Calculator" data-tool-calculator="">
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

            {normalizedSlug === "0-percent-balance-transfer-payoff-calculator" && (
              <ZeroPercentCliffCalculator
                ctaText={ctaText}
                onSaveAndContinue={handleContinue}
                persistSeed={persistSeed}
              />
            )}

            {normalizedSlug === "section-24-landlord-tax-calculator" && (
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

            {normalizedSlug === "overdraft-cost-and-payoff-calculator" && (
              <OverdraftCostCalculator
                ctaText={ctaText}
                onSaveAndContinue={handleContinue}
                persistSeed={persistSeed}
              />
            )}

            {normalizedSlug === "uk-pay-rise-take-home-calculator" && (
              <MarginalRateExplorerStandalone headingLevel="h2" />
            )}

            {normalizedSlug === "uk-student-loan-overpay-or-invest-calculator" && (
              <StudentLoanCalculator
                ctaText={ctaText}
                onSaveAndContinue={handleContinue}
                persistSeed={persistSeed}
              />
            )}
          </section>

          <div className={guideStyle}>
            <ToolGuide faqs={guide.faqs} guideSections={guide.guideSections} />
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default ToolPage;
