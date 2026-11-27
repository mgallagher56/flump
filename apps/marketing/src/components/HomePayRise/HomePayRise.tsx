import {
  Button,
  Card,
  DELTA_PANEL_COPY,
  formatMoney,
  marketingMs,
  ProjectionNotice,
  SliderField,
  useGlide,
  VisuallyHidden,
} from "@repo/ui";
import { type FC, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import type { GsapKit } from "../../motion/loadGsapKit";
import { useGsapMoment } from "../../motion/useGsapMoment";
import { signupCta } from "../../utils/site";
import { BubbleField } from "../BubbleField";
import { MarketingSection } from "../MarketingSection";
import { DEFAULT_RISE_GBP, DEFAULT_SALARY_GBP, PAY_RISE_TITLE } from "../PayRiseTeaser";
import { payRiseResult, seedSalaryForOnboarding, taxYearInWords } from "../PayRiseTeaser/payRise";
import {
  breakdownList,
  breakdownRow,
  breakdownTerm,
  breakdownValue,
  bubbleLayer,
  glideFigure,
  outcomeHeadline,
  outcomeLabel,
  payActions,
  payBand,
  payCard,
  payControls,
  payOutcome,
  taperFigure,
  taperNote,
} from "./HomePayRise.styles";

const PAY_RISE_SUBTITLE =
  "Move the sliders to see an estimate of how much of a rise reaches your pay after Income Tax and National Insurance.";

/** The Pay page, where the tool points (E42: the marketing site has no calculator pages). */
const PAY_PAGE_PATH = "/features/pay";

const gbp = (value: number) => formatMoney(value, { fractionDigits: 0 }).text;

/**
 * One of the tool's results. It glides from the figure shown to the new one when the visitor moves
 * a slider, and never on load or first view (MK13, `useGlide`). The final value is in the server
 * HTML and is what a screen reader hears; the moving digits are hidden from it (MK10).
 */
const GlideFigure: FC<{ value: number; suffix?: string; testId: string }> = ({
  value,
  suffix = "",
  testId,
}) => {
  const figure = useGlide(value, { format: gbp });
  return (
    <span className={glideFigure} data-moving={figure.moving || undefined} data-testid={testId}>
      <VisuallyHidden>{`${figure.text}${suffix}`}</VisuallyHidden>
      <span aria-hidden="true" data-testid={`${testId}-drawn`}>
        {`${figure.displayText}${suffix}`}
      </span>
    </span>
  );
};

/** The card arrives once, by time, when it nears the viewport (MK2). The figures do not move. */
export function payRiseMoment({ gsap }: GsapKit, root: HTMLElement): undefined {
  gsap.from(root, {
    y: 24,
    opacity: 0,
    duration: marketingMs("entry") / 1000,
    ease: "calm",
    clearProps: "transform,opacity",
    scrollTrigger: { trigger: root, start: "top 86%", once: true },
  });
}

/**
 * "What you keep from a pay rise" on the home page (ROLLOUT-PLAN M1, from prototype 11): the
 * two-slider tool with the same sums, copy, notice and links as `PayRiseTeaser`, whose results now
 * glide to each new value on the visitor's own input. Two sliders, one outcome figure and two
 * supporting rows (P1), and the page's single notice with the "Unverified estimate" lead (R6).
 */
export const HomePayRise: FC = () => {
  const [salary, setSalary] = useState<number>(DEFAULT_SALARY_GBP);
  const [rise, setRise] = useState<number>(DEFAULT_RISE_GBP);
  const cta = signupCta();
  const result = useMemo(() => payRiseResult(salary, rise), [salary, rise]);
  const cardRef = useRef<HTMLDivElement>(null);
  useGsapMoment(cardRef, payRiseMoment);

  const handleStart = () => {
    seedSalaryForOnboarding(salary);
    window.location.href = cta.href;
  };

  return (
    <MarketingSection
      className={payBand}
      id="pay-rise"
      subtitle={PAY_RISE_SUBTITLE}
      title={PAY_RISE_TITLE}
      tone="canvas"
    >
      <div className={bubbleLayer}>
        <BubbleField layout="c" />
      </div>
      <div ref={cardRef}>
        <Card padding="lg">
          <div className={payCard}>
            <div className={payControls}>
              <SliderField
                format="currency"
                label="Salary before tax"
                max={150_000}
                min={12_000}
                step={500}
                value={salary}
                onChange={setSalary}
              />
              <SliderField
                format="currency"
                label="Pay rise (a year)"
                max={20_000}
                min={0}
                step={250}
                value={rise}
                onChange={setRise}
              />
            </div>

            <div className={payOutcome} data-testid="pay-rise-outcome">
              <span className={outcomeLabel}>Estimated take-home from the rise</span>
              <div aria-atomic="true" aria-live="polite">
                <p className={outcomeHeadline}>
                  <GlideFigure suffix=" a year" testId="pay-rise-kept" value={result.keptAnnual} />
                </p>
              </div>

              <dl className={breakdownList}>
                <div className={breakdownRow}>
                  <dt className={breakdownTerm}>Extra Income Tax</dt>
                  <dd className={breakdownValue}>
                    <GlideFigure testId="pay-rise-income-tax" value={result.extraIncomeTax} />
                  </dd>
                </div>
                <div className={breakdownRow}>
                  <dt className={breakdownTerm}>Extra National Insurance</dt>
                  <dd className={breakdownValue}>
                    <GlideFigure
                      testId="pay-rise-national-insurance"
                      value={result.extraNationalInsurance}
                    />
                  </dd>
                </div>
              </dl>

              {result.entersTaperBand && (
                <p className={taperNote} data-testid="pay-rise-taper-note">
                  Between <span className={taperFigure}>£100,000</span> and{" "}
                  <span className={taperFigure}>£125,140</span>, the Personal Allowance reduces by{" "}
                  <span className={taperFigure}>£1</span> for every{" "}
                  <span className={taperFigure}>£2</span> of income. Less of each extra pound
                  reaches take-home pay in that band.
                </p>
              )}

              <div className={payActions}>
                {cta.external ? (
                  <Button size="md" variant="outline" onClick={handleStart}>
                    Start with this salary
                  </Button>
                ) : (
                  <Button asChild size="md" variant="outline">
                    <Link to={PAY_PAGE_PATH}>About pay in Flump</Link>
                  </Button>
                )}
              </div>
            </div>
          </div>
          <ProjectionNotice
            lead={
              <>
                {DELTA_PANEL_COPY.unverifiedBanner}{" "}
                <span data-testid="pay-rise-assumptions">
                  Uses {taxYearInWords(result.taxYear)} rates outside Scotland, with no pension or
                  student loan.
                </span>
              </>
            }
          />
        </Card>
      </div>
    </MarketingSection>
  );
};
