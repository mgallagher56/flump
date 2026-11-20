import {
  Button,
  Card,
  DELTA_PANEL_COPY,
  formatMoney,
  ProjectionNotice,
  SliderField,
} from "@repo/ui";
import { type FC, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { signupCta } from "../../utils/site";
import { MarketingSection } from "../MarketingSection";
import {
  breakdownList,
  breakdownRow,
  breakdownTerm,
  breakdownValue,
  embeddedRoot,
  embeddedSubtitle,
  embeddedTitle,
  outcomeHeadline,
  outcomeLabel,
  taperFigure,
  taperNote,
  teaserActions,
  teaserCard,
  teaserControls,
  teaserOutcome,
} from "./PayRiseTeaser.styles";
import { payRiseResult, seedSalaryForOnboarding, taxYearInWords } from "./payRise";

/** Illustrative starting salary (E31): a typical full-time UK salary, not the £100k band. */
export const DEFAULT_SALARY_GBP = 39_000;
export const DEFAULT_RISE_GBP = 2_000;

export const PAY_RISE_TITLE = "What you keep from a pay rise";
const PAY_RISE_SUBTITLE =
  "Move the sliders to see an estimate of how much of a rise reaches your pay after Income Tax and National Insurance.";

/** The Pay page, where the home page's teaser points (E42: the marketing site has no calculator pages). */
const PAY_PAGE_PATH = "/features/pay";

const gbp = (value: number) => formatMoney(value, { fractionDigits: 0 }).text;

export interface PayRiseTeaserProps {
  /** `area` (the home page): a link to the Pay page. `none`: the Pay page itself, which needs none. */
  link?: "area" | "none";
  /** Inside a section that already has its own heading: an h3 and no band of its own. */
  embedded?: boolean;
}

/**
 * The two-slider pay rise tool (E16 PR 12; on the home and Pay pages since E42): two sliders, one outcome figure and two supporting
 * rows (P1), and the page's single notice, with the "Unverified estimate" lead (ruling 3, R6).
 */
export const PayRiseTeaser: FC<PayRiseTeaserProps> = ({ link = "area", embedded = false }) => {
  const [salary, setSalary] = useState<number>(DEFAULT_SALARY_GBP);
  const [rise, setRise] = useState<number>(DEFAULT_RISE_GBP);
  const cta = signupCta();
  const result = useMemo(() => payRiseResult(salary, rise), [salary, rise]);

  const handleStart = () => {
    seedSalaryForOnboarding(salary);
    window.location.href = cta.href;
  };

  const card = (
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

        <div className={teaserOutcome()} data-testid="pay-rise-outcome">
          <span className={outcomeLabel()}>Estimated take-home from the rise</span>
          <div aria-atomic="true" aria-live="polite">
            <p className={outcomeHeadline()}>{gbp(result.keptAnnual)} a year</p>
          </div>

          <dl className={breakdownList()}>
            <div className={breakdownRow()}>
              <dt className={breakdownTerm()}>Extra Income Tax</dt>
              <dd className={breakdownValue()}>{gbp(result.extraIncomeTax)}</dd>
            </div>
            <div className={breakdownRow()}>
              <dt className={breakdownTerm()}>Extra National Insurance</dt>
              <dd className={breakdownValue()}>{gbp(result.extraNationalInsurance)}</dd>
            </div>
          </dl>

          {result.entersTaperBand && (
            <p className={taperNote()} data-testid="pay-rise-taper-note">
              Between <span className={taperFigure()}>£100,000</span> and{" "}
              <span className={taperFigure()}>£125,140</span>, the Personal Allowance reduces by{" "}
              <span className={taperFigure()}>£1</span> for every{" "}
              <span className={taperFigure()}>£2</span> of income. Less of each extra pound reaches
              take-home pay in that band.
            </p>
          )}

          {cta.external ? (
            <div className={teaserActions()}>
              <Button size="md" variant="outline" onClick={handleStart}>
                Start with this salary
              </Button>
            </div>
          ) : link === "area" ? (
            <div className={teaserActions()}>
              <Button asChild size="md" variant="outline">
                <Link to={PAY_PAGE_PATH}>About pay in Flump</Link>
              </Button>
            </div>
          ) : null}
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
  );

  if (embedded) {
    return (
      <div className={embeddedRoot()} data-testid="pay-rise">
        <h3 className={embeddedTitle()}>{PAY_RISE_TITLE}</h3>
        <p className={embeddedSubtitle()}>{PAY_RISE_SUBTITLE}</p>
        {card}
      </div>
    );
  }

  return (
    <MarketingSection id="pay-rise" subtitle={PAY_RISE_SUBTITLE} title={PAY_RISE_TITLE}>
      {card}
    </MarketingSection>
  );
};

export default PayRiseTeaser;
