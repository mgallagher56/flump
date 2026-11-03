import { css } from "@repo/ui/styled-system/css";
import type { FC } from "react";
import { FiCode, FiEyeOff, FiLock } from "react-icons/fi";
import FLPHeading from "~/components/core/typography/FLPHeading";
import FLPText from "~/components/core/typography/FLPText";

const containerStyle = css({
  maxWidth: "5xl",
  margin: "0 auto",
  paddingLeft: "16px",
  paddingRight: "16px",
  marginBottom: { base: "64px", md: "96px" },
});

const bannerCardStyle = css({
  backgroundColor: "surface",
  border: "1px solid",
  borderColor: "border",
  borderRadius: "2xl",
  padding: { base: "32px 20px", md: "48px 40px" },
  boxShadow: "sm",
});

const gridStyle = css({
  display: "grid",
  gridTemplateColumns: { base: "1fr", md: "repeat(3, 1fr)" },
  gap: "32px",
  marginTop: "40px",
});

const featureItemStyle = css({
  display: "flex",
  flexDirection: "column",
  gap: "12px",
});

const iconBoxStyle = css({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "44px",
  height: "44px",
  borderRadius: "xl",
  backgroundColor: "rgba(99, 102, 241, 0.12)",
  color: "primary",
  fontSize: "20px",
});

export const SecurityPrivacySection: FC = () => {
  return (
    <section aria-labelledby="security-heading" className={containerStyle}>
      <div className={bannerCardStyle}>
        <div style={{ textAlign: "center", maxWidth: "650px", margin: "0 auto" }}>
          <span
            className={css({
              color: "primary",
              fontSize: "xs",
              fontWeight: "bold",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              display: "block",
              marginBottom: "8px",
            })}
          >
            Privacy First
          </span>
          <FLPHeading as="h2" color="text.primary" id="security-heading" mb={3} size="3xl">
            Bank-grade security. Zero ad tracking.
          </FLPHeading>
          <FLPText color="text.muted" fontSize="md">
            Your financial data is deeply personal. We believe personal finance software should be
            transparent, secure, and completely free from ad-network spyware.
          </FLPText>
        </div>

        <div className={gridStyle}>
          <div className={featureItemStyle}>
            <div className={iconBoxStyle}>
              <FiLock aria-hidden="true" />
            </div>
            <FLPHeading as="h3" color="text.primary" size="md">
              WorkOS AuthKit
            </FLPHeading>
            <FLPText color="text.muted" fontSize="sm" lineHeight="1.6">
              Enterprise-grade authentication with Passkeys, biometric FaceID/TouchID, passwordless
              magic links, and SSO. We never store raw passwords.
            </FLPText>
          </div>

          <div className={featureItemStyle}>
            <div className={iconBoxStyle}>
              <FiEyeOff aria-hidden="true" />
            </div>
            <FLPHeading as="h3" color="text.primary" size="md">
              Zero Financial Telemetry
            </FLPHeading>
            <FLPText color="text.muted" fontSize="sm" lineHeight="1.6">
              We never sell your spending trends, net worth data, or transaction history to
              third-party marketers, insurance companies, or credit brokers.
            </FLPText>
          </div>

          <div className={featureItemStyle}>
            <div className={iconBoxStyle}>
              <FiCode aria-hidden="true" />
            </div>
            <FLPHeading as="h3" color="text.primary" size="md">
              Open & Deterministic
            </FLPHeading>
            <FLPText color="text.muted" fontSize="sm" lineHeight="1.6">
              All tax rules and compound interest engines in our domain package are transparent and
              testable. Complete mathematical accuracy without black boxes.
            </FLPText>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SecurityPrivacySection;
