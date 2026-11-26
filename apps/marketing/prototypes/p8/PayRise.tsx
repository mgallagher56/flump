import {
  Button,
  Card,
  DELTA_PANEL_COPY,
  formatMoney,
  ProjectionNotice,
  SliderField,
} from "@repo/ui";
import { type FC, useEffect, useMemo, useRef, useState } from "react";
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
import {
  payRiseResult,
  seedSalaryForOnboarding,
  taxYearInWords,
} from "../../src/components/PayRiseTeaser/payRise";
import { signupCta } from "../../src/utils/site";
import { useMotion } from "../shared/motion";
import { TIMING, usePace } from "../shared/pace";

const gbp = (value: number) => formatMoney(value, { fractionDigits: 0 }).text;

/**
 * A figure that glides to each new value (prototype 5's counting, applied to a live figure). It
 * counts up from nothing the first time it comes into view, then from wherever it is to the new
 * value whenever a slider moves. Screen readers get the final value only; the counting copy is
 * aria-hidden. Reduced motion: the value, at once.
 */
const Glide: FC<{ value: number; format: (n: number) => string }> = ({ value, format }) => {
  const { reduced } = useMotion();
  const pace = usePace();
  const [shown, setShown] = useState(value);
  const shownRef = useRef(value);
  const seen = useRef(false);
  const node = useRef<HTMLSpanElement>(null);
  const targetRef = useRef(value);
  targetRef.current = value;

  const glide = (from: number, to: number, duration: number) => {
    let raf = 0;
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) ** 3;
      const v = from + (to - from) * eased;
      shownRef.current = v;
      setShown(v);
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  };

  // The first arrival: count up from nothing.
  useEffect(() => {
    const el = node.current;
    if (!el || reduced) return;
    let cancel: (() => void) | undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting || seen.current) return;
        seen.current = true;
        observer.disconnect();
        cancel = glide(0, targetRef.current, pace.ms(TIMING.count));
      },
      { threshold: 0.6 },
    );
    if (el.getBoundingClientRect().top > window.innerHeight) {
      shownRef.current = 0;
      setShown(0);
      observer.observe(el);
    } else seen.current = true;
    return () => {
      observer.disconnect();
      cancel?.();
    };
  }, [reduced]);

  // Each change after that: glide from where it is.
  useEffect(() => {
    if (reduced) {
      shownRef.current = value;
      setShown(value);
      return;
    }
    if (!seen.current) return;
    return glide(shownRef.current, value, pace.ms(TIMING.count * 0.5));
  }, [value, reduced]);

  return (
    <span ref={node} style={{ fontVariantNumeric: "tabular-nums" }}>
      <span className="p8-sr">{format(value)}</span>
      <span aria-hidden="true">{format(Math.round(shown))}</span>
    </span>
  );
};

const SUBTITLE =
  "Move the sliders to see an estimate of how much of a rise reaches your pay after Income Tax and National Insurance.";

/**
 * The pay rise tool (a local copy of src's PayRiseTeaser so its figures can glide). Same sliders,
 * same sums, same notice. The card arrives like prototype 5's cards (see Sections.tsx), its
 * figures count up when it arrives and glide whenever a slider moves.
 */
export const PayRise: FC = () => {
  const [salary, setSalary] = useState<number>(DEFAULT_SALARY_GBP);
  const [rise, setRise] = useState<number>(DEFAULT_RISE_GBP);
  const cta = signupCta();
  const result = useMemo(() => payRiseResult(salary, rise), [salary, rise]);

  const handleStart = () => {
    seedSalaryForOnboarding(salary);
    window.location.href = cta.href;
  };

  return (
    <MarketingSection id="pay-rise" subtitle={SUBTITLE} title={PAY_RISE_TITLE}>
      <div className="p8-pay-card" data-p8-arrive="">
        <Card padding="lg">
          <div className={teaserCard()}>
            <div className={teaserControls()} data-p8-pay-part="">
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

            <div className={teaserOutcome()} data-p8-pay-part="" data-testid="pay-rise-outcome">
              <span className={outcomeLabel()}>Estimated take-home from the rise</span>
              <div aria-atomic="true" aria-live="polite">
                <p className={outcomeHeadline()}>
                  <Glide format={gbp} value={result.keptAnnual} /> a year
                </p>
              </div>

              <dl className={breakdownList()}>
                <div className={breakdownRow()}>
                  <dt className={breakdownTerm()}>Extra Income Tax</dt>
                  <dd className={breakdownValue()}>
                    <Glide format={gbp} value={result.extraIncomeTax} />
                  </dd>
                </div>
                <div className={breakdownRow()}>
                  <dt className={breakdownTerm()}>Extra National Insurance</dt>
                  <dd className={breakdownValue()}>
                    <Glide format={gbp} value={result.extraNationalInsurance} />
                  </dd>
                </div>
              </dl>

              <div
                className="p8-taper"
                data-open={result.entersTaperBand}
                inert={!result.entersTaperBand}
              >
                <div>
                  <p className={taperNote()} data-testid="pay-rise-taper-note">
                    Between <span className={taperFigure()}>£100,000</span> and{" "}
                    <span className={taperFigure()}>£125,140</span>, the Personal Allowance reduces
                    by <span className={taperFigure()}>£1</span> for every{" "}
                    <span className={taperFigure()}>£2</span> of income. Less of each extra pound
                    reaches take-home pay in that band.
                  </p>
                </div>
              </div>

              {cta.external ? (
                <div className={teaserActions()}>
                  <Button data-light="" size="md" variant="outline" onClick={handleStart}>
                    Start with this salary
                  </Button>
                </div>
              ) : (
                <div className={teaserActions()}>
                  <Button asChild size="md" variant="outline">
                    <Link data-light="" to="/features/pay">
                      About pay in Flump
                    </Link>
                  </Button>
                </div>
              )}
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
