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
import { getToolEntry, getToolGuide, resolveToolSlug, type ToolSlug } from "@repo/ui/tools";
import { ToolBreadcrumbs, type ToolBreadcrumbsRenderLink } from "@repo/ui/tools/breadcrumbs";
import { ToolGuide } from "@repo/ui/tools/guide";
import type { ComponentType, FC } from "react";
import {
  type LoaderFunctionArgs,
  type MetaFunction,
  Link as RouterLink,
  redirect,
  useLoaderData,
} from "react-router";
import { SignedOutPage } from "~/features/signed-out/components/SignedOutPage";
import { getMarketingUrl } from "~/utils/marketingUrl";

const renderCrumbLink: ToolBreadcrumbsRenderLink = (href, className, children) => (
  <RouterLink className={className} to={href}>
    {children}
  </RouterLink>
);

/** What every calculator takes on a tool page: no own title, and the interactive preview as its button. */
interface ToolCalculatorProps {
  embedded: boolean;
  ctaText: string;
  onSaveAndContinue: () => void;
  persistSeed: boolean;
}

/** Which calculator each slug renders. Titles, descriptions and guides come from `@repo/ui/tools`. */
const TOOL_COMPONENTS: Record<ToolSlug, ComponentType<ToolCalculatorProps>> = {
  "uk-debt-snowball-vs-avalanche-calculator": DebtSnowballCalculator,
  "0-percent-balance-transfer-payoff-calculator": ZeroPercentCliffCalculator,
  "overdraft-cost-and-payoff-calculator": OverdraftCostCalculator,
  "mortgage-overpayment-vs-isa-calculator": MortgageVsIsaCalculator,
  "uk-student-loan-overpay-or-invest-calculator": StudentLoanCalculator,
  "uk-pay-rise-take-home-calculator": (props) => (
    <MarginalRateExplorerStandalone headingLevel="h2" {...props} />
  ),
  "section-24-landlord-tax-calculator": Section24Calculator,
  "uk-100k-tax-trap-calculator": TaxTrapCalculator,
};

/**
 * Invite links are shared by hand (owner, 28 Nov 2026), so nothing asks for an invite: the button
 * opens the marketing site's interactive preview, the marketing heroes' one call to action.
 */
const TOOL_CTA_TEXT = "Interactive preview";

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  if (!data?.tool) {
    return [{ title: "Calculator not found | Flump" }];
  }
  return [
    { title: `${data.tool.metaTitle} | Flump` },
    { name: "description", content: data.tool.description },
  ];
};

export const loader = async ({ params, request }: LoaderFunctionArgs) => {
  const slug = params.slug || "";
  // Slugs match case-insensitively; a mixed-case link redirects to the lowercase canonical one.
  const canonical = resolveToolSlug(slug.toLowerCase());

  if (!canonical) {
    throw new Response("We cannot find that calculator.", { status: 404 });
  }
  // Older web and marketing slugs move permanently to the shared canonical slug, keeping the
  // query string (campaign and referral parameters).
  if (canonical !== slug) {
    throw redirect(`/tools/${canonical}${new URL(request.url).search}`, 301);
  }

  return {
    tool: getToolEntry(canonical),
    // The preview lives on the marketing site; figures are not handed over.
    previewHref: `${getMarketingUrl(request.url).replace(/\/+$/, "")}/preview`,
  };
};

/**
 * One public calculator: breadcrumb, h1, one line, then the tool (embedded, so it does not repeat the
 * title; it carries the page's one notice), then the collapsed guide and FAQ (E16 PR 11). Nothing else sits above the tool.
 */
export const ToolDetailPage: FC = () => {
  const { tool, previewHref } = useLoaderData<typeof loader>();

  if (!tool) return null;
  const Calculator = TOOL_COMPONENTS[tool.slug];
  const guide = getToolGuide(tool.slug);

  return (
    <SignedOutPage>
      <ToolBreadcrumbs renderLink={renderCrumbLink} title={tool.title} />
      <PageHeader description={tool.description} title={tool.title} />

      <section aria-label="Calculator" data-tool-calculator="">
        <Calculator
          ctaText={TOOL_CTA_TEXT}
          embedded
          persistSeed={false}
          onSaveAndContinue={() => {
            window.location.href = previewHref;
          }}
        />
      </section>

      <ToolGuide faqs={guide.faqs} guideSections={guide.guideSections} />
    </SignedOutPage>
  );
};

export default ToolDetailPage;
