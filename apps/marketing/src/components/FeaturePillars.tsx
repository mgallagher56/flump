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
            color: "#6363f1",
          }}
        >
          Engineered for the UK Financial Reality
        </span>
        <h2
          style={{
            fontSize: "2.25rem",
            fontWeight: "800",
            color: "var(--colors-text-primary, #0f172a)",
            marginTop: "8px",
          }}
        >
          Four Pillars to Master Your Money
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
            Debt Crusher & Snowball
          </h3>
          <p
            style={{
              fontSize: "14px",
              color: "var(--colors-text-muted, #64748b)",
              lineHeight: "1.6",
            }}
          >
            Crush UK credit cards, overdraft fees, and balloon payments with mathematical precision
            using Avalanche or Snowball prioritization.
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
            UK HMRC Tax Engine
          </h3>
          <p
            style={{
              fontSize: "14px",
              color: "var(--colors-text-muted, #64748b)",
              lineHeight: "1.6",
            }}
          >
            Navigate the £100k Personal Allowance taper, preserve 30 hours of funded childcare, and
            optimize pension salary sacrifice.
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
            Mortgage & Section 24
          </h3>
          <p
            style={{
              fontSize: "14px",
              color: "var(--colors-text-muted, #64748b)",
              lineHeight: "1.6",
            }}
          >
            Simulate overpayments against S&S ISA compounding, track fixed-rate expiry cliffs, and
            model Section 24 restrictions for landlords.
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
            Safe-to-Spend Runway
          </h3>
          <p
            style={{
              fontSize: "14px",
              color: "var(--colors-text-muted, #64748b)",
              lineHeight: "1.6",
            }}
          >
            Calculate exactly how much discretionary cash you can spend this month without
            compromising your emergency runway or retirement target.
          </p>
        </div>
      </div>
    </section>
  );
};
