import { calculateCompoundTrajectory } from "@repo/common";
import { css } from "@repo/ui/styled-system/css";
import { flex, grid } from "@repo/ui/styled-system/patterns";
import { type FC, useMemo, useState } from "react";

const containerStyle = css({
  maxWidth: "5xl",
  mx: "auto",
  py: "16",
  px: "4",
});

const cardStyle = css({
  backgroundColor: { base: "#ffffff", _dark: "dark.surface" },
  border: "1px solid",
  borderColor: { base: "slate.200", _dark: "slate.800" },
  borderRadius: "2xl",
  p: { base: "6", md: "8" },
  boxShadow: { base: "0 10px 30px rgba(0, 0, 0, 0.05)", _dark: "0 10px 30px rgba(0, 0, 0, 0.3)" },
});

const visualBarStyle = css({
  backgroundColor: { base: "#f8fafc", _dark: "dark.bg" },
  borderRadius: "16px",
  padding: "24px",
  border: "1px solid",
  borderColor: { base: "slate.200", _dark: "slate.800" },
});

export const CompoundingTeaser: FC = () => {
  const [initialPot, setInitialPot] = useState(15000);
  const [monthlyAddition, setMonthlyAddition] = useState(500);
  const [expectedReturn, setExpectedReturn] = useState(6.0);
  const [horizonYears, setHorizonYears] = useState(15);

  const trajectory = useMemo(() => {
    return calculateCompoundTrajectory(initialPot, monthlyAddition, expectedReturn, horizonYears);
  }, [initialPot, monthlyAddition, expectedReturn, horizonYears]);

  const yearlyMilestones = useMemo(() => {
    const points = [];
    const step = Math.max(1, Math.floor(horizonYears / 4));
    for (let y = step; y <= horizonYears; y += step) {
      points.push(calculateCompoundTrajectory(initialPot, monthlyAddition, expectedReturn, y));
    }
    return points;
  }, [initialPot, monthlyAddition, expectedReturn, horizonYears]);

  return (
    <section className={containerStyle}>
      <div style={{ textAlign: "center", marginBottom: "32px" }}>
        <span
          style={{
            fontSize: "12px",
            fontWeight: "700",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: "#6363f1",
          }}
        >
          Scenario Modeling Engine
        </span>
        <h2
          style={{
            fontSize: "2.25rem",
            fontWeight: "800",
            color: "var(--colors-text-primary, #0f172a)",
            marginTop: "8px",
          }}
        >
          Simulate 30 Years of UK Market Growth & Safe-to-Spend
        </h2>
        <p
          style={{
            fontSize: "1.1rem",
            color: "var(--colors-text-muted, #64748b)",
            maxWidth: "680px",
            margin: "12px auto 0",
          }}
        >
          Connect your pension tax relief, ISA allowance, and mortgage overpayments into a single
          predictive line.
        </p>
      </div>

      <div className={cardStyle}>
        <div className={grid({ columns: { base: 1, md: 3 }, gap: "6", mb: "8" })}>
          <label style={{ display: "block" }}>
            <span
              style={{ fontSize: "13px", fontWeight: "600", color: "#475569", display: "block" }}
            >
              Initial Investment / ISA Pot: £{initialPot.toLocaleString()}
            </span>
            <input
              type="range"
              min="1000"
              max="100000"
              step="1000"
              value={initialPot}
              onChange={(e) => setInitialPot(Number(e.target.value))}
              style={{ width: "100%", accentColor: "#6363f1", marginTop: "6px" }}
            />
          </label>

          <label style={{ display: "block" }}>
            <span
              style={{ fontSize: "13px", fontWeight: "600", color: "#475569", display: "block" }}
            >
              Monthly Addition: £{monthlyAddition.toLocaleString()}/mo
            </span>
            <input
              type="range"
              min="50"
              max="2500"
              step="50"
              value={monthlyAddition}
              onChange={(e) => setMonthlyAddition(Number(e.target.value))}
              style={{ width: "100%", accentColor: "#6363f1", marginTop: "6px" }}
            />
          </label>

          <label style={{ display: "block" }}>
            <span
              style={{ fontSize: "13px", fontWeight: "600", color: "#475569", display: "block" }}
            >
              Horizon: {horizonYears} Years ({expectedReturn}% APY)
            </span>
            <input
              type="range"
              min="5"
              max="30"
              step="1"
              value={horizonYears}
              onChange={(e) => setHorizonYears(Number(e.target.value))}
              style={{ width: "100%", accentColor: "#10b981", marginTop: "6px" }}
            />
          </label>
        </div>

        {/* Visual Bar Stack */}
        <div className={visualBarStyle}>
          <div
            className={flex({
              justify: "space-between",
              align: "flex-end",
              flexWrap: "wrap",
              gap: "4",
              mb: "4",
            })}
          >
            <div>
              <div style={{ fontSize: "12px", fontWeight: "600", color: "#64748b" }}>
                TOTAL PROJECTED VALUE
              </div>
              <div
                style={{
                  fontSize: "2.5rem",
                  fontWeight: "800",
                  color: "var(--colors-text-primary, #0f172a)",
                }}
              >
                £{Math.round(trajectory.endBalance).toLocaleString()}
              </div>
            </div>

            <div className={flex({ gap: "6" })}>
              <div>
                <div style={{ fontSize: "12px", color: "#64748b" }}>Your Contributions</div>
                <div style={{ fontSize: "1.2rem", fontWeight: "700", color: "#6363f1" }}>
                  £{Math.round(trajectory.totalContributions).toLocaleString()}
                </div>
              </div>
              <div>
                <div style={{ fontSize: "12px", color: "#64748b" }}>Compounded Interest</div>
                <div style={{ fontSize: "1.2rem", fontWeight: "700", color: "#10b981" }}>
                  £{Math.round(trajectory.totalInterest).toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          {/* Simple Ratio Progress Bar */}
          <div
            style={{
              height: "14px",
              borderRadius: "9999px",
              backgroundColor: "#e2e8f0",
              overflow: "hidden",
              display: "flex",
              width: "100%",
            }}
          >
            <div
              style={{
                width: `${Math.min(100, (trajectory.totalContributions / trajectory.endBalance) * 100)}%`,
                backgroundColor: "#6363f1",
              }}
              title="Contributions"
            />
            <div
              style={{
                width: `${Math.min(100, (trajectory.totalInterest / trajectory.endBalance) * 100)}%`,
                backgroundColor: "#10b981",
              }}
              title="Compound Interest"
            />
          </div>
          <div
            className={flex({
              justify: "space-between",
              fontSize: "11px",
              color: "#94a3b8",
              mt: "2",
            })}
          >
            <span>
              🔵 Capital Contributed (
              {Math.round((trajectory.totalContributions / trajectory.endBalance) * 100)}%)
            </span>
            <span>
              🟢 Pure Compounding Returns (
              {Math.round((trajectory.totalInterest / trajectory.endBalance) * 100)}%)
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};
