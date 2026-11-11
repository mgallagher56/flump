import { SectionBand } from "@repo/ui";
import { css } from "@repo/ui/styled-system/css";
import type { FC } from "react";
import { FiClock, FiShield } from "react-icons/fi";

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
  borderColor: "border.strong",
  backgroundColor: "surface.contrast",
  boxShadow: "lg",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
});

const cardStyle = css({
  backgroundColor: "surface.contrast",
  border: "1px solid",
  borderColor: "border.strong",
  borderRadius: "2xl",
  p: { base: "5", md: "6" },
  display: "flex",
  flexDirection: "column",
  gap: "10px",
});

const verificationBadge = css({
  fontSize: "12px",
  fontWeight: "700",
  padding: "3px 8px",
  borderRadius: "full",
  backgroundColor: "transparent",
  border: "1px solid",
  borderColor: "border.strong",
  color: "text.onContrast",
  display: "inline-flex",
  alignItems: "center",
  gap: "4px",
  width: "fit-content",
  fontFamily: "var(--fonts-mono, monospace)",
});

const pillarHeaderRow = css({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
});

const pillarIconTile = css({
  width: "38px",
  height: "38px",
  borderRadius: "10px",
  backgroundColor: "surface.subtle",
  color: "primary",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "16px",
});

const pillarTitle = css({
  fontSize: "1.2rem",
  fontWeight: "700",
  color: "text.onContrast",
  fontFamily: "var(--fonts-display, sans-serif)",
  margin: 0,
});

const pillarBody = css({
  fontSize: "14px",
  color: "text.onContrast",
  margin: 0,
  lineHeight: "1.5",
});

const pillarList = css({ display: "flex", flexDirection: "column", gap: "14px" });

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
  borderColor: "border.strong",
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
  backgroundColor: "surface.contrast",
  border: "1px solid",
  borderColor: "border.strong",
});

const dashedNodeStyle = css({
  padding: "12px 14px",
  borderRadius: "10px",
  backgroundColor: "surface.contrast",
  border: "1px dashed",
  borderColor: "border.strong",
});

const nodeTitle = css({ fontSize: "12px", fontWeight: "600", color: "text.onContrast" });

const nodeCaption = css({ fontSize: "11px", color: "text.onContrast", opacity: 0.8 });

const flowArrow = css({
  textAlign: "center",
  color: "text.onContrast",
  opacity: 0.7,
  fontSize: "14px",
});

export const SecurityPrivacySection: FC = () => {
  return (
    <SectionBand
      id="security"
      tone="contrast"
      indexBadge="Security and privacy"
      title="Security and privacy"
      subtitle="Manual entry today, bank connection coming soon."
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
        <div className={pillarList}>
          <div className={cardStyle}>
            <div className={pillarHeaderRow}>
              <div className={pillarIconTile}>
                <FiShield />
              </div>
              <span className={verificationBadge}>Manual entry</span>
            </div>
            <h3 className={pillarTitle}>Manual-first control</h3>
            <p className={pillarBody}>
              Use all tax, debt, mortgage, and forecasting tools with rough estimates. No bank
              connection required.
            </p>
          </div>

          <div className={cardStyle}>
            <div className={pillarHeaderRow}>
              <div className={pillarIconTile}>
                <FiClock />
              </div>
              <span className={verificationBadge}>
                <FiClock size={12} /> Coming soon
              </span>
            </div>
            <h3 className={pillarTitle}>Bank connection (coming soon)</h3>
            <p className={pillarBody}>
              Bank connection is not available yet. Flump has no feature to make payments or move
              money.
            </p>
          </div>
        </div>
      </div>
    </SectionBand>
  );
};
