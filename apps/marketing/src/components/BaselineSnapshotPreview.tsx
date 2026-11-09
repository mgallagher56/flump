import { css } from "@repo/ui/styled-system/css";
import type { FC } from "react";
import { FiArrowUpRight, FiCheckCircle, FiShield } from "react-icons/fi";

const previewCardContainer = css({
  backgroundColor: { base: "#ffffff", _dark: "dark.surface" },
  border: "1px solid",
  borderColor: { base: "slate.200", _dark: "slate.800" },
  borderRadius: "2xl",
  boxShadow: {
    base: "0 20px 45px rgba(15, 23, 42, 0.08)",
    _dark: "0 20px 45px rgba(0, 0, 0, 0.4)",
  },
  maxWidth: "780px",
  margin: "0 auto",
  textAlign: "left",
  overflow: "hidden",
});

const headerBarStyle = css({
  padding: "16px 24px",
  backgroundColor: { base: "slate.50", _dark: "dark.bg" },
  borderBottom: "1px solid",
  borderColor: { base: "slate.200", _dark: "slate.800" },
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  flexWrap: "wrap",
  gap: "12px",
});

const pillBadgeStyle = css({
  fontSize: "11px",
  fontWeight: "700",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  color: "#6363f1",
  backgroundColor: "rgba(99, 102, 241, 0.12)",
  padding: "3px 10px",
  borderRadius: "full",
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
});

const metricsGridStyle = css({
  display: "grid",
  gridTemplateColumns: { base: "repeat(2, 1fr)", md: "repeat(4, 1fr)" },
  gap: "1px",
  backgroundColor: { base: "slate.200", _dark: "slate.800" },
  borderBottom: "1px solid",
  borderColor: { base: "slate.200", _dark: "slate.800" },
});

const metricItemStyle = css({
  backgroundColor: { base: "#ffffff", _dark: "dark.surface" },
  padding: "20px 18px",
  display: "flex",
  flexDirection: "column",
  gap: "4px",
});

const highlightStripStyle = css({
  padding: "16px 24px",
  backgroundColor: { base: "rgba(16, 185, 129, 0.04)", _dark: "rgba(16, 185, 129, 0.1)" },
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  flexWrap: "wrap",
  gap: "12px",
  fontSize: "13px",
});

export const BaselineSnapshotPreview: FC = () => {
  return (
    <div className={previewCardContainer} data-testid="baseline-snapshot-preview">
      {/* Top Header Bar */}
      <div className={headerBarStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span
            style={{
              width: "10px",
              height: "10px",
              borderRadius: "50%",
              backgroundColor: "#10b981",
              display: "inline-block",
            }}
          />
          <strong style={{ fontSize: "14px", color: "var(--colors-text-primary, #0f172a)" }}>
            Your 60-Second UK Financial Baseline
          </strong>
        </div>
        <span className={pillBadgeStyle}>
          <FiCheckCircle size={13} /> Instant Dashboard Snapshot
        </span>
      </div>

      {/* 4 Core High-Level Numbers */}
      <div className={metricsGridStyle}>
        <div className={metricItemStyle}>
          <span
            style={{
              fontSize: "11px",
              color: "#64748b",
              fontWeight: "600",
              textTransform: "uppercase",
            }}
          >
            Total Net Worth
          </span>
          <div style={{ fontSize: "1.6rem", fontWeight: "800", color: "#10b981" }}>£68,400</div>
          <span style={{ fontSize: "11px", color: "#64748b" }}>Cash, ISA, Pension & Equity</span>
        </div>

        <div className={metricItemStyle}>
          <span
            style={{
              fontSize: "11px",
              color: "#64748b",
              fontWeight: "600",
              textTransform: "uppercase",
            }}
          >
            Monthly Surplus
          </span>
          <div style={{ fontSize: "1.6rem", fontWeight: "800", color: "#6363f1" }}>
            +£840
            <span style={{ fontSize: "12px", fontWeight: "normal", color: "#64748b" }}>/mo</span>
          </div>
          <span style={{ fontSize: "11px", color: "#64748b" }}>After tax, NI & outgoings</span>
        </div>

        <div className={metricItemStyle}>
          <span
            style={{
              fontSize: "11px",
              color: "#64748b",
              fontWeight: "600",
              textTransform: "uppercase",
            }}
          >
            Safe-to-Spend
          </span>
          <div style={{ fontSize: "1.6rem", fontWeight: "800", color: "#0ea5e9" }}>
            £195
            <span style={{ fontSize: "12px", fontWeight: "normal", color: "#64748b" }}>/wk</span>
          </div>
          <span style={{ fontSize: "11px", color: "#64748b" }}>Guilt-free cash buffer</span>
        </div>

        <div className={metricItemStyle}>
          <span
            style={{
              fontSize: "11px",
              color: "#64748b",
              fontWeight: "600",
              textTransform: "uppercase",
            }}
          >
            Emergency Runway
          </span>
          <div style={{ fontSize: "1.6rem", fontWeight: "800", color: "#f59e0b" }}>
            6.4 <span style={{ fontSize: "13px", fontWeight: "600" }}>Months</span>
          </div>
          <span style={{ fontSize: "11px", color: "#64748b" }}>Survival without salary</span>
        </div>
      </div>

      {/* Bottom Reassurance Strip */}
      <div className={highlightStripStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#065f46" }}>
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
            color: "#6363f1",
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
