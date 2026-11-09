import { Button } from "@repo/ui";
import { css } from "@repo/ui/styled-system/css";
import { flex, stack } from "@repo/ui/styled-system/patterns";
import type { FC } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { BaselineSnapshotPreview } from "../components/BaselineSnapshotPreview";
import { ComparisonMatrix } from "../components/ComparisonMatrix";
import { FeaturePillars } from "../components/FeaturePillars";
import { Footer } from "../components/Footer";
import { Header } from "../components/Header";
import { HomeFAQ } from "../components/HomeFAQ";
import { HowItWorksSection } from "../components/HowItWorksSection";
import { InteractiveFinancialTeaser } from "../components/InteractiveFinancialTeaser";
import { SecurityPrivacySection } from "../components/SecurityPrivacySection";
import { getAppUrl } from "../utils/url";

export const HomePage: FC = () => {
  const appUrl = getAppUrl();

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Helmet>
        <title>Flump | UK Wealth, Tax Optimization & Net Worth Engine</title>
        <meta
          name="description"
          content="The UK financial engine engineered for HMRC rules. Get your complete financial baseline in 60 seconds, crush high-interest debt, avoid the 60% tax trap, and model long-term wealth."
        />
        <link rel="canonical" href="https://flump.co.uk/" />
      </Helmet>

      <Header />

      <main style={{ flex: 1 }}>
        {/* Section 00: Hero Section with Architectural Grid & Radial Glow */}
        <section
          style={{
            position: "relative",
            padding: "80px 16px 72px",
            textAlign: "center",
            overflow: "hidden",
            backgroundColor: "var(--colors-background)",
          }}
        >
          {/* Subtle radial ambient spotlight backdrop */}
          <div
            style={{
              position: "absolute",
              top: "-80px",
              left: "50%",
              transform: "translateX(-50%)",
              width: "1100px",
              height: "520px",
              background:
                "radial-gradient(ellipse 70% 60% at 50% 10%, rgba(99, 102, 241, 0.16) 0%, rgba(16, 185, 129, 0.05) 45%, transparent 75%)",
              pointerEvents: "none",
              zIndex: 0,
            }}
          />

          <div
            style={{ maxWidth: "1060px", margin: "0 auto", position: "relative", zIndex: 1 }}
            className={stack({ gap: "7", align: "center" })}
          >
            <span
              style={{
                display: "inline-block",
                padding: "8px 18px",
                borderRadius: "9999px",
                backgroundColor: "var(--colors-surface-tinted)",
                color: "var(--colors-primary)",
                fontSize: "13px",
                fontWeight: "700",
                letterSpacing: "0.04em",
                fontFamily: "var(--fonts-mono)",
                boxShadow: "0 2px 8px rgba(99, 102, 241, 0.15)",
              }}
            >
              🇬🇧 ENGINEERED FOR UK RULES & HMRC THRESHOLDS
            </span>

            <h1
              style={{
                fontSize: "clamp(2.875rem, 6.5vw, 5.25rem)",
                fontWeight: "900",
                lineHeight: "1.08",
                letterSpacing: "-0.04em",
                color: "var(--colors-text-primary)",
                fontFamily: "var(--fonts-display)",
                margin: 0,
                maxWidth: "960px",
              }}
            >
              Get out of the red. <br />
              <span
                style={{
                  background: "linear-gradient(135deg, #EF4444 0%, #F59E0B 45%, #10B981 100%)",
                  backgroundClip: "text",
                  WebkitBackgroundClip: "text",
                  color: "transparent",
                }}
              >
                Build into the black.
              </span>
            </h1>

            <p
              style={{
                fontSize: "clamp(1.15rem, 2vw, 1.35rem)",
                color: "var(--colors-text-secondary)",
                maxWidth: "780px",
                lineHeight: "1.65",
                margin: 0,
              }}
            >
              Get your complete UK financial baseline in 60 seconds. Know your Net Worth, weekly
              Safe-to-Spend cash, and emergency runway—then drill down into taxes, mortgages, or
              debt payoff when you're ready.
            </p>

            <div className={flex({ gap: "4", flexWrap: "wrap", justify: "center" })}>
              <a href={`${appUrl}/signUp`} style={{ textDecoration: "none" }}>
                <Button
                  size="lg"
                  variant="primary"
                  style={{
                    padding: "16px 36px",
                    fontSize: "1.0625rem",
                    fontWeight: "700",
                    borderRadius: "12px",
                    boxShadow: "0 10px 28px -4px rgba(99, 102, 241, 0.45)",
                  }}
                >
                  Get Your 60-Second Baseline Free →
                </Button>
              </a>
              <a
                href={`${appUrl}/sandbox`}
                style={{ textDecoration: "none" }}
                target="_blank"
                rel="noreferrer"
              >
                <Button
                  size="lg"
                  variant="outline"
                  style={{
                    padding: "16px 28px",
                    fontSize: "1.0625rem",
                    borderRadius: "12px",
                  }}
                >
                  Explore Live Demo Sandbox
                </Button>
              </a>
            </div>
          </div>

          {/* 3D Wealth Engine Hero Illustration */}
          <div
            style={{
              maxWidth: "1060px",
              margin: "48px auto 0",
              position: "relative",
              zIndex: 1,
              borderRadius: "28px",
              overflow: "hidden",
              border: "1px solid var(--colors-border)",
              boxShadow: "0 24px 56px -12px rgba(0, 0, 0, 0.16)",
            }}
          >
            <img
              src="/illustrations/hero-wealth-engine.jpg"
              alt="3D Wealth Engine - Visualising financial baseline, debt elimination, and long-term net worth"
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

          {/* Clean Baseline Snapshot Preview Card with Cashflow Bar */}
          <div style={{ marginTop: "36px", position: "relative", zIndex: 1 }}>
            <BaselineSnapshotPreview />
          </div>
        </section>

        {/* Section 01: How It Works (Subtle Surface Band + Step Schematics) */}
        <HowItWorksSection />

        {/* Section 02: Core Benefits (Canvas Surface Band + Bento Micro-Diagrams) */}
        <FeaturePillars />

        {/* Section 03: Live HMRC Simulator Sandbox (Tinted Surface Band) */}
        <InteractiveFinancialTeaser />

        {/* Section 04: Comparison Matrix (Canvas Surface Band + Column Contrast) */}
        <ComparisonMatrix />

        {/* Section 05: Security & Privacy (Full-Bleed Contrast Dark Band) */}
        <SecurityPrivacySection />

        {/* Section 06: FAQ Accordion (Subtle Surface Band) */}
        <HomeFAQ />

        {/* Final CTA Banner */}
        <section
          style={{
            padding: "80px 16px",
            textAlign: "center",
            backgroundColor: "var(--colors-background)",
            borderTop: "1px solid var(--colors-border)",
          }}
        >
          <div style={{ maxWidth: "680px", margin: "0 auto" }}>
            <h2
              style={{
                fontSize: "2.5rem",
                fontWeight: "800",
                color: "var(--colors-text-primary)",
                fontFamily: "var(--fonts-display)",
                letterSpacing: "-0.03em",
                margin: "0 0 14px 0",
              }}
            >
              Ready to see your clear UK financial picture?
            </h2>
            <p
              style={{
                fontSize: "1.15rem",
                color: "var(--colors-text-secondary)",
                marginBottom: "32px",
                lineHeight: "1.6",
              }}
            >
              Start free with your 6-number baseline. No credit card, no ads, and zero complex
              setup.
            </p>
            <div className={flex({ gap: "4", justify: "center", flexWrap: "wrap" })}>
              <a href={`${appUrl}/signUp`} style={{ textDecoration: "none" }}>
                <Button size="lg" variant="primary">
                  Start Your Free Baseline Now →
                </Button>
              </a>
              <Link to="/tools" style={{ textDecoration: "none" }}>
                <Button size="lg" variant="ghost">
                  Browse Free Calculators Directory
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};
