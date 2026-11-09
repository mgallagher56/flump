import { css } from "@repo/ui/styled-system/css";
import { grid } from "@repo/ui/styled-system/patterns";
import type { FC } from "react";
import { FiArrowRight, FiCheckCircle, FiEdit3, FiSliders } from "react-icons/fi";

const containerStyle = css({
  maxWidth: "6xl",
  mx: "auto",
  py: "16",
  px: "4",
});

const stepCardStyle = css({
  backgroundColor: { base: "#ffffff", _dark: "dark.surface" },
  border: "1px solid",
  borderColor: { base: "slate.200", _dark: "slate.800" },
  borderRadius: "2xl",
  p: "6",
  display: "flex",
  flexDirection: "column",
  gap: "12px",
  boxShadow: { base: "0 4px 16px rgba(0,0,0,0.03)", _dark: "0 4px 16px rgba(0,0,0,0.2)" },
  position: "relative",
  overflow: "hidden",
});

const stepNumberBadge = css({
  fontSize: "12px",
  fontWeight: "800",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: "#6363f1",
  backgroundColor: "rgba(99, 102, 241, 0.12)",
  padding: "4px 10px",
  borderRadius: "full",
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  width: "fit-content",
});

export const HowItWorksSection: FC = () => {
  return (
    <section className={containerStyle} data-testid="how-it-works-section">
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
          Maximum Value, Minimum Effort
        </span>
        <h2
          style={{
            fontSize: "clamp(2rem, 3.5vw, 2.75rem)",
            fontWeight: "800",
            color: "var(--colors-text-primary, #0f172a)",
            marginTop: "8px",
          }}
        >
          How Flump Works in 3 Simple Steps
        </h2>
        <p
          style={{
            fontSize: "1.1rem",
            color: "var(--colors-text-muted, #64748b)",
            maxWidth: "620px",
            margin: "12px auto 0",
          }}
        >
          Skip weeks of spreadsheet configuration. Start with rough numbers in under a minute, then
          add granular detail only where you choose.
        </p>
      </div>

      <div className={grid({ columns: { base: 1, md: 3 }, gap: "6" })}>
        {/* Step 1 */}
        <div className={stepCardStyle}>
          <span className={stepNumberBadge}>
            <FiEdit3 size={13} /> Step 1 · 60 Seconds
          </span>
          <h3
            style={{
              fontSize: "1.25rem",
              fontWeight: "700",
              color: "var(--colors-text-primary, #0f172a)",
            }}
          >
            Enter 6 Rough Numbers
          </h3>
          <p
            style={{
              fontSize: "14px",
              color: "var(--colors-text-muted, #64748b)",
              lineHeight: "1.6",
            }}
          >
            Income, housing, general outgoings, cash savings, pension, and debt. No bank logins,
            passwords, or CSV imports needed.
          </p>
          <div
            style={{
              marginTop: "auto",
              paddingTop: "12px",
              fontSize: "12px",
              color: "#10b981",
              fontWeight: "600",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <FiCheckCircle size={14} /> Zero setup friction
          </div>
        </div>

        {/* Step 2 */}
        <div className={stepCardStyle}>
          <span className={stepNumberBadge}>
            <FiSliders size={13} /> Step 2 · Instant
          </span>
          <h3
            style={{
              fontSize: "1.25rem",
              fontWeight: "700",
              color: "var(--colors-text-primary, #0f172a)",
            }}
          >
            Unlock Instant UK Insights
          </h3>
          <p
            style={{
              fontSize: "14px",
              color: "var(--colors-text-muted, #64748b)",
              lineHeight: "1.6",
            }}
          >
            Immediately view your true Net Worth, weekly Safe-to-Spend allowance, emergency survival
            runway, and UK take-home pay breakdown.
          </p>
          <div
            style={{
              marginTop: "auto",
              paddingTop: "12px",
              fontSize: "12px",
              color: "#6363f1",
              fontWeight: "600",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <FiCheckCircle size={14} /> Built-in HMRC & NI rules
          </div>
        </div>

        {/* Step 3 */}
        <div className={stepCardStyle}>
          <span className={stepNumberBadge}>
            <FiArrowRight size={13} /> Step 3 · On Your Schedule
          </span>
          <h3
            style={{
              fontSize: "1.25rem",
              fontWeight: "700",
              color: "var(--colors-text-primary, #0f172a)",
            }}
          >
            Drill Down When You Want
          </h3>
          <p
            style={{
              fontSize: "14px",
              color: "var(--colors-text-muted, #64748b)",
              lineHeight: "1.6",
            }}
          >
            Want to crush a credit card, simulate mortgage overpayments, or escape the £100k tax
            trap? Add granular detail to individual modules whenever you're ready.
          </p>
          <div
            style={{
              marginTop: "auto",
              paddingTop: "12px",
              fontSize: "12px",
              color: "#0ea5e9",
              fontWeight: "600",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <FiCheckCircle size={14} /> Progressive depth, no overwhelm
          </div>
        </div>
      </div>
    </section>
  );
};
