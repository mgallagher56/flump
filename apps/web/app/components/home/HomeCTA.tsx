import { css } from "@repo/ui/styled-system/css";
import type { FC } from "react";
import { FiArrowRight } from "react-icons/fi";
import { Link as RouterLink } from "react-router";
import FLPButton from "~/components/core/buttons/FLPButton";
import FLPHeading from "~/components/core/typography/FLPHeading";
import FLPText from "~/components/core/typography/FLPText";

const containerStyle = css({
  maxWidth: "5xl",
  margin: "0 auto",
  paddingLeft: "16px",
  paddingRight: "16px",
  marginBottom: { base: "64px", md: "80px" },
});

const ctaCardStyle = css({
  position: "relative",
  overflow: "hidden",
  borderRadius: "3xl",
  padding: { base: "40px 24px", md: "64px 48px" },
  textAlign: "center",
  backgroundColor: "surface",
  border: "1px solid",
  borderColor: "rgba(99, 102, 241, 0.3)",
  boxShadow: "0 20px 40px rgba(99, 102, 241, 0.08)",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: "24px",
});

const buttonStackStyle = css({
  display: "flex",
  flexDirection: { base: "column", sm: "row" },
  gap: "16px",
  width: { base: "100%", sm: "auto" },
  marginTop: "8px",
});

export const HomeCTA: FC = () => {
  return (
    <section aria-labelledby="cta-heading" className={containerStyle}>
      <div className={ctaCardStyle}>
        <div style={{ maxWidth: "680px" }}>
          <FLPHeading as="h2" color="text.primary" id="cta-heading" mb={3} size="3xl">
            Your financial baseline in 60 seconds.
          </FLPHeading>
          <FLPText color="text.muted" fontSize="lg" lineHeight="1.6">
            Start with 6 rough numbers. See your true net worth, safe to spend allowance, and
            emergency runway immediately.
          </FLPText>
        </div>

        <div className={buttonStackStyle}>
          <FLPButton size="lg">
            <RouterLink
              style={{
                color: "inherit",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
              }}
              to="/signUp"
            >
              Get started free <FiArrowRight aria-hidden="true" />
            </RouterLink>
          </FLPButton>
          <FLPButton size="lg" variant="outline">
            <RouterLink style={{ color: "inherit", textDecoration: "none" }} to="/login">
              Sign in
            </RouterLink>
          </FLPButton>
        </div>

        <FLPText color="text.muted" fontSize="xs">
          Free manual tier · No credit card required · FCA Open Banking
        </FLPText>
      </div>
    </section>
  );
};

export default HomeCTA;
