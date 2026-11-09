import { css } from "@repo/ui/styled-system/css";
import { type FC, useState } from "react";
import { FaCheck, FaCoins, FaSlidersH, FaUndo } from "react-icons/fa";
import FLPText from "~/components/core/typography/FLPText";
import { useFinancialBaseline } from "~/state/baseline.store";
import { useScenario } from "~/state/scenario.store";

export const GlobalBaselineScenarioBar: FC = () => {
  const { baseline, updateBaseline, stage } = useFinancialBaseline();
  const { isActive, overrides, effectiveBaseline, toggleScenario, updateOverrides, resetScenario } =
    useScenario();

  const [isExpanded, setIsExpanded] = useState(false);

  const stageLabels = {
    STAGE_1_DEBT_RECOVERY: {
      label: "Stage 1: Debt Recovery",
      color: "#dc2626",
      bg: "rgba(220, 38, 38, 0.1)",
    },
    STAGE_2_BUFFER_BUILD: {
      label: "Stage 2: Buffer Build",
      color: "#d97706",
      bg: "rgba(217, 119, 6, 0.1)",
    },
    STAGE_3_WEALTH_OPTIMIZE: {
      label: "Stage 3: Wealth Optimize",
      color: "#16a34a",
      bg: "rgba(22, 163, 74, 0.1)",
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
        backgroundColor: isActive ? "rgba(99, 99, 241, 0.08)" : "card",
        border: "1px solid",
        borderColor: isActive ? "primary" : "border",
        borderRadius: "xl",
        padding: "12px 20px",
        marginBottom: "24px",
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
              backgroundColor: "secondary",
              color: "text.primary",
              border: "1px solid",
              borderColor: "border",
              cursor: "pointer",
              _hover: { borderColor: "primary" },
            })}
          >
            <FaSlidersH />
            <span>{isExpanded ? "Hide Controls" : "Adjust / What-If"}</span>
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

      {/* Expanded Inline Slider Controls */}
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
          })}
        >
          {/* Salary Adjustment Slider */}
          <div>
            <div
              className={css({
                display: "flex",
                justifyContent: "space-between",
                fontSize: "xs",
                mb: 1,
              })}
            >
              <span className={css({ fontWeight: "semibold", color: "text.primary" })}>
                Gross Salary
              </span>
              <span className={css({ color: "primary", fontWeight: "bold" })}>
                £{effectiveBaseline.annualGrossSalary.toLocaleString()}
              </span>
            </div>
            <input
              type="range"
              min="15000"
              max="250000"
              step="1000"
              value={effectiveBaseline.annualGrossSalary}
              onChange={(e) => updateOverrides({ annualGrossSalary: Number(e.target.value) })}
              className={css({ width: "100%", accentColor: "primary", cursor: "pointer" })}
            />
          </div>

          {/* Pension % Slider */}
          <div>
            <div
              className={css({
                display: "flex",
                justifyContent: "space-between",
                fontSize: "xs",
                mb: 1,
              })}
            >
              <span className={css({ fontWeight: "semibold", color: "text.primary" })}>
                Pension Contribution
              </span>
              <span className={css({ color: "primary", fontWeight: "bold" })}>
                {effectiveBaseline.pensionContributionPct}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="40"
              step="1"
              value={effectiveBaseline.pensionContributionPct}
              onChange={(e) => updateOverrides({ pensionContributionPct: Number(e.target.value) })}
              className={css({ width: "100%", accentColor: "primary", cursor: "pointer" })}
            />
          </div>

          {/* Salary Sacrifice Toggle */}
          <div
            className={css({
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            })}
          >
            <div>
              <FLPText fontSize="xs" fontWeight="semibold" color="text.primary">
                Salary Sacrifice (NI Relief)
              </FLPText>
              <FLPText fontSize="xs" color="text.muted">
                Deducted pre-PAYE & NI
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
