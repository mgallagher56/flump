import {
  Button,
  Card,
  DELTA_PANEL_COPY,
  formatMoney,
  ProjectionNotice,
  SliderField,
} from "@repo/ui";
import { type CSSProperties, type FC, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { MarketingSection } from "../../src/components/MarketingSection";
import {
  DEFAULT_RISE_GBP,
  DEFAULT_SALARY_GBP,
  PAY_RISE_TITLE,
} from "../../src/components/PayRiseTeaser/PayRiseTeaser";
import {
  breakdownList,
  breakdownRow,
  breakdownTerm,
  breakdownValue,
  outcomeHeadline,
  outcomeLabel,
  taperFigure,
  taperNote,
  teaserActions,
  teaserCard,
  teaserControls,
  teaserOutcome,
} from "../../src/components/PayRiseTeaser/PayRiseTeaser.styles";
import { payRiseResult, taxYearInWords } from "../../src/components/PayRiseTeaser/payRise";
import { usePace } from "../shared/pace";
import { Bubbles } from "../shared/round3";
import { useGsap } from "../shared/useGsap";
import { arrive } from "./moments";
import { useTweened } from "./useTweened";

const gbp = (value: number) => formatMoney(Math.round(value), { fractionDigits: 0 }).text;

/** A figure that glides to its value; the settled value is what a screen reader hears. */
const Glide: FC<{ value: number; node: Element | null; suffix?: string; className?: string }> = ({
  value,
  node,
  suffix = "",
  className,
}) => {
  const shown = useTweened(value, node);
  return (
    <span className={className}>
      <span className="p10-sr">
        {gbp(value)}
        {suffix}
      </span>
      <span aria-hidden="true" className="tabular-nums">
        {gbp(shown)}
        {suffix}
      </span>
    </span>
  );
};

/**
 * "What you keep from a pay rise", animated: the card arrives like prototype 5's cards, the
 * outcome counts up when it comes into view, and every figure glides up or down as the sliders
 * move. A split bar shows the rise as what you keep, the extra Income Tax and the extra National
 * Insurance, its parts easing to their new shares. Same calculation and notice as the real tool.
 */
export const PayRise: FC = () => {
  const [salary, setSalary] = useState<number>(DEFAULT_SALARY_GBP);
  const [rise, setRise] = useState<number>(DEFAULT_RISE_GBP);
  const result = useMemo(() => payRiseResult(salary, rise), [salary, rise]);
  const [outcome, setOutcome] = useState<HTMLDivElement | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const pace = usePace();

  useGsap(
    ref,
    (kit, root) => {
      const card = root.querySelector(".p10-pay__card");
      if (card) arrive(kit, card, [card], pace, 24);
      const parts = root.querySelectorAll(".p10-pay__legend > li");
      if (card) arrive(kit, card, parts, pace, 8);
    },
    [pace.pace],
  );

  const total = Math.max(1, rise);
  const share = (n: number) => Math.max(0, n) / total;
  const kept = share(result.keptAnnual);
  const tax = share(result.extraIncomeTax);
  const ni = share(result.extraNationalInsurance);

  return (
    // biome-ignore lint/a11y/useAriaPropsSupportedByRole: SectionNav reads the label to find the stop's heading; the section inside carries the landmark.
    <div
      aria-labelledby="pay-rise-title"
      className="p10-band p10-tone--canvas"
      data-proto-name="Pay rise"
      data-proto-section=""
      ref={ref}
    >
      <Bubbles layout="a" />
      <MarketingSection
        id="pay-rise"
        subtitle="Move the sliders to see an estimate of how much of a rise reaches your pay after Income Tax and National Insurance."
        title={PAY_RISE_TITLE}
      >
        <div className="p10-pay__card">
          <Card padding="lg">
            <div className={teaserCard()}>
              <div className={teaserControls()}>
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

              <div
                className={`${teaserOutcome()} p10-pay__outcome`}
                data-testid="pay-rise-outcome"
                data-tilt=""
                ref={setOutcome}
              >
                <span className={outcomeLabel()}>Estimated take-home from the rise</span>
                <div aria-atomic="true" aria-live="polite">
                  <p className={outcomeHeadline()}>
                    <Glide node={outcome} suffix=" a year" value={result.keptAnnual} />
                  </p>
                </div>

                <div
                  aria-hidden="true"
                  className="p10-pay__split"
                  style={
                    {
                      "--kept": kept,
                      "--tax": tax,
                      "--ni": ni,
                    } as CSSProperties
                  }
                >
                  <span className="p10-pay__part p10-pay__part--kept" />
                  <span className="p10-pay__part p10-pay__part--tax" />
                  <span className="p10-pay__part p10-pay__part--ni" />
                </div>
                <ul aria-hidden="true" className="p10-pay__legend">
                  <li>
                    <span className="p10-pay__key p10-pay__key--kept" />
                    You keep
                  </li>
                  <li>
                    <span className="p10-pay__key p10-pay__key--tax" />
                    Income Tax
                  </li>
                  <li>
                    <span className="p10-pay__key p10-pay__key--ni" />
                    National Insurance
                  </li>
                </ul>

                <dl className={breakdownList()}>
                  <div className={breakdownRow()}>
                    <dt className={breakdownTerm()}>Extra Income Tax</dt>
                    <dd className={breakdownValue()}>
                      <Glide node={outcome} value={result.extraIncomeTax} />
                    </dd>
                  </div>
                  <div className={breakdownRow()}>
                    <dt className={breakdownTerm()}>Extra National Insurance</dt>
                    <dd className={breakdownValue()}>
                      <Glide node={outcome} value={result.extraNationalInsurance} />
                    </dd>
                  </div>
                </dl>

                {result.entersTaperBand && (
                  <p className={`${taperNote()} p10-pay__taper`}>
                    Between <span className={taperFigure()}>£100,000</span> and{" "}
                    <span className={taperFigure()}>£125,140</span>, the Personal Allowance reduces
                    by <span className={taperFigure()}>£1</span> for every{" "}
                    <span className={taperFigure()}>£2</span> of income. Less of each extra pound
                    reaches take-home pay in that band.
                  </p>
                )}

                <div className={teaserActions()}>
                  <Button asChild size="md" variant="outline">
                    <Link data-light="" to="/features/pay">
                      About pay in Flump
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
            <ProjectionNotice
              lead={
                <>
                  {DELTA_PANEL_COPY.unverifiedBanner} Uses {taxYearInWords(result.taxYear)} rates
                  outside Scotland, with no pension or student loan.
                </>
              }
            />
          </Card>
        </div>
      </MarketingSection>
    </div>
  );
};
