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
            Ready to master your wealth and taxes?
          </FLPHeading>
          <FLPText color="text.muted" fontSize="lg" lineHeight="1.6">
            Join UK professionals, landlords, and independent contractors taking control of their
            net worth, mortgage timelines, and HMRC tax obligations.
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
              Get Started for Free <FiArrowRight aria-hidden="true" />
            </RouterLink>
          </FLPButton>
          <FLPButton size="lg" variant="outline">
            <RouterLink style={{ color: "inherit", textDecoration: "none" }} to="/login">
              Sign In to Account
            </RouterLink>
          </FLPButton>
        </div>

        <FLPText color="text.muted" fontSize="xs">
          Free personal tier • Zero credit card required • Open-source transparency
        </FLPText>
      </div>
    </section>
  );
};

export default HomeCTA;
