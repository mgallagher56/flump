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
  backgroundColor: "rgba(255, 255, 255, 0.12)",
  color: "text.onContrast",
  display: "inline-flex",
  alignItems: "center",
  gap: "4px",
  width: "fit-content",
  fontFamily: "var(--fonts-mono, monospace)",
});

const diagramColumn = css({
  width: "100%",
  display: "flex",
  flexDirection: "column",
  gap: "16px",
  padding: "28px 24px",
});

const diagramHeader = css({
  display: "flex",
  alignItems: "center",
  gap: "8px",
  borderBottom: "1px solid",
  borderColor: "rgba(255, 255, 255, 0.12)",
  paddingBottom: "12px",
});

const diagramHeaderIcon = css({ color: "text.onContrast", fontSize: "18px" });

const diagramHeaderTitle = css({
  fontSize: "13px",
  fontWeight: "700",
  letterSpacing: "0.02em",
  color: "text.onContrast",
  fontFamily: "var(--fonts-display, sans-serif)",
});

const nodeStyle = css({
  padding: "12px 14px",
  borderRadius: "10px",
  backgroundColor: "rgba(255, 255, 255, 0.05)",
  border: "1px solid",
  borderColor: "rgba(255, 255, 255, 0.1)",
});

const dashedNodeStyle = css({
  padding: "12px 14px",
  borderRadius: "10px",
  backgroundColor: "rgba(255, 255, 255, 0.03)",
  border: "1px dashed",
  borderColor: "rgba(255, 255, 255, 0.25)",
});

const nodeTitle = css({ fontSize: "12px", fontWeight: "600", color: "text.onContrast" });

const nodeCaption = css({ fontSize: "11px", color: "rgba(255, 255, 255, 0.7)" });

const flowArrow = css({
  textAlign: "center",
  color: "rgba(255, 255, 255, 0.6)",
  fontSize: "14px",
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
        {/* Data flow diagram */}
        <div className={illustrationContainer}>
          <div className={diagramColumn}>
            <div className={diagramHeader}>
              <FiShield className={diagramHeaderIcon} />
              <span className={diagramHeaderTitle}>How your data flows</span>
            </div>

            <div className={nodeStyle}>
              <div className={nodeTitle}>Your manual entries</div>
              <div className={nodeCaption}>Numbers you type in yourself</div>
            </div>

            <div className={flowArrow}>↓</div>

            <div className={nodeStyle}>
              <div className={nodeTitle}>Flump planning engine (cannot make payments)</div>
              <div className={nodeCaption}>Calculates tax, debt, mortgage and forecasts</div>
            </div>

            <div className={flowArrow}>↓</div>

            <div className={dashedNodeStyle}>
              <div className={nodeTitle}>Bank connection (coming soon)</div>
              <div className={nodeCaption}>Not available yet</div>
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
                <FiCheckCircle size={12} /> Coming soon
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
              Bank connection (coming soon)
            </h3>
            <p
              style={{
                fontSize: "14px",
                color: "rgba(255, 255, 255, 0.75)",
                margin: 0,
                lineHeight: "1.5",
              }}
            >
              Flump cannot move money or change account settings.
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
