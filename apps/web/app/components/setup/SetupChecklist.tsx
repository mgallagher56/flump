import { css } from "@repo/ui/styled-system/css";
import { type FC, useState } from "react";
import {
  FaBalanceScale,
  FaChartLine,
  FaCheckCircle,
  FaChevronDown,
  FaChevronUp,
  FaFileInvoiceDollar,
  FaHome,
  FaPiggyBank,
  FaRegCircle,
  FaShieldAlt,
  FaTimes,
  FaUniversity,
  FaUser,
  FaWallet,
} from "react-icons/fa";
import { useNavigate } from "react-router";
import FLPHeading from "~/components/core/typography/FLPHeading";
import FLPText from "~/components/core/typography/FLPText";
import { useResponsive } from "~/context/ResponsiveContext";

export interface ChecklistStep {
  key: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  isComplete: boolean;
  actionLabel: string;
  onAction: () => void;
}

export interface SetupChecklistProps {
  hasAccounts: boolean;
  hasProfile: boolean;
  hasBudget: boolean;
  hasSavings?: boolean;
  hasPension?: boolean;
  hasMortgageAccount: boolean;
  hasRunForecast: boolean;
  hasTax?: boolean;
  completedSteps: string[];
  enabledPages?: string[];
  onOpenConnectBank?: () => void;
  onOpenBudgetWizard?: () => void;
  isMobile?: boolean;
  variant?: "desktop" | "mobile";
}

const STEP_DEFINITIONS = (props: SetupChecklistProps, navigate: ReturnType<typeof useNavigate>) => [
  {
    key: "budget",
    label: "Break down monthly outgoings",
    description:
      "Your baseline outgoings are active. Break them down into Housing, Bills, Living & Wants to refine your Runway.",
    icon: <FaWallet style={{ color: "#f59e0b" }} />,
    isComplete: props.hasBudget || props.completedSteps.includes("budget"),
    actionLabel: "Drill Down Budget",
    onAction: props.onOpenBudgetWizard || (() => navigate("/app/budget")),
  },
  {
    key: "accounts",
    label: "Connect bank or split savings accounts",
    description: "Sync via FCA Read-Only Open Banking or add individual current and savings pots.",
    icon: <FaUniversity style={{ color: "#6363f1" }} />,
    isComplete: props.hasAccounts || props.completedSteps.includes("accounts"),
    actionLabel: "Add Account Detail",
    onAction: props.onOpenConnectBank || (() => navigate("/app/accounts")),
  },
  {
    key: "savings",
    label: "Track savings & interest rates",
    description: "Record individual interest rates (APY) and set regular monthly wealth targets.",
    icon: <FaPiggyBank style={{ color: "#10b981" }} />,
    isComplete: !!props.hasSavings || props.completedSteps.includes("savings"),
    actionLabel: "Track Savings",
    onAction: () => navigate("/app/savings"),
  },
  {
    key: "pension",
    label: "Refine pension schemes & match",
    description: "Add employer matching % and track multiple active or legacy UK pension pots.",
    icon: <FaShieldAlt style={{ color: "#8b5cf6" }} />,
    isComplete: !!props.hasPension || props.completedSteps.includes("pension"),
    actionLabel: "Refine Pension",
    onAction: () => navigate("/app/pension"),
  },
  {
    key: "mortgage",
    label: "Refine mortgage term & overpayment",
    description:
      "Simulate monthly overpayments, view your full amortization curve, and compare ISA vs. mortgage payoff.",
    icon: <FaHome style={{ color: "#10b981" }} />,
    isComplete: props.hasMortgageAccount || props.completedSteps.includes("mortgage"),
    actionLabel: "Drill Down Mortgage",
    onAction: () => navigate("/app/mortgage"),
  },
  {
    key: "forecast",
    label: "Explore 10–30 year scenarios",
    description:
      "Simulate pay rises, career breaks, or mortgage interest shocks on your net worth line.",
    icon: <FaChartLine style={{ color: "#3b82f6" }} />,
    isComplete: props.hasRunForecast || props.completedSteps.includes("forecast"),
    actionLabel: "Model Scenarios",
    onAction: () => navigate("/app/forecast"),
  },
  {
    key: "tax",
    label: "Record self-employed or rental tax",
    description:
      "Log income and deductible expenses to view your estimated UK Self-Assessment liability.",
    icon: <FaFileInvoiceDollar style={{ color: "#3b82f6" }} />,
    isComplete: Boolean(props.hasTax || props.completedSteps.includes("tax")),
    actionLabel: "Open Tax Tracker",
    onAction: () => navigate("/app/tax"),
  },
];

const SetupChecklist: FC<SetupChecklistProps> = (props) => {
  const navigate = useNavigate();
  const { isMobile: contextIsMobile } = useResponsive();
  const isMobileVariant = props.isMobile ?? (props.variant === "mobile" ? true : contextIsMobile);
  const [expanded, setExpanded] = useState(true);
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window !== "undefined") {
      return window.localStorage.getItem("flump_setup_checklist_dismissed") === "true";
    }
    return false;
  });

  const allSteps = STEP_DEFINITIONS(props, navigate);
  const steps = props.enabledPages
    ? allSteps.filter((s) => {
        if (s.key === "profile") return true;
        if (s.key === "runway") return props.enabledPages?.includes("budget");
        return props.enabledPages?.includes(s.key);
      })
    : allSteps;

  const completedCount = steps.filter((s) => s.isComplete).length;
  const allComplete = completedCount === steps.length;

  if (dismissed && !allComplete) return null;
  if (allComplete) return null;

  const progressPct = (completedCount / steps.length) * 100;

  return (
    <div
      className={css({
        borderRadius: "xl",
        border: "1px solid",
        borderColor: "primary",
        backgroundColor: "rgba(99,99,241,0.04)",
        overflow: "hidden",
        marginBottom: { base: "14px", md: "24px" },
        transition: "all 0.3s ease",
      })}
    >
      {/* Header */}
      <div
        className={css({
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: { base: "12px 14px", md: "16px 20px" },
          cursor: "pointer",
          userSelect: "none",
          borderBottom: expanded ? "1px solid" : "none",
          borderColor: "border",
          _hover: { backgroundColor: "rgba(99,99,241,0.07)" },
        })}
        onClick={() => setExpanded(!expanded)}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <FLPHeading as="h4" size="sm">
                Refine & Drill Down Your Baseline
              </FLPHeading>
              <span
                className={css({
                  fontSize: "xs",
                  fontWeight: "bold",
                  color: "primary",
                  backgroundColor: "rgba(99,99,241,0.12)",
                  padding: "2px 8px",
                  borderRadius: "full",
                })}
              >
                {completedCount} / {steps.length}
              </span>
            </div>
            {/* Progress bar */}
            <div
              className={css({
                height: "4px",
                borderRadius: "full",
                backgroundColor: "border",
                marginTop: "6px",
                overflow: "hidden",
                maxWidth: "300px",
              })}
            >
              <div
                style={{
                  height: "100%",
                  width: `${progressPct}%`,
                  backgroundColor: "#6363f1",
                  borderRadius: "full",
                  transition: "width 0.5s ease",
                }}
              />
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            className={css({
              color: "text.muted",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "4px",
              borderRadius: "sm",
              fontSize: "12px",
              transition: "color 0.15s",
              _hover: { color: "destructive" },
            })}
            title="Dismiss"
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setDismissed(true);
              if (typeof window !== "undefined") {
                window.localStorage.setItem("flump_setup_checklist_dismissed", "true");
              }
            }}
          >
            <FaTimes />
          </button>
          <div className={css({ color: "text.muted", fontSize: "sm" })}>
            {expanded ? <FaChevronUp /> : <FaChevronDown />}
          </div>
        </div>
      </div>

      {/* Step list */}
      {expanded && (
        <div
          className={css({
            display: "grid",
            gridTemplateColumns: isMobileVariant ? "1fr" : { base: "1fr", md: "repeat(2, 1fr)" },
            gap: "0",
          })}
        >
          {steps.map((step) => (
            <div
              key={step.key}
              className={css({
                display: "flex",
                alignItems: "flex-start",
                gap: "12px",
                padding: { base: "10px 14px", md: "16px 20px" },
                borderBottom: "1px solid",
                borderColor: "border",
                backgroundColor: step.isComplete ? "rgba(16,185,129,0.03)" : "transparent",
                transition: "background-color 0.2s",
              })}
            >
              {/* Status icon */}
              <div style={{ marginTop: "2px", flexShrink: 0 }}>
                {step.isComplete ? (
                  <FaCheckCircle style={{ color: "#10b981", fontSize: "18px" }} />
                ) : (
                  <FaRegCircle style={{ color: "#a1a1aa", fontSize: "18px" }} />
                )}
              </div>

              <div style={{ flex: 1 }}>
                <div
                  style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "3px" }}
                >
                  {step.icon}
                  <FLPText
                    fontSize="sm"
                    fontWeight="semibold"
                    style={{
                      textDecoration: step.isComplete ? "line-through" : "none",
                      opacity: step.isComplete ? 0.6 : 1,
                    }}
                  >
                    {step.label}
                  </FLPText>
                </div>
                <FLPText
                  color="text.muted"
                  fontSize="xs"
                  style={{ lineHeight: "1.5", marginBottom: "10px" }}
                >
                  {step.description}
                </FLPText>
                {step.isComplete ? (
                  <span
                    className={css({
                      fontSize: "xs",
                      fontWeight: "medium",
                      color: "success.500",
                      backgroundColor: "rgba(16, 185, 129, 0.08)",
                      padding: "3px 8px",
                      borderRadius: "md",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                    })}
                  >
                    ✓ Widget Unlocked on Dashboard
                  </span>
                ) : (
                  <button
                    className={css({
                      fontSize: "xs",
                      fontWeight: "semibold",
                      color: "primary",
                      background: "none",
                      border: "1px solid",
                      borderColor: "primary",
                      borderRadius: "sm",
                      padding: "4px 10px",
                      cursor: "pointer",
                      transition: "all 0.15s",
                      _hover: {
                        backgroundColor: "rgba(99,99,241,0.08)",
                      },
                    })}
                    type="button"
                    onClick={step.onAction}
                  >
                    {step.actionLabel} →
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SetupChecklist;
