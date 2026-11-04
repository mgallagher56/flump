import { Button } from "@repo/ui";
import { flex, stack } from "@repo/ui/styled-system/patterns";
import type { FC } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { ComparisonMatrix } from "../components/ComparisonMatrix";
import { CompoundingTeaser } from "../components/CompoundingTeaser";
import { FeaturePillars } from "../components/FeaturePillars";
import { Footer } from "../components/Footer";
import { Header } from "../components/Header";
import { HeroCalculator } from "../components/HeroCalculator";
import { HomeFAQ } from "../components/HomeFAQ";
import { getAppUrl } from "../utils/url";

export const HomePage: FC = () => {
  const appUrl = getAppUrl();

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Helmet>
        <title>Flump | UK Wealth, Tax Optimization & Net Worth Engine</title>
        <meta
          name="description"
          content="The UK financial engine engineered for HMRC rules. Crush high-interest debt, avoid the 60% £100k tax trap, and model your path to net worth freedom."
        />
        <link rel="canonical" href="https://flump.co.uk/" />
      </Helmet>

      <Header />

      <main style={{ flex: 1 }}>
        {/* Hero Section */}
        <div style={{ padding: "48px 16px 32px", textAlign: "center" }}>
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
              The UK financial engine built for every stage of your money. Crush credit card debt,
              navigate the 60% marginal tax trap, and model your path to long-term wealth—in one
              unified workspace.
            </p>

            <div className={flex({ gap: "4", flexWrap: "wrap", justify: "center" })}>
              <a
                href={`${appUrl}/sandbox`}
                style={{ textDecoration: "none" }}
                target="_blank"
                rel="noreferrer"
              >
                <Button size="lg" variant="primary">
                  Launch Free Interactive Demo →
                </Button>
              </a>
              <Link to="/tools" style={{ textDecoration: "none" }}>
                <Button size="lg" variant="outline">
                  Explore Free UK Calculators
                </Button>
              </Link>
            </div>
          </div>

          {/* Interactive Dual-Mode Hero Calculator */}
          <div style={{ marginTop: "40px" }}>
            <HeroCalculator />
          </div>
        </div>

        {/* Compounding Scenario Layers */}
        <CompoundingTeaser />

        {/* Feature Pillars */}
        <FeaturePillars />

        {/* Comparison Matrix */}
        <ComparisonMatrix />

        {/* FAQ Accordion */}
        <HomeFAQ />
      </main>

      <Footer />
    </div>
  );
};
