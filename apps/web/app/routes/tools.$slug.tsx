import { PageHeader } from "@repo/ui";
import { MarginalRateExplorerStandalone } from "@repo/ui/calculators";
import { getToolEntry, getToolGuide, resolveToolSlug, type ToolSlug } from "@repo/ui/tools";
import { ToolBreadcrumbs, type ToolBreadcrumbsRenderLink } from "@repo/ui/tools/breadcrumbs";
import { ToolGuide } from "@repo/ui/tools/guide";
import type { FC } from "react";
import {
  type LoaderFunctionArgs,
  type MetaFunction,
  Link as RouterLink,
  redirect,
  useLoaderData,
} from "react-router";
import DebtSnowballVsAvalancheTool from "~/components/tools/DebtSnowballVsAvalancheTool";
import MortgageVsIsaTool from "~/components/tools/MortgageVsIsaTool";
import OverdraftCostTool from "~/components/tools/OverdraftCostTool";
import Section24Tool from "~/components/tools/Section24Tool";
import StudentLoanOverpayTool from "~/components/tools/StudentLoanOverpayTool";
import TaxTrapCalculatorTool from "~/components/tools/TaxTrapCalculatorTool";
import ZeroPercentCliffTool from "~/components/tools/ZeroPercentCliffTool";
import { SignedOutPage } from "~/features/signed-out/components/SignedOutPage";

const renderCrumbLink: ToolBreadcrumbsRenderLink = (href, className, children) => (
  <RouterLink className={className} to={href}>
    {children}
  </RouterLink>
);

type ToolComponent =
  | "tax-trap"
  | "mortgage-isa"
  | "section-24"
  | "debt-snowball"
  | "zero-percent-cliff"
  | "overdraft-cost"
  | "student-loan"
  | "pay-rise";

/** Which calculator each slug renders. Titles, descriptions and guides come from `@repo/ui/tools`. */
const TOOL_COMPONENTS: Record<ToolSlug, ToolComponent> = {
  "uk-debt-snowball-vs-avalanche-calculator": "debt-snowball",
  "0-percent-balance-transfer-payoff-calculator": "zero-percent-cliff",
  "overdraft-cost-and-payoff-calculator": "overdraft-cost",
  "mortgage-overpayment-vs-isa-calculator": "mortgage-isa",
  "uk-student-loan-overpay-or-invest-calculator": "student-loan",
  "uk-pay-rise-take-home-calculator": "pay-rise",
  "section-24-landlord-tax-calculator": "section-24",
  "uk-100k-tax-trap-calculator": "tax-trap",
};

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

  return { tool: getToolEntry(canonical) };
};

/**
 * One public calculator: breadcrumb, h1, one line, then the tool (which carries the page's one
 * notice), then the collapsed guide and FAQ (E16 PR 11). Nothing else sits above the tool.
 */
export const ToolDetailPage: FC = () => {
  const { tool } = useLoaderData<typeof loader>();

  if (!tool) return null;
  const component = TOOL_COMPONENTS[tool.slug];
  const guide = getToolGuide(tool.slug);

  return (
    <SignedOutPage>
      <ToolBreadcrumbs renderLink={renderCrumbLink} title={tool.title} />
      <PageHeader description={tool.description} title={tool.title} />

      <section aria-label="Calculator" data-tool-calculator="">
        {component === "tax-trap" && <TaxTrapCalculatorTool />}
        {component === "mortgage-isa" && <MortgageVsIsaTool />}
        {component === "section-24" && <Section24Tool />}
        {component === "debt-snowball" && <DebtSnowballVsAvalancheTool />}
        {component === "zero-percent-cliff" && <ZeroPercentCliffTool />}
        {component === "overdraft-cost" && <OverdraftCostTool />}
        {component === "student-loan" && <StudentLoanOverpayTool />}
        {component === "pay-rise" && <MarginalRateExplorerStandalone headingLevel="h2" />}
      </section>

      <ToolGuide faqs={guide.faqs} guideSections={guide.guideSections} />
    </SignedOutPage>
  );
};

export default ToolDetailPage;
