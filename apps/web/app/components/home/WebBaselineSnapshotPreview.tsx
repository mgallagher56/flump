import { css } from "@repo/ui/styled-system/css";
import type { FC } from "react";
import { FiArrowUpRight, FiCheckCircle, FiShield } from "react-icons/fi";
import { Link as RouterLink } from "react-router";

const previewCardContainer = css({
  backgroundColor: "card",
  border: "1px solid",
  borderColor: "border",
  borderRadius: "2xl",
  boxShadow: "floating",
  maxWidth: "1060px",
  width: "100%",
  margin: "36px auto 0",
  textAlign: "left",
  overflow: "hidden",
});

const headerBarStyle = css({
  padding: "16px 24px",
  backgroundColor: "surface.subtle",
  borderBottom: "1px solid",
  borderColor: "border",
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
  backgroundColor: "surface.tinted",
  padding: "4px 12px",
  borderRadius: "full",
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  fontFamily: "var(--fonts-mono, monospace)",
});

const metricsGridStyle = css({
  display: "grid",
  gridTemplateColumns: { base: "repeat(2, 1fr)", md: "repeat(4, 1fr)" },
  gap: "1px",
  backgroundColor: "border",
  borderBottom: "1px solid",
  borderColor: "border",
});

const metricItemStyle = css({
  backgroundColor: "card",
  padding: "20px 18px",
  display: "flex",
  flexDirection: "column",
  gap: "4px",
});

const cashflowBarSection = css({
  padding: "20px 24px",
  backgroundColor: "card",
  borderBottom: "1px solid",
  borderColor: "border",
});

const highlightStripStyle = css({
  padding: "16px 24px",
  backgroundColor: "success.bg",
  borderTop: "1px solid",
  borderColor: "success.border",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  flexWrap: "wrap",
  gap: "12px",
  fontSize: "xs",
});

const livePreviewLinkStyle = css({
  display: "inline-flex",
  alignItems: "center",
  gap: "4px",
  color: "primary",
  fontWeight: "600",
  textDecoration: "none",
  cursor: "pointer",
  transition: "opacity 0.15s ease",
  _hover: {
    textDecoration: "underline",
    opacity: 0.85,
  },
});

export const WebBaselineSnapshotPreview: FC = () => {
  return (
    <div
      className={previewCardContainer}
      data-testid="web-baseline-snapshot-preview"
      id="web-baseline-snapshot-preview"
    >
      {/* Top Header Bar */}
      <div className={headerBarStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span
            style={{
              width: "10px",
              height: "10px",
              borderRadius: "50%",
              backgroundColor: "var(--colors-success-500)",
              display: "inline-block",
              boxShadow: "0 0 8px rgba(16, 185, 129, 0.6)",
            }}
          />
          <strong
            style={{
              fontSize: "14px",
              color: "var(--colors-text-primary)",
              fontFamily: "var(--fonts-display)",
            }}
          >
            Your 60-second UK financial baseline
          </strong>
        </div>
        <span className={pillBadgeStyle}>
          <FiCheckCircle size={14} /> Instant dashboard snapshot
        </span>
      </div>

      {/* 4 Core High-Level Numbers */}
      <div className={metricsGridStyle}>
        <div className={metricItemStyle}>
          <span
            style={{
              fontSize: "12px",
              color: "var(--colors-text-muted)",
              fontWeight: "600",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            Total net worth
          </span>
          <div
            className="tabular-nums"
            style={{
              fontSize: "1.75rem",
              fontWeight: "800",
              color: "var(--colors-success-500)",
              lineHeight: 1.15,
            }}
          >
            £68,400
          </div>
          <span style={{ fontSize: "12px", color: "var(--colors-text-muted)" }}>
            Cash, ISA, pension, and equity
          </span>
        </div>

        <div className={metricItemStyle}>
          <span
            style={{
              fontSize: "12px",
              color: "var(--colors-text-muted)",
              fontWeight: "600",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            Monthly surplus
          </span>
          <div
            className="tabular-nums"
            style={{
              fontSize: "1.75rem",
              fontWeight: "800",
              color: "var(--colors-primary)",
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
          <span style={{ fontSize: "12px", color: "var(--colors-text-muted)" }}>
            After tax, NI, and bills
          </span>
        </div>

        <div className={metricItemStyle}>
          <span
            style={{
              fontSize: "12px",
              color: "var(--colors-text-muted)",
              fontWeight: "600",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            Safe to spend
          </span>
          <div
            className="tabular-nums"
            style={{
              fontSize: "1.75rem",
              fontWeight: "800",
              color: "var(--colors-info-500)",
              lineHeight: 1.15,
            }}
          >
            £195
            <span
              style={{ fontSize: "12px", fontWeight: "normal", color: "var(--colors-text-muted)" }}
            >
              /wk
            </span>
          </div>
          <span style={{ fontSize: "12px", color: "var(--colors-text-muted)" }}>
            Guilt-free cash buffer
          </span>
        </div>

        <div className={metricItemStyle}>
          <span
            style={{
              fontSize: "12px",
              color: "var(--colors-text-muted)",
              fontWeight: "600",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            Emergency runway
          </span>
          <div
            className="tabular-nums"
            style={{
              fontSize: "1.75rem",
              fontWeight: "800",
              color: "var(--colors-warning-500)",
              lineHeight: 1.15,
            }}
          >
            6.4 <span style={{ fontSize: "13px", fontWeight: "600" }}>months</span>
          </div>
          <span style={{ fontSize: "12px", color: "var(--colors-text-muted)" }}>
            Runway without salary
          </span>
        </div>
      </div>

      {/* Code-Driven SVG Diagram: Stacked Cashflow Allocation Bar */}
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
              color: "var(--colors-text-primary)",
            }}
          >
            Monthly cashflow breakdown
          </span>
          <span
            className="tabular-nums"
            style={{ fontSize: "12px", color: "var(--colors-text-muted)" }}
          >
            Take-home pay: £4,200/month
          </span>
        </div>

        {/* Proportional Stacked Allocation Bar */}
        <div
          role="img"
          aria-label="Cashflow allocation diagram: 24% UK tax and NI, 42% housing and fixed bills, 18% safe to spend, 16% invested surplus"
          style={{
            height: "14px",
            borderRadius: "9999px",
            overflow: "hidden",
            display: "flex",
            width: "100%",
            backgroundColor: "var(--colors-border)",
          }}
        >
          <div
            style={{ width: "24%", backgroundColor: "var(--colors-slate-500)" }}
            title="Tax & NI: £1,008 (24%)"
          />
          <div
            style={{ width: "42%", backgroundColor: "var(--colors-destructive-500)" }}
            title="Fixed Bills & Housing: £1,764 (42%)"
          />
          <div
            style={{ width: "18%", backgroundColor: "var(--colors-info-500)" }}
            title="Safe-to-Spend Cash: £756 (18% / £195/wk)"
          />
          <div
            style={{ width: "16%", backgroundColor: "var(--colors-success-500)" }}
            title="Invested Surplus: £672 (16%)"
          />
        </div>

        {/* Legend */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "16px",
            marginTop: "12px",
            fontSize: "12px",
            color: "var(--colors-text-muted)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                backgroundColor: "var(--colors-slate-500)",
              }}
            />
            <span>Tax and NI (24%)</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                backgroundColor: "var(--colors-destructive-500)",
              }}
            />
            <span>Housing and bills (42%)</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                backgroundColor: "var(--colors-info-500)",
              }}
            />
            <span>Safe to spend (£195/wk · 18%)</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                backgroundColor: "var(--colors-success-500)",
              }}
            />
            <strong style={{ color: "var(--colors-success-500)" }}>Surplus (+£840/mo · 16%)</strong>
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
            color: "var(--colors-success-DEFAULT)",
          }}
        >
          <FiShield size={16} style={{ color: "var(--colors-success-500)", flexShrink: 0 }} />
          <span>
            <strong>Zero setup friction:</strong> Enter rough totals on first login. Drill down and
            add accounts only when you want.
          </span>
        </div>
        <RouterLink to="/sandbox" className={livePreviewLinkStyle}>
          <span>See live preview in app</span>
          <FiArrowUpRight size={14} />
        </RouterLink>
      </div>
    </div>
  );
};

export default WebBaselineSnapshotPreview;
