import { css } from "@repo/ui/styled-system/css";
import { type FC, useState } from "react";
import {
  FaBalanceScale,
  FaChartLine,
  FaCheckCircle,
  FaChevronDown,
  FaChevronUp,
  FaHome,
  FaRegCircle,
  FaTimes,
  FaUniversity,
  FaUser,
  FaWallet,
} from "react-icons/fa";
import { useNavigate } from "react-router";
import FLPHeading from "~/components/core/typography/FLPHeading";
import FLPText from "~/components/core/typography/FLPText";

export interface ChecklistStep {
  key: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  isComplete: boolean;
  actionLabel: string;
  onAction: () => void;
}

interface SetupChecklistProps {
  hasAccounts: boolean;
  hasProfile: boolean;
  hasBudget: boolean;
  hasMortgageAccount: boolean;
  hasRunForecast: boolean;
  completedSteps: string[];
  onOpenConnectBank: () => void;
  onOpenBudgetWizard: () => void;
}

const STEP_DEFINITIONS = (props: SetupChecklistProps, navigate: ReturnType<typeof useNavigate>) => [
  {
    key: "accounts",
    label: "Connect or add accounts",
    description: "Sync your bank accounts or add manual accounts to start tracking your net worth.",
    icon: <FaUniversity style={{ color: "#6363f1" }} />,
    isComplete: props.hasAccounts || props.completedSteps.includes("accounts"),
    actionLabel: "Connect Bank",
    onAction: props.onOpenConnectBank,
  },
  {
    key: "profile",
    label: "Set up your financial profile",
    description: "Enter your salary, employment type, and income sources. Used across all tools.",
    icon: <FaUser style={{ color: "#8b5cf6" }} />,
    isComplete: props.hasProfile || props.completedSteps.includes("profile"),
    actionLabel: "Open Profile",
    onAction: () => navigate("/app/profile"),
  },
  {
    key: "budget",
    label: "Configure your budget",
    description:
      "Set up income and expense categories with the guided wizard to unlock the Runway Calculator.",
    icon: <FaWallet style={{ color: "#f59e0b" }} />,
    isComplete: props.hasBudget || props.completedSteps.includes("budget"),
    actionLabel: "Set Up Budget",
    onAction: () => navigate("/app/budget"),
  },
  {
    key: "runway",
    label: "Check your unemployment runway",
    description:
      "Find out how many months you could survive without your salary. Requires budget setup.",
    icon: <FaBalanceScale style={{ color: "#ef4444" }} />,
    isComplete: props.completedSteps.includes("runway"),
    actionLabel: "Calculate Runway",
    onAction: () => navigate("/app/budget"),
  },
  {
    key: "mortgage",
    label: "Track your mortgage",
    description:
      "Simulate overpayments, compare savings vs. paying off early, and track your balance.",
    icon: <FaHome style={{ color: "#10b981" }} />,
    isComplete: props.hasMortgageAccount || props.completedSteps.includes("mortgage"),
    actionLabel: "Open Mortgage Tools",
    onAction: () => navigate("/app/mortgage"),
  },
  {
    key: "forecast",
    label: "Run a savings forecast",
    description:
      "Project your assets 10+ years into the future and model compound interest scenarios.",
    icon: <FaChartLine style={{ color: "#3b82f6" }} />,
    isComplete: props.hasRunForecast || props.completedSteps.includes("forecast"),
    actionLabel: "Run Forecast",
    onAction: () => navigate("/app/forecast"),
  },
];

const SetupChecklist: FC<SetupChecklistProps> = (props) => {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  const steps = STEP_DEFINITIONS(props, navigate);
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
        marginBottom: "8px",
        transition: "all 0.3s ease",
      })}
    >
      {/* Header */}
      <div
        className={css({
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 20px",
          cursor: "pointer",
          borderBottom: expanded ? "1px solid" : "none",
          borderColor: "border",
        })}
        role="button"
        tabIndex={0}
        onClick={() => setExpanded((p) => !p)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") setExpanded((p) => !p);
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1 }}>
          <div
            className={css({
              width: "36px",
              height: "36px",
              borderRadius: "full",
              backgroundColor: "rgba(99,99,241,0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "16px",
              flexShrink: 0,
            })}
          >
            🚀
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <FLPHeading as="h3" size="sm">
                Get started with Flump
              </FLPHeading>
              <span
                className={css({
                  fontSize: "xs",
                  fontWeight: "bold",
                  padding: "2px 8px",
                  borderRadius: "full",
                  backgroundColor: "rgba(99,99,241,0.12)",
                  color: "primary",
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
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: "0",
          })}
        >
          {steps.map((step, idx) => (
            <div
              key={step.key}
              className={css({
                display: "flex",
                alignItems: "flex-start",
                gap: "12px",
                padding: "16px 20px",
                borderBottom: idx < steps.length - 2 ? "1px solid" : "none",
                borderRight: idx % 2 === 0 ? "1px solid" : "none",
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
                {!step.isComplete && (
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
