import { css } from "@repo/ui/styled-system/css";
import { grid } from "@repo/ui/styled-system/patterns";
import type { FC } from "react";
import { FiLock, FiShield, FiSlash } from "react-icons/fi";

const containerStyle = css({
  maxWidth: "5xl",
  mx: "auto",
  py: "16",
  px: "4",
});

const cardStyle = css({
  backgroundColor: { base: "#ffffff", _dark: "dark.surface" },
  border: "1px solid",
  borderColor: { base: "slate.200", _dark: "slate.800" },
  borderRadius: "2xl",
  p: { base: "6", md: "8" },
  boxShadow: { base: "0 4px 16px rgba(0,0,0,0.03)", _dark: "0 4px 16px rgba(0,0,0,0.2)" },
});

const featureItemStyle = css({
  display: "flex",
  gap: "12px",
  alignItems: "flex-start",
});

export const SecurityPrivacySection: FC = () => {
  return (
    <section className={containerStyle} data-testid="security-privacy-section">
      <div className={cardStyle}>
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <span
            style={{
              fontSize: "12px",
              fontWeight: "700",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "#10b981",
            }}
          >
            Bank-Grade Trust & Compliance
          </span>
          <h2
            style={{
              fontSize: "2rem",
              fontWeight: "800",
              color: "var(--colors-text-primary, #0f172a)",
              marginTop: "8px",
            }}
          >
            Your Financial Privacy Comes First
          </h2>
          <p
            style={{
              fontSize: "1rem",
              color: "var(--colors-text-muted, #64748b)",
              maxWidth: "600px",
              margin: "8px auto 0",
            }}
          >
            Designed from day one to operate fully without mandatory bank account links or
            credential sharing.
          </p>
        </div>

        <div className={grid({ columns: { base: 1, md: 3 }, gap: "6" })}>
          <div className={featureItemStyle}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "10px",
                backgroundColor: "rgba(16, 185, 129, 0.1)",
                color: "#10b981",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <FiShield size={20} />
            </div>
            <div>
              <h4 style={{ fontSize: "1rem", fontWeight: "700", margin: "0 0 4px 0" }}>
                100% Manual-First Mode
              </h4>
              <p
                style={{
                  fontSize: "13px",
                  color: "var(--colors-text-muted, #64748b)",
                  margin: 0,
                  lineHeight: "1.5",
                }}
              >
                Keep complete control. You can use all tax, debt, mortgage, and forecasting features
                by entering rough totals by hand.
              </p>
            </div>
          </div>

          <div className={featureItemStyle}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "10px",
                backgroundColor: "rgba(99, 102, 241, 0.1)",
                color: "#6363f1",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <FiLock size={20} />
            </div>
            <div>
              <h4 style={{ fontSize: "1rem", fontWeight: "700", margin: "0 0 4px 0" }}>
                FCA Read-Only Open Banking
              </h4>
              <p
                style={{
                  fontSize: "13px",
                  color: "var(--colors-text-muted, #64748b)",
                  margin: 0,
                  lineHeight: "1.5",
                }}
              >
                If you choose to sync accounts, connections are strictly read-only through
                FCA-regulated Open Banking. We can never move money.
              </p>
            </div>
          </div>

          <div className={featureItemStyle}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "10px",
                backgroundColor: "rgba(245, 158, 11, 0.1)",
                color: "#f59e0b",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <FiSlash size={20} />
            </div>
            <div>
              <h4 style={{ fontSize: "1rem", fontWeight: "700", margin: "0 0 4px 0" }}>
                Zero Ads or Data Selling
              </h4>
              <p
                style={{
                  fontSize: "13px",
                  color: "var(--colors-text-muted, #64748b)",
                  margin: 0,
                  lineHeight: "1.5",
                }}
              >
                We do not sell your personal or financial data to lenders, mortgage brokers, or
                marketing networks. Period.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
