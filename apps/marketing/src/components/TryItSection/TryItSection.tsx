import { DebtSnowballCalculator, MortgageVsIsaCalculator } from "@repo/ui/calculators";
import type { FC } from "react";
import { TRY_IT } from "../../utils/featureAreas";
import { MarketingSection } from "../MarketingSection";
import { PayRiseTeaser } from "../PayRiseTeaser";
import { inAppLine, tool, toolLead, toolLine, tools, toolTitle } from "./TryItSection.styles";

export interface TryItSectionProps {
  /** The two pages with a kept calculator (D9). */
  area: "pay" | "debt-and-borrowing";
}

/**
 * "Try it with your own numbers" (E42 S6b, plan section 4.4): the kept calculators in their short
 * forms, three fields or fewer on first view, with example starting values. Nothing is saved and
 * nothing ends in a sign-up button. Each names, in one line, where the app does the same job with
 * saved figures. The two debt ways and the two mortgage options are shown with the same weight.
 */
export const TryItSection: FC<TryItSectionProps> = ({ area }) => (
  <MarketingSection id="try-it" subtitle={TRY_IT.subtitle} title={TRY_IT.title}>
    {area === "pay" ? (
      <div className={tool()}>
        <PayRiseTeaser embedded link="none" />
        <p className={inAppLine()}>{TRY_IT.payRise.inApp}</p>
      </div>
    ) : (
      <div className={tools()}>
        <section aria-labelledby="try-debt-payoff" className={tool()}>
          <h3 className={toolTitle()} id="try-debt-payoff">
            {TRY_IT.debtPayoff.title}
          </h3>
          <p className={toolLine()}>{TRY_IT.debtPayoff.line}</p>
          <DebtSnowballCalculator persistSeed={false} shortForm />
          <p className={inAppLine()}>{TRY_IT.debtPayoff.inApp}</p>
        </section>
        <section aria-labelledby="try-mortgage-isa" className={tool()}>
          <p className={toolLead()}>{TRY_IT.mortgageIsa.lead}</p>
          <h3 className={toolTitle()} id="try-mortgage-isa">
            {TRY_IT.mortgageIsa.title}
          </h3>
          <p className={toolLine()}>{TRY_IT.mortgageIsa.line}</p>
          <MortgageVsIsaCalculator persistSeed={false} shortForm />
          <p className={inAppLine()}>{TRY_IT.mortgageIsa.inApp}</p>
        </section>
      </div>
    )}
  </MarketingSection>
);
