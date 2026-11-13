import { SectionBand } from "@repo/ui";
import { css } from "@repo/ui/styled-system/css";
import { grid } from "@repo/ui/styled-system/patterns";
import type { FC } from "react";
import { FiDollarSign, FiHome, FiPercent, FiTrendingUp } from "react-icons/fi";

const positiveFigureStyle = css({
  color: "status.positive.text",
  fontVariantNumeric: "tabular-nums",
});

const bentoCardStyle = css({
  backgroundColor: "card",
  border: "1px solid",
  borderColor: "border",
  borderRadius: "2xl",
  p: "6",
  display: "flex",
  flexDirection: "column",
  gap: "14px",
  boxShadow: "card",
  transition: "transform 0.2s ease, box-shadow 0.2s ease",
  _hover: {
    transform: "translateY(-3px)",
    boxShadow: "cardHover",
  },
});

const iconBoxStyle = (bg: string, color: string) =>
  css({
    width: "42px",
    height: "42px",
    borderRadius: "12px",
    backgroundColor: bg,
    color: color,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "18px",
  });

const pillChip = css({
  fontSize: "xs",
  fontWeight: "600",
  padding: "2px 8px",
  borderRadius: "full",
  backgroundColor: "surface.subtle",
  color: "text.secondary",
});

export const FeaturePillars: FC = () => {
  return (
    <SectionBand
      id="pillars"
      tone="canvas"
      indexBadge="Core tools"
      title="Four pillars of your financial plan"
      subtitle="Built specifically for UK tax bands, Personal Allowance thresholds, and interest rates."
    >
      <div className={grid({ columns: { base: 1, md: 2 }, gap: "6" })}>
        {/* Pillar 1: Debt */}
        <div className={bentoCardStyle}>
          <div
            style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}
          >
            <div className={iconBoxStyle("rgba(239, 68, 68, 0.12)", "#ef4444")}>
              <FiDollarSign />
            </div>
            <span
              style={{
                fontSize: "12px",
                fontWeight: "600",
                color: "var(--colors-status-danger-text)",
                fontFamily: "var(--fonts-mono, monospace)",
              }}
            >
              Debt
            </span>
          </div>

          <div>
            <h3
              style={{
                fontSize: "1.35rem",
                fontWeight: "700",
                color: "var(--colors-text-primary, #0f172a)",
                fontFamily: "var(--fonts-display, sans-serif)",
                margin: "0 0 6px 0",
              }}
            >
              Debt payoff
            </h3>
            <p
              style={{
                fontSize: "14px",
                color: "var(--colors-text-secondary, #475569)",
                margin: 0,
                lineHeight: "1.5",
              }}
            >
              Compare avalanche and snowball payoff schedules, with alerts before 0% promotional
              rates expire.
            </p>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            <span className={pillChip}>Avalanche vs snowball</span>
            <span className={pillChip}>0% transfer alerts</span>
            <span className={pillChip}>39.9% EAR overdraft costs</span>
          </div>

          {/* Code-driven SVG Micro-Diagram */}
          <div
            role="img"
            aria-label="Avalanche payoff curve vs Minimum payments curve diagram"
            style={{
              marginTop: "auto",
              padding: "12px",
              borderRadius: "10px",
              backgroundColor: "var(--colors-surface-subtle)",
              border: "1px solid var(--colors-border)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "11px",
                color: "var(--colors-text-muted)",
                marginBottom: "6px",
              }}
            >
              <span>Payoff trajectory</span>
              <strong className={positiveFigureStyle}>Example: -£1,420 interest saved</strong>
            </div>
            <svg
              viewBox="0 0 280 40"
              style={{ width: "100%", height: "40px", overflow: "visible" }}
              role="img"
              aria-label="Debt payoff comparison chart"
            >
              <title>Debt payoff comparison chart</title>
              {/* Minimum line */}
              <path
                d="M 0 10 Q 140 25 280 35"
                fill="none"
                stroke="var(--colors-text-muted)"
                strokeWidth="2"
                strokeDasharray="4 4"
              />
              {/* Avalanche line */}
              <path
                d="M 0 10 Q 100 35 180 38 L 280 38"
                fill="none"
                stroke="#10b981"
                strokeWidth="2.5"
              />
            </svg>
          </div>
        </div>

        {/* Pillar 2: Tax */}
        <div className={bentoCardStyle}>
          <div
            style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}
          >
            <div className={iconBoxStyle("rgba(99, 102, 241, 0.12)", "#6363f1")}>
              <FiPercent />
            </div>
            <span
              style={{
                fontSize: "12px",
                fontWeight: "600",
                color: "var(--colors-primary)",
                fontFamily: "var(--fonts-mono, monospace)",
              }}
            >
              UK tax rules
            </span>
          </div>

          <div>
            <h3
              style={{
                fontSize: "1.35rem",
                fontWeight: "700",
                color: "var(--colors-text-primary, #0f172a)",
                fontFamily: "var(--fonts-display, sans-serif)",
                margin: "0 0 6px 0",
              }}
            >
              UK tax and pension planning
            </h3>
            <p
              style={{
                fontSize: "14px",
                color: "var(--colors-text-secondary, #475569)",
                margin: 0,
                lineHeight: "1.5",
              }}
            >
              Model the £100k Personal Allowance taper and the National Insurance effect of salary
              sacrifice.
            </p>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            <span className={pillChip}>60% tax trap</span>
            <span className={pillChip}>30 hours free childcare</span>
            <span className={pillChip}>Salary sacrifice</span>
          </div>

          {/* Code-driven SVG Micro-Diagram: £100k Cliff */}
          <div
            role="img"
            aria-label="UK income tax marginal rate diagram showing 60% trap"
            style={{
              marginTop: "auto",
              padding: "12px",
              borderRadius: "10px",
              backgroundColor: "var(--colors-surface-subtle)",
              border: "1px solid var(--colors-border)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "11px",
                color: "var(--colors-text-muted)",
                marginBottom: "6px",
              }}
            >
              <span>Marginal rate curve</span>
              <strong style={{ color: "var(--colors-status-danger-text)" }}>
                60% zone (£100k–£125k)
              </strong>
            </div>
            <div style={{ display: "flex", alignItems: "flex-end", height: "30px", gap: "8px" }}>
              <div
                style={{
                  height: "40%",
                  width: "25%",
                  backgroundColor: "#38bdf8",
                  borderRadius: "2px",
                }}
                title="20% Basic"
              />
              <div
                style={{
                  height: "70%",
                  width: "35%",
                  backgroundColor: "#6363f1",
                  borderRadius: "2px",
                }}
                title="40% Higher"
              />
              <div
                style={{
                  height: "100%",
                  width: "20%",
                  backgroundColor: "#ef4444",
                  borderRadius: "2px",
                }}
                title="60% Trap"
              />
              <div
                style={{
                  height: "80%",
                  width: "20%",
                  backgroundColor: "#6363f1",
                  borderRadius: "2px",
                }}
                title="45% Additional"
              />
            </div>
          </div>
        </div>

        {/* Pillar 3: Mortgage */}
        <div className={bentoCardStyle}>
          <div
            style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}
          >
            <div className={iconBoxStyle("rgba(245, 158, 11, 0.12)", "#f59e0b")}>
              <FiHome />
            </div>
            <span
              style={{
                fontSize: "12px",
                fontWeight: "600",
                color: "var(--colors-status-warning-text)",
                fontFamily: "var(--fonts-mono, monospace)",
              }}
            >
              Mortgages
            </span>
          </div>

          <div>
            <h3
              style={{
                fontSize: "1.35rem",
                fontWeight: "700",
                color: "var(--colors-text-primary, #0f172a)",
                fontFamily: "var(--fonts-display, sans-serif)",
                margin: "0 0 6px 0",
              }}
            >
              Mortgage and property equity
            </h3>
            <p
              style={{
                fontSize: "14px",
                color: "var(--colors-text-secondary, #475569)",
                margin: 0,
                lineHeight: "1.5",
              }}
            >
              Simulate monthly overpayments against Stocks and Shares ISA compound returns.
            </p>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            <span className={pillChip}>Overpay vs ISA</span>
            <span className={pillChip}>Fixed-rate renewal shock</span>
            <span className={pillChip}>LTV thresholds</span>
          </div>

          {/* Code-driven SVG Micro-Diagram */}
          <div
            role="img"
            aria-label="Overpayment interest savings comparison bar"
            style={{
              marginTop: "auto",
              padding: "12px",
              borderRadius: "10px",
              backgroundColor: "var(--colors-surface-subtle)",
              border: "1px solid var(--colors-border)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "11px",
                color: "var(--colors-text-muted)",
                marginBottom: "6px",
              }}
            >
              <span>Term shortened</span>
              <strong style={{ color: "var(--colors-status-warning-text)" }}>
                -4 years 2 months
              </strong>
            </div>
            <div
              style={{
                height: "8px",
                width: "100%",
                backgroundColor: "var(--colors-border)",
                borderRadius: "999px",
                overflow: "hidden",
                display: "flex",
              }}
            >
              <div style={{ width: "75%", backgroundColor: "#f59e0b" }} />
              <div style={{ width: "25%", backgroundColor: "#10b981" }} />
            </div>
          </div>
        </div>

        {/* Pillar 4: Safe to spend & Runway */}
        <div className={bentoCardStyle}>
          <div
            style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}
          >
            <div className={iconBoxStyle("rgba(16, 185, 129, 0.12)", "#10b981")}>
              <FiTrendingUp />
            </div>
            <span
              style={{
                fontSize: "12px",
                fontWeight: "600",
                color: "var(--colors-status-positive-text)",
                fontFamily: "var(--fonts-mono, monospace)",
              }}
            >
              Cashflow
            </span>
          </div>

          <div>
            <h3
              style={{
                fontSize: "1.35rem",
                fontWeight: "700",
                color: "var(--colors-text-primary, #0f172a)",
                fontFamily: "var(--fonts-display, sans-serif)",
                margin: "0 0 6px 0",
              }}
            >
              Safe to spend and emergency runway
            </h3>
            <p
              style={{
                fontSize: "14px",
                color: "var(--colors-text-secondary, #475569)",
                margin: 0,
                lineHeight: "1.5",
              }}
            >
              Estimate your weekly allowance after ring-fencing fixed bills and emergency savings.
            </p>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            <span className={pillChip}>Safe to spend / week</span>
            <span className={pillChip}>Emergency runway</span>
            <span className={pillChip}>Fixed vs flexible bills</span>
          </div>

          {/* Code-driven SVG Micro-Diagram */}
          <div
            role="img"
            aria-label="Emergency runway multi-tier gauge"
            style={{
              marginTop: "auto",
              padding: "12px",
              borderRadius: "10px",
              backgroundColor: "var(--colors-surface-subtle)",
              border: "1px solid var(--colors-border)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "11px",
                color: "var(--colors-text-muted)",
                marginBottom: "6px",
              }}
            >
              <span>Emergency runway</span>
              <strong className={positiveFigureStyle}>Example: 6.4 months</strong>
            </div>
            <div style={{ display: "flex", gap: "4px", height: "8px" }}>
              <div style={{ flex: 1, backgroundColor: "#10b981", borderRadius: "2px" }} />
              <div style={{ flex: 1, backgroundColor: "#10b981", borderRadius: "2px" }} />
              <div style={{ flex: 1, backgroundColor: "#10b981", borderRadius: "2px" }} />
              <div style={{ flex: 1, backgroundColor: "#10b981", borderRadius: "2px" }} />
              <div
                style={{ flex: 1, backgroundColor: "var(--colors-border)", borderRadius: "2px" }}
              />
              <div
                style={{ flex: 1, backgroundColor: "var(--colors-border)", borderRadius: "2px" }}
              />
            </div>
          </div>
        </div>
      </div>
    </SectionBand>
  );
};

export default FeaturePillars;
