import {
  Button,
  Card,
  DELTA_PANEL_COPY,
  formatMoney,
  Illustration,
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
  teaserActions,
  teaserCard,
  teaserControls,
  teaserOutcome,
} from "../../src/components/PayRiseTeaser/PayRiseTeaser.styles";
import { payRiseResult, taxYearInWords } from "../../src/components/PayRiseTeaser/payRise";
import {
  bandIllustration,
  stepBody,
  stepGrid,
  stepLayout,
  stepTitle,
} from "../../src/pages/HomePage/HomePage.styles";
import { useMotion } from "../shared/motion";
import { TIMING, usePace } from "../shared/pace";
import { Bubbles, SmoothFaq, unstackMoment } from "../shared/round3";
import {
  ClosingSection,
  MoreDetailSection,
  ROUGH_FIGURE_STEPS,
  SecuritySection,
} from "../shared/sections";
import { useGsap } from "../shared/useGsap";

/*
 * The rest of the home page after the journey, compact, by the round-three rules: cards and lines
 * arrive gently (16px and opacity, paced), More detail and the FAQ deal out of a stack, the FAQ
 * opens smoothly, the pay rise figures count when the card arrives and glide when a slider moves,
 * and bubbles sit quietly at the edges of three bands.
 */

const gbp = (value: number) => formatMoney(value, { fractionDigits: 0 }).text;

/**
 * A figure that glides to its value: counts up once when it first comes into view, then moves
 * smoothly from the old value to the new one each time it changes. The final value is in the live
 * region for screen readers; only an aria-hidden copy moves.
 */
const Glide: FC<{ value: number; suffix?: string; className?: string }> = ({
  value,
  suffix = "",
  className,
}) => {
  const { reduced } = useMotion();
  const pace = usePace();
  const [shown, setShown] = useState(value);
  const [inView, setInView] = useState(false);
  const from = useRef(value);
  const counted = useRef(false);
  const node = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const element = node.current;
    if (!element || reduced) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        observer.disconnect();
        from.current = 0;
        setInView(true);
      },
      { threshold: 0.6 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [reduced]);

  useEffect(() => {
    if (reduced || !inView) {
      setShown(value);
      from.current = value;
      return;
    }
    const start = performance.now();
    const a = from.current;
    const duration = pace.ms(counted.current ? TIMING.count * 0.45 : TIMING.count);
    counted.current = true;
    let raf = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const v = a + (value - a) * (1 - (1 - t) ** 3);
      from.current = v;
      setShown(v);
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, inView, reduced, pace]);

  return (
    <span className={className} ref={node}>
      <span aria-hidden="true" className="tabular-nums">
        {gbp(Math.round(shown))}
        {suffix}
      </span>
      <span className="p9-sr">
        {gbp(value)}
        {suffix}
      </span>
    </span>
  );
};

const PayRise: FC = () => {
  const [salary, setSalary] = useState<number>(DEFAULT_SALARY_GBP);
  const [rise, setRise] = useState<number>(DEFAULT_RISE_GBP);
  const result = useMemo(() => payRiseResult(salary, rise), [salary, rise]);
  return (
    <MarketingSection
      className="p9-bubbly"
      id="pay-rise"
      subtitle="Move the sliders to see an estimate of how much of a rise reaches your pay after Income Tax and National Insurance."
      title={PAY_RISE_TITLE}
    >
      <Bubbles layout="b" />
      <div data-p9-enter-group="">
        <div data-p9-enter="">
          <Card padding="lg">
            <div className={teaserCard()}>
              <div className={teaserControls()}>
                <SliderField
                  format="currency"
                  label="Salary before tax"
                  max={150_000}
                  min={12_000}
                  onChange={setSalary}
                  step={500}
                  value={salary}
                />
                <SliderField
                  format="currency"
                  label="Pay rise (a year)"
                  max={20_000}
                  min={0}
                  onChange={setRise}
                  step={250}
                  value={rise}
                />
              </div>
              <div className={teaserOutcome()}>
                <span className={outcomeLabel()}>Estimated take-home from the rise</span>
                <div aria-atomic="true" aria-live="polite">
                  <p className={outcomeHeadline()}>
                    <Glide suffix=" a year" value={result.keptAnnual} />
                  </p>
                </div>
                <dl className={breakdownList()}>
                  <div className={breakdownRow()}>
                    <dt className={breakdownTerm()}>About this much a month</dt>
                    <dd className={breakdownValue()}>
                      <Glide value={result.keptMonthly} />
                    </dd>
                  </div>
                  <div className={breakdownRow()}>
                    <dt className={breakdownTerm()}>Extra Income Tax</dt>
                    <dd className={breakdownValue()}>
                      <Glide value={result.extraIncomeTax} />
                    </dd>
                  </div>
                  <div className={breakdownRow()}>
                    <dt className={breakdownTerm()}>Extra National Insurance</dt>
                    <dd className={breakdownValue()}>
                      <Glide value={result.extraNationalInsurance} />
                    </dd>
                  </div>
                </dl>
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
      </div>
    </MarketingSection>
  );
};

const RoughFigures: FC = () => (
  <MarketingSection className="p9-bubbly" id="rough-figures" title="Start with rough figures">
    <Bubbles layout="a" />
    <div className={stepLayout()}>
      <ol className={stepGrid()} data-p9-enter-group="">
        {ROUGH_FIGURE_STEPS.map((step) => (
          <Card
            as="li"
            aria-labelledby={`step-${step.id}`}
            data-p9-enter=""
            data-tilt=""
            key={step.id}
            padding="lg"
          >
            <h3 className={stepTitle()} id={`step-${step.id}`}>
              {step.title}
            </h3>
            <p className={stepBody()}>{step.body}</p>
          </Card>
        ))}
      </ol>
      <div className={bandIllustration()} data-p9-enter-group="">
        <div data-p9-enter="">
          <Illustration scene="check-in" settle={false} size="xl" />
        </div>
      </div>
    </div>
  </MarketingSection>
);

const Faq: FC = () => (
  <MarketingSection
    className="p9-bubbly"
    id="faq"
    title="Frequently asked questions"
    tone="card"
    width="narrow"
  >
    <Bubbles layout="c" />
    <SmoothFaq />
  </MarketingSection>
);

const SECTIONS = [
  { name: "Rough figures", heading: "rough-figures-title", Section: RoughFigures },
  { name: "More detail", heading: "more-detail-title", Section: MoreDetailSection },
  { name: "Pay rise", heading: "pay-rise-title", Section: PayRise },
  { name: "Security", heading: "security-title", Section: SecuritySection },
  { name: "Questions", heading: "faq-title", Section: Faq },
  { name: "Get started", heading: "home-cta-title", Section: ClosingSection },
] as const;

export const Rest: FC = () => {
  const ref = useRef<HTMLDivElement>(null);
  const pace = usePace();
  useGsap(
    ref,
    (kit, root) => {
      const { gsap } = kit;
      const enter = (items: Element[], trigger: Element) => {
        if (!items.length) return;
        gsap.from(items, {
          y: 16,
          opacity: 0,
          duration: pace.s(TIMING.entry),
          ease: "calm",
          stagger: pace.s(TIMING.stagger),
          scrollTrigger: { trigger, start: "top 85%" },
        });
      };
      for (const group of root.querySelectorAll("[data-p9-enter-group]"))
        enter(Array.from(group.querySelectorAll("[data-p9-enter]")), group);
      // The plain bands: their lines arrive in reading order.
      for (const id of ["security", "get-started"]) {
        const band = root.querySelector(`#${id}`);
        if (band) enter(Array.from(band.querySelectorAll("h2, p, a, svg")), band);
      }
      const depth = root.querySelector<HTMLElement>(".proto-depth");
      if (depth) unstackMoment(kit, depth, "li", pace);
      const faq = root.querySelector<HTMLElement>(".proto-faq");
      if (faq) unstackMoment(kit, faq, ".proto-faq__item", pace);
    },
    [pace.pace],
  );

  return (
    <div className="p9-rest" ref={ref}>
      {SECTIONS.map(({ name, heading, Section }) => (
        // biome-ignore lint/a11y/useAriaPropsSupportedByRole: SectionNav reads the label to find each stop's heading.
        <div aria-labelledby={heading} data-proto-name={name} data-proto-section="" key={heading}>
          <Section />
        </div>
      ))}
    </div>
  );
};
