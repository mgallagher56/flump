import type { UkTaxRegion } from "@flump/finance-engine";
import { calculateTaxTrapRelief, isInTaxTrapAlertBand } from "@flump/finance-engine";
import { Card, Icon, Money, StatusBadge } from "@repo/ui";
import { Info } from "lucide-react";
import { type FC, useMemo } from "react";
import { Link } from "react-router";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";
import {
  getTaxTrapCopy,
  REGION_ASSUMPTION_LABEL,
  REGION_SETTINGS_PATH,
  regionLinkStyle,
} from "~/utils/taxTrapCopy";
import {
  assumption,
  body,
  caption,
  explainer,
  header,
  iconTile,
  lostTile,
  titleBlock,
  titleRow,
  title as titleStyle,
} from "./TaxTrapAlertBanner.styles";

export interface TaxTrapAlertBannerProps {
  /**
   * Adjusted net income, from saved details or from a scenario value inside a ScenarioZone.
   * The alert shows only between £90,000 and £125,140 inclusive (E31).
   */
  adjustedNetIncome: number;
  /** Known tax region; null or undefined means England, Wales and NI is assumed and labelled. */
  region?: UkTaxRegion | null;
  /**
   * "totalIncome" when the figure has no pension or Gift Aid deducted (the tax page), so the copy
   * says so instead of calling it adjusted net income.
   */
  incomeBasis?: "adjustedNetIncome" | "totalIncome";
}

/**
 * Personal Allowance taper note. States facts only (advice boundary R2, R4, R5, R8): no
 * action, no button and no "save" framing. The same copy shows for every user in the band.
 */
export const TaxTrapAlertBanner: FC<TaxTrapAlertBannerProps> = ({
  adjustedNetIncome,
  region,
  incomeBasis = "adjustedNetIncome",
}) => {
  const effectiveRegion: UkTaxRegion = region ?? "ENGLAND_NI_WALES";
  const { formatCurrency } = useFormatCurrency();

  const trapAnalysis = useMemo(
    () => calculateTaxTrapRelief(adjustedNetIncome, undefined, effectiveRegion),
    [adjustedNetIncome, effectiveRegion],
  );

  if (!isInTaxTrapAlertBand(adjustedNetIncome)) {
    return null;
  }

  const trapCopy = getTaxTrapCopy(trapAnalysis);
  const inTaper = trapAnalysis.isInTaxTrap;

  return (
    <Card as="section" padding="lg" data-testid="tax-trap-alert-banner">
      <div className={body()}>
        <div className={header()}>
          <div className={titleBlock()}>
            <span className={iconTile({ tone: "info" })}>
              <Icon icon={Info} size="md" />
            </span>
            <div>
              <div className={titleRow()}>
                <h3 className={titleStyle()}>
                  {inTaper
                    ? "Personal Allowance taper, £100,000–£125,140"
                    : "Near the £100,000 income limit for the full Personal Allowance"}
                </h3>
                <StatusBadge variant="info">
                  {inTaper
                    ? `${trapCopy.effectiveRate} marginal rate including NI (unverified estimate)`
                    : `${trapCopy.incomeTaxRate} income tax marginal rate (unverified estimate)`}
                </StatusBadge>
              </div>
              <p className={explainer()}>
                {incomeBasis === "totalIncome" ? "Total income" : "Adjusted net income"} in this
                estimate is <strong>{formatCurrency(adjustedNetIncome)}</strong>.{" "}
                {inTaper ? (
                  <>
                    Between £100,000 and £125,140, the Personal Allowance reduces by £1 for every £2
                    of adjusted net income. In this band the effective marginal rate is{" "}
                    <strong>{trapCopy.breakdown}</strong>. Tax-Free Childcare and the funded
                    childcare hours for working parents in England have a £100,000 adjusted net
                    income limit per parent.
                  </>
                ) : (
                  <>
                    Above £100,000, the Personal Allowance reduces by £1 for every £2 of adjusted
                    net income, until it reaches zero at £125,140.
                  </>
                )}
              </p>
              <p className={assumption()}>
                {incomeBasis === "totalIncome"
                  ? "No pension contributions or Gift Aid are deducted, so adjusted net income may be lower. "
                  : ""}
                Adjusted net income is total taxable income before the Personal Allowance, less
                certain reliefs, including the gross amount of personal pension contributions and
                Gift Aid donations.
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

          {inTaper && (
            <div className={lostTile()}>
              <span className={caption()}>Personal Allowance reduced by</span>
              <Money size="md" value={trapAnalysis.lostPersonalAllowance} />
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

export default TaxTrapAlertBanner;
