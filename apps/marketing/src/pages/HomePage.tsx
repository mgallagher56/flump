import { Button } from "@repo/ui";
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
        {/* Section 1: Hero Section + Baseline Snapshot Preview Card */}
        <section style={{ padding: "48px 16px 40px", textAlign: "center" }}>
          <div
            style={{ maxWidth: "850px", margin: "0 auto" }}
            className={stack({ gap: "6", align: "center" })}
          >
            <span
              style={{
                display: "inline-block",
                padding: "6px 14px",
                borderRadius: "9999px",
                backgroundColor: "rgba(99, 102, 241, 0.12)",
                color: "#6363F1",
                fontSize: "12px",
                fontWeight: "700",
                letterSpacing: "0.02em",
              }}
            >
              🇬🇧 Engineered Specifically for UK Personal Finance & HMRC Rules
            </span>

            <h1
              style={{
                fontSize: "clamp(2.5rem, 5vw, 4rem)",
                fontWeight: "900",
                lineHeight: "1.1",
                letterSpacing: "-0.03em",
                color: "var(--colors-text-primary, #0f172a)",
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
                color: "var(--colors-text-muted, #475569)",
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

          {/* Clean Baseline Snapshot Preview Card */}
          <div style={{ marginTop: "40px" }}>
            <BaselineSnapshotPreview />
          </div>
        </section>

        {/* Section 2: How It Works (60s Baseline -> Instant Insights -> Optional Drill-Down) */}
        <HowItWorksSection />

        {/* Section 3: Core Benefits (4 Outcome Pillars) */}
        <FeaturePillars />

        {/* Section 4: Why Flump vs Spreadsheets & Generic Apps */}
        <ComparisonMatrix />

        {/* Section 5: Security & Privacy Reassurance */}
        <SecurityPrivacySection />

        {/* Section 6: FAQ Accordion & Final CTA */}
        <HomeFAQ />

        {/* Final CTA Banner */}
        <section
          style={{
            padding: "64px 16px",
            textAlign: "center",
            backgroundColor: "rgba(99, 102, 241, 0.04)",
            borderTop: "1px solid var(--colors-border, #e2e8f0)",
          }}
        >
          <div style={{ maxWidth: "680px", margin: "0 auto" }}>
            <h2
              style={{
                fontSize: "2.25rem",
                fontWeight: "800",
                color: "var(--colors-text-primary, #0f172a)",
                margin: "0 0 12px 0",
              }}
            >
              Ready to see your clear UK financial picture?
            </h2>
            <p
              style={{
                fontSize: "1.1rem",
                color: "var(--colors-text-muted, #64748b)",
                marginBottom: "28px",
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
