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
            padding: "64px 16px 56px",
            textAlign: "center",
            overflow: "hidden",
            backgroundColor: "var(--colors-background)",
          }}
        >
          {/* Subtle radial ambient spotlight backdrop */}
          <div
            style={{
              position: "absolute",
              top: "-100px",
              left: "50%",
              transform: "translateX(-50%)",
              width: "700px",
              height: "400px",
              background:
                "radial-gradient(circle, rgba(99, 102, 241, 0.12) 0%, rgba(16, 185, 129, 0.05) 50%, transparent 70%)",
              pointerEvents: "none",
              zIndex: 0,
            }}
          />

          <div
            style={{ maxWidth: "850px", margin: "0 auto", position: "relative", zIndex: 1 }}
            className={stack({ gap: "6", align: "center" })}
          >
            <span
              style={{
                display: "inline-block",
                padding: "6px 14px",
                borderRadius: "9999px",
                backgroundColor: "rgba(99, 102, 241, 0.12)",
                color: "var(--colors-primary, #6363F1)",
                fontSize: "12px",
                fontWeight: "700",
                letterSpacing: "0.04em",
                fontFamily: "var(--fonts-mono, monospace)",
              }}
            >
              🇬🇧 ENGINEERED FOR UK RULES & HMRC THRESHOLDS
            </span>

            <h1
              style={{
                fontSize: "clamp(2.5rem, 5.5vw, 4.25rem)",
                fontWeight: "900",
                lineHeight: "1.1",
                letterSpacing: "-0.035em",
                color: "var(--colors-text-primary, #0f172a)",
                fontFamily: "var(--fonts-display, sans-serif)",
                margin: 0,
              }}
            >
              Get out of the red. <br />
              <span
                style={{
                  background: "linear-gradient(135deg, #EF4444 0%, #F59E0B 50%, #10B981 100%)",
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
                fontSize: "1.2rem",
                color: "var(--colors-text-secondary, #475569)",
                maxWidth: "660px",
                lineHeight: "1.6",
                margin: 0,
              }}
            >
              Get your complete UK financial baseline in 60 seconds. Know your Net Worth, weekly
              Safe-to-Spend cash, and emergency runway—then drill down into taxes, mortgages, or
              debt payoff when you're ready.
            </p>

            <div className={flex({ gap: "4", flexWrap: "wrap", justify: "center" })}>
              <a href={`${appUrl}/signUp`} style={{ textDecoration: "none" }}>
                <Button size="lg" variant="primary">
                  Get Your 60-Second Baseline Free →
                </Button>
              </a>
              <a
                href={`${appUrl}/sandbox`}
                style={{ textDecoration: "none" }}
                target="_blank"
                rel="noreferrer"
              >
                <Button size="lg" variant="outline">
                  Explore Live Demo Sandbox
                </Button>
              </a>
            </div>
          </div>

          {/* Clean Baseline Snapshot Preview Card with Cashflow Bar */}
          <div style={{ marginTop: "48px", position: "relative", zIndex: 1 }}>
            <BaselineSnapshotPreview />
          </div>
        </section>

        {/* Section 01: How It Works (Subtle Surface Band + Step Schematics) */}
        <HowItWorksSection />

        {/* Section 02: Core Benefits (Canvas Surface Band + Bento Micro-Diagrams) */}
        <FeaturePillars />

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
            borderTop: "1px solid var(--colors-border, #e2e8f0)",
          }}
        >
          <div style={{ maxWidth: "680px", margin: "0 auto" }}>
            <h2
              style={{
                fontSize: "2.5rem",
                fontWeight: "800",
                color: "var(--colors-text-primary, #0f172a)",
                fontFamily: "var(--fonts-display, sans-serif)",
                letterSpacing: "-0.03em",
                margin: "0 0 14px 0",
              }}
            >
              Ready to see your clear UK financial picture?
            </h2>
            <p
              style={{
                fontSize: "1.15rem",
                color: "var(--colors-text-secondary, #64748b)",
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
