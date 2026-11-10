import { css } from "@repo/ui/styled-system/css";
import { type FC, useEffect, useState } from "react";
import { FaCheck, FaCoins, FaSlidersH, FaUndo } from "react-icons/fa";
import FLPText from "~/components/core/typography/FLPText";
import { useUserProfile } from "~/hooks/useUserProfile";
import { DEFAULT_FINANCIAL_BASELINE, useFinancialBaseline } from "~/state/baseline.store";
import { useScenario } from "~/state/scenario.store";

export const GlobalBaselineScenarioBar: FC = () => {
  const { baseline, updateBaseline, stage } = useFinancialBaseline();
  const { isActive, overrides, effectiveBaseline, toggleScenario, updateOverrides, resetScenario } =
    useScenario();
  const { profile } = useUserProfile();

  const [isExpanded, setIsExpanded] = useState(false);

  // Hydrate baseline from userProfile if baseline is currently at its default
  useEffect(() => {
    if (
      profile?.annualSalary &&
      profile.annualSalary > 0 &&
      baseline.annualGrossSalary === DEFAULT_FINANCIAL_BASELINE.annualGrossSalary
    ) {
      updateBaseline({
        annualGrossSalary: profile.annualSalary,
        pensionContributionPct:
          profile.pensionPercent !== undefined && profile.pensionPercent !== null
            ? profile.pensionPercent
            : baseline.pensionContributionPct,
        isSalarySacrifice: profile.isSalarySacrifice ?? baseline.isSalarySacrifice,
      });
    }
  }, [
    profile,
    baseline.annualGrossSalary,
    updateBaseline,
    baseline.pensionContributionPct,
    baseline.isSalarySacrifice,
  ]);

  const stageLabels = {
    STAGE_1_DEBT_RECOVERY: {
      label: "Stage 1: Stabilise & Clear",
      color: "#ef4444",
      bg: "rgba(239, 68, 68, 0.1)",
    },
    STAGE_2_BUFFER_BUILD: {
      label: "Stage 2: Buffer & Protect",
      color: "#d97706",
      bg: "rgba(217, 119, 6, 0.1)",
    },
    STAGE_3_WEALTH_OPTIMIZE: {
      label: "Stage 3: Build & Optimize",
      color: "#10b981",
      bg: "rgba(16, 185, 129, 0.1)",
    },
  };

  const currentStageInfo = stageLabels[stage] || stageLabels.STAGE_2_BUFFER_BUILD;

  const handleCommitScenario = () => {
    updateBaseline({
      annualGrossSalary: effectiveBaseline.annualGrossSalary,
      pensionContributionPct: effectiveBaseline.pensionContributionPct,
      isSalarySacrifice: effectiveBaseline.isSalarySacrifice,
    });
    resetScenario();
  };

  return (
    <div
      className={css({
        backgroundColor: isActive ? "primary.subtle" : "surface.card",
        border: "1px solid",
        borderColor: isActive ? "primary" : "border",
        borderRadius: "xl",
        padding: "8px 16px",
        marginBottom: "16px",
        transition: "all 0.2s ease",
        boxShadow: isActive ? "0 4px 16px rgba(99, 99, 241, 0.12)" : "xs",
      })}
    >
      <div
        className={css({
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "12px",
        })}
      >
        {/* Left: Stage Pill & Core Baseline Summary */}
        <div
          className={css({ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" })}
        >
          <span
            style={{
              color: currentStageInfo.color,
              backgroundColor: currentStageInfo.bg,
              border: `1px solid ${currentStageInfo.color}33`,
              borderRadius: "9999px",
              padding: "4px 12px",
              fontSize: "12px",
              fontWeight: 600,
            }}
          >
            {currentStageInfo.label}
          </span>

          <div
            className={css({ display: "flex", alignItems: "center", gap: "8px", fontSize: "sm" })}
          >
            <FaCoins className={css({ color: "amber.500" })} />
            <span>
              Salary: <strong>£{effectiveBaseline.annualGrossSalary.toLocaleString()}</strong>
            </span>
            <span className={css({ color: "border" })}>•</span>
            <span>
              Pension: <strong>{effectiveBaseline.pensionContributionPct}%</strong>{" "}
              {effectiveBaseline.isSalarySacrifice ? "(Sal Sac)" : "(Net)"}
            </span>
            <span className={css({ color: "border" })}>•</span>
            <span className={css({ color: "text.muted", fontSize: "xs" })}>
              {effectiveBaseline.ukRegion === "SCOTLAND" ? "Scotland Tax" : "UK PAYE"}
            </span>
          </div>

          {isActive && (
            <span
              className={css({
                backgroundColor: "primary",
                color: "white",
                padding: "2px 8px",
                borderRadius: "full",
                fontSize: "11px",
                fontWeight: "bold",
                letterSpacing: "wider",
                textTransform: "uppercase",
              })}
            >
              What-If Active
            </span>
          )}
        </div>

        {/* Right: Controls */}
        <div className={css({ display: "flex", alignItems: "center", gap: "8px" })}>
          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            className={css({
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 12px",
              borderRadius: "md",
              fontSize: "xs",
              fontWeight: "semibold",
              backgroundColor: "surface.subtle",
              color: "text.primary",
              border: "1px solid",
              borderColor: "border",
              cursor: "pointer",
              _hover: { borderColor: "primary" },
            })}
          >
            <FaSlidersH />
            <span>{isExpanded ? "Hide details" : "Update details"}</span>
          </button>

          {isActive && (
            <>
              <button
                type="button"
                onClick={resetScenario}
                title="Reset What-If overrides"
                className={css({
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  padding: "6px 10px",
                  borderRadius: "md",
                  fontSize: "xs",
                  color: "text.muted",
                  border: "1px solid",
                  borderColor: "border",
                  cursor: "pointer",
                  _hover: { color: "destructive.500", borderColor: "destructive.500" },
                })}
              >
                <FaUndo />
                <span>Reset</span>
              </button>

              <button
                type="button"
                onClick={handleCommitScenario}
                title="Save changes to actual financial baseline"
                className={css({
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "6px 12px",
                  borderRadius: "md",
                  fontSize: "xs",
                  fontWeight: "semibold",
                  backgroundColor: "primary",
                  color: "white",
                  border: "none",
                  cursor: "pointer",
                  _hover: { opacity: 0.9 },
                })}
              >
                <FaCheck />
                <span>Commit to Profile</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Expanded Inline Scenario Controls */}
      {isExpanded && (
        <div
          className={css({
            marginTop: "16px",
            paddingTop: "16px",
            borderTop: "1px solid",
            borderColor: "border",
            display: "grid",
            gridTemplateColumns: { base: "1fr", sm: "repeat(2, 1fr)", md: "repeat(3, 1fr)" },
            gap: "16px",
            alignItems: "end",
          })}
        >
          {/* Salary Adjustment Input */}
          <div>
            <label
              htmlFor="scenario-gross-salary"
              className={css({
                display: "block",
                fontSize: "xs",
                fontWeight: "semibold",
                color: "text.primary",
                mb: 1,
              })}
            >
              Gross Annual Salary
            </label>
            <div className={css({ position: "relative", display: "flex", alignItems: "center" })}>
              <span
                className={css({
                  position: "absolute",
                  left: "10px",
                  fontSize: "xs",
                  color: "text.muted",
                  pointerEvents: "none",
                })}
              >
                £
              </span>
              <input
                id="scenario-gross-salary"
                type="number"
                min="0"
                step="500"
                value={effectiveBaseline.annualGrossSalary}
                onChange={(e) =>
                  updateOverrides({ annualGrossSalary: Number(e.target.value) || 0 })
                }
                className={css({
                  width: "100%",
                  padding: "6px 12px 6px 24px",
                  fontSize: "sm",
                  fontWeight: "semibold",
                  borderRadius: "md",
                  border: "1px solid",
                  borderColor: "border",
                  backgroundColor: "surface",
                  color: "text.primary",
                  outline: "none",
                  _focus: { borderColor: "primary" },
                })}
              />
            </div>
          </div>

          {/* Pension % Input */}
          <div>
            <label
              htmlFor="scenario-pension-pct"
              className={css({
                display: "block",
                fontSize: "xs",
                fontWeight: "semibold",
                color: "text.primary",
                mb: 1,
              })}
            >
              Pension Contribution
            </label>
            <div className={css({ position: "relative", display: "flex", alignItems: "center" })}>
              <input
                id="scenario-pension-pct"
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={effectiveBaseline.pensionContributionPct}
                onChange={(e) =>
                  updateOverrides({ pensionContributionPct: Number(e.target.value) || 0 })
                }
                className={css({
                  width: "100%",
                  padding: "6px 24px 6px 12px",
                  fontSize: "sm",
                  fontWeight: "semibold",
                  borderRadius: "md",
                  border: "1px solid",
                  borderColor: "border",
                  backgroundColor: "surface",
                  color: "text.primary",
                  outline: "none",
                  _focus: { borderColor: "primary" },
                })}
              />
              <span
                className={css({
                  position: "absolute",
                  right: "10px",
                  fontSize: "xs",
                  color: "text.muted",
                  pointerEvents: "none",
                })}
              >
                %
              </span>
            </div>
          </div>

          {/* Salary Sacrifice Toggle */}
          <div
            className={css({
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "6px 10px",
              borderRadius: "md",
              border: "1px solid",
              borderColor: "border",
              backgroundColor: "surface",
            })}
          >
            <div>
              <FLPText fontSize="xs" fontWeight="semibold" color="text.primary">
                Salary Sacrifice (NI Relief)
              </FLPText>
              <FLPText fontSize="xs" color="text.muted">
                Pre-PAYE & NI deduction
              </FLPText>
            </div>
            <input
              type="checkbox"
              checked={effectiveBaseline.isSalarySacrifice}
              onChange={(e) => updateOverrides({ isSalarySacrifice: e.target.checked })}
              className={css({
                width: "18px",
                height: "18px",
                accentColor: "primary",
                cursor: "pointer",
              })}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default GlobalBaselineScenarioBar;
