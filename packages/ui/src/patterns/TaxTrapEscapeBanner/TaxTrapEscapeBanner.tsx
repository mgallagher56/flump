import { type FC, useId, useState } from "react";
import { css, cx } from "../../../styled-system/css";
import { Button } from "../../primitives/Button/Button";
import { StatusBadge } from "../../primitives/StatusBadge/StatusBadge";
import { reliefMetricsGrid, taxTrapContainer } from "./TaxTrapEscapeBanner.styles";

export interface TaxTrapEscapeBannerProps {
  grossIncome: number;
  onApplySacrifice?: (monthlySacrifice: number) => void;
  className?: string;
}

const formatGBP = (num: number) => `£${Math.max(0, Math.round(num)).toLocaleString("en-GB")}`;

export const TaxTrapEscapeBanner: FC<TaxTrapEscapeBannerProps> = ({
  grossIncome,
  onApplySacrifice,
  className,
}) => {
  const sliderId = useId();
  const excessAbove100k = Math.max(0, grossIncome - 100000);
  const isInTrap = grossIncome >= 100000 && grossIncome <= 125140;
  const [sacrificeAmount, setSacrificeAmount] = useState<number>(Math.min(25140, excessAbove100k));
  const [applied, setApplied] = useState(false);

  // 62% marginal tax relief (40% higher rate tax + 20% restored personal allowance + 2% NI)
  const taxSaved = Math.round(sacrificeAmount * 0.62);
  const monthlySacrifice = Math.round(sacrificeAmount / 12);
  const monthlySaved = Math.round(taxSaved / 12);
  const effectiveCost = monthlySacrifice - monthlySaved;

  const handleApply = () => {
    if (onApplySacrifice) {
      onApplySacrifice(monthlySacrifice);
      setApplied(true);
      setTimeout(() => setApplied(false), 3000);
    }
  };

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
                ? "UK £100k–£125k 60% Tax Trap Active"
                : "Approaching the £100,000 UK Tax Trap"}
            </h3>
            <StatusBadge size="sm" variant={isInTrap ? "danger" : "warning"}>
              62% Marginal Tax
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
            Between £100,000 and £125,140, HMRC reduces your Personal Allowance by £1 for every £2
            of income. Combined with 40% higher rate tax and 2% National Insurance, you face an
            effective <strong>62% marginal tax rate</strong> and lose funded childcare eligibility.
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
              Pension Salary Sacrifice / SIPP Contribution
            </label>
            <div className={css({ fontSize: "11px", color: "text.muted" })}>
              Slide to reduce adjusted net income to £100,000 and restore full personal allowance.
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
              Annual Tax & NI Saved
            </span>
            <div
              className={css({
                fontFamily: "display",
                fontSize: "md",
                fontWeight: "bold",
                color: "status.positive.solid",
                fontVariantNumeric: "tabular-nums",
              })}
            >
              {formatGBP(taxSaved)} / yr
            </div>
          </div>

          <div>
            <span className={css({ fontSize: "11px", color: "text.muted" })}>
              Gross Pension Added
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
              Actual Take-Home Reduced
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
              Only -{formatGBP(effectiveCost)} / mo
            </div>
          </div>
        </div>

        {onApplySacrifice && (
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "4px" }}>
            <Button size="sm" variant="primary" onClick={handleApply}>
              {applied ? "Baseline Updated!" : `Apply ${formatGBP(monthlySacrifice)}/mo to Pension`}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TaxTrapEscapeBanner;
