import { SectionBand } from "@repo/ui";
import { css } from "@repo/ui/styled-system/css";
import type { FC } from "react";
import { FiCheckCircle, FiLock, FiShield, FiSlash } from "react-icons/fi";

const sectionGridLayout = css({
  display: "grid",
  gridTemplateColumns: { base: "1fr", lg: "5fr 7fr" },
  gap: { base: "6", lg: "8" },
  alignItems: "center",
});

const illustrationContainer = css({
  borderRadius: "2xl",
  overflow: "hidden",
  border: "1px solid",
  borderColor: "rgba(255, 255, 255, 0.15)",
  backgroundColor: "rgba(255, 255, 255, 0.03)",
  boxShadow: "0 20px 40px -15px rgba(0, 0, 0, 0.6)",
  backdropFilter: "blur(12px)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
});

const cardStyle = css({
  backgroundColor: { base: "rgba(255, 255, 255, 0.05)", _dark: "rgba(255, 255, 255, 0.04)" },
  border: "1px solid",
  borderColor: { base: "rgba(255, 255, 255, 0.12)", _dark: "rgba(255, 255, 255, 0.1)" },
  borderRadius: "2xl",
  p: { base: "5", md: "6" },
  display: "flex",
  flexDirection: "column",
  gap: "10px",
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
      indexBadge="Security and privacy"
      title="Your financial privacy comes first"
      subtitle="Designed from the start to work fully without bank account linking or password sharing."
    >
      <div className={sectionGridLayout} data-testid="security-privacy-section">
        {/* Security Vault Graphic */}
        <div className={illustrationContainer}>
          <img
            src="/illustrations/security-vault-shield.jpg"
            alt="Security shield representing privacy protection and 256-bit encryption"
            loading="lazy"
            style={{
              width: "100%",
              height: "auto",
              display: "block",
              borderRadius: "16px",
            }}
          />
        </div>

        {/* Security Pillars List */}
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {/* Pillar 1 */}
          <div className={cardStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div
                style={{
                  width: "38px",
                  height: "38px",
                  borderRadius: "10px",
                  backgroundColor: "rgba(16, 185, 129, 0.2)",
                  color: "#10b981",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "16px",
                }}
              >
                <FiShield />
              </div>
              <span className={verificationBadge}>
                <FiCheckCircle size={12} /> Private manual entry
              </span>
            </div>

            <h3
              style={{
                fontSize: "1.2rem",
                fontWeight: "700",
                color: "#ffffff",
                fontFamily: "var(--fonts-display, sans-serif)",
                margin: 0,
              }}
            >
              Manual-first control
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
                  width: "38px",
                  height: "38px",
                  borderRadius: "10px",
                  backgroundColor: "rgba(99, 102, 241, 0.2)",
                  color: "#818cf8",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "16px",
                }}
              >
                <FiLock />
              </div>
              <span className={verificationBadge}>
                <FiCheckCircle size={12} /> Read-only access
              </span>
            </div>

            <h3
              style={{
                fontSize: "1.2rem",
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
              Optional live account sync operates through FCA-regulated Open Banking APIs. We can
              never move money or change account settings.
            </p>
          </div>

          {/* Pillar 3 */}
          <div className={cardStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div
                style={{
                  width: "38px",
                  height: "38px",
                  borderRadius: "10px",
                  backgroundColor: "rgba(245, 158, 11, 0.2)",
                  color: "#fbbf24",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "16px",
                }}
              >
                <FiSlash />
              </div>
              <span className={verificationBadge}>
                <FiCheckCircle size={12} /> Zero ads
              </span>
            </div>

            <h3
              style={{
                fontSize: "1.2rem",
                fontWeight: "700",
                color: "#ffffff",
                fontFamily: "var(--fonts-display, sans-serif)",
                margin: 0,
              }}
            >
              Zero data selling
            </h3>
            <p
              style={{
                fontSize: "14px",
                color: "rgba(255, 255, 255, 0.75)",
                margin: 0,
                lineHeight: "1.5",
              }}
            >
              We never sell your personal or financial records to credit card lenders, mortgage
              brokers, or third parties.
            </p>
          </div>
        </div>
      </div>
    </SectionBand>
  );
};
