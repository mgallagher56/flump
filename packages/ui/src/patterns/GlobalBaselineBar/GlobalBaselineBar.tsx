import { type FC, useState } from "react";
import { css, cx } from "../../../styled-system/css";
import { Button } from "../../primitives/Button/Button";
import { StatusBadge } from "../../primitives/StatusBadge/StatusBadge";
import { baselineBarContainer, baselineSummaryRow } from "./GlobalBaselineBar.styles";

export interface GlobalBaselineBarProps {
  salary: number;
  pensionPct: number;
  isSalarySacrifice?: boolean;
  region?: string;
  stageName?: string;
  stageVariant?: "brand" | "positive" | "warning" | "danger" | "neutral";
  isWhatIfActive?: boolean;
  onCommit?: (updated: { salary: number; pensionPct: number }) => void;
  onReset?: () => void;
  className?: string;
}

export const GlobalBaselineBar: FC<GlobalBaselineBarProps> = ({
  salary,
  pensionPct,
  isSalarySacrifice = true,
  region = "UK PAYE",
  stageName = "Your baseline",
  stageVariant = "neutral",
  isWhatIfActive = false,
  onCommit,
  onReset,
  className,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentSalary, setCurrentSalary] = useState(salary);
  const [currentPension, setCurrentPension] = useState(pensionPct);

  return (
    <div className={cx(baselineBarContainer({ active: isWhatIfActive }), className)}>
      <div className={baselineSummaryRow()}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          <StatusBadge size="sm" variant={stageVariant}>
            {stageName}
          </StatusBadge>

          <div
            className={css({
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "xs",
              color: "text.primary",
            })}
          >
            <span>
              Salary:{" "}
              <strong className={css({ fontVariantNumeric: "tabular-nums" })}>
                £{currentSalary.toLocaleString("en-GB")}
              </strong>
            </span>
            <span className={css({ color: "border" })}>•</span>
            <span>
              Pension:{" "}
              <strong className={css({ fontVariantNumeric: "tabular-nums" })}>
                {currentPension}%
              </strong>{" "}
              {isSalarySacrifice ? "(Sal Sac)" : "(Net)"}
            </span>
            <span className={css({ color: "border" })}>•</span>
            <span className={css({ color: "text.muted" })}>{region}</span>
          </div>

          {isWhatIfActive && (
            <StatusBadge size="sm" variant="brand">
              What-If Active
            </StatusBadge>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Button size="sm" variant="secondary" onClick={() => setIsExpanded((prev) => !prev)}>
            {isExpanded ? "Hide Details" : "Adjust Baseline"}
          </Button>

          {isWhatIfActive && onReset && (
            <Button size="sm" variant="outline" onClick={onReset}>
              Reset
            </Button>
          )}

          {isWhatIfActive && onCommit && (
            <Button
              size="sm"
              variant="primary"
              onClick={() => onCommit({ salary: currentSalary, pensionPct: currentPension })}
            >
              Commit to Profile
            </Button>
          )}
        </div>
      </div>

      {isExpanded && (
        <div
          className={css({
            mt: "14px",
            pt: "14px",
            borderTopWidth: "1px",
            borderTopStyle: "solid",
            borderTopColor: "border.subtle",
            display: "grid",
            gridTemplateColumns: { base: "1fr", sm: "repeat(2, 1fr)" },
            gap: "16px",
          })}
        >
          <div>
            <label
              className={css({
                display: "block",
                fontSize: "xs",
                fontWeight: "semibold",
                mb: "4px",
              })}
              htmlFor="baseline-salary-input"
            >
              Gross Annual Salary (£)
            </label>
            <input
              id="baseline-salary-input"
              className={css({
                width: "100%",
                px: "10px",
                py: "6px",
                fontSize: "xs",
                fontWeight: "semibold",
                fontVariantNumeric: "tabular-nums",
                borderRadius: "md",
                borderWidth: "1px",
                borderColor: "border.input",
                backgroundColor: "surface.card",
                color: "text.primary",
              })}
              step="500"
              type="number"
              value={currentSalary}
              onChange={(e) => setCurrentSalary(Number(e.target.value) || 0)}
            />
          </div>

          <div>
            <label
              className={css({
                display: "block",
                fontSize: "xs",
                fontWeight: "semibold",
                mb: "4px",
              })}
              htmlFor="baseline-pension-input"
            >
              Workplace Pension Contribution (%)
            </label>
            <input
              id="baseline-pension-input"
              className={css({
                width: "100%",
                px: "10px",
                py: "6px",
                fontSize: "xs",
                fontWeight: "semibold",
                fontVariantNumeric: "tabular-nums",
                borderRadius: "md",
                borderWidth: "1px",
                borderColor: "border.input",
                backgroundColor: "surface.card",
                color: "text.primary",
              })}
              max="100"
              min="0"
              step="0.5"
              type="number"
              value={currentPension}
              onChange={(e) => setCurrentPension(Number(e.target.value) || 0)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default GlobalBaselineBar;
