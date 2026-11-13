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
import { InteractiveFinancialTeaser } from "../components/InteractiveFinancialTeaser";
import { McpSpotlightSection } from "../components/McpSpotlightSection";
import { SecurityPrivacySection } from "../components/SecurityPrivacySection";
import { getAppUrl } from "../utils/url";

export const HomePage: FC = () => {
  const appUrl = getAppUrl();

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Helmet>
        <title>Flump | UK wealth, tax planning and net worth</title>
        <meta
          name="description"
          content="Get your complete UK financial picture in 60 seconds. Know your net worth, safe to spend, emergency runway, and tax savings – built specifically for UK rules."
        />
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
              🇬🇧 Built for UK tax rules
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
              Your complete UK financial picture in 60 seconds.
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
              Enter 6 rough numbers to calculate your net worth, weekly safe to spend, and emergency
              runway – then drill down into tax, mortgage overpayments, or debt payoff when you need
              to.
            </p>

            <div className={flex({ gap: "4", flexWrap: "wrap", justify: "center" })}>
              <a href={`${appUrl}/signup`} style={{ textDecoration: "none" }}>
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
                  Get your free baseline →
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
                  Try the live demo
                </Button>
              </a>
            </div>
          </div>

          {/* Clean Baseline Snapshot Preview Card with Cashflow Bar */}
          <div style={{ marginTop: "44px", position: "relative", zIndex: 1 }}>
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

        {/* Section 06: Official Model Context Protocol (MCP) Spotlight */}
        <McpSpotlightSection />

        {/* Section 07: FAQ Accordion (Subtle Surface Band) */}
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
              Start with your 6-number baseline. No bank login needed.
            </p>
            <div className={flex({ gap: "4", justify: "center", flexWrap: "wrap" })}>
              <a href={`${appUrl}/signup`} style={{ textDecoration: "none" }}>
                <Button size="lg" variant="primary">
                  Start your free baseline →
                </Button>
              </a>
              <Link to="/tools" style={{ textDecoration: "none" }}>
                <Button size="lg" variant="ghost">
                  Browse free calculators
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
