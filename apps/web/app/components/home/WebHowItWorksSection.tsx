import { css } from "@repo/ui/styled-system/css";
import type { FC } from "react";
import { FiArrowRight, FiCheckCircle, FiEdit3, FiSliders } from "react-icons/fi";
import FLPHeading from "~/components/core/typography/FLPHeading";
import FLPText from "~/components/core/typography/FLPText";

const containerStyle = css({
  maxWidth: "6xl",
  margin: "0 auto",
  paddingTop: { base: "48px", md: "64px" },
  paddingBottom: { base: "48px", md: "64px" },
  paddingLeft: "16px",
  paddingRight: "16px",
});

const stepCardStyle = css({
  backgroundColor: "card",
  border: "1px solid",
  borderColor: "border",
  borderRadius: "2xl",
  padding: "24px",
  display: "flex",
  flexDirection: "column",
  gap: "12px",
  boxShadow: "card",
  transition: "transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease",
  _hover: {
    transform: "translateY(-3px)",
    boxShadow: "cardHover",
    borderColor: "primary",
  },
});

const stepNumberBadge = css({
  fontSize: "12px",
  fontWeight: "800",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: "primary",
  backgroundColor: "surface.tinted",
  border: "1px solid",
  borderColor: { base: "rgba(99, 102, 241, 0.25)", _dark: "rgba(99, 102, 241, 0.3)" },
  padding: "4px 10px",
  borderRadius: "full",
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  width: "fit-content",
});

export const WebHowItWorksSection: FC = () => {
  return (
    <section
      className={containerStyle}
      data-testid="how-it-works-section"
      id="how-it-works-section"
    >
      <div style={{ textAlign: "center", marginBottom: "40px" }}>
        <span
          style={{
            fontSize: "12px",
            fontWeight: "700",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: "var(--colors-primary)",
          }}
        >
          How it works
        </span>
        <FLPHeading as="h2" color="text.primary" mt={2} size="3xl">
          How Flump works in 3 simple steps
        </FLPHeading>
        <FLPText
          color="text.muted"
          fontSize="md"
          style={{ maxWidth: "620px", margin: "12px auto 0" }}
        >
          Skip weeks of spreadsheet configuration. Start with rough numbers in under a minute, then
          add detail only where you choose.
        </FLPText>
      </div>

      <div
        className={css({
          display: "grid",
          gridTemplateColumns: { base: "1fr", md: "repeat(3, 1fr)" },
          gap: "24px",
        })}
      >
        <div className={stepCardStyle}>
          <span className={stepNumberBadge}>
            <FiEdit3 size={13} /> Step 1 · 60s
          </span>
          <FLPHeading as="h3" size="lg">
            Enter 6 rough numbers
          </FLPHeading>
          <FLPText color="text.muted" fontSize="sm" lineHeight="1.6">
            Input your top-level estimates without bank logins, passwords, or CSV imports.
          </FLPText>
          <div
            style={{
              marginTop: "auto",
              paddingTop: "12px",
              fontSize: "12px",
              color: "var(--colors-status-positive-text)",
              fontWeight: "600",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <FiCheckCircle size={14} /> Zero setup friction
          </div>
        </div>

        <div className={stepCardStyle}>
          <span className={stepNumberBadge}>
            <FiSliders size={13} /> Step 2 · Instant
          </span>
          <FLPHeading as="h3" size="lg">
            See your numbers immediately
          </FLPHeading>
          <FLPText color="text.muted" fontSize="sm" lineHeight="1.6">
            Immediately view your true net worth, weekly safe to spend allowance, emergency runway,
            and UK take-home pay breakdown.
          </FLPText>
          <div
            style={{
              marginTop: "auto",
              paddingTop: "12px",
              fontSize: "12px",
              color: "var(--colors-primary)",
              fontWeight: "600",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <FiCheckCircle size={14} /> Built-in HMRC and National Insurance rules
          </div>
        </div>

        <div className={stepCardStyle}>
          <span className={stepNumberBadge}>
            <FiArrowRight size={13} /> Step 3 · On demand
          </span>
          <FLPHeading as="h3" size="lg">
            Drill down when you need to
          </FLPHeading>
          <FLPText color="text.muted" fontSize="sm" lineHeight="1.6">
            Explore individual tools for mortgage overpayments, the £100k tax trap, or debt payoff
            at your own pace.
          </FLPText>
          <div
            style={{
              marginTop: "auto",
              paddingTop: "12px",
              fontSize: "12px",
              color: "#0ea5e9",
              fontWeight: "600",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <FiCheckCircle size={14} /> Progressive depth, no overwhelm
          </div>
        </div>
      </div>
    </section>
  );
};

export default WebHowItWorksSection;
