import { Button, Icon } from "@repo/ui";
import { Check } from "lucide-react";
import { type FC, useRef } from "react";
import { Footer } from "../../../src/components/Footer";
import { Header } from "../../../src/components/Header";
import { mainContent } from "../../../src/pages/HomePage/HomePage.styles";
import { BETA_FEATURES, BETA_STATEMENT } from "../../../src/pages/PricingPage";
import { PRICING } from "../../../src/utils/pricing";
import { signupCta } from "../../../src/utils/site";
import { TIMING } from "../../shared/pace";
import { usePointerLightAndTilt } from "../../shared/round3";
import { type Moment, OBand, OHero } from "../blocks";
import { OtherShell } from "../OtherShell";
import { heroLayout, pageLayout } from "../scene/layouts";
import { PageOrbs } from "../scene/SceneLayers";

/*
 * Pricing (family E). Production's content and order: the title and one line, the beta plan card
 * first and prominent, the possible paid plan as one quiet line. In prototype 11's language: the
 * hero with the scene, the plan as a glass card that arrives once with its ticks in turn. By the
 * rules for prices: no picture beside it, no tilt on the card, no counting, nothing scroll-driven,
 * and the bubbles stay at the band's far edges (none on phones, where they would sit behind it).
 */

const planMoment: Moment = ({ gsap }, root, pace) => {
  const card = root.querySelector(".o1-plan");
  if (!card) return;
  gsap
    .timeline({
      scrollTrigger: { trigger: card, start: "top 88%", once: true },
      defaults: { ease: "calm", duration: pace.s(TIMING.entry) },
    })
    .from(card, { y: 16, opacity: 0 }, 0)
    .from(
      root.querySelectorAll(".o1-plan__features li"),
      { y: 8, opacity: 0, stagger: pace.s(TIMING.stagger) },
      pace.s(TIMING.stagger * 2),
    )
    .from(root.querySelector(".o1-paid"), { y: 8, opacity: 0 }, pace.s(TIMING.stagger * 4));
};

const Body: FC = () => {
  const ref = useRef<HTMLElement>(null);
  usePointerLightAndTilt(ref, 6);
  const cta = signupCta();
  const paid = import.meta.env.VITE_SHOW_PAID_PLAN !== "false";
  return (
    <main className={mainContent()} id="main" ref={ref} tabIndex={-1}>
      <OHero
        compact
        ctas={null}
        layout={heroLayout(["sky", "violet", "teal", "rose"])}
        lead={BETA_STATEMENT}
        title="Pricing"
        titleId="pricing-title"
      />
      <OBand
        bubbles="c"
        className="o1-plan-band"
        id="plans"
        moment={planMoment}
        tone="card"
        width="narrow"
      >
        <section aria-labelledby="plan-beta" className="o1-plan p11-soft-card" data-plan="beta">
          <h2 className="o1-plan__name" id="plan-beta">
            Free during the beta
          </h2>
          <ul className="o1-plan__features">
            {BETA_FEATURES.map((feature) => (
              <li key={feature}>
                <span aria-hidden="true" className="o1-plan__tick">
                  <Icon icon={Check} size="sm" />
                </span>
                <span>{feature}</span>
              </li>
            ))}
          </ul>
          <div>
            <Button asChild size="lg" variant="primary">
              <a data-light="" href={cta.href}>
                {cta.label}
              </a>
            </Button>
          </div>
        </section>
        {paid && (
          <section aria-labelledby="plan-paid" className="o1-paid" data-plan="paid">
            <h2 className="o1-paid__name" id="plan-paid">
              Paid plan
            </h2>
            <span className="o1-paid__price">{PRICING.display}</span>
            {/* Production's words (PricingPage). */}
            <p className="o1-paid__note">A possible future plan. It cannot be bought today.</p>
          </section>
        )}
      </OBand>
    </main>
  );
};

export const PricingProto: FC = () => (
  <OtherShell defaultLevel="s0" id="pricing">
    <PageOrbs layout={pageLayout(["sky", "violet", "teal", "rose"])} />
    <Header />
    <Body />
    <Footer />
  </OtherShell>
);
