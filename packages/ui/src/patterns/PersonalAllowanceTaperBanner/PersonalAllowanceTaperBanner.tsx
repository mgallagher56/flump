import {
  calculateTaxTrapRelief,
  calculateUKEWNITakeHome,
  getUkTaxYearRules,
  resolveUkTaxYear,
} from "@flump/finance-engine";
import { type FC, useId, useMemo, useState } from "react";
import { css, cx } from "../../../styled-system/css";
import { StatusBadge } from "../../primitives/StatusBadge/StatusBadge";
import {
  reliefMetricsGrid,
  taperBannerContainer,
  taperHeaderRow,
  taperSliderPanel,
} from "./PersonalAllowanceTaperBanner.styles";

export interface PersonalAllowanceTaperBannerProps {
  grossIncome: number;
  /** UK tax year such as "2026/27". Defaults to the current rates year. */
  taxYear?: string;
  className?: string;
}

const gbp = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 0,
});
const formatGBP = (num: number) => gbp.format(Math.max(0, Math.round(num)));

const figureStyle = css({
  fontFamily: "display",
  fontSize: "md",
  fontWeight: "bold",
  fontVariantNumeric: "tabular-nums",
});
const metricLabelStyle = css({ fontSize: "11px", color: "text.muted" });

/**
 * Models a pension salary sacrifice for an income near the Personal Allowance taper.
 * Every figure comes from the finance engine: tax and NI are computed at the current
 * income and at the income after the sacrifice, so the part of a sacrifice that falls
 * outside the taper band is taxed at its own marginal rate rather than at the band rate.
 */
export const PersonalAllowanceTaperBanner: FC<PersonalAllowanceTaperBannerProps> = ({
  grossIncome,
  taxYear,
  className,
}) => {
  const sliderId = useId();
  const year = resolveUkTaxYear(taxYear);
  const rules = getUkTaxYearRules(year);
  const taperStart = rules.ewni.personalAllowanceTaperStart;
  const taperEnd = rules.taperEnd;
  const bandWidth = taperEnd - taperStart;
  const income = Math.max(0, grossIncome);
  const excessAboveTaperStart = Math.max(0, income - taperStart);
  const isInBand = income > taperStart && income <= taperEnd;
  // The band's own effective marginal rate (income tax + employee NI), from the engine.
  const bandRatePct = calculateTaxTrapRelief(
    taperStart + bandWidth / 2,
    year,
  ).effectiveMarginalRatePct;

  const sliderMax = Math.min(income, Math.max(bandWidth, excessAboveTaperStart + 5000));
  const [sacrificeAmount, setSacrificeAmount] = useState<number>(
    Math.min(bandWidth, excessAboveTaperStart),
  );
  const sacrifice = Math.min(Math.max(0, sacrificeAmount), income);

  const { taxAndNiDifference, takeHomeChange } = useMemo(() => {
    const before = calculateUKEWNITakeHome(income, "employed", 0, true, year);
    const after = calculateUKEWNITakeHome(income - sacrifice, "employed", 0, true, year);
    return {
      taxAndNiDifference: before.incomeTax + before.ni - (after.incomeTax + after.ni),
      takeHomeChange: before.netAnnual - after.netAnnual,
    };
  }, [income, sacrifice, year]);

  const band = `${formatGBP(taperStart)} to ${formatGBP(taperEnd)}`;

  return (
    <div
      className={cx(taperBannerContainer({ inBand: isInBand }), className)}
      data-testid="personal-allowance-taper-banner"
    >
      <div className={taperHeaderRow()}>
        <div>
          <div
            className={css({ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" })}
          >
            <h3
              className={css({
                fontFamily: "display",
                fontSize: "sm",
                fontWeight: "bold",
                color: "text.primary",
                margin: "0",
              })}
            >
              {isInBand ? `Income in the ${band} band` : `Income outside the ${band} band`}
            </h3>
            <StatusBadge size="sm" variant="neutral">
              <span className={css({ fontVariantNumeric: "tabular-nums" })}>
                {bandRatePct}% marginal rate in the band
              </span>
            </StatusBadge>
          </div>
          <p
            className={css({
              fontSize: "xs",
              color: "text.muted",
              mt: "4px",
              mb: "0",
              maxWidth: "680px",
            })}
          >
            Between {formatGBP(taperStart)} and {formatGBP(taperEnd)} of adjusted net income, the
            Personal Allowance reduces by £1 for every £2 of income. With higher rate tax and
            National Insurance, the effective marginal rate in this band is{" "}
            <strong className={css({ fontVariantNumeric: "tabular-nums" })}>{bandRatePct}%</strong>.
            In England, funded childcare hours for working parents, and Tax-Free Childcare across
            the UK, are not available if either parent's adjusted net income is over{" "}
            {formatGBP(taperStart)}.
          </p>
        </div>
      </div>

      <div className={taperSliderPanel()}>
        <div
          className={css({
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "8px",
          })}
        >
          <div>
            <label
              className={css({ fontSize: "xs", fontWeight: "bold", color: "text.primary" })}
              htmlFor={sliderId}
            >
              Pension salary sacrifice
            </label>
            <div className={metricLabelStyle}>
              A sacrifice equal to the income above {formatGBP(taperStart)} brings adjusted net
              income to {formatGBP(taperStart)} in this estimate. Unverified estimate.
            </div>
          </div>
          <div className={cx(figureStyle, css({ color: "primary" }))}>
            {formatGBP(sacrifice)}{" "}
            <span className={css({ fontSize: "xs", color: "text.muted" })}>
              ({formatGBP(sacrifice / 12)}/mo)
            </span>
          </div>
        </div>

        <input
          id={sliderId}
          className={css({
            width: "100%",
            accentColor: "token(colors.primary)",
            cursor: "pointer",
          })}
          max={sliderMax}
          min={0}
          step={500}
          type="range"
          value={sacrifice}
          onChange={(e) => setSacrificeAmount(Number(e.target.value) || 0)}
        />

        <div className={reliefMetricsGrid()}>
          <div>
            <span className={metricLabelStyle}>Tax and NI difference a year</span>
            <div className={cx(figureStyle, css({ color: "text.primary" }))}>
              {formatGBP(taxAndNiDifference)} / yr
            </div>
          </div>

          <div>
            <span className={metricLabelStyle}>Gross pension contribution</span>
            <div className={cx(figureStyle, css({ color: "primary" }))}>
              +{formatGBP(sacrifice / 12)} / mo
            </div>
          </div>

          <div>
            <span className={metricLabelStyle}>Change in take-home pay</span>
            <div className={cx(figureStyle, css({ color: "text.primary" }))}>
              -{formatGBP(takeHomeChange / 12)} / mo
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PersonalAllowanceTaperBanner;
