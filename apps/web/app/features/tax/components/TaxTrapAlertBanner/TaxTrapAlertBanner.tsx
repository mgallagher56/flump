import type { UkTaxRegion } from "@flump/finance-engine";
import {
  calculateSalarySacrificeSaving,
  calculateTaxTrapRelief,
  getDisplayMarginalRatePct,
} from "@flump/finance-engine";
import { Button, Card, Icon, Money, SliderField, StatusBadge } from "@repo/ui";
import { ArrowRight, Check, TriangleAlert } from "lucide-react";
import { type FC, useMemo, useState } from "react";
import { Link } from "react-router";
import {
  getTaxTrapCopy,
  REGION_ASSUMPTION_LABEL,
  REGION_SETTINGS_PATH,
  regionLinkStyle,
} from "~/utils/taxTrapCopy";
import {
  actionRow,
  assumption,
  body,
  caption,
  explainer,
  header,
  iconTile,
  lostTile,
  metric,
  metrics,
  sacrificeBox,
  titleBlock,
  titleRow,
  title as titleStyle,
  unit,
} from "./TaxTrapAlertBanner.styles";

export interface TaxTrapAlertBannerProps {
  grossIncome: number;
  /** Known tax region; null or undefined means England, Wales and NI is assumed and labelled. */
  region?: UkTaxRegion | null;
  onApplySacrifice?: (additionalMonthlySacrifice: number) => void;
}

export const TaxTrapAlertBanner: FC<TaxTrapAlertBannerProps> = ({
  grossIncome,
  region,
  onApplySacrifice,
}) => {
  const effectiveRegion: UkTaxRegion = region ?? "ENGLAND_NI_WALES";

  const trapAnalysis = useMemo(() => {
    return calculateTaxTrapRelief(grossIncome, undefined, effectiveRegion);
  }, [grossIncome, effectiveRegion]);

  const trapCopy = getTaxTrapCopy(trapAnalysis);
  const defaultSacrifice = Math.min(25140, trapAnalysis.excessAbove100k);
  const [sacrificeAmount, setSacrificeAmount] = useState<number>(defaultSacrifice);
  const [applied, setApplied] = useState(false);

  // If income is below £95,000, this contextual banner stays hidden
  if (grossIncome < 95000) {
    return null;
  }

  // Recalculate relief with custom sacrifice amount
  // Exact income tax + employee NI difference from the engine (band edges and the allowance
  // taper are handled; a flat rate is only right when the whole sacrifice sits in the taper zone).
  const taxSaved = Math.round(
    calculateSalarySacrificeSaving(grossIncome, sacrificeAmount, undefined, effectiveRegion),
  );
  const monthlySacrifice = Math.round(sacrificeAmount / 12);
  const monthlySaved = Math.round(taxSaved / 12);
  const effectiveCost = monthlySacrifice - monthlySaved;
  const tone = trapAnalysis.isInTaxTrap ? "danger" : "warning";

  const handleApply = () => {
    if (onApplySacrifice) {
      onApplySacrifice(monthlySacrifice);
      setApplied(true);
      setTimeout(() => setApplied(false), 3000);
    }
  };

  return (
    <Card as="section" padding="lg" data-testid="tax-trap-alert-banner">
      <div className={body()}>
        <div className={header()}>
          <div className={titleBlock()}>
            <span className={iconTile({ tone })}>
              <Icon icon={TriangleAlert} size="md" />
            </span>
            <div>
              <div className={titleRow()}>
                <h3 className={titleStyle()}>
                  {trapAnalysis.isInTaxTrap
                    ? `UK £100k–£125k ${trapCopy.incomeTaxRate} tax trap active`
                    : "Approaching the £100,000 UK tax trap"}
                </h3>
                <StatusBadge variant={tone}>
                  {getDisplayMarginalRatePct(trapAnalysis)}% marginal tax
                </StatusBadge>
              </div>
              <p className={explainer()}>
                {trapAnalysis.isInTaxTrap ? (
                  <>
                    Between £100,000 and £125,140, HMRC reduces your Personal Allowance by £1 for
                    every £2 of income. Combined with higher rate tax and National Insurance, you
                    face a marginal rate of <strong>{trapCopy.breakdown}</strong> and lose 15–30
                    hours funded childcare eligibility.
                  </>
                ) : (
                  <>
                    Above £100,000, HMRC reduces your Personal Allowance by £1 for every £2 of
                    income, which raises your marginal rate sharply. Pension contributions now can
                    keep you below the threshold.
                  </>
                )}
              </p>
              {!region && (
                <p className={assumption()}>
                  {REGION_ASSUMPTION_LABEL}{" "}
                  <Link to={REGION_SETTINGS_PATH} className={regionLinkStyle}>
                    Set your region
                  </Link>
                </p>
              )}
            </div>
          </div>

          {trapAnalysis.isInTaxTrap && (
            <div className={lostTile()}>
              <span className={caption()}>Personal Allowance lost</span>
              <Money size="md" tone="danger" value={trapAnalysis.lostPersonalAllowance} />
            </div>
          )}
        </div>

        <div className={sacrificeBox()}>
          <SliderField
            label="Pension salary sacrifice or SIPP contribution"
            helperText="Slide to bring your adjusted net income down to £100,000 to restore your full allowance."
            format="currency"
            min={0}
            max={Math.max(25140, trapAnalysis.excessAbove100k + 5000)}
            step={500}
            value={sacrificeAmount}
            onChange={(value) => setSacrificeAmount(value || 0)}
          />

          <div className={metrics()}>
            <div className={metric()}>
              <span className={caption()}>Annual tax and NI saved</span>
              <span>
                <Money size="md" tone="positive" value={taxSaved} />
                <span className={unit()}>/ yr</span>
              </span>
            </div>
            <div className={metric()}>
              <span className={caption()}>Gross pension added</span>
              <span>
                <Money size="md" signDisplay="always" value={monthlySacrifice} />
                <span className={unit()}>/ mo</span>
              </span>
            </div>
            <div className={metric()}>
              <span className={caption()}>Net pay reduced by</span>
              <span>
                <Money size="md" value={Math.max(0, effectiveCost)} />
                <span className={unit()}>/ mo</span>
              </span>
            </div>
          </div>

          {onApplySacrifice && (
            <div className={actionRow()}>
              <Button size="sm" variant="primary" onClick={handleApply}>
                {applied ? (
                  <>
                    <Icon icon={Check} size="sm" /> Added to your forecaster scenario
                  </>
                ) : (
                  <>
                    Model this in the pension forecaster <Icon icon={ArrowRight} size="sm" />
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

export default TaxTrapAlertBanner;
