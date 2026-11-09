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

const contentLayout = css({
  display: "grid",
  gridTemplateColumns: { base: "1fr", lg: "5fr 7fr" },
  gap: { base: "32px", lg: "40px" },
  alignItems: "center",
  marginTop: "40px",
});

const illustrationContainer = css({
  borderRadius: "2xl",
  overflow: "hidden",
  border: "1px solid",
  borderColor: "border",
  backgroundColor: "surface.subtle",
  boxShadow: "0 12px 32px rgba(0, 0, 0, 0.08)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
});

const featureStackStyle = css({
  display: "flex",
  flexDirection: "column",
  gap: "24px",
});

const featureItemStyle = css({
  display: "flex",
  alignItems: "flex-start",
  gap: "16px",
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
  flexShrink: 0,
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

        <div className={contentLayout}>
          {/* 3D Security Vault Illustration */}
          <div className={illustrationContainer}>
            <img
              src="/illustrations/security-vault-shield.jpg"
              alt="Bank-Grade Security Vault Shield with Cryptographic Protection"
              loading="lazy"
              style={{
                width: "100%",
                height: "auto",
                display: "block",
                borderRadius: "16px",
              }}
            />
          </div>

          <div className={featureStackStyle}>
            <div className={featureItemStyle}>
              <div className={iconBoxStyle}>
                <FiLock aria-hidden="true" />
              </div>
              <div>
                <FLPHeading as="h3" color="text.primary" size="md">
                  WorkOS AuthKit
                </FLPHeading>
                <FLPText
                  color="text.muted"
                  fontSize="sm"
                  lineHeight="1.6"
                  style={{ marginTop: "4px" }}
                >
                  Enterprise-grade authentication with Passkeys, biometric FaceID/TouchID,
                  passwordless magic links, and SSO. We never store raw passwords.
                </FLPText>
              </div>
            </div>

            <div className={featureItemStyle}>
              <div className={iconBoxStyle}>
                <FiEyeOff aria-hidden="true" />
              </div>
              <div>
                <FLPHeading as="h3" color="text.primary" size="md">
                  Zero Financial Telemetry
                </FLPHeading>
                <FLPText
                  color="text.muted"
                  fontSize="sm"
                  lineHeight="1.6"
                  style={{ marginTop: "4px" }}
                >
                  We never sell your spending trends, net worth data, or transaction history to
                  third-party marketers, insurance companies, or credit brokers.
                </FLPText>
              </div>
            </div>

            <div className={featureItemStyle}>
              <div className={iconBoxStyle}>
                <FiCode aria-hidden="true" />
              </div>
              <div>
                <FLPHeading as="h3" color="text.primary" size="md">
                  Open & Deterministic
                </FLPHeading>
                <FLPText
                  color="text.muted"
                  fontSize="sm"
                  lineHeight="1.6"
                  style={{ marginTop: "4px" }}
                >
                  All tax rules and compound interest engines in our domain package are transparent
                  and testable. Complete mathematical accuracy without black boxes.
                </FLPText>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SecurityPrivacySection;
