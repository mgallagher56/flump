import { SectionBand } from "@repo/ui";
import { css } from "@repo/ui/styled-system/css";
import { grid } from "@repo/ui/styled-system/patterns";
import type { FC } from "react";
import { FiCheckCircle, FiEdit3, FiLayers, FiSliders } from "react-icons/fi";

const stepCardStyle = css({
  backgroundColor: { base: "#ffffff", _dark: "dark.surface" },
  border: "1px solid",
  borderColor: { base: "slate.200", _dark: "dark.border" },
  borderRadius: "2xl",
  p: "6",
  display: "flex",
  flexDirection: "column",
  gap: "14px",
  boxShadow: {
    base: "0 1px 3px rgba(15,23,42,0.04), 0 6px 16px rgba(15,23,42,0.04)",
    _dark: "inset 0 1px 0 rgba(255,255,255,0.06), 0 8px 24px rgba(0,0,0,0.35)",
  },
  position: "relative",
  overflow: "hidden",
  transition: "transform 0.2s ease, box-shadow 0.2s ease",
  _hover: {
    transform: "translateY(-3px)",
    boxShadow: {
      base: "0 12px 28px rgba(15,23,42,0.08)",
      _dark: "inset 0 1px 0 rgba(255,255,255,0.1), 0 16px 32px rgba(0,0,0,0.45)",
    },
  },
});

const stepNumberBadge = css({
  fontSize: "xs",
  fontWeight: "800",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  color: "primary",
  backgroundColor: "rgba(99, 102, 241, 0.12)",
  padding: "4px 10px",
  borderRadius: "full",
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  width: "fit-content",
  fontFamily: "var(--fonts-mono, monospace)",
});

const chipTagStyle = css({
  fontSize: "12px",
  fontWeight: "500",
  padding: "2px 8px",
  borderRadius: "md",
  backgroundColor: { base: "slate.100", _dark: "slate.800" },
  color: { base: "slate.700", _dark: "slate.300" },
});

export const HowItWorksSection: FC = () => {
  return (
    <SectionBand
      id="how-it-works"
      tone="subtle"
      indexBadge="01 // HOW IT WORKS"
      title="How Flump Works in 3 Simple Steps"
      subtitle="Skip weeks of spreadsheet configuration. Start with rough numbers in under a minute, then add granular detail only where you choose."
    >
      <div
        className={grid({ columns: { base: 1, md: 3 }, gap: "6" })}
        data-testid="how-it-works-section"
      >
        {/* Step 1 */}
        <div className={stepCardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className={stepNumberBadge}>
              <FiEdit3 size={13} /> Step 1 · 60s
            </span>
            <span
              style={{
                fontSize: "12px",
                color: "#10b981",
                fontWeight: "600",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <FiCheckCircle size={13} /> Zero Friction
            </span>
          </div>

          <h3
            style={{
              fontSize: "1.25rem",
              fontWeight: "700",
              color: "var(--colors-text-primary, #0f172a)",
              fontFamily: "var(--fonts-display, sans-serif)",
              margin: 0,
            }}
          >
            Enter 6 Rough Numbers
          </h3>

          <p
            style={{
              fontSize: "14px",
              color: "var(--colors-text-secondary, #475569)",
              margin: 0,
              lineHeight: "1.5",
            }}
          >
            Input your top-level estimates without bank logins, passwords, or CSV imports.
          </p>

          {/* Micro-Chips instead of text blocks */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "4px" }}>
            <span className={chipTagStyle}>Salary</span>
            <span className={chipTagStyle}>Housing</span>
            <span className={chipTagStyle}>Outgoings</span>
            <span className={chipTagStyle}>Savings</span>
            <span className={chipTagStyle}>Pension</span>
            <span className={chipTagStyle}>Debt</span>
          </div>

          {/* Mini Visual Schematic */}
          <div
            role="img"
            aria-label="Schematic diagram showing 6 simple sliders"
            style={{
              marginTop: "auto",
              padding: "12px",
              borderRadius: "8px",
              backgroundColor: "var(--colors-slate-50, #f8fafc)",
              border: "1px dashed var(--colors-border, #e2e8f0)",
              display: "flex",
              flexDirection: "column",
              gap: "6px",
            }}
          >
            <div
              style={{
                height: "6px",
                width: "85%",
                borderRadius: "999px",
                backgroundColor: "#6363f1",
              }}
            />
            <div
              style={{
                height: "6px",
                width: "60%",
                borderRadius: "999px",
                backgroundColor: "#10b981",
              }}
            />
            <div
              style={{
                height: "6px",
                width: "40%",
                borderRadius: "999px",
                backgroundColor: "#0ea5e9",
              }}
            />
          </div>
        </div>

        {/* Step 2 */}
        <div className={stepCardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className={stepNumberBadge}>
              <FiSliders size={13} /> Step 2 · Instant
            </span>
            <span
              style={{
                fontSize: "12px",
                color: "var(--colors-primary, #6363f1)",
                fontWeight: "600",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <FiCheckCircle size={13} /> UK HMRC Rules
            </span>
          </div>

          <h3
            style={{
              fontSize: "1.25rem",
              fontWeight: "700",
              color: "var(--colors-text-primary, #0f172a)",
              fontFamily: "var(--fonts-display, sans-serif)",
              margin: 0,
            }}
          >
            Unlock Instant UK Insights
          </h3>

          <p
            style={{
              fontSize: "14px",
              color: "var(--colors-text-secondary, #475569)",
              margin: 0,
              lineHeight: "1.5",
            }}
          >
            Get your comprehensive baseline dashboard calculated immediately.
          </p>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "4px" }}>
            <span className={chipTagStyle}>Net Worth</span>
            <span className={chipTagStyle}>Safe-to-Spend</span>
            <span className={chipTagStyle}>Runway</span>
            <span className={chipTagStyle}>Take-Home</span>
          </div>

          {/* Mini Visual Schematic */}
          <div
            role="img"
            aria-label="Schematic diagram showing metric dashboard cards"
            style={{
              marginTop: "auto",
              padding: "10px",
              borderRadius: "8px",
              backgroundColor: "var(--colors-slate-50, #f8fafc)",
              border: "1px dashed var(--colors-border, #e2e8f0)",
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "6px",
            }}
          >
            <div
              style={{
                padding: "6px",
                borderRadius: "4px",
                backgroundColor: "#ffffff",
                border: "1px solid #e2e8f0",
              }}
            >
              <div style={{ fontSize: "10px", color: "#64748b" }}>NET WORTH</div>
              <div style={{ fontSize: "12px", fontWeight: "bold", color: "#10b981" }}>£68.4k</div>
            </div>
            <div
              style={{
                padding: "6px",
                borderRadius: "4px",
                backgroundColor: "#ffffff",
                border: "1px solid #e2e8f0",
              }}
            >
              <div style={{ fontSize: "10px", color: "#64748b" }}>SAFE/WK</div>
              <div style={{ fontSize: "12px", fontWeight: "bold", color: "#0ea5e9" }}>£195</div>
            </div>
          </div>
        </div>

        {/* Step 3 */}
        <div className={stepCardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className={stepNumberBadge}>
              <FiLayers size={13} /> Step 3 · On Demand
            </span>
            <span
              style={{
                fontSize: "12px",
                color: "#0ea5e9",
                fontWeight: "600",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <FiCheckCircle size={13} /> Progressive
            </span>
          </div>

          <h3
            style={{
              fontSize: "1.25rem",
              fontWeight: "700",
              color: "var(--colors-text-primary, #0f172a)",
              fontFamily: "var(--fonts-display, sans-serif)",
              margin: 0,
            }}
          >
            Drill Down When You Want
          </h3>

          <p
            style={{
              fontSize: "14px",
              color: "var(--colors-text-secondary, #475569)",
              margin: 0,
              lineHeight: "1.5",
            }}
          >
            Add granular detail to individual calculation engines without feeling overwhelmed.
          </p>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "4px" }}>
            <span className={chipTagStyle}>£100k Tax Trap</span>
            <span className={chipTagStyle}>Mortgage Overpay</span>
            <span className={chipTagStyle}>Debt Avalanche</span>
          </div>

          {/* Mini Visual Schematic */}
          <div
            role="img"
            aria-label="Schematic diagram showing deep-dive tools"
            style={{
              marginTop: "auto",
              padding: "10px",
              borderRadius: "8px",
              backgroundColor: "var(--colors-slate-50, #f8fafc)",
              border: "1px dashed var(--colors-border, #e2e8f0)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-around",
            }}
          >
            <span style={{ fontSize: "11px", fontWeight: "700", color: "#6363f1" }}>Tax Trap</span>
            <span style={{ color: "#94a3b8" }}>•</span>
            <span style={{ fontSize: "11px", fontWeight: "700", color: "#f59e0b" }}>Mortgage</span>
            <span style={{ color: "#94a3b8" }}>•</span>
            <span style={{ fontSize: "11px", fontWeight: "700", color: "#ef4444" }}>Avalanche</span>
          </div>
        </div>
      </div>
    </SectionBand>
  );
};
