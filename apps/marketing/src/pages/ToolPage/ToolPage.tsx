import { PageHeader } from "@repo/ui";
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
import { getToolEntry, getToolGuide, resolveToolSlug } from "@repo/ui/tools";
import { ToolBreadcrumbs, type ToolBreadcrumbsRenderLink } from "@repo/ui/tools/breadcrumbs";
import { ToolGuide } from "@repo/ui/tools/guide";
import type { FC } from "react";
import { Link, useParams } from "react-router-dom";
import { Footer } from "../../components/Footer";
import { Header } from "../../components/Header";
import { PageMeta } from "../../components/PageMeta";
import { signupCta } from "../../utils/site";
import { isKnownToolSlug } from "../../utils/toolSlugs";
import { NotFoundPage } from "../NotFoundPage";
import { containerStyle, guideStyle, mainStyle, pageStyle } from "./ToolPage.styles";

const renderCrumbLink: ToolBreadcrumbsRenderLink = (href, className, children) => (
  <Link className={className} to={href}>
    {children}
  </Link>
);

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
  const ctaText = cta.external ? "Continue in Flump" : cta.label;
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
          <ToolBreadcrumbs renderLink={renderCrumbLink} title={tool.title} />
          <PageHeader description={tool.description} title={tool.title} />

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
