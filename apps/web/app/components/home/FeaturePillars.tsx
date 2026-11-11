import { css } from "@repo/ui/styled-system/css";
import { type FC, useState } from "react";
import type { IconType } from "react-icons";
import { FaFire } from "react-icons/fa";
import {
  FiDollarSign,
  FiFileText,
  FiHome,
  FiLayers,
  FiPercent,
  FiShield,
  FiTrendingUp,
} from "react-icons/fi";
import { Link as RouterLink } from "react-router";
import FLPHeading from "~/components/core/typography/FLPHeading";
import FLPText from "~/components/core/typography/FLPText";

const sectionContainerStyle = css({
  maxWidth: "6xl",
  margin: "0 auto",
  paddingLeft: "16px",
  paddingRight: "16px",
  marginBottom: { base: "64px", md: "96px" },
});

const headerContainerStyle = css({
  textAlign: "center",
  maxWidth: "3xl",
  margin: "0 auto 36px auto",
});

const personaTabsWrapperStyle = css({
  display: "flex",
  justifyContent: "center",
  gap: "8px",
  flexWrap: "wrap",
  marginBottom: "32px",
});

const personaTabStyle = (active: boolean) =>
  css({
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    padding: "10px 18px",
    borderRadius: "full",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
    border: "1px solid",
    borderColor: active ? "primary" : "border",
    backgroundColor: active ? "primary.solid" : "surface",
    color: active ? "primary.foreground" : "text.secondary",
    transition: "all 0.2s ease",
    "&:hover": {
      borderColor: "primary",
      transform: "translateY(-1px)",
    },
  });

const personaHighlightCardStyle = css({
  backgroundColor: "surface",
  border: "1px solid",
  borderColor: "border",
  borderRadius: "2xl",
  padding: { base: "24px", md: "36px" },
  marginBottom: "48px",
  boxShadow: "0 4px 20px rgba(0, 0, 0, 0.04)",
  position: "relative",
  overflow: "hidden",
});

const personaGridStyle = css({
  display: "grid",
  gridTemplateColumns: { base: "1fr", md: "1.2fr 0.8fr" },
  gap: "28px",
  alignItems: "center",
});

const personaFeatureListStyle = css({
  display: "flex",
  flexDirection: "column",
  gap: "12px",
  marginTop: "16px",
});

const personaFeatureItemStyle = css({
  display: "flex",
  alignItems: "flex-start",
  gap: "10px",
  fontSize: "14px",
  color: "text.secondary",
  lineHeight: "1.5",
});

const metricCardStyle = css({
  backgroundColor: "background",
  border: "1px solid",
  borderColor: "border",
  borderRadius: "xl",
  padding: "20px",
  display: "flex",
  flexDirection: "column",
  gap: "8px",
  textAlign: "left",
});

const gridStyle = css({
  display: "grid",
  gridTemplateColumns: { base: "1fr", lg: "repeat(2, 1fr)" },
  gap: "24px",
});

const cardStyle = css({
  backgroundColor: "surface",
  border: "1px solid",
  borderColor: "border",
  borderRadius: "2xl",
  padding: { base: "24px", md: "32px" },
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
  boxShadow: "sm",
  transition: "all 0.25s ease",
  "&:hover": {
    borderColor: "primary",
    boxShadow: "0 8px 24px rgba(0, 0, 0, 0.08)",
    transform: "translateY(-2px)",
  },
});

const iconBadgeStyle = (bgColor: string, textColor: string) =>
  css({
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "48px",
    height: "48px",
    borderRadius: "xl",
    backgroundColor: bgColor,
    color: textColor,
    fontSize: "22px",
    marginBottom: "20px",
  });

const tagListStyle = css({
  display: "flex",
  flexWrap: "wrap",
  gap: "8px",
  marginTop: "24px",
  paddingTop: "20px",
  borderTop: "1px solid",
  borderColor: "border",
});

const tagPillStyle = css({
  fontSize: "xs",
  fontWeight: "medium",
  padding: "4px 10px",
  borderRadius: "full",
  backgroundColor: "background",
  color: "text.muted",
  border: "1px solid",
  borderColor: "border",
});

type PersonaId = "debt" | "paye" | "homeowner" | "landlord" | "wealth";

interface PersonaConfig {
  id: PersonaId;
  label: string;
  icon: IconType;
  title: string;
  badge: string;
  description: string;
  features: string[];
  metricLabel: string;
  metricValue: string;
  metricNote: string;
  toolLink: string;
  toolLinkLabel: string;
}

const PERSONAS: PersonaConfig[] = [
  {
    id: "debt",
    label: "Debt payoff and recovery",
    icon: FaFire,
    title: "Clear high-interest debt and build positive wealth",
    badge: "Stage 1: Financial recovery",
    description:
      "Generic debt trackers treat all debt identically. Flump orders your debts by avalanche or snowball, alerts you before 0% promotional rates expire, and shows the exact day your debt payments turn into positive wealth.",
    features: [
      "Avalanche vs snowball engine calculating exact interest saved and months shaved off",
      "0% balance transfer tracker with 60-day alerts and revert APR cost analysis",
      "Debt-to-wealth crossover chart showing example +£28,000 in positive wealth 5 years post-payoff",
      "Safe to spend weekly cash allowance to protect your essentials and prevent month-end deficits",
    ],
    metricLabel: "Interest saved and time saved",
    metricValue: "£1,480 & 16 months",
    metricNote:
      "Achieved via £50/month avalanche overpayment on average UK consumer debt portfolio",
    toolLink: "/tools/uk-debt-snowball-vs-avalanche-calculator",
    toolLinkLabel: "Open snowball vs avalanche calculator →",
  },
  {
    id: "paye",
    label: "Higher-rate PAYE (£100k+)",
    icon: FiPercent,
    title: "Escape the 60% tax trap and maximise allowances",
    badge: "For high earners",
    description:
      "Cross £100k and HMRC strips your £12,570 Personal Allowance at £1 for every £2, creating a punitive 60% marginal tax rate plus loss of tax-free childcare. Flump models exact salary sacrifice and SIPP contributions to reclaim your allowance.",
    features: [
      "Dynamic £100k–£125k tax trap detector with one-click pension modelling",
      "Salary sacrifice vs SIPP relief comparison including employer National Insurance pass-through",
      "Live £20,000 ISA and £60,000 Pension Annual Allowance countdown",
    ],
    metricLabel: "Average tax trap relief",
    metricValue: "£5,020 / year",
    metricNote: "Recovered via targeted £10k pension sacrifice at £110k gross salary",
    toolLink: "/tools/uk-100k-tax-trap-calculator",
    toolLinkLabel: "Open 60% tax trap calculator →",
  },
  {
    id: "homeowner",
    label: "Homeowner and remortgager",
    icon: FiHome,
    title: "Navigate remortgage rates and compare overpayments with investing",
    badge: "For property owners",
    description:
      "When your fixed-rate deal expires, jumping to a lender's standard variable rate can add hundreds to your monthly payment. Flump tracks your deal expiry, models milestone LTV bands, and compares overpaying against investing.",
    features: [
      "Deal expiry alerts and monthly jump forecasts into lender Standard Variable Rates",
      "Target LTV milestone tracker (such as 75% vs 80%) to unlock cheaper renewal tiers",
      "Side-by-side comparison of mortgage overpayment savings against tax-free Stocks and Shares ISA compounding",
    ],
    metricLabel: "Mortgage vs ISA spread",
    metricValue: "+£48,200",
    metricNote: "Projected 15-year ISA compounding advantage over 4.2% mortgage overpayment",
    toolLink: "/tools/mortgage-overpay-vs-isa",
    toolLinkLabel: "Open overpay vs ISA calculator →",
  },
  {
    id: "landlord",
    label: "Landlord and sole trader",
    icon: FiDollarSign,
    title: "Section 24 landlord tax and HMRC Payments on Account",
    badge: "For property and self-employed",
    description:
      "Section 24 restricts buy-to-let mortgage interest relief to a 20% basic-rate credit. Flump calculates exact Section 24 adjustments, beneficial ownership splits, and January and July tax buffers.",
    features: [
      "Section 24 restriction calculator with beneficial ownership split modelling",
      "Payments on Account cash-flow reserve schedule for 31 January and 31 July HMRC deadlines",
      "Self Assessment Class 4 National Insurance and allowable expense categorisation",
    ],
    metricLabel: "HMRC tax reserve",
    metricValue: "£420 / month",
    metricNote: "Recommended monthly tax pot transfer to cover upcoming Payment on Account",
    toolLink: "/tools/section-24-landlord-calculator",
    toolLinkLabel: "Open Section 24 landlord calculator →",
  },
  {
    id: "wealth",
    label: "Long-term wealth builder",
    icon: FiTrendingUp,
    title: "Multi-account balance sheet and 30-year financial runway",
    badge: "For wealth builders",
    description:
      "Stop juggling fragmented bank apps and spreadsheets. Flump unifies liquid cash, ISAs, SIPPs, and property equity into a single living balance sheet with long-term projections.",
    features: [
      "Unified balance sheet distinguishing liquid cash from pension and property equity",
      "30-year compound trajectory simulating life events and retirement",
      "Account aggregation with emergency runway stress testing",
    ],
    metricLabel: "Financial independence runway",
    metricValue: "18.4 years",
    metricNote: "Liquid capital runway under current spending and compound ISA yields",
    toolLink: "/sandbox",
    toolLinkLabel: "Explore live demo →",
  },
];

export const FeaturePillars: FC = () => {
  const [selectedPersonaId, setSelectedPersonaId] = useState<PersonaId>("debt");
  const activePersona = PERSONAS.find((p) => p.id === selectedPersonaId) ?? PERSONAS[0];
  const IconComponent = activePersona.icon;

  return (
    <section aria-labelledby="features-heading" className={sectionContainerStyle}>
      <div className={headerContainerStyle}>
        <span
          className={css({
            color: "primary",
            fontSize: "xs",
            fontWeight: "bold",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            display: "block",
            marginBottom: "8px",
          })}
        >
          Core tools
        </span>
        <FLPHeading as="h2" color="text.primary" id="features-heading" mb={3} size="3xl">
          Everything you need to master UK wealth and taxation
        </FLPHeading>
        <FLPText color="text.muted" fontSize="md">
          Flump models your complete financial balance sheet, UK tax liabilities, and compound
          long-term wealth tailored to your exact life stage.
        </FLPText>
      </div>

      {/* Interactive Persona Selector */}
      <div aria-label="Select financial persona" className={personaTabsWrapperStyle} role="tablist">
        {PERSONAS.map((persona) => {
          const isSelected = persona.id === selectedPersonaId;
          const PersonaIcon = persona.icon;
          return (
            <button
              aria-selected={isSelected}
              className={personaTabStyle(isSelected)}
              key={persona.id}
              onClick={() => setSelectedPersonaId(persona.id)}
              role="tab"
              type="button"
            >
              <PersonaIcon aria-hidden="true" size={16} />
              <span>{persona.label}</span>
            </button>
          );
        })}
      </div>

      {/* Active Persona Spotlight Card */}
      <div aria-label={activePersona.title} className={personaHighlightCardStyle} role="tabpanel">
        <div className={personaGridStyle}>
          <div>
            <span
              style={{
                fontSize: "11px",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                color: "#6366f1",
                display: "inline-block",
                marginBottom: "8px",
              }}
            >
              {activePersona.badge}
            </span>
            <FLPHeading as="h3" color="text.primary" mb={3} size="xl">
              {activePersona.title}
            </FLPHeading>
            <FLPText color="text.muted" fontSize="sm" lineHeight="1.6">
              {activePersona.description}
            </FLPText>

            <div className={personaFeatureListStyle}>
              {activePersona.features.map((feature, i) => (
                <div className={personaFeatureItemStyle} key={i}>
                  <FiShield
                    aria-hidden="true"
                    color="#10b981"
                    size={16}
                    style={{ flexShrink: 0, marginTop: "2px" }}
                  />
                  <span>{feature}</span>
                </div>
              ))}
            </div>

            <div style={{ marginTop: "24px", display: "flex", gap: "12px", alignItems: "center" }}>
              <RouterLink
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "#6366f1",
                  textDecoration: "none",
                }}
                to={activePersona.toolLink}
              >
                {activePersona.toolLinkLabel}
              </RouterLink>
            </div>
          </div>

          <div>
            <div className={metricCardStyle}>
              <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>
                Example: {activePersona.metricLabel}
              </span>
              <span
                style={{
                  fontSize: "28px",
                  fontWeight: 800,
                  color: "#0f172a",
                  letterSpacing: "-0.02em",
                }}
              >
                {activePersona.metricValue}
              </span>
              <span style={{ fontSize: "12px", color: "#64748b", lineHeight: "1.4" }}>
                {activePersona.metricNote}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Core 4 Pillar Cards */}
      <div className={gridStyle}>
        {/* Pillar 1: UK Tax Engine */}
        <div className={cardStyle}>
          <div>
            <div className={iconBadgeStyle("rgba(59, 130, 246, 0.12)", "rgb(59, 130, 246)")}>
              <FiFileText aria-hidden="true" />
            </div>
            <FLPHeading as="h3" color="text.primary" mb={2} size="xl">
              UK tax and Self Assessment hub
            </FLPHeading>
            <FLPText color="text.muted" fontSize="sm" lineHeight="1.6">
              Navigate UK taxation with clarity. Includes HMRC tax-year (6 April – 5 April)
              tracking, PAYE take-home estimation, Class 4 National Insurance calculation, and
              automated Section 24 rental property mortgage interest relief calculations (20% basic
              rate credit).
            </FLPText>
          </div>
          <div className={tagListStyle}>
            <span className={tagPillStyle}>£100k taper alert</span>
            <span className={tagPillStyle}>Section 24 landlord tax</span>
            <span className={tagPillStyle}>Class 4 NI bands</span>
            <span className={tagPillStyle}>Joint ownership split</span>
          </div>
        </div>

        {/* Pillar 2: Net Worth & Accounts */}
        <div className={cardStyle}>
          <div>
            <div className={iconBadgeStyle("rgba(16, 185, 129, 0.12)", "rgb(16, 185, 129)")}>
              <FiLayers aria-hidden="true" />
            </div>
            <FLPHeading as="h3" color="text.primary" mb={2} size="xl">
              Complete net worth aggregation
            </FLPHeading>
            <FLPText color="text.muted" fontSize="sm" lineHeight="1.6">
              One unified balance sheet for your entire financial life. Track current accounts,
              high-yield savings, Stocks and Shares ISAs, mortgages, and loans. Distinguish liquid
              emergency cash from illiquid assets at a glance.
            </FLPText>
          </div>
          <div className={tagListStyle}>
            <span className={tagPillStyle}>Multi-account ledger</span>
            <span className={tagPillStyle}>Asset allocation</span>
            <span className={tagPillStyle}>Liquid vs total net worth</span>
          </div>
        </div>

        {/* Pillar 3: Mortgage Scenario Engine */}
        <div className={cardStyle}>
          <div>
            <div className={iconBadgeStyle("rgba(245, 158, 11, 0.12)", "rgb(245, 158, 11)")}>
              <FiHome aria-hidden="true" />
            </div>
            <FLPHeading as="h3" color="text.primary" mb={2} size="xl">
              Mortgage optimisation and ISA comparison
            </FLPHeading>
            <FLPText color="text.muted" fontSize="sm" lineHeight="1.6">
              Model amortisation schedules, evaluate interest saved by overpayments, and compare
              paying down your mortgage against investing in a tax-sheltered ISA.
            </FLPText>
          </div>
          <div className={tagListStyle}>
            <span className={tagPillStyle}>Overpayment term saver</span>
            <span className={tagPillStyle}>Mortgage vs ISA</span>
            <span className={tagPillStyle}>Equity accumulation</span>
            <span className={tagPillStyle}>Remortgage planning</span>
          </div>
        </div>

        {/* Pillar 4: Pensions & Long-Term Forecasting */}
        <div className={cardStyle}>
          <div>
            <div className={iconBadgeStyle("rgba(139, 92, 246, 0.12)", "rgb(139, 92, 246)")}>
              <FiTrendingUp aria-hidden="true" />
            </div>
            <FLPHeading as="h3" color="text.primary" mb={2} size="xl">
              Pensions and compound wealth forecaster
            </FLPHeading>
            <FLPText color="text.muted" fontSize="sm" lineHeight="1.6">
              Simulate your trajectory to financial independence. Factors in UK auto-enrolment rules
              (qualifying earnings band £6,240 – £50,270 with standard 3% employer match), salary
              sacrifice National Insurance efficiency, and multi-decade compound interest forecasts.
            </FLPText>
          </div>
          <div className={tagListStyle}>
            <span className={tagPillStyle}>Auto-enrolment qualifying bands</span>
            <span className={tagPillStyle}>Salary sacrifice savings</span>
            <span className={tagPillStyle}>FIRE target age</span>
            <span className={tagPillStyle}>Cash runway stress test</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeaturePillars;
