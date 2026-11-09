import { SectionBand } from "@repo/ui";
import { css } from "@repo/ui/styled-system/css";
import { grid } from "@repo/ui/styled-system/patterns";
import type { FC } from "react";
import { FiDollarSign, FiHome, FiPercent, FiTrendingUp } from "react-icons/fi";

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
      indexBadge="02 // FOUR PILLARS"
      title="Four Pillars of Your Financial Plan"
      subtitle="Engineered for UK specific tax laws, personal allowance thresholds, and interest rate realities."
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
                fontWeight: "700",
                color: "#ef4444",
                fontFamily: "var(--fonts-mono, monospace)",
              }}
            >
              STAGE 1 FOCUS
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
              Debt & Repayment Strategies
            </h3>
            <p
              style={{
                fontSize: "14px",
                color: "var(--colors-text-secondary, #475569)",
                margin: 0,
                lineHeight: "1.5",
              }}
            >
              Accelerate debt freedom by comparing Avalanche and Snowball schedules with promotional
              cliff alerts.
            </p>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            <span className={pillChip}>Avalanche vs Snowball</span>
            <span className={pillChip}>0% Balance Transfer Cliffs</span>
            <span className={pillChip}>39.9% Overdraft Traps</span>
          </div>

          {/* Code-driven SVG Micro-Diagram */}
          <div
            role="img"
            aria-label="Avalanche payoff curve vs Minimum payments curve diagram"
            style={{
              marginTop: "auto",
              padding: "12px",
              borderRadius: "10px",
              backgroundColor: "var(--colors-slate-50, #f8fafc)",
              border: "1px solid var(--colors-border, #e2e8f0)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "11px",
                color: "#64748b",
                marginBottom: "6px",
              }}
            >
              <span>Payoff Trajectory</span>
              <strong style={{ color: "#10b981" }}>-£1,420 Interest Saved</strong>
            </div>
            <svg
              viewBox="0 0 280 40"
              style={{ width: "100%", height: "40px", overflow: "visible" }}
            >
              {/* Minimum line */}
              <path
                d="M 0 10 Q 140 25 280 35"
                fill="none"
                stroke="#94a3b8"
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
                fontWeight: "700",
                color: "var(--colors-primary, #6363f1)",
                fontFamily: "var(--fonts-mono, monospace)",
              }}
            >
              HMRC RULES
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
              UK Tax & Pension Planning
            </h3>
            <p
              style={{
                fontSize: "14px",
                color: "var(--colors-text-secondary, #475569)",
                margin: 0,
                lineHeight: "1.5",
              }}
            >
              Navigate the £100k Personal Allowance taper and calculate salary sacrifice NI savings.
            </p>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            <span className={pillChip}>60% Tax Trap Radar</span>
            <span className={pillChip}>30h Free Childcare</span>
            <span className={pillChip}>Salary Sacrifice</span>
          </div>

          {/* Code-driven SVG Micro-Diagram: £100k Cliff */}
          <div
            role="img"
            aria-label="UK Income tax marginal rate diagram showing 60% trap"
            style={{
              marginTop: "auto",
              padding: "12px",
              borderRadius: "10px",
              backgroundColor: "var(--colors-slate-50, #f8fafc)",
              border: "1px solid var(--colors-border, #e2e8f0)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "11px",
                color: "#64748b",
                marginBottom: "6px",
              }}
            >
              <span>Marginal Rate Curve</span>
              <strong style={{ color: "#ef4444" }}>60% Zone (£100k–£125k)</strong>
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
                fontWeight: "700",
                color: "#f59e0b",
                fontFamily: "var(--fonts-mono, monospace)",
              }}
            >
              PROPERTY EQUITY
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
              Mortgage & Property Equity
            </h3>
            <p
              style={{
                fontSize: "14px",
                color: "var(--colors-text-secondary, #475569)",
                margin: 0,
                lineHeight: "1.5",
              }}
            >
              Simulate monthly overpayments against Stocks & Shares ISA compound returns.
            </p>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            <span className={pillChip}>Overpay vs S&S ISA</span>
            <span className={pillChip}>Fixed-Rate Renewal Shock</span>
            <span className={pillChip}>LTV Thresholds</span>
          </div>

          {/* Code-driven SVG Micro-Diagram */}
          <div
            role="img"
            aria-label="Overpayment interest savings comparison bar"
            style={{
              marginTop: "auto",
              padding: "12px",
              borderRadius: "10px",
              backgroundColor: "var(--colors-slate-50, #f8fafc)",
              border: "1px solid var(--colors-border, #e2e8f0)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "11px",
                color: "#64748b",
                marginBottom: "6px",
              }}
            >
              <span>Term Shortened</span>
              <strong style={{ color: "#f59e0b" }}>-4 Years 2 Months</strong>
            </div>
            <div
              style={{
                height: "8px",
                width: "100%",
                backgroundColor: "#e2e8f0",
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

        {/* Pillar 4: Safe-to-Spend & Runway */}
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
                fontWeight: "700",
                color: "#10b981",
                fontFamily: "var(--fonts-mono, monospace)",
              }}
            >
              CASHFLOW CONTROL
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
              Discretionary Surplus & Runway
            </h3>
            <p
              style={{
                fontSize: "14px",
                color: "var(--colors-text-secondary, #475569)",
                margin: 0,
                lineHeight: "1.5",
              }}
            >
              Know your exact guilt-free weekly allowance after ring-fencing priority obligations.
            </p>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            <span className={pillChip}>Safe-to-Spend / Wk</span>
            <span className={pillChip}>Emergency Runway Gauge</span>
            <span className={pillChip}>Priority vs Flexible</span>
          </div>

          {/* Code-driven SVG Micro-Diagram */}
          <div
            role="img"
            aria-label="Emergency runway multi-tier gauge"
            style={{
              marginTop: "auto",
              padding: "12px",
              borderRadius: "10px",
              backgroundColor: "var(--colors-slate-50, #f8fafc)",
              border: "1px solid var(--colors-border, #e2e8f0)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "11px",
                color: "#64748b",
                marginBottom: "6px",
              }}
            >
              <span>Survival Runway</span>
              <strong style={{ color: "#10b981" }}>6.4 Months (Target Met)</strong>
            </div>
            <div style={{ display: "flex", gap: "4px", height: "8px" }}>
              <div style={{ flex: 1, backgroundColor: "#10b981", borderRadius: "2px" }} />
              <div style={{ flex: 1, backgroundColor: "#10b981", borderRadius: "2px" }} />
              <div style={{ flex: 1, backgroundColor: "#10b981", borderRadius: "2px" }} />
              <div style={{ flex: 1, backgroundColor: "#10b981", borderRadius: "2px" }} />
              <div style={{ flex: 1, backgroundColor: "#e2e8f0", borderRadius: "2px" }} />
              <div style={{ flex: 1, backgroundColor: "#e2e8f0", borderRadius: "2px" }} />
            </div>
          </div>
        </div>
      </div>
    </SectionBand>
  );
};
