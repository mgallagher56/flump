import { css } from "@repo/ui/styled-system/css";
import type { FC } from "react";
import { FiArrowUpRight, FiCheckCircle, FiShield } from "react-icons/fi";
import { getAppUrl } from "../utils/url";

const coverFigureStyle = css({
  fontSize: "1.75rem",
  fontWeight: "800",
  color: "text.primary",
  lineHeight: "1.15",
  fontVariantNumeric: "tabular-nums",
});

const coverUnitStyle = css({ fontSize: "13px", fontWeight: "600" });

const previewCardContainer = css({
  backgroundColor: "card",
  border: "1px solid",
  borderColor: "border",
  borderRadius: "2xl",
  boxShadow: "floating",
  maxWidth: "1060px",
  margin: "0 auto",
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
  fontWeight: "600",
  letterSpacing: "0.01em",
  color: "primary",
  backgroundColor: "surface.tinted",
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

/**
 * Illustrative split of the £4,400 take-home. £195 a week is £845 a month (195 × 52 ÷ 12), and
 * 2,715 + 845 + 840 = 4,400, so the parts, the percentages and the headline figures agree.
 */
export const BREAKDOWN = [
  {
    key: "fixed",
    label: "Housing and fixed bills",
    amount: "£2,715",
    legend: "",
    pct: 62,
    fill: "var(--colors-chart-series1)",
  },
  {
    key: "safe",
    label: "Safe to spend",
    amount: "£845",
    legend: "£195/wk · ",
    pct: 19,
    fill: "var(--colors-chart-series2)",
  },
  {
    key: "surplus",
    label: "Surplus",
    amount: "£840",
    legend: "+£840/mo · ",
    pct: 19,
    fill: "var(--colors-chart-series3)",
  },
] as const;

export const BaselineSnapshotPreview: FC = () => {
  const appUrl = getAppUrl();
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
              backgroundColor: "var(--colors-status-positive-solid)",
              display: "inline-block",
            }}
          />
          <strong
            style={{
              fontSize: "14px",
              color: "var(--colors-text-primary)",
              fontFamily: "var(--fonts-display)",
            }}
          >
            Example monthly picture
          </strong>
        </div>
        <span className={pillBadgeStyle}>
          <FiCheckCircle size={14} /> Example summary, illustrative figures
        </span>
      </div>

      {/* 4 Core High-Level Numbers */}
      <div className={metricsGridStyle}>
        <div className={metricItemStyle}>
          <span
            style={{
              fontSize: "12px",
              color: "var(--colors-text-secondary)",
              fontWeight: "600",
              letterSpacing: "0.01em",
            }}
          >
            Total net worth
          </span>
          <div
            className="tabular-nums"
            style={{
              fontSize: "1.75rem",
              fontWeight: "800",
              color: "var(--colors-status-positive-text)",
              lineHeight: 1.15,
            }}
          >
            £68,400
          </div>
          <span style={{ fontSize: "12px", color: "var(--colors-text-secondary)" }}>
            Cash, savings and pensions, minus debts
          </span>
        </div>

        <div className={metricItemStyle}>
          <span
            style={{
              fontSize: "12px",
              color: "var(--colors-text-secondary)",
              fontWeight: "600",
              letterSpacing: "0.01em",
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
              style={{
                fontSize: "12px",
                fontWeight: "normal",
                color: "var(--colors-text-secondary)",
              }}
            >
              /mo
            </span>
          </div>
          <span style={{ fontSize: "12px", color: "var(--colors-text-secondary)" }}>
            After tax, NI, and fixed outgoings
          </span>
        </div>

        <div className={metricItemStyle}>
          <span
            style={{
              fontSize: "12px",
              color: "var(--colors-text-secondary)",
              fontWeight: "600",
              letterSpacing: "0.01em",
            }}
          >
            Safe to spend
          </span>
          <div
            className="tabular-nums"
            style={{
              fontSize: "1.75rem",
              fontWeight: "800",
              color: "var(--colors-status-info-text)",
              lineHeight: 1.15,
            }}
          >
            £195
            <span
              style={{
                fontSize: "12px",
                fontWeight: "normal",
                color: "var(--colors-text-secondary)",
              }}
            >
              /wk
            </span>
          </div>
          <span style={{ fontSize: "12px", color: "var(--colors-text-secondary)" }}>
            Discretionary weekly cash
          </span>
        </div>

        <div className={metricItemStyle}>
          <span
            style={{
              fontSize: "12px",
              color: "var(--colors-text-secondary)",
              fontWeight: "600",
              letterSpacing: "0.01em",
            }}
          >
            Months of cover
          </span>
          <div className={coverFigureStyle}>
            6.4 <span className={coverUnitStyle}>months</span>
          </div>
          <span style={{ fontSize: "12px", color: "var(--colors-text-secondary)" }}>
            Essential costs your savings would cover
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
              fontWeight: "600",
              letterSpacing: "0.01em",
              color: "var(--colors-text-primary)",
            }}
          >
            Where the take-home goes
          </span>
          <span
            className="tabular-nums"
            style={{ fontSize: "12px", color: "var(--colors-text-secondary)" }}
          >
            Estimated take-home: £4,400/mo
          </span>
        </div>

        {/* Proportional bar of the £4,400 take-home: the parts add up to it. */}
        <div
          role="img"
          aria-label={`Example take-home of £4,400 a month: ${BREAKDOWN.map((p) => `${p.label} ${p.amount}, ${p.pct}%`).join("; ")}`}
          style={{
            height: "14px",
            borderRadius: "9999px",
            overflow: "hidden",
            display: "flex",
            width: "100%",
            backgroundColor: "var(--colors-border)",
          }}
        >
          {BREAKDOWN.map((part) => (
            <div
              key={part.key}
              style={{ width: `${part.pct}%`, backgroundColor: part.fill }}
              title={`${part.label}: ${part.amount} (${part.pct}%)`}
            />
          ))}
        </div>

        {/* Diagram Legend */}
        <div
          className="tabular-nums"
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "16px",
            marginTop: "12px",
            fontSize: "12px",
            color: "var(--colors-text-secondary)",
          }}
        >
          {BREAKDOWN.map((part) => (
            <div key={part.key} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  backgroundColor: part.fill,
                }}
              />
              <span>
                {part.label} ({part.legend}
                {part.pct}%)
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Reassurance Strip */}
      <div className={highlightStripStyle}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            color: "var(--colors-text-primary)",
          }}
        >
          <FiShield
            size={16}
            style={{ color: "var(--colors-status-positive-text)", flexShrink: 0 }}
          />
          <span>
            <strong>Zero setup hassle:</strong> Enter rough totals to start. Add accounts and
            details only when you choose.
          </span>
        </div>
        <a
          href={`${appUrl}/sandbox`}
          className={livePreviewLinkStyle}
          target="_blank"
          rel="noreferrer"
        >
          <span>See live preview in app</span>
          <FiArrowUpRight size={14} />
        </a>
      </div>
    </div>
  );
};
