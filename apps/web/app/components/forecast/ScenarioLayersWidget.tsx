import { css } from "@repo/ui/styled-system/css";
import { type FC, useMemo, useState } from "react";
import { FiHome, FiLayers, FiSmile, FiTrendingUp, FiUserCheck } from "react-icons/fi";
import FLPHeading from "~/components/core/typography/FLPHeading";
import FLPText from "~/components/core/typography/FLPText";

export interface LifeEventScenario {
  id: string;
  title: string;
  description: string;
  icon: any;
  year: number;
  costImpactAnnual: number;
  wealthDeltaAt30Yr: number;
  category: "property" | "family" | "mortgage" | "retirement";
}

export const DEFAULT_LIFE_EVENTS: LifeEventScenario[] = [
  {
    id: "buy_home_2028",
    title: "Buy £450k Home in 2028",
    description: "£65,000 deposit from savings + £385,000 mortgage repayments at 4.5%",
    icon: FiHome,
    year: 2028,
    costImpactAnnual: -18000,
    wealthDeltaAt30Yr: 310000, // Long-term equity appreciation
    category: "property",
  },
  {
    id: "childcare_2027",
    title: "Have a Child in 2027",
    description:
      "Statutory pay dip + £1,100/mo nursery fees for 4 years (factoring in 30 hrs funding)",
    icon: FiSmile,
    year: 2027,
    costImpactAnnual: -13200,
    wealthDeltaAt30Yr: -68000,
    category: "family",
  },
  {
    id: "remortgage_shock",
    title: "Remortgage at 5.2% (2027)",
    description: "Fixed deal expiry jump from 2.1% to 5.2%, adding +£320/mo to repayments",
    icon: FiTrendingUp,
    year: 2027,
    costImpactAnnual: -3840,
    wealthDeltaAt30Yr: -32000,
    category: "mortgage",
  },
  {
    id: "retire_at_57",
    title: "Retire Early at 57 (ISA Bridge)",
    description:
      "Stop full-time PAYE earnings at 57, bridging 10 years to state pension via Stocks & Shares ISA",
    icon: FiUserCheck,
    year: 2038,
    costImpactAnnual: -28000,
    wealthDeltaAt30Yr: -210000,
    category: "retirement",
  },
];

export interface ScenarioLayersWidgetProps {
  onScenarioToggle?: (activeScenarioIds: string[]) => void;
}

const formatGBP = (num: number) =>
  `${num >= 0 ? "+" : "-"}£${Math.abs(Math.round(num)).toLocaleString("en-GB")}`;

const gridLayout = css({
  display: "grid",
  gridTemplateColumns: { base: "1fr", sm: "1fr 1fr" },
  gap: "12px",
});

export const ScenarioLayersWidget: FC<ScenarioLayersWidgetProps> = ({ onScenarioToggle }) => {
  const [activeScenarioIds, setActiveScenarioIds] = useState<string[]>([]);

  const handleToggle = (id: string) => {
    setActiveScenarioIds((prev) => {
      const next = prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
      if (onScenarioToggle) onScenarioToggle(next);
      return next;
    });
  };

  const netImpactAt30Yrs = useMemo(() => {
    return activeScenarioIds.reduce((sum, id) => {
      const ev = DEFAULT_LIFE_EVENTS.find((e) => e.id === id);
      return sum + (ev?.wealthDeltaAt30Yr || 0);
    }, 0);
  }, [activeScenarioIds]);

  return (
    <div
      style={{
        backgroundColor: "var(--colors-surface)",
        border: "1px solid var(--colors-border)",
        borderRadius: "16px",
        padding: "20px 24px",
        boxShadow: "0 4px 16px rgba(0, 0, 0, 0.04)",
      }}
      data-testid="scenario-layers-widget"
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "16px",
          flexWrap: "wrap",
          gap: "10px",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <FiLayers style={{ color: "var(--colors-primary)" }} />
            <FLPHeading as="h3" size="sm">
              Life Event Scenario Layers
            </FLPHeading>
          </div>
          <FLPText color="text.muted" fontSize="xs" style={{ marginTop: "2px" }}>
            Toggle multi-variable life events onto your 30-year forecast trajectory.
          </FLPText>
        </div>

        {activeScenarioIds.length > 0 && (
          <div
            style={{
              padding: "4px 12px",
              borderRadius: "full",
              backgroundColor:
                netImpactAt30Yrs >= 0 ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
              color: netImpactAt30Yrs >= 0 ? "#10b981" : "#ef4444",
              fontSize: "12px",
              fontWeight: 700,
            }}
          >
            30-Yr Trajectory Impact: {formatGBP(netImpactAt30Yrs)}
          </div>
        )}
      </div>

      {/* Scenario Event Chips */}
      <div className={gridLayout}>
        {DEFAULT_LIFE_EVENTS.map((event) => {
          const isActive = activeScenarioIds.includes(event.id);
          const Icon = event.icon;

          return (
            <button
              key={event.id}
              type="button"
              onClick={() => handleToggle(event.id)}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "12px",
                padding: "14px 16px",
                borderRadius: "12px",
                border: "1px solid",
                borderColor: isActive ? "var(--colors-primary)" : "var(--colors-border)",
                backgroundColor: isActive ? "rgba(99, 102, 241, 0.06)" : "transparent",
                textAlign: "left",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "8px",
                  backgroundColor: isActive ? "var(--colors-primary)" : "var(--colors-surface)",
                  color: isActive ? "#fff" : "var(--colors-text-muted)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  fontSize: "16px",
                }}
              >
                <Icon />
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}
                >
                  <strong style={{ fontSize: "13px", color: "text.primary" }}>{event.title}</strong>
                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: 700,
                      padding: "1px 6px",
                      borderRadius: "full",
                      backgroundColor: isActive
                        ? "var(--colors-primary)"
                        : "var(--colors-secondary)",
                      color: isActive ? "#fff" : "var(--colors-text-muted)",
                    }}
                  >
                    {isActive ? "ACTIVE" : "+ ADD"}
                  </span>
                </div>
                <div
                  style={{ fontSize: "11px", color: "var(--colors-text-muted)", marginTop: "4px" }}
                >
                  {event.description}
                </div>
                <div
                  style={{
                    fontSize: "11px",
                    fontWeight: 600,
                    marginTop: "6px",
                    color: event.wealthDeltaAt30Yr >= 0 ? "#10b981" : "var(--colors-text-muted)",
                  }}
                >
                  Estimated 30-Yr Impact: {formatGBP(event.wealthDeltaAt30Yr)}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ScenarioLayersWidget;
