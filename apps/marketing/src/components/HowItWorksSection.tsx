import { SectionBand } from "@repo/ui";
import { css } from "@repo/ui/styled-system/css";
import { grid } from "@repo/ui/styled-system/patterns";
import type { FC } from "react";
import { FiCheckCircle, FiEdit3, FiLayers, FiSliders } from "react-icons/fi";

const stepCardStyle = css({
  backgroundColor: "card",
  border: "1px solid",
  borderColor: "border",
  borderRadius: "2xl",
  p: "6",
  display: "flex",
  flexDirection: "column",
  gap: "14px",
  boxShadow: "card",
  position: "relative",
  overflow: "hidden",
  transition: "transform 0.2s ease, box-shadow 0.2s ease",
  _hover: {
    transform: "translateY(-3px)",
    boxShadow: "cardHover",
  },
});

const stepNumberBadge = css({
  fontSize: "xs",
  fontWeight: "600",
  letterSpacing: "0.01em",
  color: "primary",
  backgroundColor: "surface.tinted",
  padding: "4px 10px",
  borderRadius: "full",
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  width: "fit-content",
  fontFamily: "var(--fonts-mono, monospace)",
});

const chipTagStyle = css({
  fontSize: "xs",
  fontWeight: "500",
  padding: "2px 8px",
  borderRadius: "md",
  backgroundColor: "surface.subtle",
  color: "text.secondary",
});

export const HowItWorksSection: FC = () => {
  return (
    <SectionBand
      id="how-it-works"
      tone="subtle"
      indexBadge="How it works"
      title="How Flump works in 3 simple steps"
      subtitle="Skip weeks of spreadsheet configuration. Start with rough numbers in under a minute, then add detail only where you choose."
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
                color: "var(--colors-status-positive-text)",
                fontWeight: "600",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <FiCheckCircle size={13} /> No bank login
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
            Enter 6 rough numbers
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
            aria-label="Schematic diagram showing 6 simple inputs"
            style={{
              marginTop: "auto",
              padding: "12px",
              borderRadius: "8px",
              backgroundColor: "var(--colors-surface-subtle)",
              border: "1px dashed var(--colors-border)",
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
              <FiCheckCircle size={13} /> UK tax rules
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
            See your numbers immediately
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
            <span className={chipTagStyle}>Net worth</span>
            <span className={chipTagStyle}>Safe to spend</span>
            <span className={chipTagStyle}>Emergency runway</span>
            <span className={chipTagStyle}>Take-home pay</span>
          </div>

          {/* Mini Visual Schematic */}
          <div
            role="img"
            aria-label="Schematic diagram showing metric dashboard cards"
            style={{
              marginTop: "auto",
              padding: "10px",
              borderRadius: "8px",
              backgroundColor: "var(--colors-surface-subtle)",
              border: "1px dashed var(--colors-border)",
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "6px",
            }}
          >
            <div
              style={{
                padding: "6px",
                borderRadius: "4px",
                backgroundColor: "var(--colors-card, var(--colors-surface))",
                border: "1px solid var(--colors-border)",
              }}
            >
              <div style={{ fontSize: "10px", color: "var(--colors-text-muted)" }}>Net worth</div>
              <div
                style={{
                  fontSize: "12px",
                  fontWeight: "bold",
                  color: "var(--colors-status-positive-text)",
                }}
              >
                £68.4k
              </div>
            </div>
            <div
              style={{
                padding: "6px",
                borderRadius: "4px",
                backgroundColor: "var(--colors-card, var(--colors-surface))",
                border: "1px solid var(--colors-border)",
              }}
            >
              <div style={{ fontSize: "10px", color: "var(--colors-text-muted)" }}>Safe/wk</div>
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
              <FiCheckCircle size={13} /> Customised
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
            Drill down when you need to
          </h3>

          <p
            style={{
              fontSize: "14px",
              color: "var(--colors-text-secondary, #475569)",
              margin: 0,
              lineHeight: "1.5",
            }}
          >
            Explore individual tools for mortgage overpayments, the £100k tax trap, or debt payoff
            at your own pace.
          </p>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "4px" }}>
            <span className={chipTagStyle}>£100k tax trap</span>
            <span className={chipTagStyle}>Mortgage overpayment</span>
            <span className={chipTagStyle}>Debt payoff</span>
          </div>

          {/* Mini Visual Schematic */}
          <div
            role="img"
            aria-label="Schematic diagram showing deep-dive tools"
            style={{
              marginTop: "auto",
              padding: "10px",
              borderRadius: "8px",
              backgroundColor: "var(--colors-surface-subtle)",
              border: "1px dashed var(--colors-border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-around",
            }}
          >
            <span style={{ fontSize: "11px", fontWeight: "700", color: "#6363f1" }}>Tax Trap</span>
            <span style={{ color: "#94a3b8" }}>•</span>
            <span
              style={{
                fontSize: "11px",
                fontWeight: "700",
                color: "var(--colors-status-warning-text)",
              }}
            >
              Mortgage
            </span>
            <span style={{ color: "#94a3b8" }}>•</span>
            <span
              style={{
                fontSize: "11px",
                fontWeight: "700",
                color: "var(--colors-status-danger-text)",
              }}
            >
              Avalanche
            </span>
          </div>
        </div>
      </div>
    </SectionBand>
  );
};
