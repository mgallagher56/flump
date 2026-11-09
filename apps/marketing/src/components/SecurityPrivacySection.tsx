import { SectionBand } from "@repo/ui";
import { css } from "@repo/ui/styled-system/css";
import { grid } from "@repo/ui/styled-system/patterns";
import type { FC } from "react";
import { FiCheckCircle, FiLock, FiShield, FiSlash } from "react-icons/fi";

const cardStyle = css({
  backgroundColor: { base: "rgba(255, 255, 255, 0.05)", _dark: "rgba(255, 255, 255, 0.04)" },
  border: "1px solid",
  borderColor: { base: "rgba(255, 255, 255, 0.12)", _dark: "rgba(255, 255, 255, 0.1)" },
  borderRadius: "2xl",
  p: { base: "6", md: "8" },
  display: "flex",
  flexDirection: "column",
  gap: "14px",
  backdropFilter: "blur(8px)",
});

const verificationBadge = css({
  fontSize: "12px",
  fontWeight: "700",
  padding: "3px 8px",
  borderRadius: "full",
  backgroundColor: "rgba(16, 185, 129, 0.2)",
  color: "#34d399",
  display: "inline-flex",
  alignItems: "center",
  gap: "4px",
  width: "fit-content",
  fontFamily: "var(--fonts-mono, monospace)",
});

export const SecurityPrivacySection: FC = () => {
  return (
    <SectionBand
      id="security"
      tone="contrast"
      indexBadge="05 // TRUST & SECURITY"
      title="Your Financial Privacy Comes First"
      subtitle="Engineered from day one to operate fully without mandatory bank account linking or credential sharing."
    >
      <div
        className={grid({ columns: { base: 1, md: 3 }, gap: "6" })}
        data-testid="security-privacy-section"
      >
        {/* Pillar 1 */}
        <div className={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "12px",
                backgroundColor: "rgba(16, 185, 129, 0.2)",
                color: "#10b981",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "18px",
              }}
            >
              <FiShield />
            </div>
            <span className={verificationBadge}>
              <FiCheckCircle size={12} /> 100% Offline Capable
            </span>
          </div>

          <h3
            style={{
              fontSize: "1.25rem",
              fontWeight: "700",
              color: "#ffffff",
              fontFamily: "var(--fonts-display, sans-serif)",
              margin: 0,
            }}
          >
            Manual-First Control
          </h3>
          <p
            style={{
              fontSize: "14px",
              color: "rgba(255, 255, 255, 0.75)",
              margin: 0,
              lineHeight: "1.5",
            }}
          >
            Use all tax, debt, mortgage, and forecasting tools with rough estimates. No bank
            connection required.
          </p>
        </div>

        {/* Pillar 2 */}
        <div className={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "12px",
                backgroundColor: "rgba(99, 102, 241, 0.2)",
                color: "#818cf8",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "18px",
              }}
            >
              <FiLock />
            </div>
            <span className={verificationBadge}>
              <FiCheckCircle size={12} /> Read-Only Only
            </span>
          </div>

          <h3
            style={{
              fontSize: "1.25rem",
              fontWeight: "700",
              color: "#ffffff",
              fontFamily: "var(--fonts-display, sans-serif)",
              margin: 0,
            }}
          >
            FCA Open Banking
          </h3>
          <p
            style={{
              fontSize: "14px",
              color: "rgba(255, 255, 255, 0.75)",
              margin: 0,
              lineHeight: "1.5",
            }}
          >
            Optional live account syncs operate via FCA-regulated Open Banking APIs. We can never
            move money.
          </p>
        </div>

        {/* Pillar 3 */}
        <div className={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "12px",
                backgroundColor: "rgba(245, 158, 11, 0.2)",
                color: "#fbbf24",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "18px",
              }}
            >
              <FiSlash />
            </div>
            <span className={verificationBadge}>
              <FiCheckCircle size={12} /> Zero Ads
            </span>
          </div>

          <h3
            style={{
              fontSize: "1.25rem",
              fontWeight: "700",
              color: "#ffffff",
              fontFamily: "var(--fonts-display, sans-serif)",
              margin: 0,
            }}
          >
            Zero Data Selling
          </h3>
          <p
            style={{
              fontSize: "14px",
              color: "rgba(255, 255, 255, 0.75)",
              margin: 0,
              lineHeight: "1.5",
            }}
          >
            We do not sell personal or financial records to credit card lenders or mortgage brokers.
            Ever.
          </p>
        </div>
      </div>
    </SectionBand>
  );
};
