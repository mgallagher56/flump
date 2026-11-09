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
        {/* FCA AISP Read-Only Architecture Diagram */}
        <div className={illustrationContainer} style={{ padding: "28px 24px" }}>
          <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "16px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottom: "1px solid rgba(255, 255, 255, 0.12)",
                paddingBottom: "12px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <FiShield style={{ color: "#34d399", fontSize: "18px" }} />
                <span
                  style={{
                    fontSize: "13px",
                    fontWeight: "700",
                    letterSpacing: "0.02em",
                    color: "#ffffff",
                    fontFamily: "var(--fonts-display, sans-serif)",
                  }}
                >
                  FCA Open Banking Architecture
                </span>
              </div>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: "600",
                  padding: "2px 8px",
                  borderRadius: "999px",
                  backgroundColor: "rgba(16, 185, 129, 0.15)",
                  color: "#34d399",
                  border: "1px solid rgba(52, 211, 153, 0.3)",
                }}
              >
                AISP Read-Only
              </span>
            </div>

            {/* Architecture Node 1: UK Banks */}
            <div
              style={{
                padding: "12px 14px",
                borderRadius: "10px",
                backgroundColor: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <div style={{ fontSize: "12px", fontWeight: "600", color: "#ffffff" }}>
                  UK Authorised Banks & Building Societies
                </div>
                <div style={{ fontSize: "11px", color: "rgba(255, 255, 255, 0.6)" }}>
                  Open Banking OAuth 2.0 PKCE Handshake
                </div>
              </div>
              <span style={{ fontSize: "11px", color: "#38bdf8", fontFamily: "monospace" }}>
                TLS 1.3
              </span>
            </div>

            {/* Flow Indicator with Directional Arrow */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                color: "rgba(255, 255, 255, 0.4)",
                fontSize: "11px",
              }}
            >
              <span>↓ Read-only encrypted telemetry stream</span>
            </div>

            {/* Architecture Node 2: Flump Local Sandbox */}
            <div
              style={{
                padding: "12px 14px",
                borderRadius: "10px",
                backgroundColor: "rgba(99, 102, 241, 0.1)",
                border: "1px solid rgba(99, 102, 241, 0.3)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <div style={{ fontSize: "12px", fontWeight: "600", color: "#ffffff" }}>
                  Flump Analytics & Tax Modeling Engine
                </div>
                <div style={{ fontSize: "11px", color: "rgba(255, 255, 255, 0.6)" }}>
                  Zero access to initiate payments, transfers or alter accounts
                </div>
              </div>
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: "700",
                  padding: "2px 6px",
                  borderRadius: "4px",
                  backgroundColor: "rgba(239, 68, 68, 0.2)",
                  color: "#f87171",
                  border: "1px solid rgba(239, 68, 68, 0.4)",
                }}
              >
                PISP Blocked
              </span>
            </div>

            {/* Architecture Node 3: Storage Isolation */}
            <div
              style={{
                padding: "10px 14px",
                borderRadius: "8px",
                backgroundColor: "rgba(255, 255, 255, 0.03)",
                border: "1px dashed rgba(255, 255, 255, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                fontSize: "11px",
                color: "rgba(255, 255, 255, 0.7)",
              }}
            >
              <span>AES-256-GCM data at rest</span>
              <span style={{ color: "#34d399", fontWeight: "600" }}>
                ✓ Zero third-party ad brokers
              </span>
            </div>
          </div>
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
