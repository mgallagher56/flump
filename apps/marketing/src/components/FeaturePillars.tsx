import { css } from "@repo/ui/styled-system/css";
import { grid } from "@repo/ui/styled-system/patterns";
import type { FC } from "react";
import { FiDollarSign, FiHome, FiPercent, FiTrendingUp } from "react-icons/fi";

const containerStyle = css({
  maxWidth: "6xl",
  mx: "auto",
  py: "16",
  px: "4",
});

const cardStyle = css({
  backgroundColor: { base: "#ffffff", _dark: "dark.surface" },
  border: "1px solid",
  borderColor: { base: "slate.200", _dark: "slate.800" },
  borderRadius: "xl",
  p: "6",
  boxShadow: { base: "0 4px 16px rgba(0,0,0,0.03)", _dark: "0 4px 16px rgba(0,0,0,0.2)" },
  transition: "transform 0.2s ease, box-shadow 0.2s ease",
  _hover: {
    transform: "translateY(-4px)",
    boxShadow: { base: "0 12px 28px rgba(0,0,0,0.06)", _dark: "0 12px 28px rgba(0,0,0,0.3)" },
  },
});

const iconBoxStyle = (bg: string, color: string) =>
  css({
    width: "44px",
    height: "44px",
    borderRadius: "12px",
    backgroundColor: bg,
    color: color,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "20px",
    mb: "4",
  });

export const FeaturePillars: FC = () => {
  return (
    <section className={containerStyle}>
      <div style={{ textAlign: "center", marginBottom: "40px" }}>
        <span
          style={{
            fontSize: "12px",
            fontWeight: "700",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: "#6363f1",
          }}
        >
          Core Capabilities
        </span>
        <h2
          style={{
            fontSize: "2.25rem",
            fontWeight: "800",
            color: "var(--colors-text-primary, #0f172a)",
            marginTop: "8px",
          }}
        >
          Four Pillars of Your Financial Plan
        </h2>
      </div>

      <div className={grid({ columns: { base: 1, sm: 2, lg: 4 }, gap: "6" })}>
        {/* Pillar 1 */}
        <div className={cardStyle}>
          <div className={iconBoxStyle("#fee2e2", "#ef4444")}>
            <FiDollarSign />
          </div>
          <h3
            style={{
              fontSize: "1.2rem",
              fontWeight: "700",
              color: "var(--colors-text-primary, #0f172a)",
              marginBottom: "8px",
            }}
          >
            Debt & Repayment Strategies
          </h3>
          <p
            style={{
              fontSize: "14px",
              color: "var(--colors-text-muted, #64748b)",
              lineHeight: "1.6",
            }}
          >
            Compare Avalanche and Snowball payoff timelines for credit cards, overdrafts, and
            personal loans to eliminate interest faster.
          </p>
        </div>

        {/* Pillar 2 */}
        <div className={cardStyle}>
          <div className={iconBoxStyle("#dbeafe", "#2563eb")}>
            <FiPercent />
          </div>
          <h3
            style={{
              fontSize: "1.2rem",
              fontWeight: "700",
              color: "var(--colors-text-primary, #0f172a)",
              marginBottom: "8px",
            }}
          >
            UK Tax & Pension Planning
          </h3>
          <p
            style={{
              fontSize: "14px",
              color: "var(--colors-text-muted, #64748b)",
              lineHeight: "1.6",
            }}
          >
            Navigate the £100k Personal Allowance taper, protect 30 hours funded childcare, and
            model pension salary sacrifice benefits.
          </p>
        </div>

        {/* Pillar 3 */}
        <div className={cardStyle}>
          <div className={iconBoxStyle("#fef3c7", "#d97706")}>
            <FiHome />
          </div>
          <h3
            style={{
              fontSize: "1.2rem",
              fontWeight: "700",
              color: "var(--colors-text-primary, #0f172a)",
              marginBottom: "8px",
            }}
          >
            Mortgage & Property Equity
          </h3>
          <p
            style={{
              fontSize: "14px",
              color: "var(--colors-text-muted, #64748b)",
              lineHeight: "1.6",
            }}
          >
            Simulate mortgage overpayments against Stocks & Shares ISA investing, track fixed-rate
            renewal dates, and monitor your equity growth.
          </p>
        </div>

        {/* Pillar 4 */}
        <div className={cardStyle}>
          <div className={iconBoxStyle("#d1fae5", "#059669")}>
            <FiTrendingUp />
          </div>
          <h3
            style={{
              fontSize: "1.2rem",
              fontWeight: "700",
              color: "var(--colors-text-primary, #0f172a)",
              marginBottom: "8px",
            }}
          >
            Discretionary Surplus & Runway
          </h3>
          <p
            style={{
              fontSize: "14px",
              color: "var(--colors-text-muted, #64748b)",
              lineHeight: "1.6",
            }}
          >
            See exactly what is safe to spend each month after housing, committed bills, and
            scheduled savings goals are accounted for.
          </p>
        </div>
      </div>
    </section>
  );
};
