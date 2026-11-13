import { type FC, useId, useState } from "react";
import { css, cx } from "../../../styled-system/css";
import { StatusBadge } from "../../primitives/StatusBadge/StatusBadge";
import { reliefMetricsGrid, taxTrapContainer } from "./TaxTrapEscapeBanner.styles";

export interface TaxTrapEscapeBannerProps {
  grossIncome: number;
  className?: string;
}

const formatGBP = (num: number) => `£${Math.max(0, Math.round(num)).toLocaleString("en-GB")}`;

export const TaxTrapEscapeBanner: FC<TaxTrapEscapeBannerProps> = ({ grossIncome, className }) => {
  const sliderId = useId();
  const excessAbove100k = Math.max(0, grossIncome - 100000);
  const isInTrap = grossIncome >= 100000 && grossIncome <= 125140;
  const [sacrificeAmount, setSacrificeAmount] = useState<number>(Math.min(25140, excessAbove100k));

  // 62% marginal tax relief (40% higher rate tax + 20% restored personal allowance + 2% NI)
  const taxSaved = Math.round(sacrificeAmount * 0.62);
  const monthlySacrifice = Math.round(sacrificeAmount / 12);
  const monthlySaved = Math.round(taxSaved / 12);
  const effectiveCost = monthlySacrifice - monthlySaved;

  return (
    <div
      className={cx(taxTrapContainer({ inTrap: isInTrap }), className)}
      data-testid="tax-trap-escape-banner"
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "16px",
          flexWrap: "wrap",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <h3
              className={css({
                fontFamily: "display",
                fontSize: "sm",
                fontWeight: "bold",
                color: "text.primary",
                margin: "0",
              })}
            >
              {isInTrap
                ? "Income in the £100,000 to £125,140 band"
                : "Income outside the £100,000 to £125,140 band"}
            </h3>
            <StatusBadge size="sm" variant={isInTrap ? "danger" : "warning"}>
              62% marginal rate in the band
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
            Between £100,000 and £125,140 of adjusted net income, the Personal Allowance reduces by
            £1 for every £2 of income. With 40% higher rate tax and 2% National Insurance, the
            effective marginal rate in this band is <strong>62%</strong>. Funded childcare hours for
            working parents and Tax-Free Childcare are not available above £100,000.
          </p>
        </div>
      </div>

      {/* Interactive SIPP / Salary Sacrifice Slider */}
      <div
        className={css({
          p: "16px",
          borderRadius: "xl",
          backgroundColor: "surface.card",
          borderWidth: "1px",
          borderStyle: "solid",
          borderColor: "border.subtle",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        })}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "8px",
          }}
        >
          <div>
            <label
              className={css({ fontSize: "xs", fontWeight: "bold", color: "text.primary" })}
              htmlFor={sliderId}
            >
              Pension salary sacrifice or personal contribution
            </label>
            <div className={css({ fontSize: "11px", color: "text.muted" })}>
              Gross contribution modelled. A contribution equal to the income above £100,000 brings
              adjusted net income to £100,000 in this estimate.
            </div>
          </div>
          <div
            className={css({
              fontSize: "md",
              fontWeight: "bold",
              color: "primary",
              fontVariantNumeric: "tabular-nums",
            })}
          >
            {formatGBP(sacrificeAmount)}{" "}
            <span className={css({ fontSize: "xs", color: "text.muted" })}>
              ({formatGBP(monthlySacrifice)}/mo)
            </span>
          </div>
        </div>

        <input
          id={sliderId}
          aria-label="Pension sacrifice amount"
          className={css({
            width: "100%",
            accentColor: "token(colors.primary)",
            cursor: "pointer",
          })}
          max={Math.max(25140, excessAbove100k + 5000)}
          min={0}
          step={500}
          type="range"
          value={sacrificeAmount}
          onChange={(e) => setSacrificeAmount(Number(e.target.value) || 0)}
        />

        <div className={reliefMetricsGrid()}>
          <div>
            <span className={css({ fontSize: "11px", color: "text.muted" })}>
              Tax and NI difference a year
            </span>
            <div
              className={css({
                fontFamily: "display",
                fontSize: "md",
                fontWeight: "bold",
                color: "status.positive.text",
                fontVariantNumeric: "tabular-nums",
              })}
            >
              {formatGBP(taxSaved)} / yr
            </div>
          </div>

          <div>
            <span className={css({ fontSize: "11px", color: "text.muted" })}>
              Gross pension contribution
            </span>
            <div
              className={css({
                fontFamily: "display",
                fontSize: "md",
                fontWeight: "bold",
                color: "primary",
                fontVariantNumeric: "tabular-nums",
              })}
            >
              +{formatGBP(monthlySacrifice)} / mo
            </div>
          </div>

          <div>
            <span className={css({ fontSize: "11px", color: "text.muted" })}>
              Change in take-home pay
            </span>
            <div
              className={css({
                fontFamily: "display",
                fontSize: "md",
                fontWeight: "bold",
                color: "text.primary",
                fontVariantNumeric: "tabular-nums",
              })}
            >
              -{formatGBP(effectiveCost)} / mo
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaxTrapEscapeBanner;
