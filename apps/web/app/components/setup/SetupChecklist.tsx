import { chartColor } from "@repo/ui";
import { css } from "@repo/ui/styled-system/css";
import { type FC, useId, useState } from "react";
import { useTranslation } from "react-i18next";
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
import FLPText from "~/components/core/typography/FLPText";
import { useResponsive } from "~/context/ResponsiveContext";
import { useSampleMode } from "~/context/SampleModeContext";

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
      "Your baseline outgoings are active. Break them down into housing, bills, living, and wants to refine your emergency runway.",
    icon: <FaWallet style={{ color: "var(--colors-status-warning-text)" }} />,
    isComplete: props.hasBudget || props.completedSteps.includes("budget"),
    actionLabel: "Drill down budget",
    onAction: props.onOpenBudgetWizard || (() => navigate("/app/budget")),
  },
  {
    key: "accounts",
    label: "Connect bank or split savings accounts",
    description:
      "Connect a supported bank (coming soon) or add current accounts and savings pots manually.",
    icon: <FaUniversity style={{ color: chartColor("primary") }} />,
    isComplete: props.hasAccounts || props.completedSteps.includes("accounts"),
    actionLabel: "Add account detail",
    onAction: props.onOpenConnectBank || (() => navigate("/app/accounts")),
  },
  {
    key: "savings",
    label: "Track savings and interest rates",
    description: "Record individual interest rates (AER) and set regular monthly savings targets.",
    icon: <FaPiggyBank style={{ color: "var(--colors-status-positive-text)" }} />,
    isComplete: !!props.hasSavings || props.completedSteps.includes("savings"),
    actionLabel: "Track savings",
    onAction: () => navigate("/app/savings"),
  },
  {
    key: "pension",
    label: "Refine pension schemes and employer match",
    description:
      "Add employer matching percentage and track multiple active or legacy UK pension pots.",
    icon: <FaShieldAlt style={{ color: chartColor("accentPurple") }} />,
    isComplete: !!props.hasPension || props.completedSteps.includes("pension"),
    actionLabel: "Refine pension",
    onAction: () => navigate("/app/pension"),
  },
  {
    key: "mortgage",
    label: "Refine mortgage term and overpayment",
    description:
      "Simulate monthly overpayments, view your full amortisation curve, and compare ISA vs mortgage payoff.",
    icon: <FaHome style={{ color: "var(--colors-status-positive-text)" }} />,
    isComplete: props.hasMortgageAccount || props.completedSteps.includes("mortgage"),
    actionLabel: "Drill down mortgage",
    onAction: () => navigate("/app/mortgage"),
  },
  {
    key: "forecast",
    label: "Explore 10–30 year scenarios",
    description:
      "Simulate pay rises, career breaks, or mortgage interest shocks on your net worth line.",
    icon: <FaChartLine style={{ color: chartColor("series2") }} />,
    isComplete: props.hasRunForecast || props.completedSteps.includes("forecast"),
    actionLabel: "Model scenarios",
    onAction: () => navigate("/app/savings#forecast"),
  },
  {
    key: "tax",
    label: "Record self-employed or rental tax",
    description:
      "Log income and allowable expenses to view your estimated UK Self Assessment liability.",
    icon: <FaFileInvoiceDollar style={{ color: chartColor("series2") }} />,
    isComplete: Boolean(props.hasTax || props.completedSteps.includes("tax")),
    actionLabel: "Open tax tracker",
    onAction: () => navigate("/app/tax"),
  },
];

const SetupChecklist: FC<SetupChecklistProps> = (props) => {
  const routerNavigate = useNavigate();
  const sample = useSampleMode();
  const { t } = useTranslation();
  // In the signed-out sandbox these pages need an account, so the actions do nothing.
  const navigate = (sample ? () => {} : routerNavigate) as typeof routerNavigate;
  const { isMobile: contextIsMobile } = useResponsive();
  const isMobileVariant = props.isMobile ?? (props.variant === "mobile" ? true : contextIsMobile);
  const panelId = useId();
  const [expanded, setExpanded] = useState(false);
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
        backgroundColor: "primary.subtle",
        overflow: "hidden",
        marginBottom: { base: "14px", md: "24px" },
        transition: "all 0.3s ease",
      })}
    >
      {/* Header: the heading wraps the toggle so the landmark survives and the whole padded
          header is the click target; the dismiss button sits beside it, not inside it. */}
      <div
        className={css({
          position: "relative",
          display: "flex",
          alignItems: "stretch",
          userSelect: "none",
          borderBottom: expanded ? "1px solid" : "none",
          borderColor: "border",
          _hover: { backgroundColor: "primary.subtle" },
        })}
      >
        <h4 className={css({ flex: "1", minWidth: 0, margin: 0, font: "inherit" })}>
          <button
            aria-controls={panelId}
            aria-expanded={expanded}
            className={css({
              width: "100%",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "12px",
              textAlign: "left",
              background: "none",
              border: "none",
              padding: { base: "12px 44px 12px 14px", md: "16px 52px 16px 20px" },
              margin: 0,
              font: "inherit",
              color: "inherit",
              cursor: "pointer",
            })}
            type="button"
            onClick={() => setExpanded(!expanded)}
          >
            <span style={{ display: "block" }}>
              <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span
                  className={css({
                    fontSize: "sm",
                    fontWeight: "semibold",
                    color: "text.primary",
                  })}
                >
                  Refine and drill down your baseline
                </span>
                <span
                  className={css({
                    fontSize: "xs",
                    fontWeight: "bold",
                    color: "primary",
                    backgroundColor: "primary.subtle",
                    padding: "2px 8px",
                    borderRadius: "full",
                  })}
                >
                  {completedCount} / {steps.length}
                </span>
              </span>
              {/* Progress bar */}
              <span
                className={css({
                  display: "block",
                  height: "4px",
                  borderRadius: "full",
                  backgroundColor: "border",
                  marginTop: "6px",
                  overflow: "hidden",
                  maxWidth: "300px",
                })}
              >
                <span
                  style={{
                    display: "block",
                    height: "100%",
                    width: `${progressPct}%`,
                    backgroundColor: chartColor("primary"),
                    borderRadius: "full",
                    transition: "width 0.5s ease",
                  }}
                />
              </span>
            </span>
            <span className={css({ color: "text.muted", fontSize: "sm", display: "flex" })}>
              {expanded ? <FaChevronUp /> : <FaChevronDown />}
            </span>
          </button>
        </h4>
        <button
          className={css({
            position: "absolute",
            top: "50%",
            transform: "translateY(-50%)",
            right: { base: "10px", md: "16px" },
            color: "text.muted",
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "4px",
            borderRadius: "sm",
            fontSize: "12px",
            transition: "color 0.15s",
            _hover: { color: "status.danger.text" },
          })}
          aria-label="Dismiss setup checklist"
          title="Dismiss"
          type="button"
          onClick={() => {
            setDismissed(true);
            if (typeof window !== "undefined") {
              window.localStorage.setItem("flump_setup_checklist_dismissed", "true");
            }
          }}
        >
          <FaTimes />
        </button>
      </div>

      {/* Step list */}
      <div
        id={panelId}
        className={css({
          gridTemplateColumns: isMobileVariant ? "1fr" : { base: "1fr", md: "repeat(2, 1fr)" },
          gap: "0",
        })}
        style={
          expanded
            ? { display: "grid" }
            : {
                height: 0,
                overflow: "hidden",
                opacity: 0,
                position: "absolute",
                pointerEvents: "none",
              }
        }
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
              backgroundColor: step.isComplete ? "status.positive.bg" : "transparent",
              transition: "background-color 0.2s",
            })}
          >
            {/* Status icon */}
            <div style={{ marginTop: "2px", flexShrink: 0 }}>
              {step.isComplete ? (
                <FaCheckCircle
                  style={{ color: "var(--colors-status-positive-text)", fontSize: "18px" }}
                />
              ) : (
                <FaRegCircle style={{ color: chartColor("baseline"), fontSize: "18px" }} />
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
                    color: "status.positive.text",
                    backgroundColor: "status.positive.bg",
                    padding: "3px 8px",
                    borderRadius: "md",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                  })}
                >
                  ✓ Widget unlocked on dashboard
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
                      backgroundColor: "primary.subtle",
                    },
                  })}
                  type="button"
                  aria-disabled={sample ? "true" : undefined}
                  onClick={sample ? (event) => event.preventDefault() : step.onAction}
                >
                  {sample ? t("signUpToOpen", "Sign up to open") : `${step.actionLabel} →`}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SetupChecklist;
