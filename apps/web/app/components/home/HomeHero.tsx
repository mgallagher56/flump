import { css } from "@repo/ui/styled-system/css";
import type { FC } from "react";
import { FiArrowRight, FiCheckCircle, FiLock, FiPieChart, FiTrendingUp } from "react-icons/fi";
import { Link as RouterLink } from "react-router";
import FLPButton from "~/components/core/buttons/FLPButton";
import FLPHeading from "~/components/core/typography/FLPHeading";
import FLPText from "~/components/core/typography/FLPText";
import WebBaselineSnapshotPreview from "./WebBaselineSnapshotPreview";

const heroContainerStyle = css({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  textAlign: "center",
  maxWidth: { base: "100%", lg: "1160px", xl: "1280px" },
  margin: "0 auto",
  paddingTop: { base: "48px", md: "72px", lg: "96px" },
  paddingBottom: { base: "44px", md: "64px", lg: "80px" },
  paddingLeft: "16px",
  paddingRight: "16px",
  position: "relative",
});

const badgeStyle = css({
  display: "inline-flex",
  alignItems: "center",
  gap: "10px",
  borderRadius: "full",
  backgroundColor: "rgba(99, 102, 241, 0.12)",
  border: "1px solid",
  borderColor: "rgba(99, 102, 241, 0.28)",
  color: "primary",
  padding: "8px 20px",
  fontSize: "sm",
  fontWeight: "semibold",
  marginBottom: "28px",
  letterSpacing: "0.02em",
  boxShadow: "0 2px 8px rgba(99, 102, 241, 0.15)",
});

const ctaStackStyle = css({
  display: "flex",
  flexDirection: { base: "column", sm: "row" },
  alignItems: "center",
  justifyContent: "center",
  gap: "18px",
  marginTop: "36px",
  width: { base: "100%", sm: "auto" },
});

const trustBarContainer = css({
  display: "grid",
  gridTemplateColumns: { base: "repeat(2, 1fr)", md: "repeat(4, 1fr)" },
  gap: "16px",
  width: "100%",
  maxWidth: "1060px",
  marginTop: { base: "40px", md: "52px" },
  padding: "18px 24px",
  backgroundColor: "surface",
  border: "1px solid",
  borderColor: "border",
  borderRadius: "xl",
  boxShadow: "card",
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
      {/* Ambient Hero Spotlight Glow */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: "0",
          left: "50%",
          transform: "translateX(-50%)",
          width: "min(100vw, 1100px)",
          height: "520px",
          background:
            "radial-gradient(ellipse 70% 60% at 50% 10%, rgba(99, 102, 241, 0.16) 0%, rgba(16, 185, 129, 0.05) 45%, transparent 75%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <span className={badgeStyle}>
          <span>🇬🇧</span> Built for UK personal finance and HMRC rules
        </span>

        <h1
          id="hero-heading"
          style={{
            fontSize: "clamp(2.875rem, 6.5vw, 5.25rem)",
            fontWeight: "900",
            lineHeight: "1.08",
            letterSpacing: "-0.04em",
            color: "var(--colors-text-primary)",
            fontFamily: "var(--fonts-display, 'Plus Jakarta Sans', sans-serif)",
            margin: "0 0 20px 0",
            textAlign: "center",
            maxWidth: "960px",
          }}
        >
          Your complete UK financial picture in 60 seconds.
        </h1>

        <FLPText
          color="text.muted"
          fontSize="lg"
          lineHeight="1.65"
          style={{ maxWidth: "780px", margin: "0 auto", fontSize: "clamp(1.15rem, 2vw, 1.35rem)" }}
        >
          Enter 6 rough numbers to calculate your net worth, weekly safe to spend, and emergency
          runway – then drill down into tax, mortgage overpayments, or debt payoff when you need to.
        </FLPText>

        <div className={ctaStackStyle}>
          <FLPButton
            size="lg"
            style={{
              padding: "16px 36px",
              fontSize: "1.0625rem",
              fontWeight: "700",
              borderRadius: "12px",
              boxShadow: "0 10px 28px -4px rgba(99, 102, 241, 0.45)",
            }}
          >
            <RouterLink
              style={{
                color: "inherit",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: "10px",
              }}
              to="/signUp"
            >
              Get your free baseline <FiArrowRight aria-hidden="true" />
            </RouterLink>
          </FLPButton>
          <FLPButton
            size="lg"
            variant="outline"
            style={{
              padding: "16px 28px",
              fontSize: "1.0625rem",
              borderRadius: "12px",
            }}
          >
            <RouterLink style={{ color: "inherit", textDecoration: "none" }} to="/login">
              Sign in
            </RouterLink>
          </FLPButton>
          <FLPButton
            size="lg"
            variant="ghost"
            style={{
              padding: "16px 24px",
              fontSize: "1.0625rem",
              borderRadius: "12px",
            }}
          >
            <RouterLink
              style={{
                color: "inherit",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
              }}
              to="/?demo=true"
            >
              Try the live demo →
            </RouterLink>
          </FLPButton>
        </div>

        {/* Wealth Engine Hero Illustration */}
        <div
          className={css({
            maxWidth: "1060px",
            width: "100%",
            margin: "48px auto 0",
            borderRadius: "3xl",
            overflow: "hidden",
            border: "1px solid",
            borderColor: "border",
            boxShadow: {
              base: "0 20px 48px rgba(0, 0, 0, 0.1)",
              _dark: "0 28px 64px rgba(0, 0, 0, 0.6), 0 0 60px rgba(99, 102, 241, 0.18)",
            },
            position: "relative",
          })}
        >
          <img
            src="/illustrations/hero-wealth-engine.jpg"
            alt="Visual summary of financial baseline, debt payoff, and net worth"
            loading="eager"
            style={{
              width: "100%",
              maxHeight: "560px",
              objectFit: "cover",
              objectPosition: "center 48%",
              display: "block",
            }}
          />
        </div>

        {/* Clean Baseline Snapshot Preview Card */}
        <WebBaselineSnapshotPreview />

        <div className={trustBarContainer}>
          <div className={trustItem}>
            <FiCheckCircle aria-hidden="true" className={trustIconStyle} />
            <span>FCA read-only Open Banking and 256-bit encryption</span>
          </div>
          <div className={trustItem}>
            <FiPieChart aria-hidden="true" className={trustIconStyle} />
            <span>Section 24 landlord and HMRC tax bands</span>
          </div>
          <div className={trustItem}>
            <FiTrendingUp aria-hidden="true" className={trustIconStyle} />
            <span>£20k ISA and £60k pension allowances</span>
          </div>
          <div className={trustItem}>
            <FiLock aria-hidden="true" className={trustIconStyle} />
            <span>No ad tracking or data selling</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HomeHero;
