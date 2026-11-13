import type { UkTaxRegion } from "@flump/finance-engine";
import {
  calculateSalarySacrificeSaving,
  calculateTaxTrapRelief,
  getDisplayMarginalRatePct,
} from "@flump/finance-engine";
import { css } from "@repo/ui/styled-system/css";
import { type FC, useId, useMemo, useState } from "react";
import { FiAlertTriangle, FiArrowRight, FiCheck } from "react-icons/fi";
import { Link } from "react-router";
import FLPButton from "~/components/core/buttons/FLPButton";
import FLPHeading from "~/components/core/typography/FLPHeading";
import FLPText from "~/components/core/typography/FLPText";
import { getTaxTrapCopy, REGION_ASSUMPTION_LABEL, REGION_SETTINGS_PATH } from "~/utils/taxTrapCopy";

export interface TaxTrapAlertBannerProps {
  grossIncome: number;
  /** Known tax region; null or undefined means England, Wales and NI is assumed and labelled. */
  region?: UkTaxRegion | null;
  onApplySacrifice?: (additionalMonthlySacrifice: number) => void;
}

const bannerContainerStyle = (isInTrap: boolean) =>
  css({
    borderRadius: "2xl",
    border: "1px solid",
    borderColor: isInTrap
      ? "color-mix(in srgb, var(--colors-status-danger-text) 40%, transparent)"
      : "color-mix(in srgb, var(--colors-chart-warning) 40%, transparent)",
    backgroundColor: isInTrap
      ? "color-mix(in srgb, var(--colors-status-danger-text) 4%, transparent)"
      : "color-mix(in srgb, var(--colors-chart-warning) 4%, transparent)",
    padding: { base: "18px 16px", md: "24px 28px" },
    display: "flex",
    flexDirection: "column",
    gap: "18px",
    boxShadow: "var(--shadows-card)",
  });

// Semantic status tokens keep the badge above 4.5:1 contrast in light and dark.
const marginalRateBadge = (isInTrap: boolean) =>
  css({
    fontSize: "11px",
    fontWeight: "bold",
    padding: "2px 8px",
    borderRadius: "full",
    border: "1px solid",
    fontVariantNumeric: "tabular-nums",
    backgroundColor: isInTrap ? "status.danger.bg" : "status.warning.bg",
    borderColor: isInTrap ? "status.danger.border" : "status.warning.border",
    color: isInTrap ? "status.danger.text" : "status.warning.text",
  });

const metricGridLayout = css({
  display: "grid",
  gridTemplateColumns: { base: "1fr", sm: "repeat(3, 1fr)" },
  gap: "12px",
  paddingTop: "10px",
  borderTop: "1px solid",
  borderColor: "border",
});

const formatGBP = (num: number) => `£${Math.max(0, Math.round(num)).toLocaleString("en-GB")}`;

export const TaxTrapAlertBanner: FC<TaxTrapAlertBannerProps> = ({
  grossIncome,
  region,
  onApplySacrifice,
}) => {
  const effectiveRegion: UkTaxRegion = region ?? "ENGLAND_NI_WALES";
  const sliderId = useId();

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

  const handleApply = () => {
    if (onApplySacrifice) {
      onApplySacrifice(monthlySacrifice);
      setApplied(true);
      setTimeout(() => setApplied(false), 3000);
    }
  };

  return (
    <div
      className={bannerContainerStyle(trapAnalysis.isInTaxTrap)}
      data-testid="tax-trap-alert-banner"
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
        <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              backgroundColor: trapAnalysis.isInTaxTrap
                ? "color-mix(in srgb, var(--colors-status-danger-text) 15%, transparent)"
                : "color-mix(in srgb, var(--colors-chart-warning) 15%, transparent)",
              color: trapAnalysis.isInTaxTrap
                ? "var(--colors-status-danger-text)"
                : "var(--colors-chart-warning)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "18px",
              flexShrink: 0,
            }}
          >
            <FiAlertTriangle />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <FLPHeading as="h3" size="sm">
                {trapAnalysis.isInTaxTrap
                  ? `UK £100k–£125k ${trapCopy.incomeTaxRate} Tax Trap Active`
                  : "Approaching the £100,000 UK Tax Trap"}
              </FLPHeading>
              <span className={marginalRateBadge(trapAnalysis.isInTaxTrap)}>
                {getDisplayMarginalRatePct(trapAnalysis)}% Marginal Tax
              </span>
            </div>
            <FLPText
              color="text.muted"
              fontSize="xs"
              style={{ marginTop: "4px", maxWidth: "680px" }}
            >
              {trapAnalysis.isInTaxTrap ? (
                <>
                  Between £100,000 and £125,140, HMRC reduces your Personal Allowance by £1 for
                  every £2 of income. Combined with higher rate tax and National Insurance, you face
                  a marginal rate of <strong>{trapCopy.breakdown}</strong> and lose 15–30 hours
                  funded childcare eligibility.
                </>
              ) : (
                <>
                  Above £100,000, HMRC reduces your Personal Allowance by £1 for every £2 of income,
                  which raises your marginal rate sharply. Pension contributions now can keep you
                  below the threshold.
                </>
              )}
            </FLPText>
            {!region && (
              <FLPText color="text.muted" fontSize="xs" className={css({ marginTop: "4px" })}>
                {REGION_ASSUMPTION_LABEL}{" "}
                <Link to={REGION_SETTINGS_PATH} className={css({ textDecoration: "underline" })}>
                  Set your region
                </Link>
              </FLPText>
            )}
          </div>
        </div>

        {trapAnalysis.isInTaxTrap && (
          <div
            style={{
              padding: "8px 14px",
              borderRadius: "8px",
              backgroundColor:
                "color-mix(in srgb, var(--colors-status-danger-text) 8%, transparent)",
              border:
                "1px solid color-mix(in srgb, var(--colors-status-danger-text) 20%, transparent)",
              fontSize: "12px",
              textAlign: "right",
            }}
          >
            <div style={{ color: "text.muted" }}>Personal Allowance Lost:</div>
            <strong style={{ fontSize: "16px", color: "var(--colors-status-danger-text)" }}>
              {formatGBP(trapAnalysis.lostPersonalAllowance)}
            </strong>
          </div>
        )}
      </div>

      {/* Escape Slider Interactive Box */}
      <div
        style={{
          padding: "16px 20px",
          borderRadius: "14px",
          backgroundColor: "var(--colors-surface)",
          border: "1px solid var(--colors-border)",
          display: "flex",
          flexDirection: "column",
          gap: "14px",
        }}
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
            <label htmlFor={sliderId} style={{ fontSize: "13px", fontWeight: 700 }}>
              Pension Salary Sacrifice / SIPP Contribution
            </label>
            <div style={{ fontSize: "11px", color: "var(--colors-text-muted)" }}>
              Slide to bring your adjusted net income down to £100,000 to restore your full
              allowance.
            </div>
          </div>
          <div style={{ fontSize: "18px", fontWeight: 800, color: "var(--colors-primary)" }}>
            {formatGBP(sacrificeAmount)}{" "}
            <span style={{ fontSize: "12px", color: "var(--colors-text-muted)" }}>
              ({formatGBP(monthlySacrifice)}/mo)
            </span>
          </div>
        </div>

        <input
          id={sliderId}
          type="range"
          min={0}
          max={Math.max(25140, trapAnalysis.excessAbove100k + 5000)}
          step={500}
          value={sacrificeAmount}
          onChange={(e) => setSacrificeAmount(Number(e.target.value) || 0)}
        />

        {/* Live Savings Calculation Metrics */}
        <div className={metricGridLayout}>
          <div>
            <span style={{ fontSize: "11px", color: "var(--colors-text-muted)" }}>
              Annual Tax & NI Saved
            </span>
            <div
              style={{
                fontSize: "18px",
                fontWeight: 800,
                color: "var(--colors-status-positive-text)",
              }}
            >
              {formatGBP(taxSaved)} / yr
            </div>
          </div>

          <div>
            <span style={{ fontSize: "11px", color: "var(--colors-text-muted)" }}>
              Gross Pension Added
            </span>
            <div style={{ fontSize: "18px", fontWeight: 800, color: "var(--colors-primary)" }}>
              +{formatGBP(monthlySacrifice)} / mo
            </div>
          </div>

          <div>
            <span style={{ fontSize: "11px", color: "var(--colors-text-muted)" }}>
              Actual Net Pay Reduced
            </span>
            <div style={{ fontSize: "18px", fontWeight: 800, color: "text.primary" }}>
              Only -{formatGBP(effectiveCost)} / mo
            </div>
          </div>
        </div>

        {onApplySacrifice && (
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "4px" }}>
            <FLPButton size="sm" variant="primary" onClick={handleApply}>
              {applied ? (
                <>
                  <FiCheck style={{ marginRight: "6px" }} /> Baseline Updated!
                </>
              ) : (
                <>
                  Apply {formatGBP(monthlySacrifice)}/mo to Pension Baseline{" "}
                  <FiArrowRight style={{ marginLeft: "6px" }} />
                </>
              )}
            </FLPButton>
          </div>
        )}
      </div>
    </div>
  );
};

export default TaxTrapAlertBanner;
