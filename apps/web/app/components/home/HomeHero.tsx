import { css } from "@repo/ui/styled-system/css";
import type { FC } from "react";
import { FiArrowRight, FiCheckCircle, FiLock, FiPieChart, FiTrendingUp } from "react-icons/fi";
import { Link as RouterLink } from "react-router";
import FLPButton from "~/components/core/buttons/FLPButton";
import FLPHeading from "~/components/core/typography/FLPHeading";
import FLPText from "~/components/core/typography/FLPText";
import WealthCheckHeroWidget from "./WealthCheckHeroWidget";

const heroContainerStyle = css({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  textAlign: "center",
  maxWidth: "5xl",
  margin: "0 auto",
  paddingTop: { base: "32px", md: "56px" },
  paddingBottom: { base: "32px", md: "48px" },
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
  marginTop: "28px",
  width: { base: "100%", sm: "auto" },
});

const trustBarContainer = css({
  display: "grid",
  gridTemplateColumns: { base: "repeat(2, 1fr)", md: "repeat(4, 1fr)" },
  gap: "16px",
  width: "100%",
  maxWidth: "4xl",
  marginTop: { base: "36px", md: "48px" },
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
        Stop guessing your financial future. <br />
        <span
          className={css({
            background: "linear-gradient(135deg, #6366F1 0%, #8B5CF6 50%, #EC4899 100%)",
            backgroundClip: "text",
            color: "transparent",
            display: "inline-block",
          })}
        >
          Model it.
        </span>{" "}
        Master your UK wealth.
      </FLPHeading>

      <FLPText
        color="text.muted"
        fontSize="lg"
        lineHeight="1.6"
        style={{ maxWidth: "750px", margin: "0 auto" }}
      >
        The UK wealth and tax engine. Track net worth across accounts and pensions, escape the £100k
        tax trap, stress-test your mortgage against ISA yields, and forecast 30 years ahead—in one
        unified workspace.
      </FLPText>

      {/* The 30-Second UK Wealth Check Interactive Sandbox */}
      <WealthCheckHeroWidget />

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
        <FLPButton size="lg" variant="ghost">
          <RouterLink
            style={{
              color: "inherit",
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
            }}
            to="/?demo=true"
          >
            Explore Live Sandbox →
          </RouterLink>
        </FLPButton>
      </div>

      <div className={trustBarContainer}>
        <div className={trustItem}>
          <FiCheckCircle aria-hidden="true" className={trustIconStyle} />
          <span>FCA Read-Only Open Banking & 256-Bit TLS</span>
        </div>
        <div className={trustItem}>
          <FiPieChart aria-hidden="true" className={trustIconStyle} />
          <span>Section 24 Landlord & 2026/27 Tax Bands</span>
        </div>
        <div className={trustItem}>
          <FiTrendingUp aria-hidden="true" className={trustIconStyle} />
          <span>£20k ISA & £60k Pension Allowances</span>
        </div>
        <div className={trustItem}>
          <FiLock aria-hidden="true" className={trustIconStyle} />
          <span>Zero Ad Tracking or Data Selling</span>
        </div>
      </div>
    </section>
  );
};

export default HomeHero;
