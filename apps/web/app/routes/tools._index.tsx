import { PageHeader, ProjectionNotice } from "@repo/ui";
import type { FC } from "react";
import type { MetaFunction } from "react-router";
import { SignedOutPage } from "~/features/signed-out/components/SignedOutPage";
import { ToolsGrid } from "~/features/signed-out/components/ToolsGrid";

export const meta: MetaFunction = () => [
  { title: "Free UK money calculators | Flump" },
  {
    name: "description",
    content:
      "Free interactive UK money calculators. Compare debt payoff methods, mortgage overpayment with ISA investing, student loan repayments and landlord tax.",
  },
];

export const ToolsIndex: FC = () => (
  <SignedOutPage>
    <ProjectionNotice />
    <PageHeader
      description="Calculators built for UK rules, HMRC thresholds and allowances. No account or email address needed, and nothing you enter is saved."
      title="Free UK money calculators"
    />
    <ToolsGrid />
  </SignedOutPage>
);

export default ToolsIndex;
