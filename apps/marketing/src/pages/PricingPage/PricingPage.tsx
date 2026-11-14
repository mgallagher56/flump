import { Button, Icon } from "@repo/ui";
import { Check } from "lucide-react";
import type { FC } from "react";
import { Footer } from "../../components/Footer";
import { Header } from "../../components/Header";
import { PageMeta } from "../../components/PageMeta";
import { PRICING } from "../../utils/pricing";
import { signupCta } from "../../utils/site";
import {
  container,
  featureIcon,
  featureItem,
  featureList,
  headerBlock,
  heading,
  intro,
  mainContent,
  pageShell,
  paidLine,
  paidName,
  paidNote,
  paidPrice,
  planCard,
  planName,
} from "./PricingPage.styles";

/**
 * The intro. "Free during the beta" is said once, in the plan card (R2-10); the home FAQ says the
 * same in its own words.
 */
export const BETA_STATEMENT = "One plan today.";

/** What the beta includes: three things that exist today (E7, copy guide 7.4). */
export const BETA_FEATURES = [
  "The Flump app: months of cover, what is left over and what a change would do",
  "Every calculator on the tools page",
  "Your own figures, typed in. No bank login is needed",
] as const;

/**
 * Pricing (E16 PR 12, D10 b): the beta plan first and prominent; the possible paid plan as one
 * quiet line with "Price not set". No billing toggle, no example price and no disabled button.
 */
export const PricingPage: FC = () => {
  const cta = signupCta();
  // Build-time constant (vite.config.ts): false in a launch build with no price set, so the paid
  // line is dropped from the bundle.
  const paid = import.meta.env.VITE_SHOW_PAID_PLAN !== "false";

  return (
    <div className={pageShell()}>
      <PageMeta
        title="Pricing | Flump"
        description="Flump is free during the beta and nothing is charged. A paid plan may come later and its price is not set."
      />

      <Header />

      <main className={mainContent()} id="main" tabIndex={-1}>
        <div className={container()}>
          <div className={headerBlock()}>
            <h1 className={heading()}>Pricing</h1>
            <p className={intro()}>{BETA_STATEMENT}</p>
          </div>

          <section aria-labelledby="plan-beta" className={planCard()} data-plan="beta">
            <h2 className={planName()} id="plan-beta">
              Free during the beta
            </h2>
            <ul className={featureList()}>
              {BETA_FEATURES.map((feature) => (
                <li className={featureItem()} key={feature}>
                  <span aria-hidden="true" className={featureIcon()}>
                    <Icon icon={Check} size="sm" />
                  </span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <div>
              <Button asChild size="lg" variant="primary">
                <a href={cta.href}>{cta.label}</a>
              </Button>
            </div>
          </section>

          {paid && (
            <section aria-labelledby="plan-paid" className={paidLine()} data-plan="paid">
              <h2 className={paidName()} id="plan-paid">
                Paid plan
              </h2>
              <span className={paidPrice()}>{PRICING.display}</span>
              <p className={paidNote()}>A possible future plan. It cannot be bought today.</p>
            </section>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};
