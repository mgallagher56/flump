import { css } from "@repo/ui/styled-system/css";
import { grid } from "@repo/ui/styled-system/patterns";
import type { FC } from "react";
import { FiClock, FiShield } from "react-icons/fi";
import { DisclosurePolicySection } from "../components/DisclosurePolicySection";
import { Footer } from "../components/Footer";
import { Header } from "../components/Header";
import { PageMeta } from "../components/PageMeta";

const containerStyle = css({
  maxWidth: "5xl",
  mx: "auto",
  py: "16",
  px: "4",
});

const sectionCardStyle = css({
  backgroundColor: "surface.card",
  border: "1px solid",
  borderColor: "border",
  borderRadius: "2xl",
  p: { base: "6", md: "8" },
  mb: "8",
});

const iconTileStyle = css({
  width: "44px",
  height: "44px",
  borderRadius: "12px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "20px",
  marginBottom: "16px",
});

const iconTileTones = {
  positive: css({ backgroundColor: "status.positive.bg", color: "status.positive.text" }),
  neutral: css({ backgroundColor: "status.neutral.bg", color: "status.neutral.text" }),
};

const securityTitleStyle = css({
  fontSize: "1.25rem",
  fontWeight: "700",
  color: "text.primary",
  marginBottom: "8px",
});

const securityDescStyle = css({
  fontSize: "14px",
  color: "text.secondary",
  lineHeight: "1.7",
});

const eyebrowStyle = css({
  fontSize: "12px",
  fontWeight: "600",
  letterSpacing: "0.01em",
  color: "status.positive.text",
});

const heroTitleStyle = css({
  fontSize: "clamp(2rem, 4vw, 3rem)",
  fontWeight: "800",
  color: "text.primary",
  marginTop: "8px",
});

const heroBodyStyle = css({
  fontSize: "1.1rem",
  color: "text.secondary",
  maxWidth: "620px",
  margin: "12px auto 0",
});

export const SecurityPage: FC = () => {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <PageMeta
        title="Security and privacy | Flump"
        description="Flump has no feature to make payments or move money. Bank connection is coming soon."
      />

      <Header />

      <main style={{ flex: 1 }} id="main" tabIndex={-1}>
        <section className={containerStyle}>
          <div style={{ textAlign: "center", marginBottom: "40px" }}>
            <span className={eyebrowStyle}>Trust and transparency hub</span>
            <h1 className={heroTitleStyle}>Security and privacy</h1>
            <p className={heroBodyStyle}>
              Flump has no feature to make payments or move money. Bank connection is coming soon.
            </p>
          </div>

          <div className={grid({ columns: { base: 1, md: 2 }, gap: "6", mb: "12" })}>
            <div className={sectionCardStyle}>
              <div className={`${iconTileStyle} ${iconTileTones.positive}`}>
                <FiShield />
              </div>
              <h2 className={securityTitleStyle}>No payments, by design</h2>
              <p className={securityDescStyle}>
                Flump has no feature to make payments or move money.
              </p>
            </div>

            <div className={sectionCardStyle}>
              <div className={`${iconTileStyle} ${iconTileTones.neutral}`}>
                <FiClock />
              </div>
              <h2 className={securityTitleStyle}>Bank connection: coming soon</h2>
              <p className={securityDescStyle}>
                Bank connection is not available yet. You enter your own figures today.
              </p>
            </div>
          </div>

          <DisclosurePolicySection />
        </section>
      </main>

      <Footer />
    </div>
  );
};
