import { css } from "@repo/ui/styled-system/css";
import type { FC } from "react";
import { FiArrowRight, FiCheckCircle, FiLock, FiPieChart, FiTrendingUp } from "react-icons/fi";
import { Link as RouterLink } from "react-router";
import FLPButton from "~/components/core/buttons/FLPButton";
import FLPHeading from "~/components/core/typography/FLPHeading";
import FLPText from "~/components/core/typography/FLPText";

const heroContainerStyle = css({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  textAlign: "center",
  maxWidth: "4xl",
  margin: "0 auto",
  paddingTop: { base: "32px", md: "56px" },
  paddingBottom: { base: "40px", md: "56px" },
  paddingLeft: "16px",
  paddingRight: "16px",
});

const badgeStyle = css({
  display: "inline-flex",
  alignItems: "center",
  gap: "8px",
  borderRadius: "full",
  backgroundColor: "rgba(99, 102, 241, 0.12)",
  border: "1px solid",
  borderColor: "rgba(99, 102, 241, 0.25)",
  color: "primary",
  padding: "6px 16px",
  fontSize: "xs",
  fontWeight: "semibold",
  marginBottom: "24px",
  letterSpacing: "0.02em",
  boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
});

const ctaStackStyle = css({
  display: "flex",
  flexDirection: { base: "column", sm: "row" },
  alignItems: "center",
  justifyContent: "center",
  gap: "16px",
  marginTop: "32px",
  width: { base: "100%", sm: "auto" },
});

const trustBarContainer = css({
  display: "grid",
  gridTemplateColumns: { base: "repeat(2, 1fr)", md: "repeat(4, 1fr)" },
  gap: "16px",
  width: "100%",
  maxWidth: "4xl",
  marginTop: { base: "40px", md: "56px" },
  padding: "16px 20px",
  backgroundColor: "surface",
  border: "1px solid",
  borderColor: "border",
  borderRadius: "xl",
});

const trustItem = css({
  display: "flex",
  alignItems: "center",
  gap: "10px",
  fontSize: "xs",
  color: "text.muted",
  textAlign: "left",
  fontWeight: "medium",
});

const trustIconStyle = css({
  flexShrink: 0,
  color: "primary",
  fontSize: "16px",
});

export const HomeHero: FC = () => {
  return (
    <section aria-labelledby="hero-heading" className={heroContainerStyle}>
      <span className={badgeStyle}>
        <span>🇬🇧</span> Built Specifically for UK Personal Finance & HMRC Rules
      </span>

      <FLPHeading as="h1" color="text.primary" mb={4} size="4xl">
        Master your wealth. <br />
        <span
          className={css({
            background: "linear-gradient(135deg, #6366F1 0%, #8B5CF6 50%, #EC4899 100%)",
            backgroundClip: "text",
            color: "transparent",
            display: "inline-block",
          })}
        >
          Eliminate tax surprises.
        </span>{" "}
        Plan your future.
      </FLPHeading>

      <FLPText
        color="text.muted"
        fontSize="lg"
        lineHeight="1.6"
        style={{ maxWidth: "700px", margin: "0 auto" }}
      >
        Track your entire net worth across bank accounts, investments, pensions, and mortgages.
        Demystify the £100k tax trap, calculate Section 24 rental profits, and stress-test your
        mortgage against ISA returns—with zero tracker telemetry.
      </FLPText>

      <div className={ctaStackStyle}>
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
            Start Free Today <FiArrowRight aria-hidden="true" />
          </RouterLink>
        </FLPButton>
        <FLPButton size="lg" variant="outline">
          <RouterLink style={{ color: "inherit", textDecoration: "none" }} to="/login">
            Sign In to Account
          </RouterLink>
        </FLPButton>
      </div>

      <div className={trustBarContainer}>
        <div className={trustItem}>
          <FiCheckCircle aria-hidden="true" className={trustIconStyle} />
          <span>HMRC Bands & £100k Taper</span>
        </div>
        <div className={trustItem}>
          <FiPieChart aria-hidden="true" className={trustIconStyle} />
          <span>Section 24 Landlord Rules</span>
        </div>
        <div className={trustItem}>
          <FiTrendingUp aria-hidden="true" className={trustIconStyle} />
          <span>Compound Wealth & Pensions</span>
        </div>
        <div className={trustItem}>
          <FiLock aria-hidden="true" className={trustIconStyle} />
          <span>Bank-Grade WorkOS Auth</span>
        </div>
      </div>
    </section>
  );
};

export default HomeHero;
