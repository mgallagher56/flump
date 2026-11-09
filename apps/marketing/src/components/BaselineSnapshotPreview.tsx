import { css } from "@repo/ui/styled-system/css";
import type { FC } from "react";
import { FiArrowUpRight, FiCheckCircle, FiShield } from "react-icons/fi";

const previewCardContainer = css({
  backgroundColor: { base: "#ffffff", _dark: "dark.surface" },
  border: "1px solid",
  borderColor: { base: "slate.200", _dark: "dark.border" },
  borderRadius: "2xl",
  boxShadow: {
    base: "0 1px 3px rgba(15,23,42,0.04), 0 20px 45px rgba(15, 23, 42, 0.08)",
    _dark: "inset 0 1px 0 rgba(255,255,255,0.08), 0 20px 45px rgba(0, 0, 0, 0.5)",
  },
  maxWidth: "820px",
  margin: "0 auto",
  textAlign: "left",
  overflow: "hidden",
});

const headerBarStyle = css({
  padding: "16px 24px",
  backgroundColor: { base: "slate.50", _dark: "dark.subtle" },
  borderBottom: "1px solid",
  borderColor: { base: "slate.200", _dark: "dark.border" },
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  flexWrap: "wrap",
  gap: "12px",
});

const pillBadgeStyle = css({
  fontSize: "xs",
  fontWeight: "700",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  color: "primary",
  backgroundColor: "rgba(99, 102, 241, 0.12)",
  padding: "4px 12px",
  borderRadius: "full",
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
});

const metricsGridStyle = css({
  display: "grid",
  gridTemplateColumns: { base: "repeat(2, 1fr)", md: "repeat(4, 1fr)" },
  gap: "1px",
  backgroundColor: { base: "slate.200", _dark: "dark.border" },
  borderBottom: "1px solid",
  borderColor: { base: "slate.200", _dark: "dark.border" },
});

const metricItemStyle = css({
  backgroundColor: { base: "#ffffff", _dark: "dark.surface" },
  padding: "20px 18px",
  display: "flex",
  flexDirection: "column",
  gap: "4px",
});

const cashflowBarSection = css({
  padding: "20px 24px",
  backgroundColor: { base: "#ffffff", _dark: "dark.surface" },
  borderBottom: "1px solid",
  borderColor: { base: "slate.200", _dark: "dark.border" },
});

const highlightStripStyle = css({
  padding: "16px 24px",
  backgroundColor: { base: "rgba(16, 185, 129, 0.05)", _dark: "rgba(16, 185, 129, 0.12)" },
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  flexWrap: "wrap",
  gap: "12px",
  fontSize: "xs",
});

export const BaselineSnapshotPreview: FC = () => {
  return (
    <div className={previewCardContainer} data-testid="baseline-snapshot-preview">
      {/* Top Header Bar */}
      <div className={headerBarStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span
            style={{
              width: "10px",
              height: "10px",
              borderRadius: "50%",
              backgroundColor: "#10b981",
              display: "inline-block",
              boxShadow: "0 0 8px rgba(16, 185, 129, 0.6)",
            }}
          />
          <strong
            style={{
              fontSize: "14px",
              color: "var(--colors-text-primary, #0f172a)",
              fontFamily: "var(--fonts-display, sans-serif)",
            }}
          >
            Your 60-Second UK Financial Baseline
          </strong>
        </div>
        <span className={pillBadgeStyle}>
          <FiCheckCircle size={14} /> Instant Dashboard Snapshot
        </span>
      </div>

      {/* 4 Core High-Level Numbers */}
      <div className={metricsGridStyle}>
        <div className={metricItemStyle}>
          <span
            style={{
              fontSize: "12px",
              color: "var(--colors-text-muted, #64748b)",
              fontWeight: "600",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            Total Net Worth
          </span>
          <div
            className="tabular-nums"
            style={{ fontSize: "1.75rem", fontWeight: "800", color: "#10b981", lineHeight: 1.15 }}
          >
            £68,400
          </div>
          <span style={{ fontSize: "12px", color: "var(--colors-text-muted, #64748b)" }}>
            Cash, ISA, Pension & Equity
          </span>
        </div>

        <div className={metricItemStyle}>
          <span
            style={{
              fontSize: "12px",
              color: "var(--colors-text-muted, #64748b)",
              fontWeight: "600",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            Monthly Surplus
          </span>
          <div
            className="tabular-nums"
            style={{
              fontSize: "1.75rem",
              fontWeight: "800",
              color: "var(--colors-primary, #6363f1)",
              lineHeight: 1.15,
            }}
          >
            +£840
            <span
              style={{ fontSize: "12px", fontWeight: "normal", color: "var(--colors-text-muted)" }}
            >
              /mo
            </span>
          </div>
          <span style={{ fontSize: "12px", color: "var(--colors-text-muted, #64748b)" }}>
            After tax, NI & outgoings
          </span>
        </div>

        <div className={metricItemStyle}>
          <span
            style={{
              fontSize: "12px",
              color: "var(--colors-text-muted, #64748b)",
              fontWeight: "600",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            Safe-to-Spend
          </span>
          <div
            className="tabular-nums"
            style={{ fontSize: "1.75rem", fontWeight: "800", color: "#0ea5e9", lineHeight: 1.15 }}
          >
            £195
            <span
              style={{ fontSize: "12px", fontWeight: "normal", color: "var(--colors-text-muted)" }}
            >
              /wk
            </span>
          </div>
          <span style={{ fontSize: "12px", color: "var(--colors-text-muted, #64748b)" }}>
            Guilt-free cash buffer
          </span>
        </div>

        <div className={metricItemStyle}>
          <span
            style={{
              fontSize: "12px",
              color: "var(--colors-text-muted, #64748b)",
              fontWeight: "600",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            Emergency Runway
          </span>
          <div
            className="tabular-nums"
            style={{ fontSize: "1.75rem", fontWeight: "800", color: "#f59e0b", lineHeight: 1.15 }}
          >
            6.4 <span style={{ fontSize: "13px", fontWeight: "600" }}>Months</span>
          </div>
          <span style={{ fontSize: "12px", color: "var(--colors-text-muted, #64748b)" }}>
            Survival without salary
          </span>
        </div>
      </div>

      {/* Code-Driven SVG Diagram: Stacked Cashflow Waterfall & Runway Gauge */}
      <div className={cashflowBarSection}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "8px",
          }}
        >
          <span
            style={{
              fontSize: "12px",
              fontWeight: "700",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: "var(--colors-text-primary, #0f172a)",
            }}
          >
            Monthly Cashflow Allocation
          </span>
          <span
            className="tabular-nums"
            style={{ fontSize: "12px", color: "var(--colors-text-muted, #64748b)" }}
          >
            Gross Take-Home: £4,200/mo
          </span>
        </div>

        {/* Proportional Stacked Allocation Bar */}
        <div
          role="img"
          aria-label="Cashflow allocation diagram: 24% UK Tax and NI, 42% Housing and Fixed Bills, 18% Safe-to-Spend, 16% Surplus to Wealth"
          style={{
            height: "14px",
            borderRadius: "9999px",
            overflow: "hidden",
            display: "flex",
            width: "100%",
            backgroundColor: "var(--colors-slate-200, #e2e8f0)",
          }}
        >
          <div
            style={{ width: "24%", backgroundColor: "#64748b" }}
            title="Tax & NI: £1,008 (24%)"
          />
          <div
            style={{ width: "42%", backgroundColor: "#ef4444" }}
            title="Fixed Bills & Housing: £1,764 (42%)"
          />
          <div
            style={{ width: "18%", backgroundColor: "#0ea5e9" }}
            title="Safe-to-Spend Cash: £756 (18% / £195/wk)"
          />
          <div
            style={{ width: "16%", backgroundColor: "#10b981" }}
            title="Invested Surplus: £672 (16%)"
          />
        </div>

        {/* Diagram Legend */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "16px",
            marginTop: "12px",
            fontSize: "12px",
            color: "var(--colors-text-muted, #475569)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                backgroundColor: "#64748b",
              }}
            />
            <span>Tax & NI (24%)</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                backgroundColor: "#ef4444",
              }}
            />
            <span>Fixed Bills (42%)</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                backgroundColor: "#0ea5e9",
              }}
            />
            <span>Safe-to-Spend (£195/wk · 18%)</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                backgroundColor: "#10b981",
              }}
            />
            <strong style={{ color: "#10b981" }}>Surplus (+£840/mo · 16%)</strong>
          </div>
        </div>
      </div>

      {/* Bottom Reassurance Strip */}
      <div className={highlightStripStyle}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            color: "var(--colors-success-DEFAULT, #047857)",
          }}
        >
          <FiShield size={16} style={{ color: "#10b981", flexShrink: 0 }} />
          <span>
            <strong>Zero setup hassle:</strong> Enter rough totals on first login. Drill down and
            add accounts only when you want.
          </span>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
            color: "var(--colors-primary, #6363f1)",
            fontWeight: "600",
          }}
        >
          <span>See live preview in app</span>
          <FiArrowUpRight size={14} />
        </div>
      </div>
    </div>
  );
};
